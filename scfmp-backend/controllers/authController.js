const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  User,
  TeamMember,
  Cooperative,
  Member,
  PasswordResetToken,
  RefreshToken,
  sequelize,
} = require('../models');
const { sendPasswordResetEmail } = require('../services/emailService');
const { recordAuditEvent } = require('../services/auditService');
const { validatePasswordStrength } = require('../utils/passwordPolicy');
const { normalizeRwandaPhone } = require('../utils/rwandaPhone');
const { getEffectivePermissions, getAccessibleModules } = require('../config/accessControl');
const {
  ACCOUNT_SCOPES,
  ORGANIZATION_ROLES,
  isPlatformRole,
  accountScopeForRole,
} = require('../config/accountRoles');

const RESET_TOKEN_EXPIRES_MINUTES = Number(process.env.RESET_TOKEN_EXPIRES_MINUTES) || 30;
const JWT_ISSUER = process.env.JWT_ISSUER || 'scfmp-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'scfmp-web';

const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

const presentAuthenticatedUser = async (user) => {
  const values = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  const teamProfile = await TeamMember.findOne({
    where: { linked_user_id: user.id },
    attributes: ['id', 'position', 'photo_url', 'status', 'profile_visibility'],
  });
  const effectivePermissions = getEffectivePermissions(user);
  delete values.permissions;
  return {
    ...values,
    official_role: teamProfile?.position || null,
    team_profile_id: teamProfile?.id || null,
    profile_photo_url: teamProfile?.photo_url || null,
    effective_permissions: effectivePermissions,
    accessible_modules: getAccessibleModules(effectivePermissions),
  };
};

const generateAccessToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      cooperative_id: user.cooperative_id,
      token_version: user.token_version,
      type: 'access',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );

const createRefreshToken = async (user, req, options = {}) => {
  const rawToken = jwt.sign(
    {
      id: user.id,
      token_version: user.token_version,
      type: 'refresh',
      jti: crypto.randomUUID(),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
  const decoded = jwt.decode(rawToken);
  await RefreshToken.create(
    {
      user_id: user.id,
      token_hash: hashToken(rawToken),
      expires_at: new Date(decoded.exp * 1000),
      ip_address: req.ip || req.socket?.remoteAddress || null,
      user_agent: req.get('user-agent')?.slice(0, 255) || null,
    },
    options
  );
  return rawToken;
};

const revokeUserRefreshTokens = (userId, options = {}) =>
  RefreshToken.update(
    { revoked_at: new Date() },
    { where: { user_id: userId, revoked_at: null }, ...options }
  );

const register = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, role, preferred_language = 'en' } = req.body;
    const passwordError = validatePasswordStrength(password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    if (req.user.role === 'cooperative_manager' && !['accountant', 'field_officer', 'farmer'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Managers can only create cooperative staff or farmer accounts' });
    }

    if (isPlatformRole(role) && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only Super Admin can create platform accounts' });
    }

    const account_scope = accountScopeForRole(role);
    const cooperative_id = account_scope === ACCOUNT_SCOPES.ORGANIZATION
      ? (req.user.role === 'super_admin' ? req.body.cooperative_id : req.user.cooperative_id)
      : null;
    if (ORGANIZATION_ROLES.includes(role) && !cooperative_id) {
      return res.status(400).json({ success: false, message: 'cooperative_id is required' });
    }

    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ success: false, message: 'Email is already registered' });

    if (cooperative_id && !(await Cooperative.findByPk(cooperative_id))) {
      return res.status(400).json({ success: false, message: 'Cooperative not found' });
    }

    let targetMember = null;
    if (role === 'farmer') {
      targetMember = await Member.findByPk(req.body.member_id);
      if (!targetMember || targetMember.cooperative_id !== Number(cooperative_id)) {
        return res.status(400).json({ success: false, message: 'A member from this cooperative is required for a farmer account' });
      }
      if (targetMember.user_id) {
        return res.status(409).json({ success: false, message: 'This member already has a user account' });
      }
    }

    const transaction = await sequelize.transaction();
    let user;
    try {
      user = await User.create({
        first_name,
        last_name,
        email: email.toLowerCase(),
        phone: normalizeRwandaPhone(phone),
        password_hash: password,
        role,
        account_scope,
        preferred_language,
        cooperative_id,
      }, { transaction });
      if (targetMember) {
        targetMember.user_id = user.id;
        await targetMember.save({ transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'user.created',
      entityType: 'user',
      entityId: user.id,
      metadata: { cooperative_id: user.cooperative_id, role: user.role, account_scope: user.account_scope },
    });
    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    console.error('User registration failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to create the user right now' });
  }
};

const login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  try {
    const user = await User.findOne({ where: { email } });
    const mayAuthenticate = user?.status === 'active' && user.system_access_enabled !== false;
    const isMatch = mayAuthenticate ? await user.comparePassword(req.body.password) : false;
    if (!user || !mayAuthenticate || !isMatch) {
      await recordAuditEvent({
        req,
        actor: user || null,
        action: 'auth.login',
        entityType: 'user',
        entityId: user?.id,
        outcome: 'failure',
        metadata: { email },
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.last_login_at = new Date();
    await user.save();
    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user, req);
    await recordAuditEvent({ req, actor: user, action: 'auth.login', entityType: 'user', entityId: user.id });

    return res.status(200).json({
      success: true,
      data: { user: await presentAuthenticatedUser(user), accessToken, refreshToken },
    });
  } catch (err) {
    console.error('Login failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to sign in right now' });
  }
};

