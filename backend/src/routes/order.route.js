const express = require('express');
const router = express.Router();

const {
  createOrder,
  getOrderByCode,
  getAllOrders,
  updateOrderStatus,
  vnpayReturn,
} = require('../controllers/order.controller');

router.post('/', createOrder);
router.get('/vnpay-return', vnpayReturn);          
router.get('/:code', getOrderByCode);  
router.get('/', getAllOrders);         
router.patch('/:code/status', updateOrderStatus); 

module.exports = router;
