const express = require('express');
const summaryController = require('../controllers/summaryController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/daily', summaryController.getDaily);
router.get('/weekly', summaryController.getWeekly);
router.get('/range', summaryController.getRange);
router.get('/hourly', summaryController.getHourly);
router.get('/websites', summaryController.getWebsites);

module.exports = router;
