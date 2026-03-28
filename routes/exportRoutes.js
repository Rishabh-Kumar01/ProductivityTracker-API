const express = require('express');
const exportController = require('../controllers/exportController');
const { protect } = require('../middleware/auth');
const { partnerAccess } = require('../middleware/partnerAccess');

const router = express.Router();

router.use(protect);
router.use(partnerAccess);
router.get('/csv', exportController.csv);

module.exports = router;
