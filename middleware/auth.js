/**
 * DeadlineDeck - Authentication & Ownership Verification Middleware
 */

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be signed in to access this resource.'
    });
  }

  req.userId = req.session.userId;
  next();
}

module.exports = {
  requireAuth
};
