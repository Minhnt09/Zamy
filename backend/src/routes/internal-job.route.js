const express = require('express');
const { vnpayTimeout } = require('../controllers/internal-job.controller');
const { internalJobLimiter } = require('../middlewares/rateLimiters');
const router = express.Router();
router.post('/jobs/vnpay-timeout', internalJobLimiter, vnpayTimeout);
module.exports = router;
