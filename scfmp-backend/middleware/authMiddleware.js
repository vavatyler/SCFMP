const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { getEffectivePermissions, requestPermissions } = require('../config/accessControl');

/**
 * Verifies the Bearer token, attaches the authenticated user to req.user.
 * Every protected route uses this first.
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'scfmp-api',
      audience: process.env.JWT_AUDIENCE || 'scfmp-web',
    });

    if (decoded.type !== 'access') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const user = await User.findByPk(decoded.id);
    if (
      !user ||
      user.status !== 'active' ||
      user.system_access_enabled === false ||
      decoded.token_version !== user.token_version
    ) {
      return res.status(401).json({ success: false, message: 'Account access is unavailable' });
    }

    const permissions = getEffectivePermissions(user);
    const requiredPermissions = requestPermissions(req);
    if (requiredPermissions.some((permission) => !permissions.includes(permission))) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }

    req.user = user; // full user instance, cooperative_id + role available downstream
    req.userPermissions = permissions;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { verifyToken };
