const express = require('express');
const router = express.Router();
const {
    activateLock,
    verifyPartner,
    setPassword,
    deactivateLock,
    getStatus,
    getEvents,
    reportTamperEvent
} = require('../controllers/accountabilityController');
const { requirePartnerUnlock } = require('../middleware/accountabilityLock');
const { partnerAccess } = require('../middleware/partnerAccess');

router.use(partnerAccess);

router.post('/activate', activateLock);
router.post('/verify-partner', verifyPartner);
router.post('/set-password', setPassword);

// Important: Deactivation modifies settings, so it requires the partner password
router.delete('/deactivate', requirePartnerUnlock, deactivateLock);

router.get('/status', getStatus);
router.get('/events', getEvents);
router.post('/tamper-event', reportTamperEvent);

router.post('/events/:eventId/revert', require('../controllers/accountabilityController').revertEvent);

module.exports = router;
