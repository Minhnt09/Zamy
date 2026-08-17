const express = require('express');
const { vnpayIpn } = require('../controllers/order.controller');
const router = express.Router();
router.get('/vnpay/ipn', vnpayIpn);
module.exports = router;
