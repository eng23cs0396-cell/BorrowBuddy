const mongoose = require('mongoose');

const libraryBookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    rackLocation: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    categories: [
      {
        type: String,
        trim: true,
      },
    ],
    totalCopies: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    availableCopies: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    coverImage: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

libraryBookSchema.index({ title: 'text', author: 'text', isbn: 'text' });

module.exports = mongoose.model('LibraryBook', libraryBookSchema);

