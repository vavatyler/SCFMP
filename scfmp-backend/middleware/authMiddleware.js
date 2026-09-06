const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { getEffectivePermissions, requestPermissions } = require('../config/accessControl');

const resolveRequestedOrganization = (req) => {
  const values = [
    req.get('x-organization-id'),
    req.query?.cooperative_id,
    req.body?.cooperative_id,
  ].filter((value) => value !== undefined && value !== null && value !== '');
  if (values.length === 0) return { organizationId: null };
  const ids = values.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id < 1)) return { error: 'Invalid organization context' };
  if (new Set(ids).size > 1) return { error: 'Conflicting organization context' };
  return { organizationId: ids[0] };
};

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

    const requestedOrganization = resolveRequestedOrganization(req);
    if (requestedOrganization.error) {
      return res.status(400).json({ success: false, message: requestedOrganization.error });
    }
    if (
      requestedOrganization.organizationId
      && user.role !== 'super_admin'
      && requestedOrganization.organizationId !== user.cooperative_id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to the selected organization',
      });
    }

    const permissions = getEffectivePermissions(user);
    const requiredPermissions = requestPermissions(req);
    if (requiredPermissions.some((permission) => !permissions.includes(permission))) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
    }

    req.user = user; // full user instance, cooperative_id + role available downstream
    req.userPermissions = permissions;
    req.organizationId = requestedOrganization.organizationId
      || (user.account_scope === 'organization' ? user.cooperative_id : null);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { verifyToken };
