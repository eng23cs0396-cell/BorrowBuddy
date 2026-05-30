const express = require('express');
const { body } = require('express-validator');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');
const verifiedMiddleware = require('../middlewares/verifiedMiddleware');

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  verifiedMiddleware,
  [
    body('targetType')
      .isIn(['user', 'listing', 'review', 'transaction'])
      .withMessage('Invalid target type'),
    body('targetId').isMongoId().withMessage('Valid targetId is required'),
    body('reason')
      .isIn(['spam', 'fraud', 'abuse', 'fake_listing', 'copyright', 'other'])
      .withMessage('Invalid report reason'),
    body('description').optional().isString().isLength({ max: 1500 }),
  ],
  reportController.createReport
);

router.get('/my', authMiddleware, reportController.getMyReports);

module.exports = router;

