const unblockRequestService = require('../services/unblockRequestService');

exports.createRequest = async (req, res, next) => {
  try {
    const { domainId, durationMinutes, reason } = req.body;
    // targetUserId is resolved by partnerAccess middleware (or falls back to req.user.id)
    const userId = req.targetUserId || req.user.id;
    
    if (!domainId || !durationMinutes || !reason) {
      return res.status(400).json({ error: 'domainId, durationMinutes, and reason are required' });
    }

    const request = await unblockRequestService.createRequest(userId, domainId, durationMinutes, reason);
    res.status(201).json({ status: 'success', data: request });
  } catch (error) {
    next(error);
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const userId = req.targetUserId || req.user.id;
    const { status } = req.query; // optional
    const requests = await unblockRequestService.getRequests(userId, status);
    res.status(200).json({ status: 'success', data: requests });
  } catch (error) {
    next(error);
  }
};

exports.resolveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or denied' });
    }

    const targetUserId = req.targetUserId || req.user.id;
    const requestorRole = req.user.role || 'owner';

    const updated = await unblockRequestService.resolveRequest(targetUserId, id, status, requestorRole);
    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
};
