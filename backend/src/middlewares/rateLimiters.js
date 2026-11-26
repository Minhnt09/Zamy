const { rateLimit } = require('express-rate-limit');

const RATE_LIMIT_MESSAGE = 'Too many requests, please try again later';

function createRateLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: RATE_LIMIT_MESSAGE },
  });
}

const registerLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const adminLoginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const checkoutLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10 });
const internalJobLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 5 });

module.exports = {
  RATE_LIMIT_MESSAGE,
  registerLimiter,
  loginLimiter,
  adminLoginLimiter,
  checkoutLimiter,
  internalJobLimiter,
};
