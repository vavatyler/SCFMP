const { Op } = require('sequelize');
const { User, Cooperative, RefreshToken, AuditLog } = require('../models');
const { recordAuditEvent } = require('../services/auditService');
const { validatePasswordStrength } = require('../utils/passwordPolicy');
const { getEffectivePermissions, getAccessibleModules } = require('../config/accessControl');

const presentListedUser = (user, includeAccess) => {
  const values = user.toJSON();
  const officialRole = values.teamProfile?.position || null;
  delete values.teamProfile;
  delete values.token_version;
  if (includeAccess) {
    const effectivePermissions = getEffectivePermissions(user);
    values.custom_permissions = user.permissions ?? null;
    values.effective_permissions = effectivePermissions;
    values.accessible_modules = getAccessibleModules(effectivePermissions);
    values.system_access_enabled = user.system_access_enabled !== false;
  } else {
    delete values.system_access_enabled;
  }
  return { ...values, official_role: officialRole };
};

/**
 * GET /api/users
 * super_admin: sees everyone, optionally filtered by ?cooperative_id=
 * cooperative_manager: sees only their own cooperative's staff
 */
const list = async (req, res) => {
  try {
    const where = {};

    if (req.user.role !== 'super_admin') {
      where.cooperative_id = req.user.cooperative_id;
    } else if (req.query.cooperative_id) {
      where.cooperative_id = req.query.cooperative_id;
    }
    if (req.query.role) where.role = req.query.role;
    if (req.query.search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${req.query.search}%` } },
        { last_name: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const users = await User.findAll({
      where,
      include: [
        { model: Cooperative, as: 'cooperative', attributes: ['id', 'name'] },
        { association: 'teamProfile', attributes: ['id', 'position', 'photo_url', 'profile_visibility', 'status'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      data: users.map((user) => presentListedUser(user, req.user.role === 'super_admin')),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/users/:id/status
 * Activate or deactivate a user account (super_admin or that cooperative's manager).
 */
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be active or inactive' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.user.role !== 'super_admin' && user.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You can't deactivate your own account" });
    }

    user.status = status;
    if (status === 'inactive') user.token_version += 1;
    await user.save();
    if (status === 'inactive') {
      await RefreshToken.update({ revoked_at: new Date() }, { where: { user_id: user.id, revoked_at: null } });
    }
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'user.status_changed',
      entityType: 'user',
      entityId: user.id,
      metadata: { status },
    });

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/users/:id/reset-password
 * super_admin or that cooperative's manager sets a new password for a staff account
 * (e.g. when someone forgets their password). No knowledge of the old password needed —
 * that's what distinguishes this from the self-service /auth/change-password.
 */
const resetPassword = async (req, res) => {
  try {
    const { new_password } = req.body;
    const passwordError = validatePasswordStrength(new_password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.user.role !== 'super_admin' && user.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    user.password_hash = new_password; // re-hashed automatically by the model's beforeUpdate hook
    user.token_version += 1;
    await user.save();
    await RefreshToken.update({ revoked_at: new Date() }, { where: { user_id: user.id, revoked_at: null } });
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'user.password_reset_by_admin',
      entityType: 'user',
      entityId: user.id,
    });

    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (req.user.role !== 'super_admin' && user.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role === 'cooperative_manager' && (user.role === 'super_admin' || req.body.role === 'super_admin')) {
      return res.status(403).json({ success: false, message: 'Managers cannot change super administrator accounts' });
    }

    const oldRole = user.role;
    const updates = {};
    ['first_name', 'last_name', 'phone', 'preferred_language'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (req.body.role !== undefined) {
      const allowed = req.user.role === 'super_admin'
        ? ['super_admin', 'cooperative_manager', 'accountant', 'field_officer', 'farmer']
        : ['accountant', 'field_officer', 'farmer'];
      if (!allowed.includes(req.body.role)) {
        return res.status(403).json({ success: false, message: 'You cannot assign that role' });
      }
      updates.role = req.body.role;
      if (req.body.role === 'super_admin') updates.cooperative_id = null;
    }
    await user.update(updates);
    if (oldRole !== user.role) {
      user.token_version += 1;
      await user.save();
      await RefreshToken.update({ revoked_at: new Date() }, { where: { user_id: user.id, revoked_at: null } });
      await recordAuditEvent({
        req,
        actor: req.user,
        action: 'user.role_changed',
        entityType: 'user',
        entityId: user.id,
        metadata: { from: oldRole, to: user.role },
      });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const where = {};
    if (req.user.role !== 'super_admin') where.cooperative_id = req.user.cooperative_id;
    if (req.query.action) where.action = req.query.action;
    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'actor', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });
    return res.status(200).json({ success: true, data: rows, pagination: { total: count, page, limit } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, update, updateStatus, resetPassword, listAuditLogs };
