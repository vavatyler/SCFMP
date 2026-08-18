const {
  AuditLog,
  Cooperative,
  Document,
  InventoryItem,
  Loan,
  Member,
  Product,
  Production,
  Transaction,
  User,
} = require('../models');
const { validateHierarchy } = require('../services/rwandaLocationService');
const { normalizeRwandaPhone } = require('../utils/rwandaPhone');

const ORGANIZATION_FIELDS = [
  'name',
  'organization_type',
  'registration_number',
  'district',
  'sector',
  'cell',
  'village',
  'phone',
  'email',
  'status',
];
const ORGANIZATION_LOCATION_FIELDS = ['district', 'sector', 'cell'];

const cleanPayload = (body, { includeTypeDefault = false } = {}) => {
  const payload = {};
  ORGANIZATION_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = typeof body[field] === 'string' ? body[field].trim() || null : body[field];
    }
  });
  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    payload.phone = normalizeRwandaPhone(payload.phone);
  }
  if (includeTypeDefault && !payload.organization_type) payload.organization_type = 'cooperative';
  return payload;
};

const locationChanged = (body, cooperative) => (
  ORGANIZATION_LOCATION_FIELDS.some(
    (field) => Object.prototype.hasOwnProperty.call(body, field)
      && String(body[field] || '').trim() !== String(cooperative?.[field] || '').trim()
  )
);

const mergedLocation = (body, cooperative = {}) => Object.fromEntries(
  ORGANIZATION_LOCATION_FIELDS.map((field) => [
    field,
    Object.prototype.hasOwnProperty.call(body, field) ? body[field] : cooperative[field],
  ])
);

const dependentRecordCounts = async (cooperativeId) => {
  const where = { cooperative_id: cooperativeId };
  const entries = await Promise.all([
    ['users', User.count({ where })],
    ['members', Member.count({ where })],
    ['production', Production.count({ where })],
    ['transactions', Transaction.count({ where })],
    ['loans', Loan.count({ where })],
    ['inventory', InventoryItem.count({ where })],
    ['documents', Document.count({ where })],
    ['products', Product.count({ where })],
    ['audit_logs', AuditLog.count({ where })],
  ].map(async ([key, promise]) => [key, await promise]));

  return Object.fromEntries(entries.filter(([, count]) => count > 0));
};

const list = async (req, res) => {
  try {
    const cooperatives = await Cooperative.findAll({ order: [['created_at', 'DESC']] });
    return res.status(200).json({ success: true, data: cooperatives });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const coop = await Cooperative.findByPk(req.params.id);
    if (!coop) return res.status(404).json({ success: false, message: 'Organization not found' });
    return res.status(200).json({ success: true, data: coop });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const locationValidation = validateHierarchy(mergedLocation(req.body));
    if (!locationValidation.valid) {
      return res.status(422).json({ success: false, message: locationValidation.error });
    }
    const coop = await Cooperative.create(cleanPayload(req.body, { includeTypeDefault: true }));
    return res.status(201).json({ success: true, data: coop });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const coop = await Cooperative.findByPk(req.params.id);
    if (!coop) return res.status(404).json({ success: false, message: 'Organization not found' });
    if (locationChanged(req.body, coop)) {
      const locationValidation = validateHierarchy(mergedLocation(req.body, coop));
      if (!locationValidation.valid) {
        return res.status(422).json({ success: false, message: locationValidation.error });
      }
    }
    await coop.update(cleanPayload(req.body));
    return res.status(200).json({ success: true, data: coop });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const coop = await Cooperative.findByPk(req.params.id);
    if (!coop) return res.status(404).json({ success: false, message: 'Organization not found' });
    const dependencies = await dependentRecordCounts(coop.id);
    if (Object.keys(dependencies).length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This organization cannot be deleted because it has related records',
        data: { dependencies },
      });
    }
    await coop.destroy();
    return res.status(200).json({ success: true, message: 'Organization deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, getById, create, update, remove };
