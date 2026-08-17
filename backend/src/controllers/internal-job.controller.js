const crypto = require('crypto');
const { expirePendingVnpayPayments } = require('../services/vnpay-timeout.service');

function validSecret(value) {
  const expected = process.env.INTERNAL_JOB_SECRET;
  if (!expected || !value) return false;
  const actualBuffer = Buffer.from(String(value));
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

async function vnpayTimeout(req, res) {
  if (!validSecret(req.get('x-internal-job-secret'))) return res.status(401).json({ error: 'Unauthorized' });
  const result = await expirePendingVnpayPayments();
  return res.json({ data: result });
}

module.exports = { vnpayTimeout };
