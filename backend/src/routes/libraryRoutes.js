const express = require('express');
const { body } = require('express-validator');
const libraryController = require('../controllers/libraryController');
const authMiddleware = require('../middlewares/authMiddleware');
const allowRoles = require('../middlewares/roleMiddleware');
const verifiedMiddleware = require('../middlewares/verifiedMiddleware');

const router = express.Router();

router.get('/', libraryController.getLibraryBooks);

router.post(
  '/',
  authMiddleware,
  allowRoles('admin'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('author').notEmpty().withMessage('Author is required'),
    body('isbn').notEmpty().withMessage('ISBN is required'),
    body('rackLocation').notEmpty().withMessage('Rack location is required'),
    body('totalCopies').optional().isInt({ min: 1 }).withMessage('totalCopies must be >= 1'),
  ],
  libraryController.createLibraryBook
);

router.put(
  '/:id',
  authMiddleware,
  allowRoles('admin'),
  [
    body('totalCopies').optional().isInt({ min: 0 }).withMessage('totalCopies must be >= 0'),
    body('availableCopies').optional().isInt({ min: 0 }).withMessage('availableCopies must be >= 0'),
  ],
  libraryController.updateLibraryBook
);

router.post('/:id/borrow', authMiddleware, verifiedMiddleware, libraryController.borrowLibraryBook);

router.get('/my-borrowed/list', authMiddleware, libraryController.getMyBorrowedBooks);

router.post(
  '/transactions/:transactionId/return',
  authMiddleware,
  verifiedMiddleware,
  libraryController.returnLibraryBook
);

router.post(
  '/admin/reminders/trigger',
  authMiddleware,
  allowRoles('admin'),
  libraryController.triggerDueReminders
);

module.exports = router;

