const bcrypt = require('bcryptjs');
const accountabilityRepository = require('../repositories/accountabilityRepository');
const emailService = require('../services/emailService');

const requirePartnerUnlock = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const lock = await accountabilityRepository.getActiveLock(userId);

        // If no active lock, proceed normally
        if (!lock) {
            return next();
        }

        // Lock is active. Check for X-Partner-Password header
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
            await accountabilityRepository.logEvent(userId, 'password_attempt_failed', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Check if we hit 3 failed attempts in 10 minutes
            const failedCount = await accountabilityRepository.countFailedPasswordAttempts(userId, 10);
            
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
        next();
    } catch (error) {
        console.error('[AccountabilityLock Middleware] Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error checking lock status' });
    }
};

module.exports = {
    requirePartnerUnlock
};
