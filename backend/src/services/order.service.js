const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');

const SHIPPING_FEE = 20000;
const transitions = { PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['SHIPPING', 'CANCELLED'], SHIPPING: ['COMPLETED'] };
class OrderInputError extends Error { constructor(status, message) { super(message); this.status = status; } }
const code = () => `ZAMY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const positive = (value, name) => { const n = Number(value); if (!Number.isInteger(n) || n <= 0) throw new OrderInputError(400, `${name} không hợp lệ`); return n; };
const apiStatus = (status) => status.toLowerCase();

function normalizePayload(payload) {
  const customer = payload?.customer || {};
  const recipientName = String(customer.name || '').trim();
  const recipientPhone = String(customer.phone || '').trim();
  const shippingAddress = String(customer.address || '').trim();
  const recipientEmail = String(customer.email || '').trim() || null;
  if (!recipientName || !recipientPhone || !shippingAddress) throw new OrderInputError(400, 'Thiếu thông tin khách hàng');
  const method = String(payload?.paymentMethod || 'cod').toLowerCase();
  if (!['cod', 'vnpay'].includes(method)) throw new OrderInputError(400, 'Phương thức thanh toán không hợp lệ');
  if (!Array.isArray(payload?.items) || !payload.items.length) throw new OrderInputError(400, 'Đơn hàng không có sản phẩm');
  const grouped = new Map();
  for (const item of payload.items) {
    const productId = positive(item?.productId, 'productId');
    const quantity = positive(item?.qty ?? item?.quantity, 'quantity');
    const size = String(item?.size || item?.selectedSize || '').trim().toUpperCase();
    if (!size) throw new OrderInputError(400, 'Size không hợp lệ');
    const key = `${productId}:${size}`;
    grouped.set(key, { productId, size, quantity: (grouped.get(key)?.quantity || 0) + quantity });
  }
  return { recipientName, recipientPhone, recipientEmail, shippingAddress, provider: method === 'cod' ? 'COD' : 'VNPAY', items: [...grouped.values()] };
}

function mapOrder(order) {
  return { id: order.id, orderCode: order.orderCode, userId: order.userId, customer: { name: order.recipientName, phone: order.recipientPhone, email: order.recipientEmail, address: order.shippingAddress }, items: order.items.map((item) => ({ productId: item.productVariant.productId, name: item.productName, price: item.unitPrice, size: item.size, qty: item.quantity, subtotal: item.lineTotal, variantSku: item.variantSku })), subtotal: order.subtotal, shippingFee: order.shippingFee, grandTotal: order.grandTotal, total: order.grandTotal, status: apiStatus(order.status), payment: order.payments[0] ? { provider: order.payments[0].provider.toLowerCase(), status: apiStatus(order.payments[0].status), amount: order.payments[0].amount, transactionRef: order.payments[0].transactionRef } : null, createdAt: order.createdAt };
}
const includeOrder = { items: { include: { productVariant: { select: { productId: true } } } }, payments: { orderBy: { id: 'asc' } } };
function errorResult(error) { if (error instanceof OrderInputError) return { status: error.status, error: error.message }; if (error?.code === 'P2002') return { status: 409, error: 'Không thể tạo order code, vui lòng thử lại' }; return { status: 500, error: 'Không thể xử lý đơn hàng' }; }

async function createOrder(payload, userId) {
  try {
    const input = normalizePayload(payload);
    const order = await prisma.$transaction(async (tx) => {
      const resolved = [];
      for (const item of input.items) {
        const variant = await tx.productVariant.findFirst({ where: { productId: item.productId, size: item.size, isActive: true, product: { isActive: true } }, include: { product: true } });
        if (!variant) throw new OrderInputError(400, `Sản phẩm/size ${item.productId}/${item.size} không còn khả dụng`);
        const decremented = await tx.$executeRaw(Prisma.sql`UPDATE product_variants SET stock_quantity = stock_quantity - ${item.quantity}, updated_at = CURRENT_TIMESTAMP WHERE id = ${variant.id} AND is_active = true AND stock_quantity >= ${item.quantity}`);
        if (decremented !== 1) throw new OrderInputError(400, `Sản phẩm ${variant.product.name} không đủ tồn kho`);
        resolved.push({ ...item, variant });
      }
      const subtotal = resolved.reduce((sum, item) => sum + item.variant.product.price * item.quantity, 0);
      const orderCode = code();
      const order = await tx.order.create({ data: { orderCode, userId, recipientName: input.recipientName, recipientPhone: input.recipientPhone, recipientEmail: input.recipientEmail, shippingAddress: input.shippingAddress, subtotal, shippingFee: SHIPPING_FEE, grandTotal: subtotal + SHIPPING_FEE, status: 'PENDING', items: { create: resolved.map((item) => ({ productVariantId: item.variant.id, productName: item.variant.product.name, variantSku: item.variant.sku, size: item.variant.size, unitPrice: item.variant.product.price, quantity: item.quantity, lineTotal: item.variant.product.price * item.quantity })) }, payments: { create: { provider: input.provider, amount: subtotal + SHIPPING_FEE, status: 'PENDING', transactionRef: `${orderCode}-PAY` } } }, include: includeOrder });
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id, productVariantId: { in: resolved.map((item) => item.variant.id) } } });
      return order;
    });
    return { status: 201, data: mapOrder(order) };
  } catch (error) { return errorResult(error); }
}

async function getOrderByCode(orderCode, userId, isAdmin) {
  try {
    const order = await prisma.order.findUnique({ where: { orderCode }, include: includeOrder });
    if (!order) return { status: 404, error: 'Không tìm thấy đơn hàng' };
    if (!isAdmin && order.userId !== userId) return { status: 403, error: 'Bạn không có quyền xem đơn hàng này' };
    return { status: 200, data: mapOrder(order) };
  } catch (error) { return errorResult(error); }
}
async function getAllOrders() { try { const orders = await prisma.order.findMany({ include: includeOrder, orderBy: { createdAt: 'desc' } }); return { status: 200, data: orders.map(mapOrder) }; } catch (error) { return errorResult(error); } }

async function updateOrderStatus(orderCode, rawStatus) {
  const nextStatus = String(rawStatus || '').trim().toUpperCase();
  if (!Object.values(transitions).flat().includes(nextStatus)) return { status: 400, error: 'Status không hợp lệ' };
  try {
    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { orderCode }, include: includeOrder });
      if (!existing) throw new OrderInputError(404, 'Không tìm thấy đơn hàng');
      if (!transitions[existing.status]?.includes(nextStatus)) throw new OrderInputError(400, 'Chuyển trạng thái đơn hàng không hợp lệ');
      const payment = existing.payments[0];
      if (nextStatus === 'CONFIRMED' && payment?.provider === 'VNPAY' && payment.status !== 'PAID') throw new OrderInputError(400, 'VNPay chưa được xác nhận thanh toán');
      const changed = await tx.order.updateMany({ where: { id: existing.id, status: existing.status }, data: { status: nextStatus } });
      if (changed.count !== 1) throw new OrderInputError(409, 'Đơn hàng vừa được cập nhật, vui lòng thử lại');
      if (nextStatus === 'CANCELLED') {
        for (const item of existing.items) await tx.productVariant.update({ where: { id: item.productVariantId }, data: { stockQuantity: { increment: item.quantity } } });
        if (payment?.status === 'PENDING') await tx.payment.update({ where: { id: payment.id }, data: { status: 'CANCELLED' } });
      }
      if (nextStatus === 'COMPLETED' && payment?.provider === 'COD' && payment.status === 'PENDING') await tx.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } });
      return tx.order.findUnique({ where: { id: existing.id }, include: includeOrder });
    });
    return { status: 200, data: mapOrder(order) };
  } catch (error) { return errorResult(error); }
}
async function processVnpayResult({ transactionRef, amount, success, providerTransactionId }) {
  const payment = await prisma.payment.findUnique({ where: { transactionRef }, include: { order: { include: { items: true } } } });
  if (!payment || payment.provider !== 'VNPAY') return { code: '01', message: 'Order not found' };
  if (!Number.isInteger(amount) || amount !== payment.amount * 100) return { code: '04', message: 'Invalid amount' };
  if (payment.status !== 'PENDING') return { code: '02', message: 'Order already confirmed' };
  if (!success && payment.order.status !== 'PENDING') return { code: '02', message: 'Order already confirmed' };
  try {
    const result = await prisma.$transaction(async (tx) => {
      const changed = await tx.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: success ? { status: 'PAID', ...(providerTransactionId ? { providerTransactionId } : {}) } : { status: 'FAILED' } });
      if (changed.count !== 1) return 'duplicate';
      if (!success) {
        const cancelled = await tx.order.updateMany({ where: { id: payment.orderId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
        if (cancelled.count === 1) for (const item of payment.order.items) await tx.productVariant.update({ where: { id: item.productVariantId }, data: { stockQuantity: { increment: item.quantity } } });
      }
      return 'updated';
    });
    return { code: result === 'duplicate' ? '02' : '00', message: result === 'duplicate' ? 'Order already confirmed' : 'Confirm Success' };
  } catch (error) { return error?.code === 'P2002' ? { code: '02', message: 'Order already confirmed' } : { code: '99', message: 'Unknown error' }; }
}

async function getOrderCodeByPaymentRef(transactionRef) {
  const payment = await prisma.payment.findUnique({ where: { transactionRef }, select: { order: { select: { orderCode: true } } } });
  return payment?.order.orderCode || null;
}

module.exports = { createOrder, getOrderByCode, getAllOrders, updateOrderStatus, processVnpayResult, getOrderCodeByPaymentRef };
