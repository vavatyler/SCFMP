const { Op } = require('sequelize');
const { Member, Farmer, Cooperative } = require('../models');
const { validateHierarchy } = require('../services/rwandaLocationService');
const {
  MEMBER_ADDRESS_FIELDS,
  hasStructuredMemberAddress,
  memberAddressChanged,
  memberAddressToHierarchy,
  mergeMemberAddress,
} = require('../utils/memberAddress');
const { normalizeRwandaNationalId } = require('../utils/rwandaNationalId');
const { normalizeRwandaPhone } = require('../utils/rwandaPhone');

const MEMBER_FIELDS = [
  'first_name',
  'last_name',
  'national_id',
  'gender',
  'phone',
  'address',
  ...MEMBER_ADDRESS_FIELDS,
  'membership_date',
];

const normalizeMemberPayload = (body) => {
  const payload = Object.fromEntries(
    MEMBER_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
      .map((field) => [field, body[field]])
  );
  if (Object.prototype.hasOwnProperty.call(payload, 'national_id')) {
    payload.national_id = normalizeRwandaNationalId(payload.national_id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    payload.phone = normalizeRwandaPhone(payload.phone);
  }
  MEMBER_ADDRESS_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      payload[field] = String(payload[field] || '').trim() || null;
    }
  });
  return payload;
};

const validateMemberAddress = (value) => validateHierarchy(
  memberAddressToHierarchy(value),
  { requireVillage: hasStructuredMemberAddress(value) }
);

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
        { national_id: { [Op.like]: `%${search}%` } },
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

    const addressValidation = validateMemberAddress(req.body);
    if (!addressValidation.valid) {
      return res.status(422).json({ success: false, message: addressValidation.error });
    }

    const member = await Member.create({ ...normalizeMemberPayload(req.body), cooperative_id });
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

    if (memberAddressChanged(req.body, member)) {
      const addressValidation = validateMemberAddress(mergeMemberAddress(req.body, member));
      if (!addressValidation.valid) {
        return res.status(422).json({ success: false, message: addressValidation.error });
      }
    }

    // Prevent moving a member to a different cooperative via this endpoint
    await member.update(normalizeMemberPayload(req.body));

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
