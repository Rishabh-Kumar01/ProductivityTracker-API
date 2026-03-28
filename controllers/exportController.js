// CSV export strategy
const activityService = require('../services/activityService');
const AppError = require('../utils/error');

class ExportController {
  csv = async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) return next(new AppError('startDate and endDate required', 400));
      
      const db = require('../config/databaseConfig');
      const { rows } = await db.query(
        `SELECT app_name, window_title, url, domain, category, productivity_score, start_time, end_time, is_idle
         FROM activities
         WHERE user_id = $1 AND start_time >= $2 AND end_time <= $3
         ORDER BY start_time ASC`,
        [req.targetUserId, startDate, endDate]
      );

      if (!rows.length) {
        return res.status(404).json({ status: 'fail', message: 'No data found in range' });
      }

      // Manual CSV generation to force quotes and prevent corruption from commas in titles
      const headers = ['app_name', 'window_title', 'url', 'domain', 'category', 'productivity_score', 'start_time', 'end_time', 'is_idle'];
      
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '""';
        const str = String(value);
        // If string contains quotes, escape them by doubling them
        const escapedStr = str.replace(/"/g, '""');
        return `"${escapedStr}"`;
      };
      
      const csvLines = [headers.join(',')];
      
      for (const row of rows) {
        const line = headers.map(header => escapeCSV(row[header])).join(',');
        csvLines.push(line);
      }
      
      const csvData = csvLines.join('\n');

      res.header('Content-Type', 'text/csv');
      res.attachment('export.csv');
      res.send(csvData);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new ExportController();
