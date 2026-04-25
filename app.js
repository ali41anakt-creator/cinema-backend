const express      = require('express');
const session      = require('express-session');
const cookieParser = require('cookie-parser');
const path         = require('path');
const fs           = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// uploads қалтасын автоматты жасау
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── MIDDLEWARE ──────────────────────────────────────────────
// МАҢЫЗДЫ: limit '20mb' — base64 фотолар үшін
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// ── СТАТИКАЛЫҚ ФАЙЛДАР ──────────────────────────────────────
// /uploads — суреттер үшін, cache жоқ (жаңа фото бірден көрінеді)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}, express.static(uploadsDir));

// Жалпы статика (public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── SESSION ─────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'corei9-cinema-2025-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 }
}));

// ── API ROUTES ──────────────────────────────────────────────
app.use('/api', require('./routes/index'));

// ── SPA FALLBACK ────────────────────────────────────────────
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
);

// ── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Сервер қатесі' });
});

// ── START ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎬 CoreI9 Cinema — http://localhost:${PORT}\n`);
  console.log(`📌 PostgreSQL: ${process.env.PG_HOST || 'localhost'}:${process.env.PG_PORT || 5432}/${process.env.PG_DB || 'cinema_db'}`);
  console.log(`📁 Uploads: ${uploadsDir}\n`);
});

module.exports = app;
