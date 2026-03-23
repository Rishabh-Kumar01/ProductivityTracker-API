const db = require('../config/databaseConfig');

const userRepository = {
  async upsertByEmail(email) {
    const { rows } = await db.query(
      `INSERT INTO users (email) VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [email]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  }
};

module.exports = userRepository;
