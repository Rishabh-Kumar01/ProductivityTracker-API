const express = require('express');
const router = express.Router();
const controller = require('../controllers/unblockRequestController');
const { protect } = require('../middleware/auth');
const { partnerAccess } = require('../middleware/partnerAccess');

router.use(protect);
router.use(partnerAccess);

router.post('/', controller.createRequest);
router.get('/', controller.getRequests);
router.patch('/:id/resolve', controller.resolveRequest);

module.exports = router;
