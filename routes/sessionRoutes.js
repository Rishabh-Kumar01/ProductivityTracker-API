const express = require('express');
const sessionController = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');
const { ownerOnly } = require('../middleware/partnerAccess');

const router = express.Router();

router.use(protect);
router.use(ownerOnly);

router.get('/', sessionController.getActiveSessions);
router.delete('/:id', sessionController.revokeSession);
router.delete('/', sessionController.revokeAllSessions);

module.exports = router;
