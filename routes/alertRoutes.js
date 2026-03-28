const express = require('express');
const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/auth');
const { partnerAccess } = require('../middleware/partnerAccess');
const { unlockAuditLogger } = require('../middleware/unlockAuditLogger');
const db = require('../config/databaseConfig');

const router = express.Router();

router.use(protect);
router.use(partnerAccess);

router.get('/', alertController.getAll);
router.post('/', unlockAuditLogger('unlock_alert_created', {
    buildDetails: (req, _, body) => ({
        matchType: req.body.matchType || req.body.match_type,
        pattern: req.body.pattern,
        limitMinutes: req.body.limitMinutes || req.body.limit_minutes,
        autoBlock: req.body.autoBlock || req.body.auto_block,
        ruleId: body.data?.id
    })
}), alertController.create);

router.put('/:id', unlockAuditLogger('unlock_alert_updated', {
    captureBefore: async (req) => {
        const result = await db.query('SELECT * FROM alert_rules WHERE id = $1', [req.params.id]);
        return result.rows[0];
    },
    buildDetails: (req, before) => ({
        ruleId: req.params.id,
        pattern: before?.pattern,
        oldLimit: before?.limit_minutes,
        newLimit: req.body.limitMinutes || req.body.limit_minutes,
        oldAutoBlock: before?.auto_block,
        newAutoBlock: req.body.autoBlock || req.body.auto_block
    })
}), alertController.update);

router.delete('/:id', unlockAuditLogger('unlock_alert_deleted', {
    captureBefore: async (req) => {
        const result = await db.query('SELECT * FROM alert_rules WHERE id = $1', [req.params.id]);
        return result.rows[0];
    },
    buildDetails: (req, before) => ({
        matchType: before?.match_type,
        pattern: before?.pattern,
        limitMinutes: before?.limit_minutes,
        autoBlock: before?.auto_block,
        ruleId: req.params.id
    })
}), alertController.delete);

module.exports = router;
