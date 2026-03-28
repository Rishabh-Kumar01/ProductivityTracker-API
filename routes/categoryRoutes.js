const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { partnerAccess } = require('../middleware/partnerAccess');
const { unlockAuditLogger } = require('../middleware/unlockAuditLogger');
const db = require('../config/databaseConfig');

const router = express.Router();

router.use(protect);
router.use(partnerAccess);

router.get('/', categoryController.getAll);
router.post('/', unlockAuditLogger('unlock_category_created', {
    buildDetails: (req, _, body) => ({
        identifier: req.body.pattern || req.body.identifier,
        type: req.body.matchType || req.body.type,
        category: req.body.category,
        score: req.body.score || req.body.productivityScore,
        ruleId: body.data?.id
    })
}), categoryController.createOverride);

router.put('/:id', unlockAuditLogger('unlock_category_changed', {
    captureBefore: async (req) => {
        const result = await db.query('SELECT * FROM category_rules WHERE id = $1', [req.params.id]);
        return result.rows[0];
    },
    buildDetails: (req, before) => ({
        identifier: before?.pattern || before?.identifier,
        type: before?.match_type || before?.type,
        oldCategory: before?.category,
        oldScore: before?.productivity_score || before?.score,
        newCategory: req.body.category,
        newScore: req.body.score || req.body.productivityScore,
        ruleId: req.params.id
    })
}), categoryController.updateOverride);

router.delete('/:id', unlockAuditLogger('unlock_category_deleted', {
    captureBefore: async (req) => {
        const result = await db.query('SELECT * FROM category_rules WHERE id = $1', [req.params.id]);
        return result.rows[0];
    },
    buildDetails: (req, before) => ({
        identifier: before?.pattern || before?.identifier,
        type: before?.match_type || before?.type,
        category: before?.category,
        score: before?.productivity_score || before?.score,
        ruleId: req.params.id
    })
}), categoryController.deleteOverride);

module.exports = router;
