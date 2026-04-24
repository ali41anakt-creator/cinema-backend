const pool = require('../../db/database');

async function getAllSessions(req, res) {
  try {
    const { movie_id, date } = req.query;
    let query = `
      SELECT s.*, m.title AS movie_title, m.genre, m.duration, m.emoji, m.age_limit,
             h.name AS hall_name, h.hall_type,
             COUNT(CASE WHEN seats.is_booked=FALSE THEN 1 END) AS free_seats,
             COUNT(seats.id) AS total_seats
      FROM sessions s
      JOIN movies m ON m.id=s.movie_id
      JOIN halls  h ON h.id=s.hall_id
      LEFT JOIN seats ON seats.session_id=s.id
      WHERE m.is_active=TRUE
    `;
    const params = [];
    let i = 1;
    if (movie_id) { query += ` AND s.movie_id=$${i++}`; params.push(movie_id); }
    if (date)     { query += ` AND DATE(s.date_time)=$${i++}`; params.push(date); }
    query += ' GROUP BY s.id, m.title, m.genre, m.duration, m.emoji, m.age_limit, h.name, h.hall_type ORDER BY s.date_time';

    const r = await pool.query(query, params);
    res.json({ count: r.rows.length, sessions: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function getSeats(req, res) {
  try {
    const sr = await pool.query(`
      SELECT s.*, m.title AS movie_title, m.emoji,
             h.name AS hall_name, h.hall_type, h.rows, h.cols
      FROM sessions s
      JOIN movies m ON m.id=s.movie_id
      JOIN halls  h ON h.id=s.hall_id
      WHERE s.id=$1
    `, [req.params.id]);
    if (!sr.rows[0]) return res.status(404).json({ error: 'Сеанс табылмады' });
    const session = sr.rows[0];

    const seatsR = await pool.query('SELECT * FROM seats WHERE session_id=$1 ORDER BY seat_label', [req.params.id]);
    const seats = seatsR.rows;

    const seatMap = {};
    seats.forEach(s => {
      const row = s.seat_label[0];
      if (!seatMap[row]) seatMap[row] = [];
      seatMap[row].push(s);
    });

    const stats = {
      total:  seats.length,
      free:   seats.filter(s => !s.is_booked).length,
      booked: seats.filter(s => s.is_booked).length,
    };

    res.json({ session, stats, seatMap });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function createSession(req, res) {
  try {
    const { movie_id, hall_id, date_time, price } = req.body;
    if (!movie_id || !hall_id || !date_time || !price)
      return res.status(400).json({ error: 'Барлық өрістер міндетті' });

    const hallR = await pool.query('SELECT * FROM halls WHERE id=$1', [hall_id]);
    if (!hallR.rows[0]) return res.status(404).json({ error: 'Зал табылмады' });
    const hall = hallR.rows[0];

    const movR = await pool.query('SELECT id FROM movies WHERE id=$1 AND is_active=TRUE', [movie_id]);
    if (!movR.rows[0]) return res.status(404).json({ error: 'Фильм табылмады' });

    const sessR = await pool.query(
      'INSERT INTO sessions (movie_id,hall_id,date_time,price) VALUES ($1,$2,$3,$4) RETURNING id',
      [movie_id, hall_id, date_time, price]
    );
    const sid = sessR.rows[0].id;

    // Орындарды жасау
    const seatInserts = [];
    for (let r = 1; r <= hall.rows; r++) {
      for (let c = 1; c <= hall.cols; c++) {
        const label = String.fromCharCode(64 + r) + c;
        const type  = r === 1 ? 'vip' : r === parseInt(hall.rows) ? 'couple' : 'standard';
        seatInserts.push(`(${sid}, '${label}', '${type}')`);
      }
    }
    await pool.query(`INSERT INTO seats (session_id, seat_label, seat_type) VALUES ${seatInserts.join(',')}`);

    res.status(201).json({ message: 'Сеанс жасалды!', sessionId: sid, seatsCreated: hall.rows * hall.cols });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function deleteSession(req, res) {
  try {
    const r = await pool.query('SELECT id FROM sessions WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Сеанс табылмады' });
    await pool.query('DELETE FROM sessions WHERE id=$1', [req.params.id]);
    res.json({ message: 'Сеанс өшірілді' });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function getHalls(req, res) {
  try {
    const r = await pool.query('SELECT * FROM halls ORDER BY id');
    res.json(r.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
}

module.exports = { getAllSessions, getSeats, createSession, updateSession, deleteSession, getHalls };

async function updateSession(req, res) {
  try {
    const { movie_id, hall_id, date_time, price } = req.body;
    const id = req.params.id;
    if (!movie_id || !hall_id || !date_time || !price)
      return res.status(400).json({ error: 'Барлық өрістер міндетті' });

    const r = await pool.query('SELECT id FROM sessions WHERE id=$1', [id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Сеанс табылмады' });

    await pool.query(
      'UPDATE sessions SET movie_id=$1, hall_id=$2, date_time=$3, price=$4 WHERE id=$5',
      [movie_id, hall_id, date_time, price, id]
    );
    res.json({ message: 'Сеанс жаңартылды!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
}
