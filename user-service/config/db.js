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

    // Setup DB (this is idempotent)
    await client.query('CREATE TABLE IF NOT EXISTS users (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100))');
    
    // Add default user if not present (prevents error on restart)
    await client.query("INSERT INTO users (id, name) VALUES ('1', 'Alice') ON CONFLICT (id) DO NOTHING");
    
    client.release();
    console.log('[User DB] PostgreSQL database and table initialized.');
  } catch (err) {
    console.error('[User DB] Error initializing local database.', err);
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params),
};