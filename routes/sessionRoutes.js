const express = require('express');
const sessionController = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', sessionController.getActiveSessions);
router.delete('/:id', sessionController.revokeSession);
router.delete('/', sessionController.revokeAllSessions);

module.exports = router;
