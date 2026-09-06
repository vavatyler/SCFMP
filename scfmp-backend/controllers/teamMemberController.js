const { TeamMember, User, RefreshToken, sequelize } = require('../models');
const { recordAuditEvent } = require('../services/auditService');
const {
  getEffectivePermissions,
  getAccessibleModules,
  validatePermissions,
} = require('../config/accessControl');
const { isOfficialTeamRole } = require('../config/teamRoles');
const { ACCOUNT_SCOPES, PLATFORM_ROLES } = require('../config/accountRoles');
const { saveTeamPhoto, streamStoredTeamPhoto } = require('../services/teamPhotoStorageService');
const { UPLOAD_DIR } = require('../middleware/uploadMiddleware');
const path = require('path');

const cleanOptional = (value) => String(value || '').trim() || null;
const accountAttributes = [
  'id',
  'first_name',
  'last_name',
  'email',
  'role',
  'account_scope',
  'status',
  'last_login_at',
  'system_access_enabled',
  'permissions',
];
const accountInclude = { model: User, as: 'userAccount', attributes: accountAttributes };

const httpError = (status, message) => Object.assign(new Error(message), { status });

const respondWithError = (res, error) => {
  const status = error.status || (error.name?.startsWith('Sequelize') ? 422 : 500);
  if (status >= 500) console.error('Team member request failed:', error);
  const message = status >= 500 ? 'Unable to update the Team right now' : error.message;
  return res.status(status).json({ success: false, message });
};

const publicProfile = (member) => ({
  id: member.id,
  full_name: member.full_name,
  position: member.position,
  biography: member.biography,
  responsibilities: member.responsibilities,
  skills: member.skills,
  photo_url: member.photo_url,
  linkedin_url: member.linkedin_url,
  github_url: member.github_url,
  email: member.email,
  status: member.status,
  display_order: member.display_order,
});

const managementProfile = (member) => {
  const profile = publicProfile(member);
  const account = member.userAccount;
  const effectivePermissions = account ? getEffectivePermissions(account) : [];
  return {
    ...profile,
    profile_visibility: member.profile_visibility,
    linked_user_id: member.linked_user_id,
    access: {
      system_access_enabled: account ? account.system_access_enabled !== false : false,
      account_status: account?.status || 'not_linked',
      platform_role: account?.role || null,
      account_scope: account?.account_scope || null,
      last_login_at: account?.last_login_at || null,
      custom_permissions: account?.permissions ?? null,
      permissions: effectivePermissions,
      accessible_modules: getAccessibleModules(effectivePermissions),
      account: account ? {
        id: account.id,
        full_name: `${account.first_name} ${account.last_name}`.trim(),
        email: account.email,
      } : null,
    },
  };
};

const loadMember = (id, options = {}) => TeamMember.findByPk(id, {
  include: [accountInclude],
  ...options,
});

const auditAccessEvents = async (req, user, events) => {
  for (const event of events) {
    await recordAuditEvent({
      req,
      actor: req.user,
      action: event.action,
      entityType: 'user',
      entityId: user.id,
      metadata: event.metadata,
    });
  }
};

