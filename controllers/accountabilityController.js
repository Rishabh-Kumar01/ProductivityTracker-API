const accountabilityService = require('../services/accountabilityService');

exports.activateLock = async (req, res) => {
    try {
        const { partnerEmail } = req.body;
        if (!partnerEmail) {
            return res.status(400).json({ status: 'error', message: 'partnerEmail is required' });
        }

        // Send OTP
        await accountabilityService.sendActivationOTP(partnerEmail);

        res.status(200).json({
            status: 'success',
            message: `OTP sent to ${partnerEmail}`
        });
    } catch (error) {
        console.error('[Accountability Controller] Activation Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.verifyPartner = async (req, res) => {
    try {
        const { partnerEmail, otp } = req.body;
        
        const isValid = accountabilityService.verifyOTP(partnerEmail, otp);
        if (!isValid) {
            return res.status(400).json({ status: 'error', message: 'Invalid or expired OTP' });
        }

        res.status(200).json({
            status: 'success',
            message: 'OTP verified'
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.setPassword = async (req, res) => {
    try {
        const { partnerEmail, password } = req.body;
        const userId = req.user.id; // from auth.protect

        if (!partnerEmail || !password) {
            return res.status(400).json({ status: 'error', message: 'Email and password required' });
        }

        await accountabilityService.setPasswordAndActivate(userId, partnerEmail, password);

        res.status(200).json({
            status: 'success',
            message: 'Accountability lock is now active.'
        });
    } catch (error) {
        console.error('[Accountability Controller] Set Password Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.deactivateLock = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Note: The accountabilityLock middleware ensures X-Partner-Password was provided and valid
        await accountabilityService.deactivateLock(userId);

        res.status(200).json({
            status: 'success',
            message: 'Accountability lock removed.'
        });
    } catch (error) {
        console.error('[Accountability Controller] Deactivate Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const status = await accountabilityService.getStatus(userId);
        res.status(200).json({ status: 'success', data: status });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.getEvents = async (req, res) => {
    try {
        const userId = req.user.id;
        const events = await accountabilityService.getEvents(userId);
        res.status(200).json({ status: 'success', data: { events } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.recordHeartbeat = async (req, res) => {
    try {
        const userId = req.user.id;
        const { clientVersion, isBlockingActive, blockedDomainCount } = req.body;
        
        await accountabilityService.recordHeartbeat(userId, clientVersion, isBlockingActive, blockedDomainCount);
        res.status(201).json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

exports.reportTamperEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        await accountabilityService.reportTamperEvent(userId);
        res.status(201).json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
