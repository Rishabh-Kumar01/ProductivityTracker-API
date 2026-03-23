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
         SUM(EXTRACT(EPOCH FROM (end_time - start_time)))::INT AS active_seconds,
         AVG(productivity_score) AS avg_score
       FROM activities
       WHERE user_id = $1 AND start_time >= $2 AND end_time <= $3 AND is_idle = FALSE
       GROUP BY hour_bucket
       ORDER BY hour_bucket ASC`,
      [userId, startDate, endDate]
    );
    return rows;
  }
};

module.exports = summaryRepository;
