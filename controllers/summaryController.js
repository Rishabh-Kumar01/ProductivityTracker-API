const summaryService = require('../services/summaryService');

class SummaryController {
  getDaily = async (req, res, next) => {
    try {
      const { date } = req.query; // YYYY-MM-DD
      const summary = await summaryService.getDailySummary(req.user.id, date);
      res.status(200).json({ status: 'success', data: summary });
    } catch (err) {
      next(err);
    }
  };

  getWeekly = async (req, res, next) => {
    try {
      const { date } = req.query; // YYYY-MM-DD reference point
      const summary = await summaryService.getWeeklySummary(req.user.id, date);
      res.status(200).json({ status: 'success', data: summary });
    } catch (err) {
      next(err);
    }
  };

  getRange = async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const summary = await summaryService.getRangeSummary(req.user.id, start, end);
      res.status(200).json({ status: 'success', data: summary });
    } catch (err) {
      next(err);
    }
  };

  getHourly = async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      const hourly = await summaryService.getHourlySummary(req.user.id, startDate, endDate);
      res.status(200).json({ status: 'success', data: hourly });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new SummaryController();
