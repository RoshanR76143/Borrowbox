const Borrow = require('../models/Borrow');
const Book = require('../models/Book');
const User = require('../models/User');

const BORROW_PERIOD_DAYS = 14;
const DUE_SOON_WINDOW_DAYS = 3;

// Recomputes the status of a single borrow document based on today's date
const syncStatus = (borrow) => {
  if (borrow.status === 'borrowed' && borrow.dueDate < new Date()) {
    borrow.status = 'overdue';
  }
  return borrow;
};

// @desc    Borrow a book
// @route   POST /api/borrow
// @access  Private
const borrowBook = async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        message: 'bookId is required',
      });
    }

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No copies of this book are currently available',
      });
    }

    const alreadyBorrowed = await Borrow.findOne({
      user: req.user._id,
      book: book._id,
      status: { $in: ['borrowed', 'overdue'] },
    });

    if (alreadyBorrowed) {
      return res.status(400).json({
        success: false,
        message: 'You already have this book borrowed',
      });
    }

    const borrowDate = new Date();
    const dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + BORROW_PERIOD_DAYS);

    const borrow = await Borrow.create({
      user: req.user._id,
      book: book._id,
      borrowDate,
      dueDate,
      status: 'borrowed',
    });

    book.availableCopies -= 1;
    await book.save();

    const populated = await borrow.populate('book');

    return res.status(201).json({
      success: true,
      message: `You have borrowed "${book.title}". It is due in ${BORROW_PERIOD_DAYS} days.`,
      data: { borrow: populated },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while borrowing the book',
    });
  }
};

// @desc    Return a borrowed book
// @route   POST /api/borrow/:id/return
// @access  Private
const returnBook = async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id);

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: 'Borrow record not found',
      });
    }

    if (borrow.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This borrow record does not belong to you',
      });
    }

    if (borrow.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'This book has already been returned',
      });
    }

    borrow.status = 'returned';
    borrow.returnDate = new Date();
    await borrow.save();

    const book = await Book.findById(borrow.book);
    if (book) {
      book.availableCopies = Math.min(book.availableCopies + 1, book.totalCopies);
      await book.save();
    }

    const populated = await borrow.populate('book');

    return res.status(200).json({
      success: true,
      message: 'Book returned successfully',
      data: { borrow: populated },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while returning the book',
    });
  }
};

// @desc    Get the logged-in user's borrow history
// @route   GET /api/borrow/my
// @access  Private
const getMyBorrows = async (req, res) => {
  try {
    const borrows = await Borrow.find({ user: req.user._id })
      .populate('book')
      .sort({ createdAt: -1 });

    borrows.forEach(syncStatus);
    await Promise.all(borrows.filter((b) => b.isModified()).map((b) => b.save()));

    const now = new Date();
    const summary = {
      total: borrows.length,
      borrowed: borrows.filter((b) => b.status === 'borrowed').length,
      overdue: borrows.filter((b) => b.status === 'overdue').length,
      returned: borrows.filter((b) => b.status === 'returned').length,
      dueSoon: borrows.filter((b) => {
        if (b.status !== 'borrowed') return false;
        const diffDays = (b.dueDate - now) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= DUE_SOON_WINDOW_DAYS;
      }).length,
    };

    return res.status(200).json({
      success: true,
      message: 'Borrow history fetched successfully',
      data: { borrows, summary },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while fetching borrow history',
    });
  }
};

// @desc    Get all borrow records (admin)
// @route   GET /api/borrow
// @access  Private/Admin
const getAllBorrows = async (req, res) => {
  try {
    const borrows = await Borrow.find()
      .populate('book')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    borrows.forEach(syncStatus);
    await Promise.all(borrows.filter((b) => b.isModified()).map((b) => b.save()));

    return res.status(200).json({
      success: true,
      message: 'Borrow records fetched successfully',
      data: { borrows },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while fetching borrow records',
    });
  }
};

// @desc    Get admin dashboard statistics
// @route   GET /api/borrow/stats
// @access  Private/Admin
const getStats = async (req, res) => {
  try {
    const [totalUsers, totalBooks, books, allBorrows] = await Promise.all([
      User.countDocuments(),
      Book.countDocuments(),
      Book.find(),
      Borrow.find(),
    ]);

    allBorrows.forEach(syncStatus);
    await Promise.all(allBorrows.filter((b) => b.isModified()).map((b) => b.save()));

    const totalBorrowed = allBorrows.filter((b) => b.status === 'borrowed' || b.status === 'overdue').length;
    const totalReturned = allBorrows.filter((b) => b.status === 'returned').length;
    const overdueBooks = allBorrows.filter((b) => b.status === 'overdue').length;
    const availableCopies = books.reduce((sum, b) => sum + b.availableCopies, 0);

    return res.status(200).json({
      success: true,
      message: 'Statistics fetched successfully',
      data: {
        totalUsers,
        totalBooks,
        totalBorrowed,
        totalReturned,
        overdueBooks,
        availableCopies,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while fetching statistics',
    });
  }
};

module.exports = { borrowBook, returnBook, getMyBorrows, getAllBorrows, getStats };
