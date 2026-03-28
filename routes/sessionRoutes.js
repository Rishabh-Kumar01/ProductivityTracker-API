const express = require('express');
const sessionController = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');
const { partnerAccess, ownerOnly } = require('../middleware/partnerAccess');

const router = express.Router();

router.use(protect);

// GET — partner can see owner's active sessions (read-only)
router.get('/', partnerAccess, sessionController.getActiveSessions);

// DELETE — only owner can revoke sessions
router.delete('/:id', ownerOnly, sessionController.revokeSession);
router.delete('/', ownerOnly, sessionController.revokeAllSessions);

module.exports = router;
