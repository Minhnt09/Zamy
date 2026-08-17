const prisma = require('../lib/prisma');
const { sanitizeLogMessage } = require('../utils/sanitizeLogMessage');

const TIMEOUT_MS = 15 * 60 * 1000;
const BATCH_SIZE = 50;

async function cancelExpiredPayment(paymentId) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: { include: { items: true } } } });
    if (!payment || payment.provider !== 'VNPAY' || payment.status !== 'PENDING' || payment.order.status !== 'PENDING') return false;
    const paymentChanged = await tx.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (paymentChanged.count !== 1) return false;
    const orderChanged = await tx.order.updateMany({ where: { id: payment.orderId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (orderChanged.count !== 1) throw new Error(`Order ${payment.order.orderCode} could not be cancelled`);
    for (const item of payment.order.items) {
      await tx.productVariant.update({ where: { id: item.productVariantId }, data: { stockQuantity: { increment: item.quantity } } });
    }
    return true;
  });
}

async function expirePendingVnpayPayments() {
  const cutoff = new Date(Date.now() - TIMEOUT_MS);
  const payments = await prisma.payment.findMany({
    where: { provider: 'VNPAY', status: 'PENDING', createdAt: { lte: cutoff }, order: { status: 'PENDING' } },
    select: { id: true, transactionRef: true, order: { select: { orderCode: true } } }, orderBy: { createdAt: 'asc' }, take: BATCH_SIZE,
  });
  let cancelled = 0;
  let skipped = 0;
  let failed = 0;
  for (const payment of payments) {
    try {
      if (await cancelExpiredPayment(payment.id)) cancelled += 1;
      else skipped += 1;
    } catch (error) {
      failed += 1;
      console.warn('VNPay timeout job failed', {
        paymentId: payment.id,
        transactionRef: payment.transactionRef,
        orderCode: payment.order.orderCode,
        errorName: error?.name || 'Error',
        errorMessage: sanitizeLogMessage(error?.message),
        ...(error?.code ? { errorCode: error.code } : {}),
      });
    }
  }
  return { scanned: payments.length, cancelled, skipped, failed };
}

module.exports = { expirePendingVnpayPayments, TIMEOUT_MS, BATCH_SIZE };
