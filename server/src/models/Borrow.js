const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    borrowDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['borrowed', 'returned', 'overdue'],
      default: 'borrowed',
    },
  },
  { timestamps: true }
);

// Keep status in sync with due date whenever a document is loaded/queried
borrowSchema.methods.refreshStatus = function refreshStatus() {
  if (this.status === 'borrowed' && this.dueDate < new Date()) {
    this.status = 'overdue';
  }
  return this.status;
};

module.exports = mongoose.model('Borrow', borrowSchema);
