const db = require('../config/db');

const findAll = async () => {
  const { rows } = await db.query('SELECT * FROM users');
  return rows;
};

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
};

const findByEmail = async (email) => {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
};

const create = async (name, email, passwordHash) => {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password, is_email_verified, token_version, refresh_sessions) 
     VALUES ($1, $2, $3, false, 0, '[]'::jsonb) RETURNING *`,
    [name, email, passwordHash]
  );
  return rows[0];
};

const updateUser = async (id, fields) => {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  
  if (keys.length === 0) return null;

  const setString = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  values.push(id); // Add ID as the last parameter

  const { rows } = await db.query(
    `UPDATE users SET ${setString} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0];
};

module.exports = {
  findAll,
  findById,
  findByEmail,
  create,
  updateUser
};