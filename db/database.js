const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB       || 'cinema_db',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

// Helper: синхронды-стильді интерфейс үшін async query wrapper
// Барлық жерде await db.query(sql, params) немесе db.queryOne(sql, params) қолданылады

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

module.exports = pool;