const refresh = async (req, res) => {
  const rawToken = req.body.refreshToken;
  if (!rawToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const decoded = jwt.verify(rawToken, process.env.JWT_REFRESH_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (decoded.type !== 'refresh') throw new Error('Wrong token type');

    const stored = await RefreshToken.findOne({
      where: { token_hash: hashToken(rawToken) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!stored || stored.used_at || stored.revoked_at || stored.expires_at <= new Date()) {
      await transaction.rollback();
      if (decoded.id) await revokeUserRefreshTokens(decoded.id);
      return res.status(401).json({ success: false, message: 'Invalid or reused refresh token' });
    }

    const user = await User.findByPk(decoded.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (
      !user ||
      user.status !== 'active' ||
      user.system_access_enabled === false ||
      decoded.token_version !== user.token_version
    ) {
      await transaction.rollback();
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    stored.used_at = new Date();
    await stored.save({ transaction });
    const refreshToken = await createRefreshToken(user, req, { transaction });
    const accessToken = generateAccessToken(user);
    await transaction.commit();
    return res.status(200).json({ success: true, data: { accessToken, refreshToken } });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

const logout = async (req, res) => {
  try {
    const rawToken = req.body.refreshToken;
    if (rawToken) {
      await RefreshToken.update(
        { revoked_at: new Date() },
        { where: { token_hash: hashToken(rawToken), revoked_at: null, user_id: req.user.id } }
      );
    }
    await recordAuditEvent({ req, actor: req.user, action: 'auth.logout', entityType: 'user', entityId: req.user.id });
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to log out right now' });
  }
};

const getProfile = async (req, res) => res.status(200).json({
  success: true,
  data: await presentAuthenticatedUser(req.user),
});

const updatePreferredLanguage = async (req, res) => {
  try {
    req.user.preferred_language = req.body.preferred_language;
    await req.user.save();
    return res.status(200).json({ success: true, data: await presentAuthenticatedUser(req.user) });
  } catch (err) {
    console.error('Language preference update failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to update language preference' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const passwordError = validatePasswordStrength(new_password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    const user = await User.findByPk(req.user.id);
    if (!(await user.comparePassword(current_password))) {
      await recordAuditEvent({
        req,
        actor: user,
        action: 'auth.password_changed',
        entityType: 'user',
        entityId: user.id,
        outcome: 'failure',
      });
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password_hash = new_password;
    user.token_version += 1;
    await user.save();
    await revokeUserRefreshTokens(user.id);
    await recordAuditEvent({ req, actor: user, action: 'auth.password_changed', entityType: 'user', entityId: user.id });
    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to update the password right now' });
  }
};

const forgotPassword = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const genericResponse = {
    success: true,
    message: 'If an active account matches that email, a password reset link will be sent shortly.',
  };
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || user.status !== 'active') {
      await recordAuditEvent({
        req,
        actor: user || null,
        action: 'auth.password_reset_requested',
        entityType: 'user',
        entityId: user?.id,
        outcome: 'failure',
        metadata: { email },
      });
      return res.status(200).json(genericResponse);
    }

    await PasswordResetToken.destroy({ where: { user_id: user.id, used_at: null } });
    const rawToken = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      user_id: user.id,
      token_hash: hashToken(rawToken),
      expires_at: new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000),
    });
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetLink, RESET_TOKEN_EXPIRES_MINUTES);
    await recordAuditEvent({
      req,
      actor: user,
      action: 'auth.password_reset_requested',
      entityType: 'user',
      entityId: user.id,
    });
    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error('Password reset request failed:', err.message);
    // Preserve the same response for existing and non-existing accounts.
    return res.status(200).json(genericResponse);
  }
};

const resetPasswordWithToken = async (req, res) => {
  const passwordError = validatePasswordStrength(req.body.new_password);
  if (passwordError) return res.status(400).json({ success: false, message: passwordError });

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const resetToken = await PasswordResetToken.findOne({
      where: { token_hash: hashToken(req.body.token) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!resetToken || resetToken.used_at || resetToken.expires_at <= new Date()) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'This reset link is invalid, expired, or already used.' });
    }

    const user = await User.findByPk(resetToken.user_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'This reset link is invalid.' });
    }

    user.password_hash = req.body.new_password;
    user.token_version += 1;
    resetToken.used_at = new Date();
    await user.save({ transaction });
    await resetToken.save({ transaction });
    await revokeUserRefreshTokens(user.id, { transaction });
    await PasswordResetToken.update(
      { used_at: new Date() },
      { where: { user_id: user.id, used_at: null, id: { [Op.ne]: resetToken.id } }, transaction }
    );
    await transaction.commit();
    await recordAuditEvent({ req, actor: user, action: 'auth.password_reset', entityType: 'user', entityId: user.id });
    return res.status(200).json({ success: true, message: 'Your password has been reset. You can now log in.' });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Password reset failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to reset the password right now' });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getProfile,
  updatePreferredLanguage,
  changePassword,
  forgotPassword,
  resetPasswordWithToken,
};
