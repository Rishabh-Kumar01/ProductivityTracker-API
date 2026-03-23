const db = require('../config/databaseConfig');

const otpRepository = {
  async create(email, otpHash, expiresAt) {
    const { rows } = await db.query(
      `INSERT INTO otp_codes (email, otp_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [email, otpHash, expiresAt]
    );
    return rows[0];
  },

  async findValid(email) {
    const { rows } = await db.query(
      `SELECT * FROM otp_codes 
       WHERE email = $1 AND expires_at > NOW() AND attempts < 5
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async incrementAttempts(id) {
    await db.query(
      'UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1',
      [id]
    );
  },

  async deleteForEmail(email) {
    await db.query('DELETE FROM otp_codes WHERE email = $1', [email]);
  },

  async findLatestByEmail(email) {
    const { rows } = await db.query(
      `SELECT * FROM otp_codes WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  }
};

module.exports = otpRepository;