const updateAccountAccess = async ({ req, account, access, transaction }) => {
  if (!access || Object.keys(access).length === 0) return [];
  if (!account) throw httpError(400, 'Link a user account before configuring system access');
  if (account.account_scope !== ACCOUNT_SCOPES.PLATFORM) {
    throw httpError(400, 'Only independent platform accounts can receive Team platform access');
  }

  const events = [];
  const updates = {};
  let revokeSessions = false;

  if (access.system_access_enabled !== undefined) {
    const enabled = access.system_access_enabled === true || access.system_access_enabled === 'true';
    if (account.id === req.user.id && !enabled) {
      throw httpError(400, 'You cannot disable your own system access');
    }
    if (enabled !== (account.system_access_enabled !== false)) {
      updates.system_access_enabled = enabled;
      revokeSessions = !enabled;
      events.push({ action: 'team_access.system_access_changed', metadata: { enabled } });
    }
  }

  if (access.account_status !== undefined) {
    if (!['active', 'inactive'].includes(access.account_status)) {
      throw httpError(400, 'Account status must be active or inactive');
    }
    if (account.id === req.user.id && access.account_status === 'inactive') {
      throw httpError(400, 'You cannot deactivate your own account');
    }
    if (access.account_status !== account.status) {
      updates.status = access.account_status;
      revokeSessions = revokeSessions || access.account_status === 'inactive';
      events.push({ action: 'team_access.account_status_changed', metadata: { status: access.account_status } });
    }
  }

  if (access.platform_role !== undefined) {
    if (!PLATFORM_ROLES.includes(access.platform_role)) throw httpError(400, 'Unsupported platform role');
    if (account.id === req.user.id && access.platform_role !== 'super_admin') {
      throw httpError(400, 'You cannot remove your own Super Admin role');
    }
    if (access.platform_role !== account.role) {
      events.push({ action: 'team_access.platform_role_changed', metadata: { from: account.role, to: access.platform_role } });
      updates.role = access.platform_role;
      updates.account_scope = ACCOUNT_SCOPES.PLATFORM;
      updates.cooperative_id = null;
      revokeSessions = true;
    }
  }

  if (access.permissions !== undefined) {
    if (!validatePermissions(access.permissions)) throw httpError(400, 'One or more permissions are unsupported');
    const permissions = [...new Set(access.permissions)];
    const current = Array.isArray(account.permissions) ? account.permissions : null;
    if (JSON.stringify(current) !== JSON.stringify(permissions)) {
      updates.permissions = permissions;
      revokeSessions = true;
      events.push({ action: 'team_access.permissions_changed', metadata: { permissions } });
    }
  }

  if (revokeSessions) updates.token_version = Number(account.token_version || 0) + 1;
  if (Object.keys(updates).length > 0) {
    await account.update(updates, { transaction });
    if (revokeSessions) {
      await RefreshToken.update(
        { revoked_at: new Date() },
        { where: { user_id: account.id, revoked_at: null }, transaction }
      );
    }
  }
  return events;
};

const resolveLinkedAccount = async (linkedUserId, memberId, transaction) => {
  if (linkedUserId === null || linkedUserId === '' || linkedUserId === undefined) return null;
  const account = await User.findByPk(linkedUserId, { transaction });
  if (!account) throw httpError(400, 'Linked user account was not found');
  if (account.account_scope !== ACCOUNT_SCOPES.PLATFORM || !PLATFORM_ROLES.includes(account.role)) {
    throw httpError(400, 'Only independent platform accounts can be linked to Team profiles');
  }
  const alreadyLinked = await TeamMember.findOne({
    where: { linked_user_id: account.id },
    transaction,
  });
  if (alreadyLinked && alreadyLinked.id !== memberId) {
    throw httpError(409, 'That user account is already linked to another Team profile');
  }
  return account;
};

const list = async (req, res) => {
  try {
    const isManagementView = req.user.role === 'super_admin'
      && (req.query.include_inactive === 'true' || req.query.include_hidden === 'true');
    const where = isManagementView ? {} : { status: 'active', profile_visibility: 'visible' };
    const members = await TeamMember.findAll({
      where,
      include: req.user.role === 'super_admin' ? [accountInclude] : [],
      order: [['display_order', 'ASC'], ['full_name', 'ASC']],
    });
    return res.status(200).json({
      success: true,
      data: members.map((member) => (
        req.user.role === 'super_admin' ? managementProfile(member) : publicProfile(member)
      )),
    });
  } catch (error) {
    return respondWithError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const member = await loadMember(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Team member not found' });
    if (
      req.user.role !== 'super_admin'
      && (member.status !== 'active' || member.profile_visibility !== 'visible')
    ) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    return res.status(200).json({
      success: true,
      data: req.user.role === 'super_admin' ? managementProfile(member) : publicProfile(member),
    });
  } catch (error) {
    return respondWithError(res, error);
  }
};

const uploadPhoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'An image file is required' });
  try {
    const photo_url = await saveTeamPhoto(req.file, req);
    return res.status(201).json({ success: true, data: { photo_url } });
  } catch (error) {
    return respondWithError(res, error);
  }
};

