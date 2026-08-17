const express = require('express');
const { vnpayTimeout } = require('../controllers/internal-job.controller');
const router = express.Router();
router.post('/jobs/vnpay-timeout', vnpayTimeout);
module.exports = router;
