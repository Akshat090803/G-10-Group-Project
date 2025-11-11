const db = require('../config/db');

const findAll = async () => {
  const { rows } = await db.query('SELECT * FROM users');
  return rows;
};

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
};

const create = async (id, name) => {
  const { rows } = await db.query(
    'INSERT INTO users (id, name) VALUES ($1, $2) RETURNING *',
    [id, name]
  );
  return rows[0];
};

module.exports = {
  findAll,
  findById,
  create,
};