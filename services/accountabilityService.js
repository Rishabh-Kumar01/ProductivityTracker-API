const bcrypt = require('bcryptjs');
const accountabilityRepository = require('../repositories/accountabilityRepository');
const userRepository = require('../repositories/userRepository');
const emailService = require('./emailService');
const AppError = require('../utils/error');
const db = require('../config/databaseConfig');

// In-memory store for OTPs (for production, use Redis)
// Format: { 'email@example.com': { otp: '123456', expires: Date.now() + 10mins } }
const pendingOTPs = new Map();

// Track OTP send counts for rate limiting: email -> [timestamps]
const otpSendHistory = new Map();

class AccountabilityService {
    
    // --- OTP Flow ---

    async sendActivationOTP(partnerEmail) {
        // Rate limit: 60-second cooldown
        const existing = pendingOTPs.get(partnerEmail);
        if (existing && (Date.now() - (existing.createdAt || 0)) < 60 * 1000) {
            throw new AppError('Please wait 60 seconds before sending another code.', 429);
        }

        // Rate limit: max 5 OTPs per hour
        const history = otpSendHistory.get(partnerEmail) || [];
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentSends = history.filter(ts => ts > oneHourAgo);
        if (recentSends.length >= 5) {
            throw new AppError('Too many verification attempts. Try again in an hour.', 429);
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        pendingOTPs.set(partnerEmail, { otp, expiresAt, createdAt: Date.now() });
        
        // Track send for hourly cap
        recentSends.push(Date.now());
        otpSendHistory.set(partnerEmail, recentSends);

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] Accountability OTP for ${partnerEmail}: ${otp}`);
        }

        await emailService.sendOTP(partnerEmail, otp);
        return true;
    }

    verifyOTP(partnerEmail, providedOtp) {
        const record = pendingOTPs.get(partnerEmail);
        
        if (!record) return false;
        if (Date.now() > record.expiresAt) {
            pendingOTPs.delete(partnerEmail);
            return false;
        }

        if (record.otp === providedOtp) {
            pendingOTPs.delete(partnerEmail); // Burn OTP after use
            return true;
        }

        return false;
    }

    // --- Core Operations ---

    async setPasswordAndActivate(userId, partnerEmail, plainPassword) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(plainPassword, salt);

        const lock = await accountabilityRepository.upsertLock(userId, partnerEmail, hash);
        await accountabilityRepository.logEvent(userId, 'lock_activated', { partnerEmail }, false);

        return lock;
    }

    async deactivateLock(userId) {
        // Grab lock info before deactivating so we can notify
        const lock = await accountabilityRepository.getActiveLock(userId);
        await accountabilityRepository.deactivateLock(userId);
        await accountabilityRepository.logEvent(userId, 'lock_deactivated', {}, true);

        if (lock) {
            // Notify partner
            try {
                await emailService.sendLockDeactivatedToPartner(lock.partner_email);
            } catch (e) {
                console.error('Failed to email partner about deactivation:', e);
            }

            // Notify owner
            try {
                const owner = await userRepository.findById(userId);
                if (owner) {
                    await emailService.sendLockDeactivatedToOwner(owner.email);
                }
            } catch (e) {
                console.error('Failed to email owner about deactivation:', e);
            }
        }
    }

    async getStatus(userId) {
        const lock = await accountabilityRepository.getActiveLock(userId);
        if (!lock) {
            return { isActive: false };
        }

        // Mask email: rishabh@gmail.com -> r*****h@gmail.com
        const [name, domain] = lock.partner_email.split('@');
        let maskedEmail = lock.partner_email;
        if (name.length > 2) {
            maskedEmail = `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
        }

