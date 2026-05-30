const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: ['library_borrow', 'p2p_sell', 'p2p_borrow', 'p2p_exchange'],
      required: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    libraryBook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LibraryBook',
      default: null,
    },
    listedBook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ListedBook',
      default: null,
    },
    status: {
      type: String,
      enum: [
        'requested',
        'approved',
        'rejected',
        'active',
        'returned',
        'completed',
        'cancelled',
        'overdue',
      ],
      default: 'requested',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    returnRequestedAt: {
      type: Date,
      default: null,
    },
    fineAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    amountPaid: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Transaction', transactionSchema);

