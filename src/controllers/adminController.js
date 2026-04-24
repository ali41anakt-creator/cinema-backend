const pool = require('../../db/database');

async function getStats(req, res) {
  try {
    const [users, movies, sessions, tickets, revenue] = await Promise.all([
      pool.query('SELECT COUNT(*) AS c FROM users'),
      pool.query('SELECT COUNT(*) AS c FROM movies WHERE is_active=TRUE'),
      pool.query('SELECT COUNT(*) AS c FROM sessions'),
      pool.query("SELECT COUNT(*) AS c FROM tickets WHERE status='active'"),
      pool.query("SELECT COALESCE(SUM(price),0) AS c FROM tickets WHERE status='active'"),
    ]);
    res.json({
      users:    parseInt(users.rows[0].c),
      movies:   parseInt(movies.rows[0].c),
      sessions: parseInt(sessions.rows[0].c),
      tickets:  parseInt(tickets.rows[0].c),
      revenue:  parseFloat(revenue.rows[0].c),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

// GET /api/admin/users — барлық пайдаланушылар (баланспен)
async function getUsers(req, res) {
  try {
    const r = await pool.query(
      'SELECT id, name, email, role, balance, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: r.rows.map(u => ({ ...u, balance: parseFloat(u.balance) })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

// POST /api/admin/payment — пайдаланушыға ақша жіберу
async function sendPayment(req, res) {
  const { user_id, amount, note } = req.body;
  const adminId = req.session.userId;

  if (!user_id || !amount || parseFloat(amount) <= 0)
    return res.status(400).json({ error: 'user_id және оң amount міндетті' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userR = await client.query('SELECT id, name, balance FROM users WHERE id=$1 AND role=$2', [user_id, 'user']);
    if (!userR.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Пайдаланушы табылмады' }); }

    const amt = parseFloat(amount);

    // Балансты жаңарту
    await client.query('UPDATE users SET balance = balance + $1 WHERE id=$2', [amt, user_id]);

    // Транзакция жазу
    await client.query(
      'INSERT INTO payments (admin_id, user_id, amount, note) VALUES ($1,$2,$3,$4)',
      [adminId, user_id, amt, note || '']
    );

    const updatedR = await client.query('SELECT balance FROM users WHERE id=$1', [user_id]);
    await client.query('COMMIT');

    res.json({
      message: `${userR.rows[0].name} аккаунтына ${amt.toLocaleString()} тг сәтті жіберілді!`,
      newBalance: parseFloat(updatedR.rows[0].balance)
    });
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
}

// GET /api/admin/payments — барлық төлем тарихы
async function getPayments(req, res) {
  try {
    const r = await pool.query(`
      SELECT p.id, p.amount, p.note, p.created_at,
             a.name AS admin_name,
             u.name AS user_name, u.email AS user_email
      FROM payments p
      JOIN users a ON a.id = p.admin_id
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC LIMIT 200
    `);
    res.json({ payments: r.rows.map(p => ({ ...p, amount: parseFloat(p.amount) })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

module.exports = { getStats, getUsers, sendPayment, getPayments };
