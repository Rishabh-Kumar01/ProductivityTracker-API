const activityRepository = require('../repositories/activityRepository');
const AppError = require('../utils/error');

const activityService = {
  async bulkUpload(userId, activities) {
    if (!Array.isArray(activities) || activities.length === 0) {
      throw new AppError('Activities array is required and cannot be empty.', 400);
    }
    if (activities.length > 500) {
      throw new AppError('Maximum 500 activities per batch.', 400);
    }

    // Validate each activity
    for (const act of activities) {
      if (!act.appName || !act.startTime || !act.endTime) {
        throw new AppError('Each activity must have appName, startTime, and endTime.', 400);
      }
    }

    const insertedIds = await activityRepository.bulkInsert(userId, activities);
    return { insertedCount: insertedIds.length };
  },

  async getActivities(userId, options) {
    return activityRepository.getActivitiesPaginated(userId, options);
  },

  async searchActivities(userId, query, limit) {
    if (!query) throw new AppError('Search query is required.', 400);
    return activityRepository.searchActivities(userId, query, limit);
  },
};

module.exports = activityService;
