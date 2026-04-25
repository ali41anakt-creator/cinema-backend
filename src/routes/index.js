const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const router  = express.Router();
const { body } = require('express-validator');

const authCtrl    = require('../controllers/authController');
const movieCtrl   = require('../controllers/movieController');
const sessCtrl    = require('../controllers/sessionController');
const ticketCtrl  = require('../controllers/ticketController');
const adminCtrl   = require('../controllers/adminController');
const { requireLogin, requireAdmin } = require('../middleware/auth');

// ── AUTH ────────────────────────────────────────────────────
router.post('/auth/register',
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })],
  authCtrl.register
);
router.post('/auth/login',
  [body('email').isEmail(), body('password').notEmpty()],
  authCtrl.login
);
router.post('/auth/logout', authCtrl.logout);
router.get('/auth/me', requireLogin, authCtrl.getMe);

// ── MOVIES ──────────────────────────────────────────────────
router.get('/movies/genres',  movieCtrl.getGenres);
router.get('/movies',         movieCtrl.getAllMovies);
router.get('/movies/:id',     movieCtrl.getMovieById);
router.post('/movies', requireLogin, requireAdmin,
  [body('title').notEmpty(), body('genre').notEmpty(), body('duration').isInt({ min: 1 })],
  movieCtrl.createMovie
);
router.put('/movies/:id',    requireLogin, requireAdmin, movieCtrl.updateMovie);
router.delete('/movies/:id', requireLogin, requireAdmin, movieCtrl.deleteMovie);

// ── SESSIONS ────────────────────────────────────────────────
router.get('/sessions',            sessCtrl.getAllSessions);
router.get('/sessions/:id/seats',  sessCtrl.getSeats);
router.get('/halls',               sessCtrl.getHalls);
router.post('/sessions',    requireLogin, requireAdmin, sessCtrl.createSession);
router.put('/sessions/:id', requireLogin, requireAdmin, sessCtrl.updateSession);
router.delete('/sessions/:id', requireLogin, requireAdmin, sessCtrl.deleteSession);

// ── TICKETS ─────────────────────────────────────────────────
router.post('/tickets/book',          requireLogin, ticketCtrl.bookTicket);
router.get('/tickets/my',             requireLogin, ticketCtrl.getMyTickets);
router.delete('/tickets/:id/cancel',  requireLogin, ticketCtrl.cancelTicket);
router.get('/tickets/all',            requireLogin, requireAdmin, ticketCtrl.getAllTickets);

// ── ADMIN ───────────────────────────────────────────────────
router.get('/admin/stats',    requireLogin, requireAdmin, adminCtrl.getStats);
router.get('/admin/users',    requireLogin, requireAdmin, adminCtrl.getUsers);
router.post('/admin/payment', requireLogin, requireAdmin, adminCtrl.sendPayment);
router.get('/admin/payments', requireLogin, requireAdmin, adminCtrl.getPayments);

// ── PHOTO UPLOAD ─────────────────────────────────────────────
// POST /api/upload/movie-photo/:id  (тек админ, base64 арқылы)
router.post('/upload/movie-photo/:id', requireLogin, requireAdmin, async (req, res) => {
  try {
    const { imageData, mimeType } = req.body;
    if (!imageData) return res.status(400).json({ error: 'imageData міндетті' });

    // Тек рұқсат етілген форматтар
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const mime = mimeType || 'image/jpeg';
    if (!allowedMimes.includes(mime)) return res.status(400).json({ error: 'Тек JPG, PNG, WebP, GIF рұқсат етілген' });

    const ext   = mime.split('/')[1].replace('jpeg', 'jpg');
    const fname = 'movie_' + req.params.id + '_' + Date.now() + '.' + ext;
    const upDir = path.join(__dirname, '..', '..', 'public', 'uploads');
    const fpath = path.join(upDir, fname);

    // Uploads қалтасын жасау (жоқ болса)
    if (!fs.existsSync(upDir)) fs.mkdirSync(upDir, { recursive: true });

    // Base64 декод → файл
    const base64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    fs.writeFileSync(fpath, Buffer.from(base64, 'base64'));

    // Ескі суретті өшіру (жаңасын жүктегенде)
    const pool = require('../../db/database');
    const old = await pool.query('SELECT poster_url FROM movies WHERE id=$1', [req.params.id]);
    if (old.rows[0] && old.rows[0].poster_url) {
      const oldPath = path.join(__dirname, '..', '..', 'public', old.rows[0].poster_url);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch(e) { /* ескіні өшіру сәтсіз болса, жалғастыру */ }
      }
    }

    const publicUrl = '/uploads/' + fname;
    await pool.query('UPDATE movies SET poster_url=$1 WHERE id=$2', [publicUrl, req.params.id]);

    res.json({ message: 'Фото сәтті жүктелді!', url: publicUrl });
  } catch(e) {
    console.error('Photo upload error:', e);
    res.status(500).json({ error: 'Фото жүктеу қатесі: ' + e.message });
  }
});

module.exports = router;
