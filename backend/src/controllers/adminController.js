const { validationResult } = require('express-validator');
const User = require('../models/User');
const ListedBook = require('../models/ListedBook');
const LibraryBook = require('../models/LibraryBook');
const Report = require('../models/Report');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

const BORROW_DAYS = 7;
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const FINE_PER_DAY = Number(process.env.FINE_PER_DAY || 5);

exports.getDashboard = async (req, res) => {
  try {
    const [totalUsers, verifiedUsers, bannedUsers, totalLibraryBooks, totalListings, pendingReports] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isVerified: true }),
        User.countDocuments({ status: 'banned' }),
        LibraryBook.countDocuments(),
        ListedBook.countDocuments(),
        Report.countDocuments({ status: 'pending' }),
      ]);

    return res.status(200).json({
      stats: {
        totalUsers,
        verifiedUsers,
        bannedUsers,
        totalLibraryBooks,
        totalListings,
        pendingReports,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { status, role, verified } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (role) filter.role = role;
    if (verified !== undefined) filter.isVerified = verified === 'true';

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: users.length, users });
  } catch (error) {
    console.error('Get users error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.setUserStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const { status, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.status = status;
    await user.save();

    await Notification.create({
      user: user._id,
      type: 'admin_action',
      title: `Account ${status}`,
      message:
        status === 'banned'
          ? `Your account has been banned. ${reason ? `Reason: ${reason}` : ''}`.trim()
          : 'Your account has been restored by admin.',
      metadata: { reason: reason || '' },
    });

    return res.status(200).json({
      message: `User status updated to ${status}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Set user status error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.setUserVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const parsedIsVerified = req.body.isVerified === true || req.body.isVerified === 'true';

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isVerified: parsedIsVerified } },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    await Notification.create({
      user: user._id,
      type: 'verification',
      title: parsedIsVerified ? 'Verification Approved' : 'Verification Revoked',
      message: parsedIsVerified
        ? 'Your profile has been verified by admin.'
        : 'Your verification has been revoked by admin.',
    });

    return res.status(200).json({
      message: `User verification set to ${parsedIsVerified}`,
      user,
    });
  } catch (error) {
    console.error('Set user verification error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getListingsForModeration = async (req, res) => {
  try {
    const { status, approved } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (approved !== undefined) filter.isApproved = approved === 'true';

    const listings = await ListedBook.find(filter)
      .populate('owner', 'name email status isVerified')
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: listings.length, listings });
  } catch (error) {
    console.error('Get moderation listings error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.moderateListing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { listingId } = req.params;
    const { action, adminNote } = req.body;
    const actionPastTense = {
      approve: 'approved',
      flag: 'flagged',
      remove: 'removed',
    };

    const listing = await ListedBook.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (action === 'approve') {
      listing.isApproved = true;
      if (listing.status === 'flagged') listing.status = 'active';
    }
    if (action === 'flag') {
      listing.isApproved = false;
      listing.status = 'flagged';
    }
    if (action === 'remove') {
      listing.isApproved = false;
      listing.status = 'removed';
    }

    await listing.save();

    await Notification.create({
      user: listing.owner,
      type: 'admin_action',
      title: 'Listing Moderation Update',
      message: `Your listing "${listing.title}" has been ${actionPastTense[action]} by admin.`,
      metadata: { listingId: listing._id, action, adminNote: adminNote || '' },
    });

    return res.status(200).json({
      message: `Listing ${actionPastTense[action]} successfully`,
      listing,
    });
  } catch (error) {
    console.error('Moderate listing error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getReports = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate('reporter', 'name email')
      .populate('targetUser', 'name email status')
      .populate('targetListing', 'title status isApproved')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: reports.length, reports });
  } catch (error) {
    console.error('Get reports error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reportId } = req.params;
    const { status, adminNote } = req.body;

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = status;
    report.adminNote = adminNote || '';
    report.reviewedBy = req.user._id;
    await report.save();

    if (report.targetType === 'listing' && report.targetListing) {
      if (status === 'resolved') {
        await ListedBook.findByIdAndUpdate(report.targetListing, {
          $set: { isApproved: false, status: 'removed' },
        });
      } else if (status === 'rejected') {
        await ListedBook.findByIdAndUpdate(report.targetListing, {
          $set: { isApproved: true, status: 'active' },
        });
      }
    }

    await Notification.create({
      user: report.reporter,
      type: 'admin_action',
      title: 'Report Reviewed',
      message: `Your report has been marked as ${status}.`,
      metadata: { reportId: report._id, adminNote: report.adminNote },
    });

    return res.status(200).json({
      message: 'Report status updated',
      report,
    });
  } catch (error) {
    console.error('Update report status error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.transactionType = type;

    const transactions = await Transaction.find(filter)
      .populate('requester', 'name email')
      .populate('owner', 'name email')
      .populate('libraryBook', 'title isbn')
      .populate('listedBook', 'title listingType')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.reviewLibraryBorrowRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId } = req.params;
    const { action } = req.body;

    const transaction = await Transaction.findById(transactionId).populate('libraryBook');
    if (!transaction || transaction.transactionType !== 'library_borrow') {
      return res.status(404).json({ message: 'Borrow request not found' });
    }

    if (transaction.status !== 'requested') {
      return res.status(400).json({ message: 'Only pending borrow requests can be reviewed' });
    }

    if (action === 'reject') {
      transaction.status = 'rejected';
      transaction.notes = 'Borrow request rejected by admin';
      await transaction.save();

      await Notification.create({
        user: transaction.requester,
        type: 'admin_action',
        title: 'Borrow Request Rejected',
        message: `Your borrow request for "${transaction.libraryBook?.title || 'book'}" was rejected by admin.`,
      });

      return res.status(200).json({ message: 'Borrow request rejected', transaction });
    }

    const book = transaction.libraryBook;
    if (!book || !book.isActive) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'Book is currently unavailable' });
    }

    transaction.status = 'active';
    transaction.dueDate = new Date(Date.now() + BORROW_DAYS * MS_IN_DAY);
    transaction.notes = 'Borrow request approved by admin';
    await transaction.save();

    book.availableCopies -= 1;
    await book.save();

    await Notification.create({
      user: transaction.requester,
      type: 'admin_action',
      title: 'Borrow Request Approved',
      message: `Your borrow request for "${book.title}" was approved by admin. Due in ${BORROW_DAYS} days.`,
      metadata: { transactionId: transaction._id },
    });

    return res.status(200).json({ message: 'Borrow request approved', transaction });
  } catch (error) {
    console.error('Review borrow request error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.reviewLibraryReturnRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId } = req.params;
    const { action } = req.body;

    const transaction = await Transaction.findById(transactionId).populate('libraryBook');
    if (!transaction || transaction.transactionType !== 'library_borrow') {
      return res.status(404).json({ message: 'Return request not found' });
    }

    if (!transaction.returnRequestedAt) {
      return res.status(400).json({ message: 'No pending return request found' });
    }

    if (action === 'reject') {
      transaction.returnRequestedAt = null;
      transaction.notes = 'Return request rejected by admin';
      await transaction.save();

      await Notification.create({
        user: transaction.requester,
        type: 'admin_action',
        title: 'Return Request Rejected',
        message: `Your return request for "${transaction.libraryBook?.title || 'book'}" was rejected by admin.`,
      });

      return res.status(200).json({ message: 'Return request rejected', transaction });
    }

    const now = new Date();
    const dueDate = transaction.dueDate ? new Date(transaction.dueDate) : now;
    const lateMs = now.getTime() - dueDate.getTime();
    const overdueDays = lateMs > 0 ? Math.ceil(lateMs / MS_IN_DAY) : 0;
    const fine = overdueDays * FINE_PER_DAY;

    transaction.returnRequestedAt = null;
    transaction.returnedAt = now;
    transaction.fineAmount = fine;
    transaction.status = 'returned';
    transaction.notes = 'Return request approved by admin';
    await transaction.save();

    if (transaction.libraryBook) {
      transaction.libraryBook.availableCopies += 1;
      if (transaction.libraryBook.availableCopies > transaction.libraryBook.totalCopies) {
        transaction.libraryBook.availableCopies = transaction.libraryBook.totalCopies;
      }
      await transaction.libraryBook.save();
    }

    await Notification.create({
      user: transaction.requester,
      type: 'admin_action',
      title: 'Return Request Approved',
      message: `Your return request for "${transaction.libraryBook?.title || 'book'}" was approved by admin.`,
      metadata: { transactionId: transaction._id, fineAmount: fine },
    });

    return res.status(200).json({ message: 'Return request approved', overdueDays, fineAmount: fine, transaction });
  } catch (error) {
    console.error('Review return request error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

