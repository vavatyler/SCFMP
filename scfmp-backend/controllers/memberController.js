const { Op } = require('sequelize');
const { Member, Farmer, Cooperative } = require('../models');

/**
 * GET /api/members
 * Super admin: sees all members (optionally filtered by ?cooperative_id=)
 * Everyone else: only sees members of their own cooperative
 * Supports ?search= (matches first/last name or phone) and pagination via ?page= & ?limit=
 */
const list = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (req.user.role !== 'super_admin') {
      where.cooperative_id = req.user.cooperative_id;
    } else if (req.query.cooperative_id) {
      where.cooperative_id = req.query.cooperative_id;
    }
    if (req.user.role === 'farmer') where.user_id = req.user.id;

    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { rows, count } = await Member.findAndCountAll({
      where,
      include: [
        { model: Cooperative, as: 'cooperative', attributes: ['id', 'name'] },
        { model: Farmer, as: 'farmerProfile' },
      ],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id, {
      include: [
        { model: Cooperative, as: 'cooperative', attributes: ['id', 'name'] },
        { model: Farmer, as: 'farmerProfile' },
      ],
    });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    if (
      req.user.role !== 'super_admin' &&
      (member.cooperative_id !== req.user.cooperative_id ||
        (req.user.role === 'farmer' && member.user_id !== req.user.id))
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: member });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    // Non-super_admin users can only create members within their own cooperative
    const cooperative_id =
      req.user.role === 'super_admin' ? req.body.cooperative_id : req.user.cooperative_id;

    if (!cooperative_id) {
      return res.status(400).json({ success: false, message: 'cooperative_id is required' });
    }

    const member = await Member.create({ ...req.body, cooperative_id });
    return res.status(201).json({ success: true, data: member });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    if (req.user.role !== 'super_admin' && member.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Prevent moving a member to a different cooperative via this endpoint
    const { cooperative_id, ...safeUpdates } = req.body;
    await member.update(safeUpdates);

    return res.status(200).json({ success: true, data: member });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    if (req.user.role !== 'super_admin' && member.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await member.destroy();
    return res.status(200).json({ success: true, message: 'Member deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, getById, create, update, remove };
