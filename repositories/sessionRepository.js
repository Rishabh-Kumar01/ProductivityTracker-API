const db = require('../config/databaseConfig');

const sessionRepository = {
  async create({ userId, tokenHash, deviceName, os, ipAddress, expiresAt }) {
    const { rows } = await db.query(
      `INSERT INTO sessions (user_id, token_hash, device_name, os, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, tokenHash, deviceName, os, ipAddress, expiresAt]
    );
    return rows[0];
  },

  async findByTokenHash(tokenHash) {
    const { rows } = await db.query(
      `SELECT s.*, u.email, u.name FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = $1 AND s.is_revoked = FALSE AND s.expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  async enforceLimit(userId, maxSessions = 5) {
    // Count active sessions
    const { rows } = await db.query(
      `SELECT id FROM sessions 
       WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > NOW()
       ORDER BY last_active_at ASC`,
      [userId]
    );

    // Revoke oldest sessions if over limit
    if (rows.length >= maxSessions) {
      const toRevoke = rows.slice(0, rows.length - maxSessions + 1);
      const ids = toRevoke.map(r => r.id);
      await db.query(
        `UPDATE sessions SET is_revoked = TRUE WHERE id = ANY($1)`,
        [ids]
      );
    }
  },

  async revoke(sessionId, userId) {
    await db.query(
      'UPDATE sessions SET is_revoked = TRUE WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
  },

  async revokeAll(userId) {
    await db.query(
      'UPDATE sessions SET is_revoked = TRUE WHERE user_id = $1',
      [userId]
    );
  },

  async updateLastActive(sessionId) {
    await db.query(
      'UPDATE sessions SET last_active_at = NOW() WHERE id = $1',
      [sessionId]
    );
  },

  async getActiveSessions(userId) {
    const { rows } = await db.query(
      `SELECT id, device_name, os, ip_address, last_active_at, created_at
       FROM sessions
       WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > NOW()
       ORDER BY last_active_at DESC`,
      [userId]
    );
    return rows;
  }
};

module.exports = sessionRepository;
