const db = require('../config/databaseConfig');

const activityRepository = {
  async bulkInsert(userId, activities) {
    if (!activities.length) return [];

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const inserted = [];
      for (const act of activities) {
        const { rows } = await client.query(
          `INSERT INTO activities (user_id, app_name, bundle_id, window_title, url, category, productivity_score, start_time, end_time, is_idle)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [
            userId,
            act.appName,
            act.bundleId || null,
            act.windowTitle || null,
            act.url || null,
            act.category || 'Uncategorized',
            act.productivityScore || 2,
            act.startTime,
            act.endTime,
            act.isIdle || false,
          ]
        );
        if (rows[0]) inserted.push(rows[0].id);
      }

      await client.query('COMMIT');
      return inserted;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getActivitiesPaginated(userId, { cursor, limit = 50, category, appName }) {
    let query = 'SELECT * FROM activities WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (cursor) {
      query += ` AND start_time < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (appName) {
      query += ` AND app_name = $${paramIndex}`;
      params.push(appName);
      paramIndex++;
    }

    query += ' ORDER BY start_time DESC';
    query += ` LIMIT $${paramIndex}`;
    params.push(limit);

    const { rows } = await db.query(query, params);
    return rows;
  },

  async searchActivities(userId, searchQuery, limit = 50) {
    const { rows } = await db.query(
      `SELECT * FROM activities 
       WHERE user_id = $1 AND search_vector @@ plainto_tsquery('english', $2)
       ORDER BY start_time DESC LIMIT $3`,
      [userId, searchQuery, limit]
    );
    return rows;
  },
};

module.exports = activityRepository;
