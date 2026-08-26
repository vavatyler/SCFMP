const { Op } = require('sequelize');
const {
  Production,
  Farmer,
  FarmerGroup,
  Member,
  Product,
  Cooperative,
} = require('../models');
const { recordAuditEvent } = require('../services/auditService');

const clampPagination = (query) => ({
  page: Math.max(1, Number.parseInt(query.page, 10) || 1),
  limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)),
});

const getOwnFarmer = (userId) =>
  Farmer.findOne({
    include: [{ model: Member, as: 'member', required: true, where: { user_id: userId } }],
  });

const resolveScope = async (req) => {
  const scope = {};
  if (req.user.role === 'super_admin') {
    if (req.query.cooperative_id) scope.cooperative_id = Number(req.query.cooperative_id);
  } else {
    scope.cooperative_id = req.user.cooperative_id;
  }
  if (req.user.role === 'farmer') {
    const ownFarmer = await getOwnFarmer(req.user.id);
    scope.farmer_id = ownFarmer?.id || -1;
  }
  return scope;
};

const buildWhere = async (req) => {
  const scope = await resolveScope(req);
  const where = { ...scope };
  const {
    production_mode,
    farmer_id,
    farmer_group_id,
    product_id,
    season,
    status,
    from,
    to,
    search,
  } = req.query;
  if (production_mode) where.production_mode = production_mode;
  if (farmer_id && req.user.role !== 'farmer') where.farmer_id = Number(farmer_id);
  if (farmer_group_id && req.user.role !== 'farmer') {
    where.farmer_group_id = Number(farmer_group_id);
  }
  if (product_id) where.product_id = Number(product_id);
  if (season) where.season = season;
  if (status) where.status = status;
  if (from || to) {
    where.production_date = {};
    if (from) where.production_date[Op.gte] = from;
    if (to) where.production_date[Op.lte] = to;
  }
  if (search) {
    where[Op.or] = [
      { product_name: { [Op.like]: `%${search}%` } },
      { production_location: { [Op.like]: `%${search}%` } },
      { notes: { [Op.like]: `%${search}%` } },
    ];
  }
  return where;
};

const includeDetails = [
  {
    model: Farmer,
    as: 'farmer',
    attributes: ['id', 'crop_type', 'farm_size', 'farm_size_unit', 'farm_size_ha'],
    include: [{ model: Member, as: 'member', attributes: ['id', 'first_name', 'last_name', 'user_id'] }],
  },
  {
    model: FarmerGroup,
    as: 'farmerGroup',
    attributes: ['id', 'name', 'location', 'status'],
  },
  { model: Product, as: 'product', attributes: ['id', 'name', 'category', 'default_unit'] },
  { model: Cooperative, as: 'cooperative', attributes: ['id', 'name'] },
];

const canAccess = async (record, user) => {
  if (user.role === 'super_admin') return true;
  if (record.cooperative_id !== user.cooperative_id) return false;
  if (user.role !== 'farmer') return true;
  const ownFarmer = await getOwnFarmer(user.id);
  return ownFarmer?.id === record.farmer_id;
};

