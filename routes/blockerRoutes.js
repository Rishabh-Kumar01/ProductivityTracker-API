const express = require('express');
const router = express.Router();
const blockerController = require('../controllers/blockerController');
const { protect } = require('../middleware/auth');
const { requirePartnerUnlock } = require('../middleware/accountabilityLock');
const { partnerAccess } = require('../middleware/partnerAccess');
const { unlockAuditLogger } = require('../middleware/unlockAuditLogger');
const db = require('../config/databaseConfig');

router.use(protect);
router.use(partnerAccess);

// Sources
router.get('/sources', blockerController.getSources);
router.post('/sources', requirePartnerUnlock, blockerController.addSource);
router.delete('/sources/:id', requirePartnerUnlock, unlockAuditLogger('unlock_source_removed', {
    captureBefore: async (req) => {
        const result = await db.query('SELECT name, domain_count FROM blocklist_sources WHERE id = $1', [req.params.id]);
        return result.rows[0];
    },
    buildDetails: (req, before) => ({
        sourceName: before?.name,
        sourceId: req.params.id,
        domainCount: before?.domain_count
    })
}), blockerController.removeSource);
router.post('/sources/:id/refresh', requirePartnerUnlock, blockerController.refreshSource);

// Domains
router.get('/domains', blockerController.getDomains);
router.post('/domains', requirePartnerUnlock, unlockAuditLogger('unlock_domain_added', {
    buildDetails: (req, _, body) => ({
        domains: req.body.domains,
        domainIds: body.data?.map(d => d.id) || []
    })
}), blockerController.addDomains);
router.post('/domains/import', requirePartnerUnlock, blockerController.importDomains);
router.post('/domains/import-text', requirePartnerUnlock, blockerController.importDomainsText);
router.delete('/domains/:id', requirePartnerUnlock, unlockAuditLogger('unlock_domain_removed', {
    captureBefore: async (req) => {
        const result = await db.query('SELECT domain, source FROM blocked_domains WHERE id = $1', [req.params.id]);
        return result.rows[0];
    },
    buildDetails: (req, before) => ({
        domain: before?.domain,
        domainId: req.params.id,
        source: before?.source
    })
}), blockerController.removeDomain);
router.post('/domains/:id/temp-unblock', requirePartnerUnlock, unlockAuditLogger('unlock_temp_unblock', {
    captureBefore: async (req) => {
        const result = await db.query('SELECT domain FROM blocked_domains WHERE id = $1', [req.params.id]);
        return result.rows[0];
    },
    buildDetails: (req, before) => ({
        domain: before?.domain,
        domainId: req.params.id,
        minutes: req.body.minutes
    })
}), blockerController.tempUnblockDomain);

module.exports = router;
