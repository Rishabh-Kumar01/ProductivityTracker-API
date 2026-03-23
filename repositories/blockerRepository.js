const db = require('../db');

class BlockerRepository {
  async getDomains(userId, search = '', limit = 50, offset = 0) {
    const query = `
      SELECT id, domain, source, temp_unblock_until, created_at,
             (temp_unblock_until IS NULL OR temp_unblock_until < NOW()) AS is_blocking
      FROM blocked_domains
      WHERE user_id = $1 AND is_active = TRUE AND domain ILIKE $2
      ORDER BY domain ASC
      LIMIT $3 OFFSET $4
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM blocked_domains
      WHERE user_id = $1 AND is_active = TRUE AND domain ILIKE $2
    `;
    const searchPattern = `%${search}%`;
    const [dataRes, countRes] = await Promise.all([
      db.query(query, [userId, searchPattern, limit, offset]),
      db.query(countQuery, [userId, searchPattern])
    ]);
    return {
      domains: dataRes.rows,
      total: parseInt(countRes.rows[0].total, 10)
    };
  }

  async addDomains(userId, domains, sourceName = 'manual') {
    if (!domains || domains.length === 0) return 0;
    
    // Chunk imports in pg if large, but unnest is usually preferred pg practice
    // Using unnest array approach:
    const query = `
      INSERT INTO blocked_domains (user_id, domain, source)
      SELECT $1, t.domain, $2
      FROM unnest($3::varchar[]) AS t(domain)
      ON CONFLICT (user_id, domain) DO NOTHING
    `;
    const res = await db.query(query, [userId, sourceName, domains]);
    return res.rowCount;
  }

  async removeDomain(id, userId) {
    const res = await db.query(
      'DELETE FROM blocked_domains WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return res.rows[0];
  }

  async removeDomainsBySource(userId, sourceName) {
    const res = await db.query(
      'DELETE FROM blocked_domains WHERE user_id = $1 AND source = $2',
      [userId, sourceName]
    );
    return res.rowCount;
  }

  async tempUnblockDomain(id, userId, minutes) {
    const res = await db.query(
      `UPDATE blocked_domains 
       SET temp_unblock_until = NOW() + INTERVAL '1 minute' * $1 
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [minutes, id, userId]
    );
    return res.rows[0];
  }

  // Sources
  async getSources(userId) {
    const res = await db.query(
      'SELECT * FROM blocklist_sources WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    return res.rows;
  }

  async addSource(userId, name, url) {
    const res = await db.query(
      `INSERT INTO blocklist_sources (user_id, name, url)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, name) DO UPDATE SET url = EXCLUDED.url
       RETURNING *`,
      [userId, name, url]
    );
    return res.rows[0];
  }

  async updateSourceCount(userId, name, count) {
    await db.query(
      `UPDATE blocklist_sources 
       SET domain_count = $1, last_updated = NOW() 
       WHERE user_id = $2 AND name = $3`,
      [count, userId, name]
    );
  }

  async removeSource(id, userId) {
    const res = await db.query(
      'DELETE FROM blocklist_sources WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return res.rows[0];
  }

  async getSourceById(id, userId) {
    const res = await db.query(
      'SELECT * FROM blocklist_sources WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return res.rows[0];
  }
}

module.exports = new BlockerRepository();
