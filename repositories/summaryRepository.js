const db = require('../config/databaseConfig');

const summaryRepository = {
  async getSummary(userId, startDate, endDate) {
    const { rows } = await db.query(
      `SELECT
         app_name,
         category,
         SUM(EXTRACT(EPOCH FROM (end_time - start_time)))::INT AS duration_seconds,
         AVG(productivity_score) AS avg_score
       FROM activities
       WHERE user_id = $1 AND start_time >= $2 AND end_time <= $3 AND is_idle = FALSE
       GROUP BY app_name, category
       ORDER BY duration_seconds DESC`,
      [userId, startDate, endDate]
    );
    return rows;
  },

  async getHourlyPattern(userId, startDate, endDate) {
    const { rows } = await db.query(
      `SELECT
         DATE_TRUNC('hour', start_time) AS hour_bucket,
         SUM(CASE WHEN productivity_score >= 3 THEN EXTRACT(EPOCH FROM (end_time - start_time)) ELSE 0 END)::INT AS productive_seconds,
         SUM(CASE WHEN productivity_score = 2 THEN EXTRACT(EPOCH FROM (end_time - start_time)) ELSE 0 END)::INT AS neutral_seconds,
         SUM(CASE WHEN productivity_score <= 1 THEN EXTRACT(EPOCH FROM (end_time - start_time)) ELSE 0 END)::INT AS distracting_seconds,
         SUM(EXTRACT(EPOCH FROM (end_time - start_time)))::INT AS active_seconds,
         AVG(productivity_score) AS avg_score
       FROM activities
       WHERE user_id = $1 AND start_time >= $2 AND end_time <= $3 AND is_idle = FALSE
       GROUP BY hour_bucket
       ORDER BY hour_bucket ASC`,
      [userId, startDate, endDate]
    );
    return rows;
  },

  async getWebsites(userId, startDate, endDate) {
    const { rows } = await db.query(
      `SELECT
         domain,
         category,
         AVG(productivity_score)::INTEGER as avg_score,
         SUM(EXTRACT(EPOCH FROM (end_time - start_time)))::INT as total_duration,
         COUNT(*) as visit_count
       FROM activities
       WHERE user_id = $1
         AND domain IS NOT NULL AND domain != ''
         AND start_time >= $2 AND start_time < $3
         AND is_idle = FALSE
       GROUP BY domain, category
       ORDER BY total_duration DESC
       LIMIT 50`,
      [userId, startDate, endDate]
    );
    return rows;
  }
};

module.exports = summaryRepository;
