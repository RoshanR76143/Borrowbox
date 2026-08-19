const express = require('express');
const {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} = require('../controllers/bookController');
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.get('/', getBooks);
router.get('/:id', getBookById);

router.post('/', protect, admin, createBook);
router.put('/:id', protect, admin, updateBook);
router.delete('/:id', protect, admin, deleteBook);

module.exports = router;
