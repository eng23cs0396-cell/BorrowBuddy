const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const exchangeController = require('../controllers/exchangeController');
const authMiddleware = require('../middlewares/authMiddleware');
const verifiedMiddleware = require('../middlewares/verifiedMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function destination(req, file, cb) {
    cb(null, 'uploads/listings');
  },
  filename: function filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.get('/listings', exchangeController.getListings);
router.get('/users/:userId/reviews', exchangeController.getUserReviews);

router.get('/my/listings', authMiddleware, exchangeController.getMyListings);
router.get('/my/requests', authMiddleware, exchangeController.getMyRequests);
router.get('/my/listing-requests', authMiddleware, exchangeController.getMyListingRequests);

router.post(
  '/listings',
  authMiddleware,
  verifiedMiddleware,
  upload.array('images', 5),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('author').notEmpty().withMessage('Author is required'),
    body('listingType').isIn(['sell', 'borrow', 'exchange']).withMessage('Invalid listing type'),
    body('condition')
      .isIn(['new', 'like_new', 'good', 'fair', 'poor'])
      .withMessage('Invalid condition'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be >= 0'),
  ],
  exchangeController.createListing
);

router.put('/listings/:listingId', authMiddleware, verifiedMiddleware, exchangeController.updateMyListing);
router.delete(
  '/listings/:listingId',
  authMiddleware,
  verifiedMiddleware,
  exchangeController.removeMyListing
);

router.post(
  '/listings/:listingId/request',
  authMiddleware,
  verifiedMiddleware,
  exchangeController.requestListing
);

router.post(
  '/transactions/:transactionId/respond',
  authMiddleware,
  verifiedMiddleware,
  [body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject')],
  exchangeController.respondToRequest
);

router.post(
  '/transactions/:transactionId/complete',
  authMiddleware,
  verifiedMiddleware,
  exchangeController.completeTransaction
);

router.post(
  '/transactions/:transactionId/review',
  authMiddleware,
  verifiedMiddleware,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be from 1 to 5'),
    body('comment').optional().isString(),
  ],
  exchangeController.createReview
);

module.exports = router;

