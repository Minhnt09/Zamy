const express = require('express');
const router = express.Router();

const {
  createOrder,
  getOrderByCode,
  getAllOrders,
  updateOrderStatus,
  vnpayReturn,
} = require('../controllers/order.controller');
const { requireAuth, verifyAdmin } = require('../middlewares/auth.middleware');

router.post('/', requireAuth, createOrder);
router.get('/vnpay-return', vnpayReturn);          
router.get('/:code', requireAuth, getOrderByCode);
router.get('/', verifyAdmin, getAllOrders);
router.patch('/:code/status', verifyAdmin, updateOrderStatus);

module.exports = router;
