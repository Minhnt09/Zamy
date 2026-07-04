const crypto = require('crypto');
const qs = require('qs');

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).map(key => encodeURIComponent(key)).sort();

  keys.forEach(key => {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  });
  return sorted;
}

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');

  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function createVnpayPaymentUrl(order, ipAddr) {
  const vnpUrl = process.env.VNPAY_PAYMENT_URL;
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secretKey = process.env.VNPAY_HASH_SECRET;
  const returnUrl = process.env.VNPAY_RETURN_URL;

  let vnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: order.grandTotal * 100,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: order.orderCode,
    vnp_OrderInfo: `Thanh toan don hang ${order.orderCode}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: formatDate(new Date()),
  };

  vnpParams = sortObject(vnpParams);

  const signData = qs.stringify(vnpParams, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  vnpParams.vnp_SecureHash = signed;

  return `${vnpUrl}?${qs.stringify(vnpParams, { encode: false })}`;
}

module.exports = {
  createVnpayPaymentUrl,
};