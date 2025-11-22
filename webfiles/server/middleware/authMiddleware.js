// Simple auth middleware - can be enhanced later
const requireAuth = (req, res, next) => {
  // For now, just pass through - you can add proper JWT validation here
  next();
};

module.exports = requireAuth;