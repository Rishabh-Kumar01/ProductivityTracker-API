const db = require('../config/databaseConfig');

const alertRepository = {
  async getAll(userId) {
    const { rows } = await db.query(
      'SELECT * FROM alert_rules WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  async create(userId, { matchType, pattern, limitMinutes, autoBlock }) {
    const { rows } = await db.query(
      `INSERT INTO alert_rules (user_id, match_type, pattern, limit_minutes, auto_block)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, matchType, pattern, limitMinutes, autoBlock]
    );
    return rows[0];
  },

  async update(id, userId, { matchType, pattern, limitMinutes, autoBlock }) {
    const { rows } = await db.query(
      `UPDATE alert_rules
       SET match_type = $1, pattern = $2, limit_minutes = $3, auto_block = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [matchType, pattern, limitMinutes, autoBlock, id, userId]
    );
    return rows[0];
  },

  async delete(id, userId) {
    const { rowCount } = await db.query(
      'DELETE FROM alert_rules WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rowCount > 0;
  }
};

module.exports = alertRepository;
