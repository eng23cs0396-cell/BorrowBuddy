const mongoose = require('mongoose');

const listedBookSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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
      default: '',
      trim: true,
      index: true,
    },
    listingType: {
      type: String,
      enum: ['sell', 'borrow', 'exchange'],
      required: true,
    },
    condition: {
      type: String,
      enum: ['new', 'like_new', 'good', 'fair', 'poor'],
      required: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: function validatePrice(value) {
          if (this.listingType === 'sell') {
            return value > 0;
          }
          return true;
        },
        message: 'Price must be greater than 0 for sell listings.',
      },
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    images: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ['active', 'reserved', 'completed', 'flagged', 'removed'],
      default: 'active',
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

listedBookSchema.index({ title: 'text', author: 'text', isbn: 'text' });

module.exports = mongoose.model('ListedBook', listedBookSchema);

