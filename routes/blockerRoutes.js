const express = require('express');
const router = express.Router();
const blockerController = require('../controllers/blockerController');
const { protect } = require('../middleware/auth');
const { requirePartnerUnlock } = require('../middleware/accountabilityLock');

router.use(protect);

// Sources
router.get('/sources', blockerController.getSources);
router.post('/sources', requirePartnerUnlock, blockerController.addSource);
router.delete('/sources/:id', requirePartnerUnlock, blockerController.removeSource);
router.post('/sources/:id/refresh', requirePartnerUnlock, blockerController.refreshSource);

// Domains
router.get('/domains', blockerController.getDomains);
router.post('/domains', requirePartnerUnlock, blockerController.addDomains);
router.post('/domains/import', requirePartnerUnlock, blockerController.importDomains);
router.post('/domains/import-text', requirePartnerUnlock, blockerController.importDomainsText);
router.delete('/domains/:id', requirePartnerUnlock, blockerController.removeDomain);
router.post('/domains/:id/temp-unblock', requirePartnerUnlock, blockerController.tempUnblockDomain);

module.exports = router;
