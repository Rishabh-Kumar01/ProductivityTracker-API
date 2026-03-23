const express = require('express');
const router = express.Router();
const blockerController = require('../controllers/blockerController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Sources
router.get('/sources', blockerController.getSources);
router.post('/sources', blockerController.addSource);
router.delete('/sources/:id', blockerController.removeSource);
router.post('/sources/:id/refresh', blockerController.refreshSource);

// Domains
router.get('/domains', blockerController.getDomains);
router.post('/domains', blockerController.addDomains);
router.post('/domains/import', blockerController.importDomains);
router.post('/domains/import-text', blockerController.importDomainsText);
router.delete('/domains/:id', blockerController.removeDomain);
router.post('/domains/:id/temp-unblock', blockerController.tempUnblockDomain);

module.exports = router;
