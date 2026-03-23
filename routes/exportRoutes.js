const express = require('express');
const exportController = require('../controllers/exportController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/csv', exportController.csv);

module.exports = router;
