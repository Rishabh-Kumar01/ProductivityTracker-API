const express = require('express');
const exportController = require('../controllers/exportController');
const { protect } = require('../middleware/auth');
const { ownerOnly } = require('../middleware/partnerAccess');

const router = express.Router();

router.use(protect);
router.use(ownerOnly);
router.get('/csv', exportController.csv);

module.exports = router;
