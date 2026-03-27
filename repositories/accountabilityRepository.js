const db = require('../config/databaseConfig');

class AccountabilityRepository {
    async getActiveLock(userId) {
        const query = `
            SELECT * FROM accountability_locks 
            WHERE user_id = $1 AND is_active = TRUE
        `;
        const result = await db.query(query, [userId]);
        return result.rows[0];
    }

    async upsertLock(userId, partnerEmail, passwordHash) {
        // If a lock exists for the user, update it. Otherwise insert.
        const query = `
            INSERT INTO accountability_locks (user_id, partner_email, partner_password_hash, is_active, activated_at, updated_at)
            VALUES ($1, $2, $3, TRUE, NOW(), NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                partner_email = EXCLUDED.partner_email,
                partner_password_hash = EXCLUDED.partner_password_hash,
                is_active = TRUE,
                activated_at = NOW(),
                updated_at = NOW()
            RETURNING id
        `;
        const result = await db.query(query, [userId, partnerEmail, passwordHash]);
        return result.rows[0];
    }

    async deactivateLock(userId) {
        const query = `
            UPDATE accountability_locks
            SET is_active = FALSE, updated_at = NOW()
            WHERE user_id = $1 AND is_active = TRUE
            RETURNING id
        `;
        const result = await db.query(query, [userId]);
        return result.rows[0];
    }

    async logEvent(userId, eventType, details = {}, notifiedPartner = false) {
        const query = `
            INSERT INTO accountability_events (user_id, event_type, details, notified_partner)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;
        const result = await db.query(query, [userId, eventType, JSON.stringify(details), notifiedPartner]);
        return result.rows[0];
    }

    async getEvents(userId, limit = 50) {
        const query = `
            SELECT id, event_type, details, notified_partner, created_at
            FROM accountability_events
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;
        const result = await db.query(query, [userId, limit]);
        return result.rows;
    }

    async upsertHeartbeat(userId, clientVersion, isBlockingActive, blockedDomainCount) {
        const query = `
            INSERT INTO heartbeats (user_id, client_version, is_blocking_active, blocked_domain_count, last_seen_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                client_version = EXCLUDED.client_version,
                is_blocking_active = EXCLUDED.is_blocking_active,
                blocked_domain_count = EXCLUDED.blocked_domain_count,
                last_seen_at = NOW()
            RETURNING id
        `;
        const result = await db.query(query, [userId, clientVersion, isBlockingActive, blockedDomainCount]);
        return result.rows[0];
    }

    async countFailedPasswordAttempts(userId, minutes = 10) {
        const query = `
            SELECT COUNT(*) 
            FROM accountability_events
            WHERE user_id = $1 
              AND event_type = 'password_attempt_failed'
              AND created_at >= NOW() - INTERVAL '1 minute' * $2
        `;
        const result = await db.query(query, [userId, minutes]);
        return parseInt(result.rows[0].count, 10);
    }
}

module.exports = new AccountabilityRepository();
