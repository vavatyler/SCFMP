const { TeamMember } = require('../models');
const { recordAuditEvent } = require('../services/auditService');

const cleanOptional = (value) => String(value || '').trim() || null;

const list = async (req, res) => {
  try {
    const where = req.user.role === 'super_admin' && req.query.include_inactive === 'true'
      ? {}
      : { status: 'active' };
    const members = await TeamMember.findAll({
      where,
      order: [['display_order', 'ASC'], ['full_name', 'ASC']],
    });
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const member = await TeamMember.create({
      full_name: req.body.full_name.trim(),
      position: req.body.position.trim(),
      biography: cleanOptional(req.body.biography),
      responsibilities: cleanOptional(req.body.responsibilities),
      skills: cleanOptional(req.body.skills),
      photo_url: cleanOptional(req.body.photo_url),
      linkedin_url: cleanOptional(req.body.linkedin_url),
      github_url: cleanOptional(req.body.github_url),
      email: cleanOptional(req.body.email),
      status: req.body.status || 'active',
      display_order: req.body.display_order ?? 0,
    });
    await recordAuditEvent({ req, actor: req.user, action: 'team_member.created', entityType: 'team_member', entityId: member.id });
    return res.status(201).json({ success: true, data: member });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const member = await TeamMember.findByPk(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Team member not found' });
    const updates = {};
    for (const field of ['full_name', 'position']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field].trim();
    }
    for (const field of ['biography', 'responsibilities', 'skills', 'photo_url', 'linkedin_url', 'github_url', 'email']) {
      if (req.body[field] !== undefined) updates[field] = cleanOptional(req.body[field]);
    }
    for (const field of ['status', 'display_order']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    await member.update(updates);
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'team_member.updated',
      entityType: 'team_member',
      entityId: member.id,
      metadata: { changed_fields: Object.keys(updates) },
    });
    return res.status(200).json({ success: true, data: member });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const member = await TeamMember.findByPk(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Team member not found' });
    await member.destroy();
    await recordAuditEvent({ req, actor: req.user, action: 'team_member.deleted', entityType: 'team_member', entityId: member.id });
    return res.status(200).json({ success: true, message: 'Team member deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { list, create, update, remove };
