const pool   = require('../../db/database');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

async function register(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Бұл email тіркелген' });

    const hash = bcrypt.hashSync(password, 10);
    const r = await pool.query(
      'INSERT INTO users (name,email,password) VALUES ($1,$2,$3) RETURNING id',
      [name, email, hash]
    );
    res.status(201).json({ message: 'Тіркелу сәтті!', userId: r.rows[0].id });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
}

async function login(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = r.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Email немесе пароль қате' });

    req.session.userId = user.id;
    req.session.name   = user.name;
    req.session.role   = user.role;

    res.json({
      message: `Қош келдіңіз, ${user.name}!`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: parseFloat(user.balance) }
    });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Сервер қатесі' });
  }
}

async function logout(req, res) {
  req.session.destroy();
  res.json({ message: 'Жүйеден шықтыңыз' });
}

async function getMe(req, res) {
  try {
    const r = await pool.query('SELECT id,name,email,role,balance FROM users WHERE id=$1', [req.session.userId]);
    if (!r.rows[0]) return res.status(401).json({ error: 'Сессия жоқ' });
    const u = r.rows[0];
    res.json({ ...u, balance: parseFloat(u.balance) });
  } catch(e) {
    res.status(500).json({ error: 'Сервер қатесі' });
  }
}

module.exports = { register, login, logout, getMe };
