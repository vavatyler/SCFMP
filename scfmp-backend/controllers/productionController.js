const { Op } = require('sequelize');
const {
  Production,
  Farmer,
  FarmerGroup,
  ProductionContribution,
  Member,
  Product,
  Cooperative,
  sequelize,
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
  {
    model: ProductionContribution,
    as: 'contributions',
    attributes: ['id', 'farmer_id', 'quantity', 'unit'],
    include: [{
      model: Farmer,
      as: 'farmer',
      attributes: ['id'],
      include: [{ model: Member, as: 'member', attributes: ['id', 'first_name', 'last_name'] }],
    }],
  },
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

const resolveProduct = async ({ product_id, product_name, unit, cooperative_id }, transaction) => {
  if (product_id) {
    const product = await Product.findOne({ where: { id: product_id, cooperative_id, status: 'active' }, transaction });
    if (!product) return null;
    return product;
  }
  const name = String(product_name || '').trim();
  if (!name) return null;
  const [product] = await Product.findOrCreate({
    where: { cooperative_id, name },
    defaults: { default_unit: unit || 'kg' },
    transaction,
  });
  return product;
};

const normalizeUnit = (value) => String(value || '').trim().toLowerCase();

const validateContributions = async (contributions, cooperativeId, productionUnit, transaction) => {
  if (contributions === undefined) return null;
  if (!Array.isArray(contributions)) {
    throw Object.assign(new Error('Contributions must be an array'), { status: 400 });
  }
  if (contributions.length === 0) return [];
  const normalizedUnit = normalizeUnit(productionUnit);
  const seen = new Set();
  const normalized = contributions.map((item) => {
    const farmerId = Number(item.farmer_id);
    const quantity = Number(item.quantity);
    const unit = normalizeUnit(item.unit || productionUnit);
    if (!Number.isInteger(farmerId) || farmerId < 1 || !Number.isFinite(quantity) || quantity <= 0) {
      throw Object.assign(new Error('Each contribution requires a valid farmer and positive quantity'), { status: 400 });
    }
    if (!unit || unit !== normalizedUnit) {
      throw Object.assign(new Error('Contribution units must match the production unit'), { status: 400 });
    }
    if (seen.has(farmerId)) {
      throw Object.assign(new Error('A farmer can only be added once per production record'), { status: 400 });
    }
    seen.add(farmerId);
    return { farmer_id: farmerId, quantity, unit: String(productionUnit).trim() };
  });
  const farmers = await Farmer.findAll({
    where: { id: { [Op.in]: [...seen] } },
    include: [{ model: Member, as: 'member', required: true, where: { cooperative_id: cooperativeId }, attributes: ['id'] }],
    transaction,
  });
  if (farmers.length !== seen.size) {
    throw Object.assign(new Error('Every contributing farmer must belong to the production organization'), { status: 400 });
  }
  return normalized;
};

const quantityBreakdown = ({ actualHarvest, soldQuantity, storageQuantity, remainingQuantity }) => {
  const actual = Number(actualHarvest);
  const sold = soldQuantity === undefined || soldQuantity === '' ? 0 : Number(soldQuantity);
  const remaining = remainingQuantity === undefined || remainingQuantity === ''
    ? actual - sold
    : Number(remainingQuantity);
  const storage = storageQuantity === undefined || storageQuantity === '' || storageQuantity === null
    ? null
    : Number(storageQuantity);
  const values = [actual, sold, remaining, ...(storage === null ? [] : [storage])];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw Object.assign(new Error('Production quantities must be nonnegative numbers'), { status: 400 });
  }
  if (sold > actual || remaining > actual || Math.abs((actual - sold) - remaining) > 0.01) {
    throw Object.assign(new Error('Remaining quantity must equal actual quantity minus sold quantity'), { status: 400 });
  }
  if (storage !== null && storage > remaining) {
    throw Object.assign(new Error('Storage quantity cannot exceed remaining quantity'), { status: 400 });
  }
  return { sold, storage, remaining };
};

