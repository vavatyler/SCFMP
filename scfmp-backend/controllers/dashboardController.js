const { Op, fn, col } = require('sequelize');
const {
  Member,
  Farmer,
  Production,
  Transaction,
  Loan,
  InventoryItem,
  AuditLog,
  sequelize,
} = require('../models');
const { PERMISSIONS, getEffectivePermissions } = require('../config/accessControl');

const resolveCooperativeScope = (req) => {
  if (req.organizationId) return req.organizationId;
  return req.user.role === 'super_admin' ? null : req.user.cooperative_id;
};

/**
 * Builds the same aggregate numbers used by both the JSON summary and the CSV export,
 * so the two endpoints can never drift out of sync with each other.
 */
const buildSummary = async (cooperativeId, { from, to, user } = {}) => {
  const permissions = getEffectivePermissions(user);
  const canView = (permission) => permissions.includes(permission);
  const summary = {};
  const memberWhere = { cooperative_id: cooperativeId };
  if (user?.role === 'farmer') memberWhere.user_id = user.id;

  if (canView(PERMISSIONS.MEMBERS_VIEW)) {
    summary.members = {
      total: await Member.count({ where: memberWhere }),
      active: await Member.count({ where: { ...memberWhere, status: 'active' } }),
    };
  }

  if (canView(PERMISSIONS.FARMERS_VIEW)) {
    // Farmers are linked to members, so scope through the member relationship.
    summary.farmers = {
      total: await Farmer.count({
        include: [{ model: Member, as: 'member', where: memberWhere, attributes: [] }],
      }),
    };
  }

  if (canView(PERMISSIONS.PRODUCTION_VIEW)) {
    // Production owns its cooperative relationship directly. Always scope organization
    // totals by that column so mismatched farmer relationships cannot cross boundaries.
    const productionWhere = { cooperative_id: cooperativeId };
    if (from || to) {
      productionWhere.production_date = {};
      if (from) productionWhere.production_date[Op.gte] = from;
      if (to) productionWhere.production_date[Op.lte] = to;
    }
    const productionInclude = user?.role === 'farmer'
      ? [{
        model: Farmer,
        as: 'farmer',
        required: true,
        attributes: [],
        include: [{ model: Member, as: 'member', required: true, where: { user_id: user.id }, attributes: [] }],
      }]
      : [];
    const productionTotals = await Production.findOne({
      where: productionWhere,
      include: productionInclude,
      attributes: [
        [fn('COALESCE', fn('SUM', col('Production.total_amount')), 0), 'total_value'],
        [fn('COALESCE', fn('SUM', col('Production.quantity')), 0), 'total_quantity'],
        [fn('COUNT', col('Production.id')), 'record_count'],
      ],
      raw: true,
    });
    summary.production = {
      total_value: parseFloat(productionTotals?.total_value || 0),
      total_quantity: parseFloat(productionTotals?.total_quantity || 0),
      record_count: parseInt(productionTotals?.record_count || 0, 10),
    };
  }

  if (canView(PERMISSIONS.FINANCE_VIEW)) {
    // Finance is scoped directly by cooperative_id on transactions and loans.
    const transactionWhere = { cooperative_id: cooperativeId };
    if (user?.role === 'farmer') {
      const ownMember = await Member.findOne({ where: { user_id: user.id }, attributes: ['id'] });
      transactionWhere.member_id = ownMember?.id || -1;
    }
    if (from || to) {
      transactionWhere.transaction_date = {};
      if (from) transactionWhere.transaction_date[Op.gte] = from;
      if (to) transactionWhere.transaction_date[Op.lte] = to;
    }
    const financeRows = await Transaction.findAll({
      where: transactionWhere,
      attributes: ['type', [fn('SUM', col('amount')), 'total']],
      group: ['type'],
      raw: true,
    });
    const finance = { income: 0, expense: 0, saving: 0, loan_disbursement: 0, loan_repayment: 0 };
    financeRows.forEach((row) => { finance[row.type] = parseFloat(row.total); });
    finance.net_balance = finance.income - finance.expense;
    summary.finance = finance;

    const loanWhere = { cooperative_id: cooperativeId };
    if (transactionWhere.member_id !== undefined) loanWhere.member_id = transactionWhere.member_id;
    summary.loans = {
      active_count: await Loan.count({ where: { ...loanWhere, status: 'active' } }),
      outstanding_balance: parseFloat(await Loan.sum('balance', { where: { ...loanWhere, status: 'active' } }) || 0),
    };
  }

  if (canView(PERMISSIONS.INVENTORY_VIEW)) {
    const inventoryWhere = { cooperative_id: cooperativeId, status: 'active' };
    summary.inventory = {
      low_stock_count: await InventoryItem.count({
        where: {
          ...inventoryWhere,
          [Op.and]: sequelize.where(sequelize.col('quantity_in_stock'), Op.lte, sequelize.col('reorder_level')),
        },
      }),
    };
  }

  return summary;
};

