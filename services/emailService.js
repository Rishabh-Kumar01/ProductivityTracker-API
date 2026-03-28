const { Resend } = require('resend');

// Only initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
// Use a verified domain or resend's onboarding email. Typically: "onboarding@resend.dev" for testing.
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sam-focussync.com';

exports.sendOTP = async (to, otp) => {
    if (!resend) {
        console.log(`[EmailService] Resend not configured. Simulated OTP for ${to}: ${otp}`);
        return;
    }

    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: 'Accountability Partner Activation Code',
            html: `
                <h2>Productivity Tracker</h2>
                <p>You have been invited to be an accountability partner.</p>
                <p>Your verification code is: <strong>${otp}</strong></p>
                <p>Please enter this code on the user's computer to proceed with setting up your password.</p>
            `
        });
        console.log(`[EmailService] Sent OTP to ${to}, ${otp}`);
    } catch (error) {
        console.error('[EmailService] Failed to send OTP email:', error);
    }
};

exports.sendTamperAlert = async (to) => {
    if (!resend) return console.log(`[EmailService] Simulated Tamper Alert to ${to}`);

    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: '⚠️ Alert: Blocker Tampering Detected',
            html: `
                <h2>Productivity Tracker Alert</h2>
                <p>The system detected that the blocklist on the user's computer was modified outside of the application.</p>
                <p>The tracker automatically reverted the changes and re-applied the block constraints.</p>
            `
        });
    } catch (error) {
        console.error('[EmailService] Error:', error);
    }
};

exports.sendHeartbeatMissedAlert = async (to) => {
    if (!resend) return console.log(`[EmailService] Simulated Heartbeat Alert to ${to}`);

    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: '📡 Alert: Tracker Offline',
            html: `
                <h2>Productivity Tracker Alert</h2>
                <p>The productivity tracker has not reported in for over 30 minutes. The device might be turned off, or the app was closed.</p>
            `
        });
    } catch (error) {
        console.error('[EmailService] Error:', error);
    }
};

exports.sendMultipleFailedPasswordsAlert = async (to) => {
    if (!resend) return console.log(`[EmailService] Simulated Failed Passwords Alert to ${to}`);

    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: '🔐 Alert: Multiple Failed Password Attempts',
            html: `
                <h2>Productivity Tracker Alert</h2>
                <p>Someone attempted to enter your accountability password incorrectly 3 or more times in the last 10 minutes.</p>
            `
        });
    } catch (error) {
        console.error('[EmailService] Error:', error);
    }
};

exports.sendUnblockRequest = async (to, domain, reason, duration) => {
    if (!resend) return console.log(`[EmailService] Simulated Unblock Request to ${to}`);
    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: '🔓 Request: Unblock Domain',
            html: `
                <h2>Productivity Tracker Needs Your Review</h2>
                <p>The owner of this blocker is requesting a temporary unlock for the following domain:</p>
                <ul>
                    <li><strong>Domain:</strong> ${domain}</li>
                    <li><strong>Duration:</strong> ${duration} minutes</li>
                    <li><strong>Reason:</strong> ${reason}</li>
                </ul>
                <p>Please log in to your Partner Portal to approve or deny this request.</p>
            `
        });
    } catch (error) {
        console.error('[EmailService] Error:', error);
    }
};

exports.sendUnblockDecision = async (to, domain, status) => {
    if (!resend) return console.log(`[EmailService] Simulated Decision email to ${to}`);
    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: `Unlock Request ${status.toUpperCase()}`,
            html: `
                <h2>Request ${status.toUpperCase()}</h2>
                <p>Your accountability partner has ${status} your request to unblock <strong>${domain}</strong>.</p>
            `
        });
    } catch (error) {
        console.error('[EmailService] Error:', error);
    }
};

exports.sendLockDeactivatedToPartner = async (to) => {
    if (!resend) return console.log(`[EmailService] Simulated Lock Deactivated (partner) to ${to}`);
    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: '🔓 Accountability lock was deactivated',
            html: `
                <h2>Productivity Tracker Alert</h2>
                <p>The accountability lock on your partner's account was deactivated at <strong>${new Date().toLocaleString()}</strong>.</p>
                <p>All blocker settings are now freely editable.</p>
                <p>If you didn't authorize this, please reach out to your partner.</p>
            `
        });
    } catch (error) {
        console.error('[EmailService] Error:', error);
    }
};

exports.sendLockDeactivatedToOwner = async (to) => {
    if (!resend) return console.log(`[EmailService] Simulated Lock Deactivated (owner) to ${to}`);
    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: '🔓 Your accountability lock has been deactivated',
            html: `
                <h2>Productivity Tracker</h2>
                <p>Your accountability partner has deactivated the lock on your account.</p>
                <p>You can now freely modify your blocker settings.</p>
            `
        });
    } catch (error) {
        console.error('[EmailService] Error:', error);
    }
};

exports.sendUnblockApprovalToOwner = async (to, domain, minutes) => {
    if (!resend) return console.log(`[EmailService] Simulated Approval email to ${to} for ${domain}`);
    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: '✅ Your unblock request was approved',
            html: `
                <h2>Request Approved</h2>
                <p>Your request to temporarily unblock <strong>${domain}</strong> was approved for <strong>${minutes} minutes</strong>.</p>
                <p>It will be re-blocked automatically when the timer expires.</p>
            `
        });
    } catch (error) {
        console.error('[EmailService] Error:', error);
    }
};

exports.sendUnblockDenialToOwner = async (to, domain) => {
    if (!resend) return console.log(`[EmailService] Simulated Denial email to ${to} for ${domain}`);
    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: '❌ Your unblock request was denied',
            html: `
                <h2>Request Denied</h2>
                <p>Your request to temporarily unblock <strong>${domain}</strong> was denied by your accountability partner.</p>
            `
        });
    } catch (error) {
        console.error('[EmailService] Error:', error);
    }
};

exports.sendUnlockMutationsAlert = async (to, count, timestamp) => {
    if (!resend) return console.log(`[EmailService] Simulated Mutations Alert to ${to} (${count} changes)`);
    try {
        await resend.emails.send({
            from: fromEmail,
            to: to,
            subject: '⚠️ Changes made during unlock session',
            html: `
                <h2>Productivity Tracker Alert</h2>
                <p>Your partner unlocked their blocker settings and made <strong>${count} change(s)</strong> during a 5-minute window that ended at ${timestamp}.</p>
                <p>Please log in to your Partner Portal to review and revert any unauthorized changes.</p>
            `
        });
    } catch (error) {
        console.error('[EmailService] Error:', error);
    }
};
