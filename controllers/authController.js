const authService = require('../services/authService');

class AuthController {
  requestOTP = async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ status: 'fail', message: 'Email is required' });
      }
      const result = await authService.requestOTP(email);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  };

  verifyOTP = async (req, res, next) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ status: 'fail', message: 'Email and OTP are required' });
      }
      const deviceInfo = {
        deviceName: req.body.deviceName || req.headers['x-device-name'],
        os: req.body.os || req.headers['x-device-os'],
        ipAddress: req.ip,
      };
      const result = await authService.verifyOTP(email, otp, deviceInfo);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ status: 'fail', message: 'Refresh token is required' });
      }
      const result = await authService.refreshAccessToken(refreshToken);
      res.status(200).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      res.status(200).json({ status: 'success', message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new AuthController();
