const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { registerLimiter, loginLimiter, adminLoginLimiter } = require('../middlewares/rateLimiters');

router.post('/admin/login', adminLoginLimiter, authController.loginAdmin);
router.post('/register', registerLimiter, authController.registerUser);
router.post('/login', loginLimiter, authController.loginUser);
router.get('/me', requireAuth, authController.getCurrentUser);

module.exports = router;
