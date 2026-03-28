const bcrypt = require('bcryptjs');
const accountabilityRepository = require('../repositories/accountabilityRepository');
const emailService = require('../services/emailService');
const accountabilityService = require('../services/accountabilityService');

const requirePartnerUnlock = async (req, res, next) => {
    try {
        const targetUserId = req.targetUserId || req.user.id;
        const lock = await accountabilityRepository.getActiveLock(targetUserId);

        // If no active lock, proceed normally
        if (!lock) {
            return next();
        }

        // PARTNER SESSION: already authenticated as the partner
        if (req.user.role === 'partner') {
            if (lock.partner_email === req.user.email) {
                return next(); // Partner is authorized, no password needed
            }
            return res.status(403).json({
                status: 'forbidden',
                message: 'You are not the accountability partner for this account'
            });
        }

        // OWNER SESSION
        // 1. Check for valid 5-minute timed unlock token
        const unlockToken = req.headers['x-unlock-token'];
        if (unlockToken && accountabilityService.validateUnlockToken(targetUserId, unlockToken)) {
            return next();
        }

        // 2. Fallback to physical password challenge
        const providedPassword = req.headers['x-partner-password'];

        if (!providedPassword) {
            return res.status(403).json({
                status: 'error',
                message: 'Accountability lock is active. Partner password required.'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(providedPassword, lock.partner_password_hash);

        if (!isMatch) {
            // Log failed attempt
            await accountabilityRepository.logEvent(targetUserId, 'password_attempt_failed', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Check if we hit 3 failed attempts in 10 minutes
            const failedCount = await accountabilityRepository.countFailedPasswordAttempts(targetUserId, 10);
            
            if (failedCount >= 3) {
                // Email partner
                await emailService.sendMultipleFailedPasswordsAlert(lock.partner_email);
                
                return res.status(403).json({
                    status: 'error',
                    message: 'Too many incorrect attempts. Partner has been notified.'
                });
            }

            return res.status(401).json({
                status: 'error',
                message: 'Incorrect partner password.'
            });
        }

        // Password matches! Proceed
        const newToken = await accountabilityService.issueUnlockToken(targetUserId, req);
        
        // Log successful bypass
        await accountabilityRepository.logEvent(targetUserId, 'physical_password_unlock', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.setHeader('X-Unlock-Token', newToken);
        next();
    } catch (error) {
        console.error('[AccountabilityLock Middleware] Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error checking lock status' });
    }
};

module.exports = {
    requirePartnerUnlock
};
