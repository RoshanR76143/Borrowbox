const Book = require('../models/Book');
const Borrow = require('../models/Borrow');

// @desc    Get all books (supports search, category filter, sort)
// @route   GET /api/books
// @access  Public
const getBooks = async (req, res) => {
  try {
    const { search, category, sort } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'title-asc') sortOption = { title: 1 };
    if (sort === 'title-desc') sortOption = { title: -1 };
    if (sort === 'author-asc') sortOption = { author: 1 };
    if (sort === 'availability') sortOption = { availableCopies: -1 };

    const books = await Book.find(query).sort(sortOption);

    return res.status(200).json({
      success: true,
      message: 'Books fetched successfully',
      data: { books, count: books.length },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while fetching books',
    });
  }
};

// @desc    Get a single book
// @route   GET /api/books/:id
// @access  Public
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Book fetched successfully',
      data: { book },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while fetching the book',
    });
  }
};

// @desc    Create a new book
// @route   POST /api/books
// @access  Private/Admin
const createBook = async (req, res) => {
  try {
    const { title, author, description, category, isbn, coverImage, totalCopies } = req.body;

    if (!title || !author || !description || !category || !isbn) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, description, category and ISBN are required',
      });
    }

    const copies = Number.isFinite(Number(totalCopies)) ? Number(totalCopies) : 1;

    const book = await Book.create({
      title: title.trim(),
      author: author.trim(),
      description: description.trim(),
      category,
      isbn: isbn.trim(),
      coverImage: coverImage ? coverImage.trim() : '',
      totalCopies: copies,
      availableCopies: copies,
    });

    return res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: { book },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A book with this ISBN already exists',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while creating the book',
    });
  }
};

// @desc    Update a book
// @route   PUT /api/books/:id
// @access  Private/Admin
const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    const { title, author, description, category, isbn, coverImage, totalCopies, availableCopies } = req.body;

    if (title !== undefined) book.title = title.trim();
    if (author !== undefined) book.author = author.trim();
    if (description !== undefined) book.description = description.trim();
    if (category !== undefined) book.category = category;
    if (isbn !== undefined) book.isbn = isbn.trim();
    if (coverImage !== undefined) book.coverImage = coverImage.trim();

    if (totalCopies !== undefined) {
      const newTotal = Number(totalCopies);
      const diff = newTotal - book.totalCopies;
      book.totalCopies = newTotal;
      book.availableCopies = Math.max(0, book.availableCopies + diff);
    }

    if (availableCopies !== undefined) {
      book.availableCopies = Math.min(Number(availableCopies), book.totalCopies);
    }

    await book.save();

    return res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: { book },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A book with this ISBN already exists',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while updating the book',
    });
  }
};

// @desc    Delete a book
// @route   DELETE /api/books/:id
// @access  Private/Admin
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    const activeBorrow = await Borrow.findOne({ book: book._id, status: { $in: ['borrowed', 'overdue'] } });

    if (activeBorrow) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a book that currently has active borrows',
      });
    }

    await book.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Book deleted successfully',
      data: {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while deleting the book',
    });
  }
};

module.exports = { getBooks, getBookById, createBook, updateBook, deleteBook };
