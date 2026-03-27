const express = require('express');
const activityController = require('../controllers/activityController');
const { protect } = require('../middleware/auth');
const { ownerOnly } = require('../middleware/partnerAccess');

const router = express.Router();

// All activity routes require authentication
router.use(protect);
router.use(ownerOnly);

// POST /api/activities/bulk — Upload activities batch
router.post('/bulk', activityController.bulkUpload);

// GET /api/activities — Get paginated activities
router.get('/', activityController.getActivities);

// GET /api/activities/search — Full-text search
router.get('/search', activityController.search);

module.exports = router;