const photo = async (req, res) => {
  try {
    const member = await TeamMember.findByPk(req.params.id);
    if (!member?.photo_url) return res.status(404).end();
    if (await streamStoredTeamPhoto(member.photo_url, res)) return undefined;

    const filename = path.basename(new URL(member.photo_url).pathname);
    return res.sendFile(path.join(UPLOAD_DIR, filename), {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    if (res.headersSent) return res.end();
    return res.status(404).end();
  }
};

const create = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    if (!isOfficialTeamRole(req.body.position)) throw httpError(400, 'Select an approved official role');
    const account = await resolveLinkedAccount(req.body.linked_user_id, null, transaction);
    const member = await TeamMember.create({
      full_name: req.body.full_name.trim(),
      position: req.body.position,
      biography: cleanOptional(req.body.biography),
      responsibilities: cleanOptional(req.body.responsibilities),
      skills: cleanOptional(req.body.skills),
      photo_url: cleanOptional(req.body.photo_url),
      linkedin_url: cleanOptional(req.body.linkedin_url),
      github_url: cleanOptional(req.body.github_url),
      email: cleanOptional(req.body.email),
      status: req.body.status || 'active',
      profile_visibility: req.body.profile_visibility || 'visible',
      linked_user_id: account?.id || null,
      display_order: req.body.display_order ?? 0,
    }, { transaction });
    const accessEvents = await updateAccountAccess({ req, account, access: req.body.access, transaction });
    await transaction.commit();

    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'team_member.created',
      entityType: 'team_member',
      entityId: member.id,
      metadata: { official_role: member.position, linked_user_id: member.linked_user_id },
    });
    if (account) await auditAccessEvents(req, account, accessEvents);
    const savedMember = account ? await loadMember(member.id) : member;
    return res.status(201).json({ success: true, data: managementProfile(savedMember) });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    return respondWithError(res, error);
  }
};

const update = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const member = await TeamMember.findByPk(req.params.id, { transaction });
    if (!member) throw httpError(404, 'Team member not found');
    if (req.body.position !== undefined && !isOfficialTeamRole(req.body.position)) {
      throw httpError(400, 'Select an approved official role');
    }

    let account;
    if (req.body.linked_user_id !== undefined) {
      account = await resolveLinkedAccount(req.body.linked_user_id, member.id, transaction);
    } else if (member.linked_user_id) {
      account = await User.findByPk(member.linked_user_id, { transaction });
    } else {
      account = null;
    }

    const updates = {};
    for (const field of ['full_name', 'position']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field].trim();
    }
    for (const field of ['biography', 'responsibilities', 'skills', 'photo_url', 'linkedin_url', 'github_url', 'email']) {
      if (req.body[field] !== undefined) updates[field] = cleanOptional(req.body[field]);
    }
    for (const field of ['status', 'profile_visibility', 'display_order']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (req.body.linked_user_id !== undefined) updates.linked_user_id = account?.id || null;

    await member.update(updates, { transaction });
    const accessEvents = await updateAccountAccess({ req, account, access: req.body.access, transaction });
    await transaction.commit();

    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'team_member.updated',
      entityType: 'team_member',
      entityId: member.id,
      metadata: { changed_fields: Object.keys(updates) },
    });
    if (account) await auditAccessEvents(req, account, accessEvents);
    const savedMember = account ? await loadMember(member.id) : member;
    return res.status(200).json({ success: true, data: managementProfile(savedMember) });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    return respondWithError(res, error);
  }
};

// Preserve records and their audit history: the legacy DELETE action now archives a profile.
const remove = async (req, res) => {
  try {
    const member = await TeamMember.findByPk(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Team member not found' });
    await member.update({ status: 'inactive', profile_visibility: 'hidden' });
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'team_member.archived',
      entityType: 'team_member',
      entityId: member.id,
    });
    return res.status(200).json({ success: true, message: 'Team member archived' });
  } catch (error) {
    return respondWithError(res, error);
  }
};

module.exports = { list, getById, uploadPhoto, photo, create, update, remove };