const list = async (req, res) => {
  try {
    const { page, limit } = clampPagination(req.query);
    const where = await buildWhere(req);
    const { rows, count } = await Production.findAndCountAll({
      where,
      include: includeDetails,
      order: [['production_date', 'DESC'], ['id', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });
    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const record = await Production.findByPk(req.params.id, { include: includeDetails });
    if (!record) return res.status(404).json({ success: false, message: 'Production record not found' });
    if (!(await canAccess(record, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const resolveProduct = async ({ product_id, product_name, unit, cooperative_id }) => {
  if (product_id) {
    const product = await Product.findOne({ where: { id: product_id, cooperative_id, status: 'active' } });
    if (!product) return null;
    return product;
  }
  const name = String(product_name || '').trim();
  if (!name) return null;
  const [product] = await Product.findOrCreate({
    where: { cooperative_id, name },
    defaults: { default_unit: unit || 'kg' },
  });
  return product;
};

const create = async (req, res) => {
  try {
    const productionMode = req.body.production_mode || 'individual';
    let farmer = null;
    let farmerGroup = null;
    let cooperative_id;

    if (productionMode === 'group') {
      farmerGroup = await FarmerGroup.findByPk(req.body.farmer_group_id);
      if (!farmerGroup) {
        return res.status(404).json({ success: false, message: 'Farmer group not found' });
      }
      cooperative_id = farmerGroup.cooperative_id;
    } else {
      farmer = await Farmer.findByPk(req.body.farmer_id, {
        include: [{ model: Member, as: 'member', required: true }],
      });
      if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });
      cooperative_id = farmer.member.cooperative_id;
    }

    if (req.user.role !== 'super_admin' && cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role === 'super_admin' && req.body.cooperative_id && Number(req.body.cooperative_id) !== cooperative_id) {
      return res.status(400).json({ success: false, message: 'Production owner does not belong to the selected organization' });
    }

    const product = await resolveProduct({ ...req.body, cooperative_id });
    if (!product) return res.status(400).json({ success: false, message: 'A valid product is required' });
    const requestedStatus = req.body.status || 'recorded';
    const status = ['super_admin', 'cooperative_manager'].includes(req.user.role)
      ? requestedStatus
      : 'recorded';
    const actualHarvest = req.body.actual_harvest ?? req.body.quantity;
    const harvestDate = req.body.harvest_date ?? req.body.production_date;
    const fallbackLocation = productionMode === 'group' ? farmerGroup.location : farmer.location;

    const record = await Production.create({
      cooperative_id,
      production_mode: productionMode,
      farmer_id: farmer?.id || null,
      farmer_group_id: farmerGroup?.id || null,
      product_id: product.id,
      product_name: product.name,
      quantity: actualHarvest,
      expected_production: req.body.expected_production || null,
      actual_harvest: actualHarvest,
      unit: req.body.unit || product.default_unit,
      unit_price: req.body.unit_price ?? 0,
      season: req.body.season || null,
      status,
      production_date: harvestDate,
      harvest_date: harvestDate,
      production_location: String(req.body.production_location || fallbackLocation || '').trim() || null,
      notes: String(req.body.notes || '').trim() || null,
      recorded_by: req.user.id,
    });
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'production.created',
      entityType: 'production',
      entityId: record.id,
      metadata: {
        cooperative_id,
        production_mode: productionMode,
        farmer_id: farmer?.id || null,
        farmer_group_id: farmerGroup?.id || null,
        product_id: product.id,
      },
    });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const record = await Production.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Production record not found' });
    if (!(await canAccess(record, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updates = {};
    ['unit', 'unit_price', 'season'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (req.body.actual_harvest !== undefined || req.body.quantity !== undefined) {
      const actualHarvest = req.body.actual_harvest ?? req.body.quantity;
      updates.actual_harvest = actualHarvest;
      updates.quantity = actualHarvest;
    }
    if (req.body.harvest_date !== undefined || req.body.production_date !== undefined) {
      const harvestDate = req.body.harvest_date ?? req.body.production_date;
      updates.harvest_date = harvestDate;
      updates.production_date = harvestDate;
    }
    for (const field of ['expected_production', 'production_location', 'notes']) {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim() || null
          : req.body[field];
      }
    }
    if (req.body.status !== undefined) {
      if (!['super_admin', 'cooperative_manager'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Only managers can change verification status' });
      }
      updates.status = req.body.status;
    }
    if (req.body.product_id || req.body.product_name) {
      const product = await resolveProduct({ ...req.body, cooperative_id: record.cooperative_id });
      if (!product) return res.status(400).json({ success: false, message: 'A valid product is required' });
      updates.product_id = product.id;
      updates.product_name = product.name;
    }

    await record.update(updates);
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'production.updated',
      entityType: 'production',
      entityId: record.id,
      metadata: { cooperative_id: record.cooperative_id, changed_fields: Object.keys(updates) },
    });
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const record = await Production.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Production record not found' });
    if (!(await canAccess(record, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const auditMetadata = {
      cooperative_id: record.cooperative_id,
      production_mode: record.production_mode,
      farmer_id: record.farmer_id,
      farmer_group_id: record.farmer_group_id,
      product_id: record.product_id,
    };
    await record.destroy();
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'production.deleted',
      entityType: 'production',
      entityId: record.id,
      metadata: auditMetadata,
    });
    return res.status(200).json({ success: true, message: 'Production record deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listProducts = async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const where = { status: 'active' };
    if (req.user.role !== 'super_admin' || scope.cooperative_id) {
      where.cooperative_id = scope.cooperative_id;
    }
    const products = await Product.findAll({
      where,
      include: [{ model: Cooperative, as: 'cooperative', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    });
    return res.status(200).json({ success: true, data: products });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listFarmerGroups = async (req, res) => {
  try {
    const scope = await resolveScope(req);
    const where = { status: 'active' };
    if (req.user.role !== 'super_admin' || scope.cooperative_id) {
      where.cooperative_id = scope.cooperative_id;
    }
    const farmerGroups = await FarmerGroup.findAll({
      where,
      include: [{ model: Cooperative, as: 'cooperative', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
    });
    return res.status(200).json({ success: true, data: farmerGroups });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const analytics = async (req, res) => {
  try {
    const where = await buildWhere(req);
    const records = await Production.findAll({ where, include: includeDetails, order: [['production_date', 'ASC']] });
    const totals = {
      record_count: records.length,
      total_quantity: 0,
      total_expected: 0,
      total_value: 0,
      farmer_ids: new Set(),
      farmer_group_ids: new Set(),
    };
    const monthly = new Map();
    const products = new Map();
    const farmers = new Map();
    const farmerGroups = new Map();
    const producers = new Map();
    const modes = new Map();
    const cooperatives = new Map();

    records.forEach((record) => {
      const quantity = Number(record.quantity || 0);
      const value = Number(record.total_amount || 0);
      totals.total_quantity += quantity;
      totals.total_expected += Number(record.expected_production || 0);
      totals.total_value += value;
      if (record.farmer_id) totals.farmer_ids.add(record.farmer_id);
      if (record.farmer_group_id) totals.farmer_group_ids.add(record.farmer_group_id);
      const month = String(record.harvest_date || record.production_date).slice(0, 7);
      const farmerName = record.farmer?.member
        ? `${record.farmer.member.first_name} ${record.farmer.member.last_name}`
        : `Farmer #${record.farmer_id}`;
      const farmerGroupName = record.farmerGroup?.name || `Farmer Group #${record.farmer_group_id}`;
      const producerName = record.production_mode === 'group' ? farmerGroupName : farmerName;
      const productName = record.product?.name || record.product_name;
      const cooperativeName = record.cooperative?.name || `Cooperative #${record.cooperative_id}`;

      const add = (map, key, label) => {
        const item = map.get(key) || { key, label, quantity: 0, value: 0, records: 0 };
        item.quantity += quantity;
        item.value += value;
        item.records += 1;
        map.set(key, item);
      };
      add(monthly, month, month);
      add(products, record.product_id, productName);
      if (record.production_mode === 'group') {
        add(farmerGroups, record.farmer_group_id, farmerGroupName);
        add(producers, `group:${record.farmer_group_id}`, farmerGroupName);
      } else {
        add(farmers, record.farmer_id, farmerName);
        add(producers, `individual:${record.farmer_id}`, producerName);
      }
      add(modes, record.production_mode, record.production_mode);
      add(cooperatives, record.cooperative_id, cooperativeName);
    });

    const byValueDesc = (map) => [...map.values()].sort((a, b) => b.value - a.value);
    return res.status(200).json({
      success: true,
      data: {
        stats: {
          record_count: totals.record_count,
          total_quantity: totals.total_quantity,
          total_actual_harvest: totals.total_quantity,
          total_expected_production: totals.total_expected,
          total_value: totals.total_value,
          active_farmers: totals.farmer_ids.size,
          active_groups: totals.farmer_group_ids.size,
          active_producers: totals.farmer_ids.size + totals.farmer_group_ids.size,
        },
        monthly_trend: [...monthly.values()],
        by_product: byValueDesc(products),
        farmer_performance: byValueDesc(farmers),
        group_performance: byValueDesc(farmerGroups),
        producer_performance: byValueDesc(producers),
        by_mode: byValueDesc(modes),
        cooperative_comparison: byValueDesc(cooperatives),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const summary = async (req, res) => {
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (!payload.success) return originalJson(payload);
    return originalJson({ success: true, data: payload.data.by_product });
  };
  return analytics(req, res);
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  summary,
  analytics,
  listProducts,
  listFarmerGroups,
};
