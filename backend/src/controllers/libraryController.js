const { validationResult } = require('express-validator');
const LibraryBook = require('../models/LibraryBook');
const Transaction = require('../models/Transaction');
const { processDueReminders } = require('../services/reminderService');

const BORROW_DAYS = 7;
const FINE_PER_DAY = Number(process.env.FINE_PER_DAY || 5);
const MS_IN_DAY = 24 * 60 * 60 * 1000;

exports.createLibraryBook = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, author, isbn, rackLocation, description, categories, totalCopies } = req.body;
    const parsedTotal = Number(totalCopies || 1);

    const book = await LibraryBook.create({
      title,
      author,
      isbn,
      rackLocation,
      description: description || '',
      categories: categories ? categories.split(',').map((c) => c.trim()).filter(Boolean) : [],
      totalCopies: parsedTotal,
      availableCopies: parsedTotal,
      addedBy: req.user._id,
    });

    return res.status(201).json({ message: 'Library book created', book });
  } catch (error) {
    console.error('Create library book error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getLibraryBooks = async (req, res) => {
  try {
    const { query } = req.query;
    const filter = { isActive: true };

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } },
        { isbn: { $regex: query, $options: 'i' } },
      ];
    }

    const books = await LibraryBook.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ count: books.length, books });
  } catch (error) {
    console.error('Get library books error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateLibraryBook = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.totalCopies !== undefined || updates.availableCopies !== undefined) {
      updates.totalCopies = Number(updates.totalCopies);
      updates.availableCopies = Number(updates.availableCopies);
      if (updates.availableCopies > updates.totalCopies) {
        return res.status(400).json({
          message: 'availableCopies cannot be greater than totalCopies',
        });
      }
    }

    const updated = await LibraryBook.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json({ message: 'Library book updated', book: updated });
  } catch (error) {
    console.error('Update library book error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.borrowLibraryBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await LibraryBook.findById(id);
    if (!book || !book.isActive) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'Book is currently unavailable' });
    }

    const hasActiveBorrow = await Transaction.findOne({
      requester: req.user._id,
      libraryBook: book._id,
      transactionType: 'library_borrow',
      status: { $in: ['requested', 'approved', 'active', 'overdue'] },
    });

    if (hasActiveBorrow) {
      return res.status(400).json({ message: 'You already have this book borrowed/requested' });
    }

    const transaction = await Transaction.create({
      transactionType: 'library_borrow',
      requester: req.user._id,
      libraryBook: book._id,
      status: 'requested',
      notes: 'Awaiting admin approval',
    });

    return res.status(201).json({
      message: 'Borrow request submitted for admin approval.',
      transaction,
    });
  } catch (error) {
    console.error('Borrow library book error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.returnLibraryBook = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const transaction = await Transaction.findById(transactionId).populate('libraryBook');

    if (!transaction || transaction.transactionType !== 'library_borrow') {
      return res.status(404).json({ message: 'Borrow transaction not found' });
    }

    const isOwner = String(transaction.requester) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You cannot return this transaction' });
    }

    if (['returned', 'completed', 'cancelled'].includes(transaction.status)) {
      return res.status(400).json({ message: 'This transaction is already closed' });
    }

    if (transaction.returnRequestedAt) {
      return res.status(400).json({ message: 'Return request is already pending admin approval' });
    }

    if (!['active', 'overdue'].includes(transaction.status)) {
      return res.status(400).json({ message: 'Only active borrow transactions can be returned' });
    }

    transaction.returnRequestedAt = new Date();
    transaction.notes = 'Return requested by user';
    await transaction.save();

    return res.status(200).json({
      message: 'Return request submitted for admin approval',
      transaction,
    });
  } catch (error) {
    console.error('Return library book error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.triggerDueReminders = async (req, res) => {
  try {
    const result = await processDueReminders();
    return res.status(200).json({
      message: 'Due reminder job completed',
      ...result,
    });
  } catch (error) {
    console.error('Trigger reminders error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyBorrowedBooks = async (req, res) => {
  try {
    const pendingBorrowRequests = await Transaction.find({
      requester: req.user._id,
      transactionType: 'library_borrow',
      status: 'requested',
    })
      .populate('libraryBook')
      .sort({ createdAt: -1 });

    const activeBorrowedTransactions = await Transaction.find({
      requester: req.user._id,
      transactionType: 'library_borrow',
      status: { $in: ['active', 'overdue'] },
      returnRequestedAt: null,
    })
      .populate('libraryBook')
      .sort({ createdAt: -1 });

    const pendingReturnRequests = await Transaction.find({
      requester: req.user._id,
      transactionType: 'library_borrow',
      status: { $in: ['active', 'overdue'] },
      returnRequestedAt: { $ne: null },
    })
      .populate('libraryBook')
      .sort({ createdAt: -1 });

    const returnedTransactions = await Transaction.find({
      requester: req.user._id,
      transactionType: 'library_borrow',
      status: 'returned',
    })
      .populate('libraryBook')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      pendingBorrowRequests,
      activeBorrowedTransactions,
      pendingReturnRequests,
      returned: returnedTransactions,
    });
  } catch (error) {
    console.error('Get my borrowed books error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

