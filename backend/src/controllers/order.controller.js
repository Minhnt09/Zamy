const orderService = require('../services/order.service');
const { createVnpayPaymentUrl } = require('../services/vnpay.service');

const createOrder = (req, res) => {
  const result = orderService.createOrder(req.body);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }

  const order = result.data;
  if (req.body.paymentMethod === 'vnpay') {
    const ipAddr = 
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress ||
      '127.0.0.1';

    const paymentUrl = createVnpayPaymentUrl(order, ipAddr);

    return res.status(201).json({
      message: 'Đặt hàng thành công',
      data: order,
      paymentUrl,
    });
  }

  return res.status(201).json({
    message: 'Dat hang thanh cong',
    data: order,
  });
};

const getOrderByCode = (req, res) => {
  const { code } = req.params;
  const result = orderService.getOrderByCode(code);
  if (result.error) return res.status(result.status || 404).json({ error: result.error });
  return res.json({ data: result.data });
};

const getAllOrders = (req, res) => {
  const result = orderService.getAllOrders();
  return res.json({ data: result.data });
};

const updateOrderStatus = (req, res) => {
  const { code } = req.params;
  const { status } = req.body;

  const result = orderService.updateOrderStatus(code, status);
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  return res.json({ message: 'Cập nhật trạng thái thành công', data: result.data });
};
const vnpayReturn = (req, res) => {
    return res.redirect(`${process.env.FRONTEND_URL}/payment-success?orderCode=${req.query.vnp_TxnRef}&vnp_ResponseCode=${req.query.vnp_ResponseCode}`);
};

module.exports = { 
  createOrder, 
  getOrderByCode, 
  getAllOrders, 
  updateOrderStatus, 
  vnpayReturn 
};
