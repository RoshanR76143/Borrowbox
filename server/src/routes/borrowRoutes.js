const express = require('express');
const {
  borrowBook,
  returnBook,
  getMyBorrows,
  getAllBorrows,
  getStats,
} = require('../controllers/borrowController');
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.post('/', protect, borrowBook);
router.post('/:id/return', protect, returnBook);

router.get('/my', protect, getMyBorrows);
router.get('/stats', protect, admin, getStats);
router.get('/', protect, admin, getAllBorrows);

module.exports = router;