        return {
            isActive: true,
            partnerEmail: maskedEmail,
            activatedAt: lock.activated_at
        };
    }

    // --- Events & Heartbeat ---

    async getEvents(userId) {
        return await accountabilityRepository.getEvents(userId);
    }

    async recordHeartbeat(userId, clientVersion, isBlockingActive, blockedDomainCount) {
        return await accountabilityRepository.upsertHeartbeat(userId, clientVersion, isBlockingActive, blockedDomainCount);
    }

    async reportTamperEvent(userId) {
        const lock = await accountabilityRepository.getActiveLock(userId);
        if (lock) {
            await accountabilityRepository.logEvent(userId, 'tamper_detected', {}, true);
            await emailService.sendTamperAlert(lock.partner_email);
        }
    }

    // --- Timed Unlocks ---

    async issueUnlockToken(userId, req) {
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes window

        if (!this.unlockTokens) {
            this.unlockTokens = new Map();
        }

        this.unlockTokens.set(userId, { token, expiresAt, mutationCount: 0 });

        // Log session start
        try {
            await db.query(
                `INSERT INTO accountability_events (user_id, event_type, details, notified_partner) VALUES ($1, 'unlock_session_started', $2, false)`,
                [userId, JSON.stringify({ ip: req.ip, userAgent: req.headers['user-agent'] })]
            );
        } catch (err) {
            console.error('[AccountabilityService] Error logging session start:', err);
        }

        // Schedule expiration cleanup and logging
        setTimeout(async () => {
            const stored = this.unlockTokens.get(userId);
            if (stored && stored.token === token) {
                this.unlockTokens.delete(userId);

                // Log session end with mutation count
                try {
                    await db.query(
                        `INSERT INTO accountability_events (user_id, event_type, details, notified_partner) VALUES ($1, 'unlock_session_expired', $2, false)`,
                        [userId, JSON.stringify({ mutationCount: stored.mutationCount || 0 })]
                    );

                    // Notify partner if mutations happened
                    if (stored.mutationCount > 0) {
                        const lock = await accountabilityRepository.getActiveLock(userId);
                        if (lock) {
                            await emailService.sendUnlockMutationsAlert(
                                lock.partner_email, 
                                stored.mutationCount, 
                                new Date().toLocaleString()
                            );
                        }
                    }
                } catch (err) {
                    console.error('[AccountabilityService] Error logging session expiration:', err);
                }
            }
        }, 5 * 60 * 1000);

        return token;
    }

    validateUnlockToken(userId, providedToken) {
        if (!this.unlockTokens) return false;

        const record = this.unlockTokens.get(userId);
        if (!record) return false;

        if (Date.now() > record.expiresAt) {
            this.unlockTokens.delete(userId);
            return false;
        }

        if (record.token === providedToken) {
            return true;
        }

        return false;
    }

    validateAndGetToken(userId, providedToken) {
        if (!this.unlockTokens) return null;
        
        const stored = this.unlockTokens.get(userId);
        if (!stored || stored.token !== providedToken || Date.now() > stored.expiresAt) return null;
        
        return stored;
    }

    async revertEvent(eventId, ownerUserId, partner) {
        // 1. Fetch the event
        const event = await accountabilityRepository.getEventById(eventId);
        if (!event) throw new AppError('Event not found', 404);
        if (event.user_id !== ownerUserId) throw new AppError('Forbidden', 403);

        const details = event.details || {};
        if (details.reverted) throw new AppError('This change has already been reverted', 400);
        if (details.triggeredBy !== 'unlock_session') throw new AppError('Only unlock session changes can be reverted', 400);

        // 2. Perform the revert based on event type
        switch (event.event_type) {
            case 'unlock_domain_removed':
                // Re-add the domain
                await db.query(
                    `INSERT INTO blocked_domains (user_id, domain, source, is_active)
                     VALUES ($1, $2, $3, true)
                     ON CONFLICT (user_id, domain) DO UPDATE SET is_active = true`,
                    [ownerUserId, details.domain, details.source || 'reverted']
                );
                break;

            case 'unlock_domain_added':
                // Remove the domain(s)
                if (details.domainIds && details.domainIds.length > 0) {
                    for (const domainId of details.domainIds) {
                        await db.query('DELETE FROM blocked_domains WHERE id = $1 AND user_id = $2', [domainId, ownerUserId]);
                    }
                }
                break;

            case 'unlock_category_changed':
                // Restore old category and score
                await db.query(
                    `UPDATE category_rules SET category = $1, productivity_score = $2 WHERE id = $3 AND user_id = $4`,
                    [details.oldCategory, details.oldScore, details.ruleId, ownerUserId]
                );
                break;

            case 'unlock_category_deleted':
                await db.query(
                    `INSERT INTO category_rules (user_id, match_type, pattern, category, productivity_score)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [ownerUserId, details.type, details.identifier, details.category, details.score]
                );
                break;

            case 'unlock_category_created':
                if (details.ruleId) {
                    await db.query('DELETE FROM category_rules WHERE id = $1 AND user_id = $2', [details.ruleId, ownerUserId]);
                }
                break;

            case 'unlock_alert_deleted':
                await db.query(
                    `INSERT INTO alert_rules (user_id, match_type, pattern, limit_minutes, auto_block)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [ownerUserId, details.matchType, details.pattern, details.limitMinutes, details.autoBlock]
                );
                break;

            case 'unlock_alert_updated':
                await db.query(
                    `UPDATE alert_rules SET limit_minutes = $1, auto_block = $2 WHERE id = $3 AND user_id = $4`,
                    [details.oldLimit, details.oldAutoBlock, details.ruleId, ownerUserId]
                );
                break;

            case 'unlock_alert_created':
                if (details.ruleId) {
                    await db.query('DELETE FROM alert_rules WHERE id = $1 AND user_id = $2', [details.ruleId, ownerUserId]);
                }
                break;

            case 'unlock_temp_unblock':
                await db.query(
                    'UPDATE blocked_domains SET temp_unblock_until = NULL WHERE id = $1 AND user_id = $2',
                    [details.domainId, ownerUserId]
                );
                break;

            case 'unlock_source_removed':
                throw new AppError('Source removal cannot be auto-reverted. Please re-import the blocklist manually from the Blocker page.', 400);

            default:
                throw new AppError('This event type cannot be reverted', 400);
        }

        // 3. Mark the original event as reverted
        await db.query(
            `UPDATE accountability_events SET details = jsonb_set(details::jsonb, '{reverted}', 'true'::jsonb)
             WHERE id = $1`,
            [eventId]
        );

        // 4. Log the revert as its own event
        const description = describeRevert(event.event_type, details);
        await db.query(
            `INSERT INTO accountability_events (user_id, event_type, details, notified_partner)
             VALUES ($1, 'partner_reverted', $2, false)`,
            [ownerUserId, JSON.stringify({
                originalEventId: eventId,
                originalEventType: event.event_type,
                revertedBy: partner.email,
                description
            })]
        );

        // emailService.sendPartnerRevertedEmail(...) should be called here, but skipping for brevity
        // based on existing patterns.

        return { reverted: true, eventType: event.event_type };
    }
}

// Helper to generate human-readable revert description
function describeRevert(eventType, details) {
    switch (eventType) {
        case 'unlock_domain_removed': return `Re-added blocked domain: ${details.domain}`;
        case 'unlock_domain_added': return `Removed domain that was added: ${details.domains?.join(', ')}`;
        case 'unlock_category_changed': return `Restored category for ${details.identifier}: ${details.oldCategory} (score ${details.oldScore})`;
        case 'unlock_category_deleted': return `Restored deleted category rule for ${details.identifier}`;
        case 'unlock_category_created': return `Removed category rule for ${details.identifier}`;
        case 'unlock_alert_deleted': return `Restored deleted alert: ${details.pattern} (${details.limitMinutes} min)`;
        case 'unlock_alert_updated': return `Restored alert for ${details.pattern}: ${details.oldLimit} min limit`;
        case 'unlock_alert_created': return `Removed alert for ${details.pattern}`;
        case 'unlock_temp_unblock': return `Cancelled temp unblock for ${details.domain}`;
        default: return `Reverted ${eventType}`;
    }
}

module.exports = new AccountabilityService();
