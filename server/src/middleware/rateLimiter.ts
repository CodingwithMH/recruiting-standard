import rateLimit from "express-rate-limit";

export const standardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    error: "Too many requests from this IP address, please try again after 15 minutes.",
    timestamp: new Date().toISOString(),
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Strict limit for login/registration attempts
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    error: "Too many authentication attempts, please try again after 15 minutes.",
    timestamp: new Date().toISOString(),
  },
});

export const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Public contact form abuse protection
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    error: "Too many messages sent from this IP address. Please try again after 15 minutes.",
    timestamp: new Date().toISOString(),
  },
});
