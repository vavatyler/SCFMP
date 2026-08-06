/**
 * Restricts a route to specific roles.
 * Usage: router.post('/cooperatives', verifyToken, checkRole('super_admin'), handler)
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not permitted to perform this action`,
      });
    }
    next();
  };
};

/**
 * Ensures a non-super_admin user can only act within their own cooperative.
 * Compares req.user.cooperative_id against a cooperative_id found in
 * req.params, req.body, or req.query (checked in that order).
 */
const checkCooperativeScope = (req, res, next) => {
  if (req.user.role === 'super_admin') return next(); // SNDS staff see everything

  const targetCoopId =
    req.params.cooperativeId ||
    req.params.id || // covers routes like /cooperatives/:id where :id IS the cooperative id
    req.body.cooperative_id ||
    req.query.cooperative_id;

  if (targetCoopId && Number(targetCoopId) !== req.user.cooperative_id) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this cooperative\'s data',
    });
  }
  next();
};

module.exports = { checkRole, checkCooperativeScope };
