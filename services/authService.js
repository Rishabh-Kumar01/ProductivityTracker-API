const crypto = require('crypto');
const { Resend } = require('resend');
const otpRepository = require('../repositories/otpRepository');
const userRepository = require('../repositories/userRepository');
const sessionRepository = require('../repositories/sessionRepository');
const { signToken } = require('../utils/tokenUtils');
const AppError = require('../utils/error');
const db = require('../config/databaseConfig');

const resend = new Resend(process.env.RESEND_API_KEY);

const authService = {
  // Generate a 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  },

  // SHA-256 hash
  hashValue(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  },

  // Generate opaque refresh token
  generateRefreshToken() {
    return crypto.randomBytes(32).toString('hex');
  },

  async requestOTP(email) {
    // Rate limit: max 1 OTP per 60 seconds
    const latest = await otpRepository.findLatestByEmail(email);
    if (latest) {
      const secondsSince = (Date.now() - new Date(latest.created_at).getTime()) / 1000;
      if (secondsSince < 60) {
        throw new AppError(`Please wait ${Math.ceil(60 - secondsSince)} seconds before requesting another OTP.`, 429);
      }
    }

    // Generate and store OTP
    const otp = this.generateOTP();
    const otpHash = this.hashValue(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await otpRepository.create(email, otpHash, expiresAt);

    // In development mode, always print to console for testing
    if (process.env.NODE_ENV === 'development') {
      console.log(`\\n\\n🛡️ [DEV MODE] OTP FOR ${email}: ${otp}\\n\\n`);
    }

    // Send via Resend
    try {
      await resend.emails.send({
        from: 'ProductivityTracker <onboarding@resend.dev>',
        to: email,
        subject: 'Your ProductivityTracker Login Code',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #1a1a1a; margin-bottom: 8px;">Your login code</h2>
            <p style="color: #666; margin-bottom: 24px;">Enter this code in ProductivityTracker to sign in:</p>
            <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
      return { message: 'OTP sent successfully' };
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Resend failed (likely unverified email), but allowing login in DEV mode. Error: ${err.message}`);
        return { message: 'OTP logged to console (Dev Mode)' };
      }
      console.error('Failed to send OTP email:', err);
      throw new AppError('Failed to send OTP email. Please try again.', 500);
    }
  },

  async verifyOTP(email, otp, deviceInfo = {}) {
    const otpRecord = await otpRepository.findValid(email);

    if (!otpRecord) {
      throw new AppError('No valid OTP found. Please request a new one.', 400);
    }

    // Check hash match
    const otpHash = this.hashValue(otp);
    if (otpHash !== otpRecord.otp_hash) {
      await otpRepository.incrementAttempts(otpRecord.id);
      const remaining = 5 - (otpRecord.attempts + 1);
      throw new AppError(
        remaining > 0
          ? `Invalid OTP. ${remaining} attempt(s) remaining.`
          : 'Too many failed attempts. Please request a new OTP.',
        401
      );
    }

    // OTP is valid — clean up
    await otpRepository.deleteForEmail(email);

    // Upsert user
    const user = await userRepository.upsertByEmail(email);

    // Enforce max 5 sessions
    await sessionRepository.enforceLimit(user.id, 5);

    // Default to owner role
    let role = 'owner';
    let linkedUserId = null;

    // Check if this email is a registered accountability partner
    const lockCheck = await db.query(
      'SELECT user_id FROM accountability_locks WHERE partner_email = $1 AND is_active = true',
      [email]
    );

    if (lockCheck.rows.length > 0) {
      role = 'partner';
      linkedUserId = lockCheck.rows[0].user_id;
    }

    // Create session with refresh token
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashValue(refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await sessionRepository.create({
      userId: user.id,
      tokenHash: refreshTokenHash,
      deviceName: deviceInfo.deviceName || 'Unknown',
      os: deviceInfo.os || 'macOS',
      ipAddress: deviceInfo.ipAddress || null,
      expiresAt,
      role,
      linkedUserId
    });

    // Generate JWT access token (15 min)
    const accessToken = signToken({
      id: user.id,
      email: user.email,
      role,
      linkedUserId
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
      role,
      linkedUserId
    };
  },

  async refreshAccessToken(refreshToken) {
    const refreshTokenHash = this.hashValue(refreshToken);
    const session = await sessionRepository.findByTokenHash(refreshTokenHash);

    if (!session) {
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    // Update last active
    await sessionRepository.updateLastActive(session.id);

    // Generate new access token
    const role = session.role || 'owner';
    const linkedUserId = session.linked_user_id || null;

    const accessToken = signToken({
      id: session.user_id,
      email: session.email,
      role,
      linkedUserId
    });

    return {
      accessToken,
      user: { id: session.user_id, email: session.email, name: session.name },
      role,
      linkedUserId
    };
  },

  async logout(refreshToken) {
    if (!refreshToken) return;
    const refreshTokenHash = this.hashValue(refreshToken);
    const session = await sessionRepository.findByTokenHash(refreshTokenHash);
    if (session) {
      await sessionRepository.revoke(session.id, session.user_id);
    }
  },
};

module.exports = authService;
