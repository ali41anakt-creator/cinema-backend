const pool = require('./database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        name       TEXT    NOT NULL,
        email      TEXT    NOT NULL UNIQUE,
        password   TEXT    NOT NULL,
        role       TEXT    NOT NULL DEFAULT 'user',
        balance    NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id          SERIAL PRIMARY KEY,
        title       TEXT    NOT NULL,
        description TEXT    DEFAULT '',
        genre       TEXT    NOT NULL,
        duration    INTEGER NOT NULL,
        rating      NUMERIC(3,1) DEFAULT 0,
        year        INTEGER DEFAULT 2025,
        director    TEXT    DEFAULT '',
        age_limit   TEXT    DEFAULT '12+',
        emoji       TEXT    DEFAULT '🎬',
        poster_url  TEXT    DEFAULT '',
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS halls (
        id        SERIAL PRIMARY KEY,
        name      TEXT    NOT NULL,
        rows      INTEGER NOT NULL DEFAULT 7,
        cols      INTEGER NOT NULL DEFAULT 9,
        hall_type TEXT    DEFAULT 'standard'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id        SERIAL PRIMARY KEY,
        movie_id  INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
        hall_id   INTEGER NOT NULL REFERENCES halls(id),
        date_time TIMESTAMPTZ NOT NULL,
        price     NUMERIC(10,2) NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS seats (
        id         SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        seat_label TEXT    NOT NULL,
        seat_type  TEXT    DEFAULT 'standard',
        is_booked  BOOLEAN DEFAULT FALSE,
        UNIQUE(session_id, seat_label)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        session_id INTEGER NOT NULL REFERENCES sessions(id),
        seat_id    INTEGER NOT NULL UNIQUE REFERENCES seats(id),
        price      NUMERIC(10,2) NOT NULL,
        status     TEXT    DEFAULT 'active',
        code       TEXT    NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id         SERIAL PRIMARY KEY,
        admin_id   INTEGER NOT NULL REFERENCES users(id),
        user_id    INTEGER NOT NULL REFERENCES users(id),
        amount     NUMERIC(12,2) NOT NULL,
        note       TEXT    DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Залдарды жүктеу (егер жоқ болса)
    const hallCount = await client.query('SELECT COUNT(*) FROM halls');
    if (parseInt(hallCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO halls (name, rows, cols, hall_type) VALUES
          ('Зал 1 — IMAX',     8, 10, 'imax'),
          ('Зал 2 — Стандарт', 7,  9, 'standard'),
          ('Зал 3 — VIP',      5,  8, 'vip'),
          ('Зал 4 — 4DX',      6, 10, '4dx')
      `);
    }

    await client.query('COMMIT');
    console.log('✅ Миграция сәтті аяқталды');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Миграция қатесі:', e.message);
    throw e;
  } finally {
    client.release();
  }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));
