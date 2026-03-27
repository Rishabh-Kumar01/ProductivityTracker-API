const express = require('express');
const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/auth');
const { ownerOnly } = require('../middleware/partnerAccess');

const router = express.Router();

router.use(protect);
router.use(ownerOnly);

router.get('/', alertController.getAll);
router.post('/', alertController.create);
router.put('/:id', alertController.update);
router.delete('/:id', alertController.delete);

module.exports = router;
