const summaryService = require('../services/summaryService');

class SummaryController {
  getDaily = async (req, res, next) => {
    try {
      const { date } = req.query; // YYYY-MM-DD
      const summary = await summaryService.getDailySummary(req.targetUserId, date);
      res.status(200).json({ status: 'success', data: summary });
    } catch (err) {
      next(err);
    }
  };

  getWeekly = async (req, res, next) => {
    try {
      const { date } = req.query; // YYYY-MM-DD reference point
      const summary = await summaryService.getWeeklySummary(req.targetUserId, date);
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
      const summary = await summaryService.getRangeSummary(req.targetUserId, start, end);
      res.status(200).json({ status: 'success', data: summary });
    } catch (err) {
      next(err);
    }
  };

  getHourly = async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      const hourly = await summaryService.getHourlySummary(req.targetUserId, startDate, endDate);
      res.status(200).json({ status: 'success', data: hourly });
    } catch (err) {
      next(err);
    }
  };

  getWebsites = async (req, res, next) => {
    try {
      const { date, startDate, endDate } = req.query;
      let start, end;
      if (date) {
        start = new Date(`${date}T00:00:00Z`);
        end = new Date(`${date}T23:59:59.999Z`);
      } else if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        return next(new AppError('date or startDate/endDate required', 400));
      }
      const websites = await summaryService.getWebsites(req.targetUserId, start, end);
      res.status(200).json({ status: 'success', data: websites });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new SummaryController();
