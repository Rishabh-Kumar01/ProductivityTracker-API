const alertService = require('../services/alertService');

class AlertController {
  getAll = async (req, res, next) => {
    try {
      const alerts = await alertService.getAlerts(req.targetUserId);
      res.status(200).json({ status: 'success', data: alerts });
    } catch (err) {
      next(err);
    }
  };

  create = async (req, res, next) => {
    try {
      const alert = await alertService.createAlert(req.targetUserId, req.body);
      res.status(201).json({ status: 'success', data: alert });
    } catch (err) {
      next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const alert = await alertService.updateAlert(req.params.id, req.targetUserId, req.body);
      res.status(200).json({ status: 'success', data: alert });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req, res, next) => {
    try {
      await alertService.deleteAlert(req.params.id, req.targetUserId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new AlertController();
