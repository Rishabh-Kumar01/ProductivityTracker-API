// We already have a fast CSV generation strategy using pg's output. But a simpler approach is fetching JSON and parsing.
const { parse } = require('json2csv');
const activityService = require('../services/activityService');
const AppError = require('../utils/error');

class ExportController {
  csv = async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) return next(new AppError('startDate and endDate required', 400));
      
      // Fetch data (using the existing search or paginated repo but we hack it for all data in range)
      // Since it's an export we can query the DB directly to get everything inside the range
      const db = require('../config/databaseConfig');
      const { rows } = await db.query(
        `SELECT app_name, window_title, url, category, productivity_score, start_time, end_time, is_idle
         FROM activities
         WHERE user_id = $1 AND start_time >= $2 AND end_time <= $3
         ORDER BY start_time ASC`,
        [req.user.id, startDate, endDate]
      );

      if (!rows.length) {
        return res.status(404).json({ status: 'fail', message: 'No data found in range' });
      }

      const csvData = parse(rows);
      res.header('Content-Type', 'text/csv');
      res.attachment('export.csv');
      res.send(csvData);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new ExportController();
