const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const allowRoles = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware, allowRoles('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.get('/transactions', adminController.getTransactions);
router.get('/listings', adminController.getListingsForModeration);
router.get('/reports', adminController.getReports);

router.patch(
  '/transactions/:transactionId/library-borrow',
  [body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject')],
  adminController.reviewLibraryBorrowRequest
);

router.patch(
  '/transactions/:transactionId/library-return',
  [body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject')],
  adminController.reviewLibraryReturnRequest
);

router.patch(
  '/users/:userId/status',
  [
    body('status').isIn(['active', 'banned']).withMessage('Status must be active or banned'),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  adminController.setUserStatus
);

router.patch(
  '/users/:userId/verification',
  [body('isVerified').isBoolean().withMessage('isVerified must be boolean')],
  adminController.setUserVerification
);

router.patch(
  '/listings/:listingId/moderation',
  [
    body('action').isIn(['approve', 'flag', 'remove']).withMessage('Invalid moderation action'),
    body('adminNote').optional().isString().isLength({ max: 1000 }),
  ],
  adminController.moderateListing
);

router.patch(
  '/reports/:reportId/status',
  [
    body('status')
      .isIn(['pending', 'reviewed', 'resolved', 'rejected'])
      .withMessage('Invalid report status'),
    body('adminNote').optional().isString().isLength({ max: 1000 }),
  ],
  adminController.updateReportStatus
);

module.exports = router;

