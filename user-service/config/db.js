const { Pool } = require('pg');

// Connects to your local PostgreSQL
const pool = new Pool({
  user: 'useradmin',
  host: 'localhost',
  database: 'user_service_db',
  password: 'userpass',
  port: 5432,
});

// A simple dummy user to query
(async () => {
  try {
    const client = await pool.connect();
    console.log('[User DB] Connected to local PostgreSQL.');

    // --- FIX APPLIED HERE ---
    // Changed from DROP TABLE to CREATE TABLE IF NOT EXISTS.
    // This is now idempotent and will NOT delete your data on restart.
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL
      )
    `);
    
    // --- IDEMPOTENT SEEDING ---
    // Now, we check if the table is empty *before* adding "Alice".
    // This prevents creating "Alice 2", "Alice 3", etc. on every restart.
    const { rows } = await client.query('SELECT COUNT(*) FROM users');
    
    if (rows[0].count === '0') {
      await client.query("INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')");
      console.log('[User DB] "users" table created and initial user "Alice" seeded.');
    } else {
      console.log('[User DB] "users" table already exists with data. Skipping seed.');
    }
    
    client.release();
    console.log('[User DB] PostgreSQL database and table verified.');
  } catch (err) {
    console.error('[User DB] Error initializing local database.', err);
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params),
};
