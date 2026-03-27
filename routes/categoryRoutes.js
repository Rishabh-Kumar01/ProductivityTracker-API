const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { ownerOnly } = require('../middleware/partnerAccess');

const router = express.Router();

router.use(protect);
router.use(ownerOnly);

router.get('/', categoryController.getAll);
router.post('/', categoryController.createOverride);
router.put('/:id', categoryController.updateOverride);
router.delete('/:id', categoryController.deleteOverride);

module.exports = router;
