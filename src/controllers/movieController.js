const pool = require('../../db/database');
const { validationResult } = require('express-validator');

async function getAllMovies(req, res) {
  try {
    const { search, genre } = req.query;
    let query = 'SELECT * FROM movies WHERE is_active=TRUE';
    const params = [];
    let i = 1;
    if (search) { query += ` AND title ILIKE $${i++}`; params.push(`%${search}%`); }
    if (genre)  { query += ` AND genre=$${i++}`;       params.push(genre); }
    query += ' ORDER BY created_at DESC';
    const r = await pool.query(query, params);
    res.json({ count: r.rows.length, movies: r.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function getGenres(req, res) {
  try {
    const r = await pool.query('SELECT DISTINCT genre FROM movies WHERE is_active=TRUE ORDER BY genre');
    res.json(r.rows.map(g => g.genre));
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function getMovieById(req, res) {
  try {
    const r = await pool.query('SELECT * FROM movies WHERE id=$1 AND is_active=TRUE', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Фильм табылмады' });
    const movie = r.rows[0];

    const sr = await pool.query(`
      SELECT s.*, h.name AS hall_name, h.hall_type,
             COUNT(CASE WHEN seats.is_booked=FALSE THEN 1 END) AS free_seats
      FROM sessions s
      JOIN halls h ON h.id=s.hall_id
      LEFT JOIN seats ON seats.session_id=s.id
      WHERE s.movie_id=$1
      GROUP BY s.id, h.name, h.hall_type
      ORDER BY s.date_time
    `, [req.params.id]);

    res.json({ ...movie, sessions: sr.rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function createMovie(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, genre, duration, rating, year, director, age_limit, emoji, poster_url } = req.body;
    const r = await pool.query(`
      INSERT INTO movies (title,description,genre,duration,rating,year,director,age_limit,emoji,poster_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [title, description||'', genre, duration, rating||0, year||2025, director||'', age_limit||'12+', emoji||'🎬', poster_url||'']);

    res.status(201).json({ message: 'Фильм сәтті қосылды!', movie: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function updateMovie(req, res) {
  try {
    const mv = await pool.query('SELECT * FROM movies WHERE id=$1', [req.params.id]);
    if (!mv.rows[0]) return res.status(404).json({ error: 'Фильм табылмады' });
    const m = mv.rows[0];
    const { title, description, genre, duration, rating, year, director, age_limit, emoji, poster_url } = req.body;

    const r = await pool.query(`
      UPDATE movies SET title=$1,description=$2,genre=$3,duration=$4,
        rating=$5,year=$6,director=$7,age_limit=$8,emoji=$9,poster_url=$10
      WHERE id=$11 RETURNING *
    `, [
      title||m.title, description!==undefined?description:m.description,
      genre||m.genre, duration||m.duration,
      rating!==undefined?rating:m.rating, year||m.year,
      director!==undefined?director:m.director, age_limit||m.age_limit,
      emoji||m.emoji, poster_url!==undefined?poster_url:m.poster_url,
      req.params.id
    ]);
    res.json({ message: 'Фильм жаңартылды', movie: r.rows[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

async function deleteMovie(req, res) {
  try {
    const mv = await pool.query('SELECT title FROM movies WHERE id=$1', [req.params.id]);
    if (!mv.rows[0]) return res.status(404).json({ error: 'Фильм табылмады' });
    await pool.query('UPDATE movies SET is_active=FALSE WHERE id=$1', [req.params.id]);
    res.json({ message: `"${mv.rows[0].title}" өшірілді` });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

module.exports = { getAllMovies, getGenres, getMovieById, createMovie, updateMovie, deleteMovie };
