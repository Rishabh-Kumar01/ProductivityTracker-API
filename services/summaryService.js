const summaryRepository = require('../repositories/summaryRepository');
const AppError = require('../utils/error');

const summaryService = {
  async getDailySummary(userId, dateString) {
    // dateString expected format: YYYY-MM-DD
    if (!dateString) throw new AppError('Date is required', 400);

    const startDate = new Date(`${dateString}T00:00:00Z`);
    const endDate = new Date(`${dateString}T23:59:59.999Z`);
    
    return this.getRangeSummary(userId, startDate, endDate);
  },

  async getWeeklySummary(userId, dateString) {
    if (!dateString) throw new AppError('Date is required', 400);

    const refDate = new Date(`${dateString}T00:00:00Z`);
    // Find previous Monday
    const day = refDate.getUTCDay();
    const diff = refDate.getUTCDate() - day + (day === 0 ? -6 : 1);
    const startDate = new Date(refDate.setUTCDate(diff));
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);
    endDate.setUTCHours(23, 59, 59, 999);

    return this.getRangeSummary(userId, startDate, endDate);
  },

  async getRangeSummary(userId, startDate, endDate) {
    const rawData = await summaryRepository.getSummary(userId, startDate, endDate);
    
    let totalSeconds = 0;
    let totalScoreWeighted = 0;

    const apps = rawData.map(row => {
      totalSeconds += row.duration_seconds;
      totalScoreWeighted += row.duration_seconds * parseFloat(row.avg_score);
      return {
        app_name: row.app_name,
        category: row.category,
        duration_seconds: row.duration_seconds,
        avg_score: parseFloat(row.avg_score).toFixed(2)
      };
    });

    const productivityPulse = totalSeconds > 0 ? Math.round((totalScoreWeighted / totalSeconds) * 10) / 10 : 0;
    
    // Group by category
    const categories = apps.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.duration_seconds;
      return acc;
    }, {});

    return {
      total_duration_seconds: totalSeconds,
      productivity_pulse: productivityPulse,
      top_apps: apps.slice(0, 10),
      all_apps: apps,
      category_breakdown: categories
    };
  },

  async getHourlySummary(userId, startDateString, endDateString) {
    if (!startDateString || !endDateString) throw new AppError('startDate and endDate required', 400);
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    return summaryRepository.getHourlyPattern(userId, startDate, endDate);
  }
};

module.exports = summaryService;
