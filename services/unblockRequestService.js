const requestRepo = require('../repositories/unblockRequestRepository');
const blockerRepo = require('../repositories/blockerRepository');
const accountabilityLockRepo = require('../repositories/accountabilityRepository');
const userRepository = require('../repositories/userRepository');
const emailService = require('./emailService');
const AppError = require('../utils/error');

const unblockRequestService = {
  async createRequest(userId, domainId, durationMinutes, reason) {
    // Verify accountability is active
    const lock = await accountabilityLockRepo.getActiveLock(userId);
    if (!lock) {
      throw new AppError('No active accountability partner lock to request an unblock from', 400);
    }

    // Verify domain is owned by user
    const domains = await blockerRepo.getDomains(userId, '', 100, 0);
    const domainObj = domains.domains.find(d => d.id === domainId);
    if (!domainObj) {
      throw new AppError('You are not blocking this domain', 404);
    }

    // Create request
    const req = await requestRepo.create(userId, domainId, durationMinutes, reason);

    // Email partner
    try {
      await emailService.sendUnblockRequest(lock.partner_email, domainObj.domain, reason, durationMinutes);
    } catch (err) {
      console.error('Failed to email partner about request', err);
    }

    return req;
  },

  async getRequests(userId, statusFilter) {
    return await requestRepo.findByUserId(userId, statusFilter);
  },

  async resolveRequest(targetUserId, requestId, status, requestorRole) {
    const req = await requestRepo.findById(requestId);
    if (!req) throw new AppError('Request not found', 404);

    if (req.user_id !== targetUserId) {
      throw new AppError('Unauthorized to resolve this request', 403);
    }

    if (req.status !== 'pending') {
      throw new AppError('Request is already resolved', 400);
    }

    if (requestorRole !== 'partner') {
      throw new AppError('Only the partner can resolve requests', 403);
    }

    const updated = await requestRepo.updateStatus(requestId, status);

    if (status === 'approved') {
      await blockerRepo.tempUnblockDomain(req.domain_id, targetUserId, req.duration_minutes);
      
      // Log approval event
      await accountabilityLockRepo.logEvent(targetUserId, 'temp_unblock_approved', {
        domain: req.domain,
        minutes: req.duration_minutes
      }, true);

      // Notify owner about approval
      try {
        const owner = await userRepository.findById(targetUserId);
        if (owner) {
          await emailService.sendUnblockApprovalToOwner(owner.email, req.domain, req.duration_minutes);
        }
      } catch (err) {
        console.error('Failed to email owner about approval:', err);
      }
    } else if (status === 'denied') {
      // Log denial event
      await accountabilityLockRepo.logEvent(targetUserId, 'temp_unblock_denied', {
        domain: req.domain
      }, true);

      // Notify owner about denial
      try {
        const owner = await userRepository.findById(targetUserId);
        if (owner) {
          await emailService.sendUnblockDenialToOwner(owner.email, req.domain);
        }
      } catch (err) {
        console.error('Failed to email owner about denial:', err);
      }
    }

    return updated;
  }
};

module.exports = unblockRequestService;
