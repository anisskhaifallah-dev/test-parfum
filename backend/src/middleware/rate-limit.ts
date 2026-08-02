import rateLimit from 'express-rate-limit';

// Kept blunt on purpose: this only needs to make brute-forcing the staff login
// endpoint impractical, not implement a full account-lockout policy.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});
