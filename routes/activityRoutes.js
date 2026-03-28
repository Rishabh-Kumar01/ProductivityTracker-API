const express = require('express');
const activityController = require('../controllers/activityController');
const { protect } = require('../middleware/auth');
const { partnerAccess, ownerOnly } = require('../middleware/partnerAccess');

const router = express.Router();

// All activity routes require authentication
router.use(protect);

// POST /api/activities/bulk — Upload activities batch (owner only — macOS client)
router.post('/bulk', ownerOnly, activityController.bulkUpload);

// GET /api/activities — Get paginated activities (partner can view)
router.get('/', partnerAccess, activityController.getActivities);

// GET /api/activities/search — Full-text search (partner can view)
router.get('/search', partnerAccess, activityController.search);

module.exports = router;
