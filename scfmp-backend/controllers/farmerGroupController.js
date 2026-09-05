const { FarmerGroup, Cooperative, Production } = require('../models');
const { recordAuditEvent } = require('../services/auditService');

const resolveCooperativeId = (req) => (
  req.user.role === 'super_admin'
    ? Number(req.query.cooperative_id || req.body.cooperative_id || 0) || null
    : req.user.cooperative_id
);

const list = async (req, res) => {
  try {
    const cooperativeId = resolveCooperativeId(req);
    const where = {};
    if (req.user.role !== 'super_admin' || cooperativeId) where.cooperative_id = cooperativeId;
    if (req.query.status) where.status = req.query.status;
    const groups = await FarmerGroup.findAll({
      where,
      include: [{ model: Cooperative, as: 'cooperative', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    });
    return res.status(200).json({ success: true, data: groups });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const cooperativeId = resolveCooperativeId(req);
    if (!cooperativeId) {
      return res.status(400).json({ success: false, message: 'Organization is required' });
    }
    const cooperative = await Cooperative.findByPk(cooperativeId);
    if (!cooperative) return res.status(404).json({ success: false, message: 'Organization not found' });
    const group = await FarmerGroup.create({
      cooperative_id: cooperativeId,
      name: req.body.name.trim(),
      location: String(req.body.location || '').trim() || null,
      status: req.body.status || 'active',
    });
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'farmer_group.created',
      entityType: 'farmer_group',
      entityId: group.id,
      metadata: { cooperative_id: cooperativeId },
    });
    return res.status(201).json({ success: true, data: group });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A farmer group with this name already exists' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const group = await FarmerGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Farmer group not found' });
    if (req.user.role !== 'super_admin' && group.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.location !== undefined) updates.location = req.body.location.trim() || null;
    if (req.body.status !== undefined) updates.status = req.body.status;
    await group.update(updates);
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'farmer_group.updated',
      entityType: 'farmer_group',
      entityId: group.id,
      metadata: { cooperative_id: group.cooperative_id, changed_fields: Object.keys(updates) },
    });
    return res.status(200).json({ success: true, data: group });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A farmer group with this name already exists' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const group = await FarmerGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Farmer group not found' });
    if (req.user.role !== 'super_admin' && group.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const recordCount = await Production.count({ where: { farmer_group_id: group.id } });
    if (recordCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'This farmer group has production records and cannot be deleted. Deactivate it instead.',
      });
    }
    await group.destroy();
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'farmer_group.deleted',
      entityType: 'farmer_group',
      entityId: group.id,
      metadata: { cooperative_id: group.cooperative_id },
    });
    return res.status(200).json({ success: true, message: 'Farmer group deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { list, create, update, remove };
