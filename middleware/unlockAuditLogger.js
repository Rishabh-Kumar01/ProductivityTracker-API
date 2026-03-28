const db = require('../config/databaseConfig');

const unlockAuditLogger = (eventType, extractDetails) => {
    return async (req, res, next) => {
        // Only log for OWNER sessions using an unlock token
        const unlockToken = req.headers['x-unlock-token'];
        if (!unlockToken || req.user.role !== 'owner') return next();

        // Capture "before" state for updates/deletes (needs the record before it's modified)
        let beforeState = null;
        if (extractDetails.captureBefore) {
            try {
                beforeState = await extractDetails.captureBefore(req);
            } catch (err) {
                console.error('[AuditLog] captureBefore error:', err.message);
            }
        }

        // Intercept res.json to log AFTER the action succeeds
        const originalJson = res.json.bind(res);
        res.json = function(body) {
            // Only log on success (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const details = extractDetails.buildDetails(req, beforeState, body);
                // Fire-and-forget — don't block the response
                db.query(
                    `INSERT INTO accountability_events (user_id, event_type, details, notified_partner)
                     VALUES ($1, $2, $3, false)`,
                    [req.user.id, eventType, JSON.stringify({
                        ...details,
                        reverted: false,
                        triggeredBy: 'unlock_session'
                    })]
                ).catch(err => console.error('[AuditLog] insert error:', err.message));

                // Increment mutation count on the unlock token (for session summary email)
                const accountabilityService = require('../services/accountabilityService');
                const tokenData = accountabilityService.validateAndGetToken(req.user.id, unlockToken);
                if (tokenData) {
                    tokenData.mutationCount = (tokenData.mutationCount || 0) + 1;
                }
            }
            return originalJson(body);
        };

        next();
    };
};

module.exports = { unlockAuditLogger };