/**
 * GET /api/dashboard/summary
 * Optional ?from= &to= to scope to a reporting period.
 * Organization data always requires an explicit Super Admin organization context.
 * Organization accounts remain locked to their assigned cooperative.
 */
const summary = async (req, res) => {
  try {
    const cooperativeId = resolveCooperativeScope(req);
    if (!cooperativeId) return res.status(400).json({ success: false, message: 'Select an organization to view dashboard data' });
    const { from, to } = req.query;
    const data = await buildSummary(cooperativeId, { from, to, user: req.user });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const monthExpression = (field) => (
  sequelize.getDialect() === 'sqlite'
    ? fn('strftime', '%Y-%m', col(field))
    : fn('DATE_FORMAT', col(field), '%Y-%m')
);

const dashboardMonths = () => {
  const now = new Date();
  const firstMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  return { from: `${firstMonthDate.toISOString().slice(0, 7)}-01`, to: now.toISOString().slice(0, 10) };
};

/**
 * GET /api/dashboard/analytics
 * Every series is built from existing records for the selected organization. The
 * response omits modules the authenticated user cannot view.
 */
const analytics = async (req, res) => {
  try {
    const cooperativeId = resolveCooperativeScope(req);
    if (!cooperativeId) return res.status(400).json({ success: false, message: 'Select an organization to view dashboard analytics' });

    const permissions = getEffectivePermissions(req.user);
    const canView = (permission) => permissions.includes(permission);
    const { from, to } = dashboardMonths();
    const data = {};

    if (canView(PERMISSIONS.PRODUCTION_VIEW)) {
      const productionWhere = { cooperative_id: cooperativeId, production_date: { [Op.gte]: from, [Op.lte]: to } };
      const productionInclude = req.user.role === 'farmer'
        ? [{
          model: Farmer,
          as: 'farmer',
          required: true,
          attributes: [],
          include: [{ model: Member, as: 'member', required: true, where: { user_id: req.user.id }, attributes: [] }],
        }]
        : [];
      const productionMonth = monthExpression('Production.production_date');
      const productionRows = await Production.findAll({
        where: productionWhere,
        include: productionInclude,
        attributes: [
          [productionMonth, 'period'],
          [fn('SUM', col('Production.quantity')), 'quantity'],
          [fn('SUM', col('Production.total_amount')), 'value'],
          [fn('COUNT', col('Production.id')), 'records'],
        ],
        group: [productionMonth],
        order: [[productionMonth, 'ASC']],
        raw: true,
      });
      data.production_trend = productionRows.map((row) => ({
        period: row.period,
        quantity: Number(row.quantity || 0),
        value: Number(row.value || 0),
        records: Number(row.records || 0),
      }));
    }

    if (canView(PERMISSIONS.FARMERS_VIEW)) {
      const farmerLocation = fn(
        'COALESCE',
        fn('NULLIF', col('Farmer.district'), ''),
        fn('NULLIF', col('member.address_district'), ''),
        'Not specified'
      );
      const memberWhere = { cooperative_id: cooperativeId };
      if (req.user.role === 'farmer') memberWhere.user_id = req.user.id;
      const farmerRows = await Farmer.findAll({
        include: [{ model: Member, as: 'member', required: true, attributes: [], where: memberWhere }],
        attributes: [[farmerLocation, 'location'], [fn('COUNT', col('Farmer.id')), 'farmers']],
        group: [farmerLocation],
        order: [[fn('COUNT', col('Farmer.id')), 'DESC']],
        raw: true,
      });
      data.farmer_distribution = farmerRows.map((row) => ({ location: row.location, farmers: Number(row.farmers || 0) }));
    }

    if (canView(PERMISSIONS.INVENTORY_VIEW)) {
      const inventoryWhere = { cooperative_id: cooperativeId, status: 'active' };
      const quantity = sequelize.col('quantity_in_stock');
      const reorderLevel = sequelize.col('reorder_level');
      const [totalItems, availableItems, lowStockItems, outOfStockItems] = await Promise.all([
        InventoryItem.count({ where: inventoryWhere }),
        InventoryItem.count({ where: { ...inventoryWhere, [Op.and]: [sequelize.where(quantity, Op.gt, reorderLevel)] } }),
        InventoryItem.count({ where: { ...inventoryWhere, [Op.and]: [sequelize.where(quantity, Op.gt, 0), sequelize.where(quantity, Op.lte, reorderLevel)] } }),
        InventoryItem.count({ where: { ...inventoryWhere, quantity_in_stock: { [Op.lte]: 0 } } }),
      ]);
      data.inventory_status = {
        total_items: totalItems,
        available: availableItems,
        low_stock: lowStockItems,
        out_of_stock: outOfStockItems,
      };
    }

    if (canView(PERMISSIONS.FINANCE_VIEW)) {
      const transactionWhere = { cooperative_id: cooperativeId, transaction_date: { [Op.gte]: from, [Op.lte]: to } };
      if (req.user.role === 'farmer') {
        const ownMember = await Member.findOne({ where: { user_id: req.user.id }, attributes: ['id'] });
        transactionWhere.member_id = ownMember?.id || -1;
      }
      const transactionMonth = monthExpression('Transaction.transaction_date');
      const transactionRows = await Transaction.findAll({
        where: transactionWhere,
        attributes: [[transactionMonth, 'period'], 'type', [fn('SUM', col('Transaction.amount')), 'amount']],
        group: [transactionMonth, 'type'],
        order: [[transactionMonth, 'ASC']],
        raw: true,
      });
      const months = new Map();
      transactionRows.forEach((row) => {
        if (!['income', 'expense'].includes(row.type)) return;
        const month = months.get(row.period) || { period: row.period, income: 0, expense: 0 };
        month[row.type] = Number(row.amount || 0);
        months.set(row.period, month);
      });
      data.financial_overview = [...months.values()];
    }

    const visibleEntities = [];
    if (canView(PERMISSIONS.MEMBERS_VIEW)) visibleEntities.push('member');
    if (canView(PERMISSIONS.FARMERS_VIEW)) visibleEntities.push('farmer', 'farmer_group');
    if (canView(PERMISSIONS.PRODUCTION_VIEW)) visibleEntities.push('production');
    if (canView(PERMISSIONS.FINANCE_VIEW)) visibleEntities.push('transaction', 'loan');
    if (canView(PERMISSIONS.INVENTORY_VIEW)) visibleEntities.push('inventory_item', 'inventory_transaction');
    if (canView(PERMISSIONS.DOCUMENTS_VIEW)) visibleEntities.push('document');
    if (canView(PERMISSIONS.TEAM_VIEW)) visibleEntities.push('team_member');
    if (canView(PERMISSIONS.ORGANIZATIONS_VIEW)) visibleEntities.push('cooperative');
    if (visibleEntities.length) {
      const activityWhere = { cooperative_id: cooperativeId, entity_type: { [Op.in]: visibleEntities } };
      if (req.user.role === 'farmer') activityWhere.actor_user_id = req.user.id;
      const activityRows = await AuditLog.findAll({
        where: activityWhere,
        attributes: ['id', 'action', 'entity_type', 'outcome', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 8,
        raw: true,
      });
      data.recent_activity = activityRows;
    } else {
      data.recent_activity = [];
    }

    return res.status(200).json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to load dashboard analytics' });
  }
};

/**
 * GET /api/dashboard/export
 * Same numbers as /summary, flattened into a downloadable CSV.
 */
const exportCsv = async (req, res) => {
  try {
    const cooperativeId = resolveCooperativeScope(req);
    if (!cooperativeId) return res.status(400).json({ success: false, message: 'Select an organization to export dashboard data' });
    const { from, to } = req.query;
    const data = await buildSummary(cooperativeId, { from, to, user: req.user });

    const rows = [['Metric', 'Value']];
    if (data.members) rows.push(['Total Members', data.members.total], ['Active Members', data.members.active]);
    if (data.farmers) rows.push(['Total Farmers', data.farmers.total]);
    if (data.production) rows.push(
      ['Production Total Value (RWF)', data.production.total_value],
      ['Production Total Quantity', data.production.total_quantity],
      ['Production Record Count', data.production.record_count],
    );
    if (data.finance) rows.push(
      ['Income (RWF)', data.finance.income], ['Expenses (RWF)', data.finance.expense],
      ['Savings (RWF)', data.finance.saving], ['Net Balance (RWF)', data.finance.net_balance],
    );
    if (data.loans) rows.push(['Active Loans', data.loans.active_count], ['Outstanding Loan Balance (RWF)', data.loans.outstanding_balance]);
    if (data.inventory) rows.push(['Low Stock Items', data.inventory.low_stock_count]);

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="agribridge-dashboard-summary.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { summary, analytics, exportCsv, buildSummary };
