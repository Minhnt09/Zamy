const orderService = require('../services/order.service');
const { verifyVnpaySignature } = require('../services/vnpay.service');
const isAdmin = (user) => user?.role === 'admin' || user?.role === 'ADMIN';
const createOrder = async (req, res) => {
  const { status, data, error, paymentUrl } = await orderService.createOrder(req.body, req.user.id, {
    idempotencyKey: req.get('Idempotency-Key'),
    ipAddress: req.ip,
  });
  if (error) return res.status(status).json({ error });
  return res.status(status).json({ message: 'Đặt hàng thành công', data, paymentUrl });
};
const getOrderByCode = async (req, res) => { const result = await orderService.getOrderByCode(req.params.code, req.user.id, isAdmin(req.user)); return result.error ? res.status(result.status || 400).json({ error: result.error }) : res.json({ data: result.data }); };
const getAllOrders = async (req, res) => { const result = await orderService.getAllOrders(); return result.error ? res.status(result.status || 500).json({ error: result.error }) : res.json({ data: result.data }); };
const updateOrderStatus = async (req, res) => { const result = await orderService.updateOrderStatus(req.params.code, req.body.status); return result.error ? res.status(result.status || 400).json({ error: result.error }) : res.json({ message: 'Cập nhật trạng thái thành công', data: result.data }); };
const vnpayReturn = async (req, res) => { const orderCode = await orderService.getOrderCodeByPaymentRef(String(req.query.vnp_TxnRef || '')); return res.redirect(`${process.env.FRONTEND_URL}/payment-success?orderCode=${orderCode || ''}&vnp_ResponseCode=${req.query.vnp_ResponseCode || ''}`); };
const vnpayIpn = async (req, res) => {
  if (!verifyVnpaySignature(req.query)) return res.json({ RspCode: '97', Message: 'Invalid signature' });
  const amount = Number(req.query.vnp_Amount);
  if (!Number.isInteger(amount) || amount <= 0 || !req.query.vnp_TxnRef) return res.json({ RspCode: '99', Message: 'Invalid request' });
  const success = req.query.vnp_ResponseCode === '00' && req.query.vnp_TransactionStatus === '00';
  const result = await orderService.processVnpayResult({ transactionRef: String(req.query.vnp_TxnRef), amount, success, providerTransactionId: String(req.query.vnp_TransactionNo || '').trim() || undefined });
  return res.json({ RspCode: result.code, Message: result.message });
};
module.exports = { createOrder, getOrderByCode, getAllOrders, updateOrderStatus, vnpayReturn, vnpayIpn };
