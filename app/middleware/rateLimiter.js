// middleware/rateLimiter.js
const rateLimitStore = new Map();
const WINDOW_SIZE_IN_HOURS = 24;
const MAX_WINDOW_REQUEST_COUNT = 100;
const WINDOW_LOG_INTERVAL_IN_HOURS = 1;

function rateLimiter(req, res, next) {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE_IN_HOURS * 60 * 60 * 1000;

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }

  const requestTimestamps = rateLimitStore.get(ip);

  // Remove old timestamps
  const validTimestamps = requestTimestamps.filter(
    (timestamp) => timestamp > windowStart
  );

  if (validTimestamps.length >= MAX_WINDOW_REQUEST_COUNT) {
    return res.status(429).json({
      error: "Too many requests",
      message: `Maximum ${MAX_WINDOW_REQUEST_COUNT} requests per ${WINDOW_SIZE_IN_HOURS} hours allowed.`,
    });
  }

  // Add current timestamp
  validTimestamps.push(now);
  rateLimitStore.set(ip, validTimestamps);

  next();
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE_IN_HOURS * 60 * 60 * 1000;

  for (const [ip, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter(
      (timestamp) => timestamp > windowStart
    );
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, validTimestamps);
    }
  }
}, WINDOW_LOG_INTERVAL_IN_HOURS * 60 * 60 * 1000);

module.exports = rateLimiter;
