import rateLimit from 'express-rate-limit';

// Login, OTP request and OTP verify are the brute-forceable endpoints (previously had zero rate
// limiting anywhere in the app). Keyed per-IP by express-rate-limit's default.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' }
});

export const otpVerifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' }
});