const create = async (req, res) => {
  let dbTransaction;
  try {
    const productionMode = req.body.production_mode || 'individual';
    let farmer = null;
    let farmerGroup = null;
    let cooperative_id;

    if (productionMode === 'group') {
      if (req.body.farmer_group_id) {
        farmerGroup = await FarmerGroup.findByPk(req.body.farmer_group_id);
        if (!farmerGroup) {
          return res.status(404).json({ success: false, message: 'Farmer group not found' });
        }
        cooperative_id = farmerGroup.cooperative_id;
      } else {
        cooperative_id = req.user.role === 'super_admin'
          ? Number(req.body.cooperative_id || 0) || null
          : req.user.cooperative_id;
        if (!cooperative_id) {
          return res.status(400).json({ success: false, message: 'Organization is required for cooperative production' });
        }
        const cooperative = await Cooperative.findByPk(cooperative_id);
        if (!cooperative) return res.status(404).json({ success: false, message: 'Organization not found' });
      }
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

    dbTransaction = await sequelize.transaction();
    const product = await resolveProduct({ ...req.body, cooperative_id }, dbTransaction);
    if (!product) throw Object.assign(new Error('A valid product is required'), { status: 400 });
    const requestedStatus = req.body.status || 'recorded';
    const status = ['super_admin', 'cooperative_manager'].includes(req.user.role)
      ? requestedStatus
      : 'recorded';
    const unit = String(req.body.unit || product.default_unit || '').trim();
    const contributions = productionMode === 'group'
      ? await validateContributions(req.body.contributions, cooperative_id, unit, dbTransaction)
      : null;
    if (productionMode !== 'group' && req.body.contributions?.length) {
      throw Object.assign(new Error('Contributions are only supported for group production'), { status: 400 });
    }
    const contributionTotal = contributions?.length
      ? contributions.reduce((sum, item) => sum + item.quantity, 0)
      : null;
    const actualHarvest = contributionTotal ?? Number(req.body.actual_harvest ?? req.body.quantity);
    const productionDate = req.body.production_date || req.body.harvest_date;
    const harvestDate = req.body.harvest_date || req.body.production_date;
    const fallbackLocation = productionMode === 'group' ? farmerGroup?.location : farmer.location;
    const breakdown = quantityBreakdown({
      actualHarvest,
      soldQuantity: req.body.sold_quantity,
      storageQuantity: req.body.storage_quantity,
      remainingQuantity: req.body.remaining_quantity,
    });

    const record = await Production.create({
      cooperative_id,
      production_mode: productionMode,
      farmer_id: farmer?.id || null,
      farmer_group_id: farmerGroup?.id || null,
      product_id: product.id,
      product_name: product.name,
      quantity: actualHarvest,
      expected_production: req.body.expected_production || null,
      reporting_period: String(req.body.reporting_period || '').trim() || null,
      variety: String(req.body.variety || '').trim() || null,
      production_category: String(req.body.production_category || '').trim() || null,
      actual_harvest: actualHarvest,
      unit,
      unit_price: req.body.unit_price ?? 0,
      season: req.body.season || null,
      status,
      production_date: productionDate,
      harvest_date: harvestDate,
      production_location: String(req.body.production_location || fallbackLocation || '').trim() || null,
      quality_grade: String(req.body.quality_grade || '').trim() || null,
      storage_location: String(req.body.storage_location || '').trim() || null,
      storage_quantity: breakdown.storage,
      sold_quantity: breakdown.sold,
      remaining_quantity: breakdown.remaining,
      buyer: String(req.body.buyer || '').trim() || null,
      notes: String(req.body.notes || '').trim() || null,
      recorded_by: req.user.id,
    }, { transaction: dbTransaction });
    if (contributions?.length) {
      await ProductionContribution.bulkCreate(
        contributions.map((item) => ({ ...item, production_id: record.id })),
        { transaction: dbTransaction }
      );
    }
    await dbTransaction.commit();
    dbTransaction = null;
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
    const created = await Production.findByPk(record.id, { include: includeDetails });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    if (dbTransaction) await dbTransaction.rollback();
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  let dbTransaction;
  try {
    const record = await Production.findByPk(req.params.id, { include: [{ model: ProductionContribution, as: 'contributions' }] });
    if (!record) return res.status(404).json({ success: false, message: 'Production record not found' });
    if (!(await canAccess(record, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    dbTransaction = await sequelize.transaction();
    const updates = {};
    ['unit', 'unit_price', 'season'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (req.body.actual_harvest !== undefined || req.body.quantity !== undefined) {
      const actualHarvest = req.body.actual_harvest ?? req.body.quantity;
      updates.actual_harvest = actualHarvest;
      updates.quantity = actualHarvest;
    }
    const requestedUnit = String(req.body.unit ?? record.unit).trim();
    let contributions = null;
    if (req.body.contributions !== undefined) {
      if (record.production_mode !== 'group') {
        throw Object.assign(new Error('Contributions are only supported for group production'), { status: 400 });
      }
      contributions = await validateContributions(
        req.body.contributions,
        record.cooperative_id,
        requestedUnit,
        dbTransaction
      );
      if (contributions.length) {
        const contributionTotal = contributions.reduce((sum, item) => sum + item.quantity, 0);
        updates.actual_harvest = contributionTotal;
        updates.quantity = contributionTotal;
      }
    } else if (record.contributions?.length && normalizeUnit(requestedUnit) !== normalizeUnit(record.unit)) {
      throw Object.assign(new Error('Provide updated contributions before changing a contributed record unit'), { status: 400 });
    }
    if (req.body.harvest_date !== undefined || req.body.production_date !== undefined) {
      const harvestDate = req.body.harvest_date ?? req.body.production_date;
      updates.harvest_date = harvestDate;
      updates.production_date = harvestDate;
    }
    for (const field of [
      'expected_production', 'reporting_period', 'variety', 'production_category',
      'production_location', 'quality_grade', 'storage_location', 'buyer', 'notes',
    ]) {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim() || null
          : req.body[field];
      }
    }
    if (req.body.status !== undefined) {
      if (!['super_admin', 'cooperative_manager'].includes(req.user.role)) {
        throw Object.assign(new Error('Only managers can change verification status'), { status: 403 });
      }
      updates.status = req.body.status;
    }
    if (req.body.product_id || req.body.product_name) {
      const product = await resolveProduct({ ...req.body, cooperative_id: record.cooperative_id }, dbTransaction);
      if (!product) throw Object.assign(new Error('A valid product is required'), { status: 400 });
      updates.product_id = product.id;
      updates.product_name = product.name;
    }

    const actualHarvest = Number(updates.actual_harvest ?? record.actual_harvest ?? record.quantity);
    const breakdown = quantityBreakdown({
      actualHarvest,
      soldQuantity: req.body.sold_quantity ?? record.sold_quantity,
      storageQuantity: req.body.storage_quantity !== undefined ? req.body.storage_quantity : record.storage_quantity,
      remainingQuantity: req.body.remaining_quantity !== undefined
        ? req.body.remaining_quantity
        : (updates.actual_harvest !== undefined || req.body.sold_quantity !== undefined ? undefined : record.remaining_quantity),
    });
    updates.sold_quantity = breakdown.sold;
    updates.storage_quantity = breakdown.storage;
    updates.remaining_quantity = breakdown.remaining;

    await record.update(updates, { transaction: dbTransaction });
    if (contributions !== null) {
      await ProductionContribution.destroy({ where: { production_id: record.id }, transaction: dbTransaction });
      if (contributions.length) {
        await ProductionContribution.bulkCreate(
          contributions.map((item) => ({ ...item, production_id: record.id })),
          { transaction: dbTransaction }
        );
      }
    }
    await dbTransaction.commit();
    dbTransaction = null;
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'production.updated',
      entityType: 'production',
      entityId: record.id,
      metadata: { cooperative_id: record.cooperative_id, changed_fields: Object.keys(updates) },
    });
    const updated = await Production.findByPk(record.id, { include: includeDetails });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (dbTransaction) await dbTransaction.rollback();
    return res.status(err.status || 500).json({ success: false, message: err.message });
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
      total_sold: 0,
      total_remaining: 0,
      farmer_ids: new Set(),
      farmer_group_ids: new Set(),
      cooperative_group_ids: new Set(),
    };
    const monthly = new Map();
    const products = new Map();
    const farmers = new Map();
    const farmerGroups = new Map();
    const producers = new Map();
    const modes = new Map();
    const cooperatives = new Map();
    const locations = new Map();
    const years = new Map();

    records.forEach((record) => {
      const quantity = Number(record.quantity || 0);
      const value = Number(record.total_amount || 0);
      totals.total_quantity += quantity;
      totals.total_expected += Number(record.expected_production || 0);
      totals.total_value += value;
      totals.total_sold += Number(record.sold_quantity || 0);
      totals.total_remaining += Number(record.remaining_quantity || 0);
      if (record.farmer_id) totals.farmer_ids.add(record.farmer_id);
      if (record.farmer_group_id) totals.farmer_group_ids.add(record.farmer_group_id);
      if (record.production_mode === 'group' && !record.farmer_group_id) {
        totals.cooperative_group_ids.add(record.cooperative_id);
      }
      const month = String(record.harvest_date || record.production_date).slice(0, 7);
      const farmerName = record.farmer?.member
        ? `${record.farmer.member.first_name} ${record.farmer.member.last_name}`
        : `Farmer #${record.farmer_id}`;
      const productName = record.product?.name || record.product_name;
      const cooperativeName = record.cooperative?.name || `Cooperative #${record.cooperative_id}`;
      const farmerGroupName = record.farmerGroup?.name || cooperativeName;
      const producerName = record.production_mode === 'group' ? farmerGroupName : farmerName;
      const locationName = record.production_location || 'Not specified';
      const year = String(record.harvest_date || record.production_date).slice(0, 4);

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
        const groupKey = record.farmer_group_id || `cooperative:${record.cooperative_id}`;
        add(farmerGroups, groupKey, farmerGroupName);
        add(producers, `group:${groupKey}`, farmerGroupName);
      } else {
        add(farmers, record.farmer_id, farmerName);
        add(producers, `individual:${record.farmer_id}`, producerName);
      }
      add(modes, record.production_mode, record.production_mode);
      add(cooperatives, record.cooperative_id, cooperativeName);
      add(locations, locationName, locationName);
      add(years, year, year);
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
          sold_quantity: totals.total_sold,
          remaining_quantity: totals.total_remaining,
          active_farmers: totals.farmer_ids.size,
          active_groups: totals.farmer_group_ids.size,
          active_producers: totals.farmer_ids.size + totals.farmer_group_ids.size + totals.cooperative_group_ids.size,
        },
        monthly_trend: [...monthly.values()],
        by_product: byValueDesc(products),
        farmer_performance: byValueDesc(farmers),
        group_performance: byValueDesc(farmerGroups),
        producer_performance: byValueDesc(producers),
        by_mode: byValueDesc(modes),
        cooperative_comparison: byValueDesc(cooperatives),
        by_location: byValueDesc(locations),
        by_year: [...years.values()].sort((a, b) => String(a.key).localeCompare(String(b.key))),
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
