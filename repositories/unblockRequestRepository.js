const db = require('../config/databaseConfig');

const unblockRequestRepository = {
  async create(userId, domainId, durationMinutes, reason) {
    const { rows } = await db.query(
      `INSERT INTO unblock_requests (user_id, domain_id, duration_minutes, request_reason, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [userId, domainId, durationMinutes, reason]
    );
    return rows[0];
  },

  async findById(requestId) {
    const { rows } = await db.query(
      `SELECT ur.*, u.email as user_email, u.name as user_name, bd.domain 
       FROM unblock_requests ur
       JOIN users u ON ur.user_id = u.id
       JOIN blocked_domains bd ON ur.domain_id = bd.id
       WHERE ur.id = $1`,
      [requestId]
    );
    return rows[0];
  },

  async findByUserId(userId, statusFilter = null) {
    let query = `
      SELECT ur.*, bd.domain 
      FROM unblock_requests ur
      JOIN blocked_domains bd ON ur.domain_id = bd.id
      WHERE ur.user_id = $1
    `;
    const params = [userId];

    if (statusFilter) {
      params.push(statusFilter);
      query += ` AND ur.status = $2`;
    }

    query += ` ORDER BY ur.created_at DESC`;

    const { rows } = await db.query(query, params);
    return rows;
  },

  async updateStatus(requestId, status) {
    const { rows } = await db.query(
      `UPDATE unblock_requests 
       SET status = $1, responded_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [status, requestId]
    );
    return rows[0];
  },

  async deleteExpiredPending(hours = 24) {
    const { rowCount } = await db.query(
      `DELETE FROM unblock_requests 
       WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour' * $1`,
      [hours]
    );
    return rowCount;
  }
};

module.exports = unblockRequestRepository;
