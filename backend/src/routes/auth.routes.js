const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.post('/admin/login', authController.loginAdmin);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/me', requireAuth, authController.getCurrentUser);

module.exports = router;
