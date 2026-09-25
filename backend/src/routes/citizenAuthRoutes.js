import express from 'express';
import {
  requestRegistrationOtp,
  verifyRegistration,
  requestLoginOtp,
  verifyLogin,
  getMe
} from '../controllers/citizenAuthController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { authRateLimiter, otpVerifyRateLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.post('/register/request-otp', authRateLimiter, requestRegistrationOtp);
router.post('/register/verify-otp', otpVerifyRateLimiter, verifyRegistration);
router.post('/login/request-otp', authRateLimiter, requestLoginOtp);
router.post('/login/verify-otp', otpVerifyRateLimiter, verifyLogin);
router.get('/me', authMiddleware('citizen'), getMe);

export default router;
