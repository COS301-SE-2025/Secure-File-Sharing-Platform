const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for mnemonic verification attempts
 * Prevents brute force attacks on mnemonic recovery
 */
const mnemonicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many mnemonic verification attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit'] === 'true';
  }
});

module.exports = mnemonicRateLimit;