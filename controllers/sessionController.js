const sessionRepository = require('../repositories/sessionRepository');
const AppError = require('../utils/error');

class SessionController {
  getActiveSessions = async (req, res, next) => {
    try {
      const sessions = await sessionRepository.getActiveSessions(req.user.id);
      res.status(200).json({ status: 'success', data: sessions });
    } catch (err) {
      next(err);
    }
  };

  revokeSession = async (req, res, next) => {
    try {
      await sessionRepository.revoke(req.params.id, req.user.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  revokeAllSessions = async (req, res, next) => {
    try {
      await sessionRepository.revokeAll(req.user.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new SessionController();
