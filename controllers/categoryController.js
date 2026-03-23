const db = require('../config/databaseConfig');
const AppError = require('../utils/error');

class CategoryController {
  getAll = async (req, res, next) => {
    try {
      const { rows } = await db.query(
        'SELECT * FROM category_rules WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      );
      res.status(200).json({ status: 'success', data: rows });
    } catch (err) {
      next(err);
    }
  };

  createOverride = async (req, res, next) => {
    try {
      const { matchType, pattern, category, productivityScore } = req.body;
      if (!matchType || !pattern || !category || productivityScore === undefined) {
        return next(new AppError('Missing required fields', 400));
      }

      const { rows } = await db.query(
        `INSERT INTO category_rules (user_id, match_type, pattern, category, productivity_score)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.user.id, matchType, pattern, category, productivityScore]
      );
      res.status(201).json({ status: 'success', data: rows[0] });
    } catch (err) {
      next(err);
    }
  };

  updateOverride = async (req, res, next) => {
    try {
      const { matchType, pattern, category, productivityScore } = req.body;
      const { rows } = await db.query(
        `UPDATE category_rules SET match_type = $1, pattern = $2, category = $3, productivity_score = $4, updated_at = NOW()
         WHERE id = $5 AND user_id = $6 RETURNING *`,
        [matchType, pattern, category, productivityScore, req.params.id, req.user.id]
      );
      if (!rows.length) return next(new AppError('Rule not found', 404));
      res.status(200).json({ status: 'success', data: rows[0] });
    } catch (err) {
      next(err);
    }
  };

  deleteOverride = async (req, res, next) => {
    try {
      const { rowCount } = await db.query(
        'DELETE FROM category_rules WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );
      if (rowCount === 0) return next(new AppError('Rule not found', 404));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new CategoryController();
