const { validationResult } = require('express-validator');
const ListedBook = require('../models/ListedBook');
const Transaction = require('../models/Transaction');
const Review = require('../models/Review');
const Notification = require('../models/Notification');

const getTransactionType = (listingType) => {
  if (listingType === 'sell') return 'p2p_sell';
  if (listingType === 'borrow') return 'p2p_borrow';
  return 'p2p_exchange';
};

exports.createListing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, author, isbn, listingType, condition, price, description } = req.body;
    const images = (req.files || []).map((file) => file.path);

    const listing = await ListedBook.create({
      owner: req.user._id,
      title,
      author,
      isbn: isbn || '',
      listingType,
      condition,
      price: Number(price || 0),
      description: description || '',
      images,
      isApproved: true,
      status: 'active',
    });

    return res.status(201).json({
      message: 'Listing created successfully',
      listing,
    });
  } catch (error) {
    console.error('Create listing error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getListings = async (req, res) => {
  try {
    const { query, listingType, condition, status = 'active' } = req.query;
    const filter = { isApproved: true };

    if (status) filter.status = status;
    if (listingType) filter.listingType = listingType;
    if (condition) filter.condition = condition;
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } },
        { isbn: { $regex: query, $options: 'i' } },
      ];
    }

    const listings = await ListedBook.find(filter)
      .populate('owner', 'name email isVerified')
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: listings.length, listings });
  } catch (error) {
    console.error('Get listings error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyListings = async (req, res) => {
  try {
    const listings = await ListedBook.find({ owner: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ count: listings.length, listings });
  } catch (error) {
    console.error('Get my listings error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const requests = await Transaction.find({
      requester: req.user._id,
      transactionType: { $in: ['p2p_sell', 'p2p_borrow', 'p2p_exchange'] },
    })
      .populate('listedBook', 'title author isbn listingType status isApproved price')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: requests.length, requests });
  } catch (error) {
    console.error('Get my requests error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyListingRequests = async (req, res) => {
  try {
    const requests = await Transaction.find({
      owner: req.user._id,
      transactionType: { $in: ['p2p_sell', 'p2p_borrow', 'p2p_exchange'] },
    })
      .populate('requester', 'name email')
      .populate('listedBook', 'title author isbn listingType status isApproved price')
      .sort({ createdAt: -1 });

    const pending = requests.filter((request) => request.status === 'requested');
    const reviewed = requests.filter((request) => request.status !== 'requested');

    return res.status(200).json({
      count: requests.length,
      pending,
      reviewed,
      requests,
    });
  } catch (error) {
    console.error('Get my listing requests error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateMyListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const listing = await ListedBook.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (String(listing.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only edit your own listing' });
    }

    const updates = { ...req.body };
    if (updates.price !== undefined) updates.price = Number(updates.price);

    const updated = await ListedBook.findByIdAndUpdate(listingId, updates, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({ message: 'Listing updated', listing: updated });
  } catch (error) {
    console.error('Update listing error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.removeMyListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const listing = await ListedBook.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (String(listing.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only remove your own listing' });
    }

    listing.status = 'removed';
    await listing.save();

    return res.status(200).json({ message: 'Listing removed', listing });
  } catch (error) {
    console.error('Remove listing error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.requestListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const listing = await ListedBook.findById(listingId);
    if (!listing || !listing.isApproved || listing.status !== 'active') {
      return res.status(404).json({ message: 'Active listing not found' });
    }

    if (String(listing.owner) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot request your own listing' });
    }

    const existing = await Transaction.findOne({
      requester: req.user._id,
      listedBook: listing._id,
      status: { $in: ['requested', 'approved', 'active'] },
    });

    if (existing) {
      return res.status(400).json({ message: 'You already have an active request for this listing' });
    }

    const dueDate =
      listing.listingType === 'borrow' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;

    const transaction = await Transaction.create({
      transactionType: getTransactionType(listing.listingType),
      requester: req.user._id,
      owner: listing.owner,
      listedBook: listing._id,
      status: 'requested',
      dueDate,
      amountPaid: listing.listingType === 'sell' ? Number(listing.price || 0) : 0,
    });

    await Notification.create({
      user: listing.owner,
      type: 'transaction_update',
      title: 'New Listing Request',
      message: `${req.user.name} requested your listing "${listing.title}".`,
      metadata: { transactionId: transaction._id, listingId: listing._id, action: 'requested' },
    });

    return res.status(201).json({
      message: 'Request submitted successfully',
      transaction,
    });
  } catch (error) {
    console.error('Request listing error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.respondToRequest = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    const transaction = await Transaction.findById(transactionId).populate('listedBook');
    if (!transaction || !transaction.listedBook) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (String(transaction.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only listing owner can perform this action' });
    }

    if (transaction.status !== 'requested') {
      return res.status(400).json({ message: 'Only requested transactions can be updated' });
    }

    if (action === 'reject') {
      transaction.status = 'rejected';
      await transaction.save();

      await Notification.create({
        user: transaction.requester,
        type: 'transaction_update',
        title: 'Request Rejected',
        message: `Your request for "${transaction.listedBook.title}" was rejected by the owner.`,
        metadata: { transactionId: transaction._id, action: 'rejected' },
      });

      return res.status(200).json({ message: 'Request rejected', transaction });
    }

    transaction.status = 'approved';
    await transaction.save();

    transaction.listedBook.status = 'reserved';
    await transaction.listedBook.save();

    await Notification.create({
      user: transaction.requester,
      type: 'transaction_update',
      title: 'Request Approved',
      message: `Your request for "${transaction.listedBook.title}" was approved by the owner.`,
      metadata: { transactionId: transaction._id, action: 'approved' },
    });

    return res.status(200).json({ message: 'Request approved', transaction });
  } catch (error) {
    console.error('Respond to request error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.completeTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const transaction = await Transaction.findById(transactionId).populate('listedBook');
    if (!transaction || !transaction.listedBook) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const isOwner = String(transaction.owner) === String(req.user._id);
    const isRequester = String(transaction.requester) === String(req.user._id);
    if (!isOwner && !isRequester) {
      return res.status(403).json({ message: 'Not allowed for this transaction' });
    }

    if (!['approved', 'active'].includes(transaction.status)) {
      return res.status(400).json({ message: 'Transaction must be approved/active to complete' });
    }

    transaction.status = 'completed';
    transaction.returnedAt = new Date();
    await transaction.save();

    transaction.listedBook.status = 'completed';
    await transaction.listedBook.save();

    return res.status(200).json({ message: 'Transaction completed', transaction });
  } catch (error) {
    console.error('Complete transaction error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId } = req.params;
    const { rating, comment } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    const isOwner = String(transaction.owner) === String(req.user._id);
    const isRequester = String(transaction.requester) === String(req.user._id);
    if (!isOwner && !isRequester) {
      return res.status(403).json({ message: 'Not allowed for this transaction' });
    }

    if (!['completed', 'returned'].includes(transaction.status)) {
      return res.status(400).json({ message: 'Review allowed only after transaction completion' });
    }

    const reviewee = isOwner ? transaction.requester : transaction.owner;
    const existing = await Review.findOne({
      reviewer: req.user._id,
      transaction: transaction._id,
    });
    if (existing) {
      return res.status(400).json({ message: 'You already reviewed this transaction' });
    }

    const review = await Review.create({
      reviewer: req.user._id,
      reviewee,
      transaction: transaction._id,
      listedBook: transaction.listedBook || null,
      rating: Number(rating),
      comment: comment || '',
    });

    return res.status(201).json({ message: 'Review submitted', review });
  } catch (error) {
    console.error('Create review error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await Review.find({ reviewee: userId })
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 });

    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2))
        : 0;

    return res.status(200).json({
      count: reviews.length,
      averageRating: avgRating,
      reviews,
    });
  } catch (error) {
    console.error('Get user reviews error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

