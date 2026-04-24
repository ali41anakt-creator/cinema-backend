const pool   = require('../../db/database');
const crypto = require('crypto');

function genCode() {
  return 'CI9-' + crypto.randomBytes(5).toString('hex').toUpperCase();
}

async function bookTicket(req, res) {
  const { session_id, seat_ids } = req.body;
  const userId = req.session.userId;

  if (!session_id || !Array.isArray(seat_ids) || !seat_ids.length)
    return res.status(400).json({ error: 'session_id және seat_ids міндетті' });
  if (seat_ids.length > 8)
    return res.status(400).json({ error: 'Ең көбі 8 орын таңдауға болады' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessR = await client.query('SELECT * FROM sessions WHERE id=$1', [session_id]);
    if (!sessR.rows[0]) throw new Error('Сеанс табылмады');
    const session = sessR.rows[0];

    const totalCost = parseFloat(session.price) * seat_ids.length;

    // Баланс тексеру
    const userR = await client.query('SELECT balance FROM users WHERE id=$1', [userId]);
    const userBalance = parseFloat(userR.rows[0].balance);
    if (userBalance < totalCost) {
      throw new Error(`Баланс жетіспейді. Қажет: ${totalCost.toLocaleString()} тг, бар: ${userBalance.toLocaleString()} тг`);
    }

    const booked = [];
    for (const seatId of seat_ids) {
      const seatR = await client.query('SELECT * FROM seats WHERE id=$1 AND session_id=$2', [seatId, session_id]);
      const seat = seatR.rows[0];
      if (!seat) throw new Error(`Орын #${seatId} табылмады`);
      if (seat.is_booked) throw new Error(`"${seat.seat_label}" орны бос емес`);

      await client.query('UPDATE seats SET is_booked=TRUE WHERE id=$1', [seatId]);

      const code = genCode();
      const tr = await client.query(
        'INSERT INTO tickets (user_id,session_id,seat_id,price,code) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [userId, session_id, seatId, session.price, code]
      );
      booked.push({ ticketId: tr.rows[0].id, seat: seat.seat_label, code, price: parseFloat(session.price) });
    }

    // Балансты шегеру
    await client.query('UPDATE users SET balance = balance - $1 WHERE id=$2', [totalCost, userId]);

    await client.query('COMMIT');
    const newBalR = await pool.query('SELECT balance FROM users WHERE id=$1', [userId]);
    const newBalance = parseFloat(newBalR.rows[0].balance);

    res.status(201).json({
      message: '🎫 Билет сәтті сатып алынды!',
      tickets: booked,
      totalPrice: totalCost,
      newBalance
    });
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
}

async function getMyTickets(req, res) {
  try {
    const r = await pool.query(`
      SELECT t.id, t.code, t.price, t.status, t.created_at,
             seats.seat_label, seats.seat_type,
             s.date_time, h.name AS hall_name,
             m.title AS movie_title, m.emoji, m.genre, m.duration
      FROM tickets t
      JOIN seats    ON seats.id = t.seat_id
      JOIN sessions s ON s.id  = t.session_id
      JOIN halls    h ON h.id  = s.hall_id
      JOIN movies   m ON m.id  = s.movie_id
      WHERE t.user_id=$1
      ORDER BY t.created_at DESC
    `, [req.session.userId]);
    res.json({ count: r.rows.length, tickets: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function cancelTicket(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('SELECT * FROM tickets WHERE id=$1 AND user_id=$2', [req.params.id, req.session.userId]);
    const ticket = r.rows[0];
    if (!ticket) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Билет табылмады' }); }
    if (ticket.status === 'cancelled') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Бұрын болдырмаланған' }); }

    await client.query("UPDATE tickets SET status='cancelled' WHERE id=$1", [ticket.id]);
    await client.query('UPDATE seats SET is_booked=FALSE WHERE id=$1', [ticket.seat_id]);
    // Ақшаны қайтару
    await client.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [ticket.price, ticket.user_id]);
    await client.query('COMMIT');
    res.json({ message: 'Билет болдырмаланды, орын босатылды, ақша қайтарылды' });
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
}

async function getAllTickets(req, res) {
  try {
    const r = await pool.query(`
      SELECT t.id, t.code, t.price, t.status, t.created_at,
             u.name AS user_name, u.email,
             seats.seat_label, h.name AS hall_name,
             s.date_time, m.title AS movie_title
      FROM tickets t
      JOIN users    u ON u.id   = t.user_id
      JOIN seats    ON seats.id = t.seat_id
      JOIN sessions s ON s.id  = t.session_id
      JOIN halls    h ON h.id  = s.hall_id
      JOIN movies   m ON m.id  = s.movie_id
      ORDER BY t.created_at DESC LIMIT 200
    `);
    res.json({ count: r.rows.length, tickets: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

module.exports = { bookTicket, getMyTickets, cancelTicket, getAllTickets };
