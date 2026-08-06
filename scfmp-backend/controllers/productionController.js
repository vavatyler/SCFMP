const { Production, Farmer, Member } = require('../models');
const { Op, fn, col } = require('sequelize');

/**
 * Helper: checks the caller can access a given farmer's records
 * (same cooperative, or super_admin).
 */
const assertAccessToFarmer = async (farmerId, user) => {
  const farmer = await Farmer.findByPk(farmerId, {
    include: [{ model: Member, as: 'member' }],
  });
  if (!farmer) return { allowed: false, farmer: null };
  if (user.role !== 'super_admin' && farmer.member.cooperative_id !== user.cooperative_id) {
    return { allowed: false, farmer };
  }
  return { allowed: true, farmer };
};

/**
 * GET /api/production
 * Optional filters: ?farmer_id=  &from=YYYY-MM-DD  &to=YYYY-MM-DD  &product_name=
 * Non-super_admin users only ever see records from their own cooperative's farmers.
 */
const list = async (req, res) => {
  try {
    const { farmer_id, from, to, product_name, page = 1, limit = 20 } = req.query;

    const where = {};
    if (farmer_id) where.farmer_id = farmer_id;
    if (product_name) where.product_name = { [Op.like]: `%${product_name}%` };
    if (from || to) {
      where.production_date = {};
      if (from) where.production_date[Op.gte] = from;
      if (to) where.production_date[Op.lte] = to;
    }

    const memberWhere = {};
    if (req.user.role !== 'super_admin') {
      memberWhere.cooperative_id = req.user.cooperative_id;
    } else if (req.query.cooperative_id) {
      memberWhere.cooperative_id = req.query.cooperative_id;
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { rows, count } = await Production.findAndCountAll({
      where,
      include: [
        {
          model: Farmer,
          as: 'farmer',
          required: true,
          include: [{ model: Member, as: 'member', required: true, where: memberWhere }],
        },
      ],
      order: [['production_date', 'DESC']],
      limit: Number(limit),
      offset,
      // CRITICAL: without this, Sequelize's default subQuery:true (triggered by
      // limit + include) selects paginated rows using ONLY the top-level `where`,
      // completely ignoring the nested cooperative_id filter above — meaning a
      // super_admin viewing one cooperative would see every cooperative's
      // production records. See tests/production-cooperative-isolation.integration.test.js.
      subQuery: false,
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
    const record = await Production.findByPk(req.params.id, {
      include: [{ model: Farmer, as: 'farmer', include: [{ model: Member, as: 'member' }] }],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    if (
      req.user.role !== 'super_admin' &&
      record.farmer.member.cooperative_id !== req.user.cooperative_id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/production
 * total_amount is calculated automatically by the model hook — never accepted from the client.
 */
const create = async (req, res) => {
  try {
    const { farmer_id, product_name, quantity, unit, unit_price, season, production_date } =
      req.body;

    const { allowed, farmer } = await assertAccessToFarmer(farmer_id, req.user);
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });
    if (!allowed) return res.status(403).json({ success: false, message: 'Access denied' });

    const record = await Production.create({
      farmer_id,
      product_name,
      quantity,
      unit,
      unit_price,
      season,
      production_date,
      recorded_by: req.user.id,
    });

    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const record = await Production.findByPk(req.params.id, {
      include: [{ model: Farmer, as: 'farmer', include: [{ model: Member, as: 'member' }] }],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    if (
      req.user.role !== 'super_admin' &&
      record.farmer.member.cooperative_id !== req.user.cooperative_id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { farmer_id, total_amount, ...safeUpdates } = req.body; // farmer_id immutable, total_amount always derived
    await record.update(safeUpdates);

    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const record = await Production.findByPk(req.params.id, {
      include: [{ model: Farmer, as: 'farmer', include: [{ model: Member, as: 'member' }] }],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    if (
      req.user.role !== 'super_admin' &&
      record.farmer.member.cooperative_id !== req.user.cooperative_id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await record.destroy();
    return res.status(200).json({ success: true, message: 'Production record deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/production/summary
 * Returns total quantity and total value, grouped by product, for the caller's cooperative.
 * Feeds directly into the dashboard from your architecture doc.
 */
const summary = async (req, res) => {
  try {
    const memberWhere = {};
    if (req.user.role !== 'super_admin') {
      memberWhere.cooperative_id = req.user.cooperative_id;
    } else if (req.query.cooperative_id) {
      memberWhere.cooperative_id = req.query.cooperative_id;
    }

    const rows = await Production.findAll({
      attributes: [
        'product_name',
        [fn('SUM', col('quantity')), 'total_quantity'],
        [fn('SUM', col('total_amount')), 'total_value'],
        [fn('COUNT', col('Production.id')), 'record_count'],
      ],
      include: [
        {
          model: Farmer,
          as: 'farmer',
          attributes: [],
          include: [{ model: Member, as: 'member', attributes: [], where: memberWhere }],
        },
      ],
      group: ['product_name'],
      raw: true,
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, getById, create, update, remove, summary };
