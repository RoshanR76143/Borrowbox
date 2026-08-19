const express = require('express');
const {
  register,
  login,
  getMe,
  updateMe,
  getAllUsers,
  getUserById,
  setUserStatus,
} = require('../controllers/authController');
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

// Admin: user management
router.get('/users', protect, admin, getAllUsers);
router.get('/users/:id', protect, admin, getUserById);
router.put('/users/:id/status', protect, admin, setUserStatus);

module.exports = router;
