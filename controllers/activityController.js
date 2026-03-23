const activityService = require('../services/activityService');

class ActivityController {
  bulkUpload = async (req, res, next) => {
    try {
      const result = await activityService.bulkUpload(req.user.id, req.body.activities);
      res.status(201).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  };

  getActivities = async (req, res, next) => {
    try {
      const { cursor, limit, category, appName } = req.query;
      const activities = await activityService.getActivities(req.user.id, {
        cursor,
        limit: limit ? parseInt(limit) : 50,
        category,
        appName,
      });
      res.status(200).json({ status: 'success', data: activities });
    } catch (err) {
      next(err);
    }
  };

  search = async (req, res, next) => {
    try {
      const { q, limit } = req.query;
      const activities = await activityService.searchActivities(
        req.user.id,
        q,
        limit ? parseInt(limit) : 50
      );
      res.status(200).json({ status: 'success', data: activities });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new ActivityController();
