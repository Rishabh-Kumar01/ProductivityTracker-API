const bcrypt = require('bcryptjs');
const accountabilityRepository = require('../repositories/accountabilityRepository');
const emailService = require('./emailService');

// In-memory store for OTPs (for production, use Redis)
// Format: { 'email@example.com': { otp: '123456', expires: Date.now() + 10mins } }
const pendingOTPs = new Map();

class AccountabilityService {
    
    // --- OTP Flow ---

    async sendActivationOTP(partnerEmail) {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        pendingOTPs.set(partnerEmail, { otp, expiresAt });
        
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
        await accountabilityRepository.deactivateLock(userId);
        await accountabilityRepository.logEvent(userId, 'lock_deactivated', {}, false);
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

    issueUnlockToken(userId) {
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes window

        if (!this.unlockTokens) {
            this.unlockTokens = new Map();
        }

        this.unlockTokens.set(userId, { token, expiresAt });
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
}

module.exports = new AccountabilityService();
