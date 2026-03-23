const alertRepository = require('../repositories/alertRepository');
const AppError = require('../utils/error');

const alertService = {
  async getAlerts(userId) {
    return alertRepository.getAll(userId);
  },

  async createAlert(userId, data) {
    if (!data.matchType || !data.pattern || !data.limitMinutes) {
      throw new AppError('Missing required fields for alert', 400);
    }
    return alertRepository.create(userId, data);
  },

  async updateAlert(id, userId, data) {
    const rule = await alertRepository.update(id, userId, data);
    if (!rule) throw new AppError('Alert rule not found', 404);
    return rule;
  },

  async deleteAlert(id, userId) {
    const deleted = await alertRepository.delete(id, userId);
    if (!deleted) throw new AppError('Alert rule not found', 404);
  }
};

module.exports = alertService;
