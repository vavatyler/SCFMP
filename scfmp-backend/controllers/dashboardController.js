const { Op, fn, col } = require('sequelize');
const {
  Member,
  Farmer,
  Production,
  Transaction,
  Loan,
  InventoryItem,
  sequelize,
} = require('../models');

const resolveCooperativeScope = (req) => {
  if (req.user.role === 'super_admin') {
    return req.query.cooperative_id || null;
  }
  return req.user.cooperative_id;
};

/**
 * Builds the same aggregate numbers used by both the JSON summary and the CSV export,
 * so the two endpoints can never drift out of sync with each other.
 */
const buildSummary = async (cooperativeId, { from, to, user } = {}) => {
  const memberWhere = {};
  if (user?.role !== 'super_admin' || cooperativeId) {
    memberWhere.cooperative_id = cooperativeId;
  }
  if (user?.role === 'farmer') memberWhere.user_id = user.id;

  const totalMembers = await Member.count({ where: memberWhere });
  const activeMembers = await Member.count({ where: { ...memberWhere, status: 'active' } });

  // Farmers are linked to members, so scope through that relationship
  const totalFarmers = await Farmer.count({
    include: [{ model: Member, as: 'member', where: memberWhere, attributes: [] }],
  });

  // Production owns its cooperative relationship directly. Always scope organization
  // totals by that column so a mismatched farmer relationship cannot cross boundaries.
  const productionWhere = {};
  if (user?.role !== 'super_admin' || cooperativeId) {
    productionWhere.cooperative_id = cooperativeId;
  }
  if (from || to) {
    productionWhere.production_date = {};
    if (from) productionWhere.production_date[Op.gte] = from;
    if (to) productionWhere.production_date[Op.lte] = to;
  }
  const productionInclude = user?.role === 'farmer'
    ? [
      {
        model: Farmer,
        as: 'farmer',
        required: true,
        attributes: [],
        include: [{
          model: Member,
          as: 'member',
          required: true,
          where: { user_id: user.id },
          attributes: [],
        }],
      },
    ]
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

  // Finance: scoped directly by cooperative_id on transactions
  const transactionWhere = {};
  if (user?.role !== 'super_admin' || cooperativeId) {
    transactionWhere.cooperative_id = cooperativeId;
  }
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
  financeRows.forEach((r) => {
    finance[r.type] = parseFloat(r.total);
  });
  finance.net_balance = finance.income - finance.expense;

  // Loans
  const loanWhere = {};
  if (user?.role !== 'super_admin' || cooperativeId) {
    loanWhere.cooperative_id = cooperativeId;
  }
  if (user?.role === 'farmer') loanWhere.member_id = transactionWhere.member_id;
  const activeLoansCount = await Loan.count({ where: { ...loanWhere, status: 'active' } });
  const outstandingBalance = await Loan.sum('balance', { where: { ...loanWhere, status: 'active' } });

  // Inventory: low-stock count
  const inventoryWhere = { status: 'active' };
  if (user?.role !== 'super_admin' || cooperativeId) {
    inventoryWhere.cooperative_id = cooperativeId;
  }
  const lowStockCount = await InventoryItem.count({
    where: {
      ...inventoryWhere,
      [Op.and]: sequelize.where(
        sequelize.col('quantity_in_stock'),
        Op.lte,
        sequelize.col('reorder_level')
      ),
    },
  });

  return {
    members: {
      total: totalMembers,
      active: activeMembers,
    },
    farmers: {
      total: totalFarmers,
    },
    production: {
      total_value: parseFloat(productionTotals?.total_value || 0),
      total_quantity: parseFloat(productionTotals?.total_quantity || 0),
      record_count: parseInt(productionTotals?.record_count || 0, 10),
    },
    finance,
    loans: {
      active_count: activeLoansCount,
      outstanding_balance: parseFloat(outstandingBalance || 0),
    },
    inventory: {
      low_stock_count: lowStockCount,
    },
  };
};

/**
 * GET /api/dashboard/summary
 * Optional ?from= &to= to scope to a reporting period.
 * super_admin can pass ?cooperative_id= to view a specific cooperative; omitting it
 * gives a platform-wide summary for super_admin, or the caller's own cooperative otherwise.
 */
const summary = async (req, res) => {
  try {
    const cooperativeId = resolveCooperativeScope(req);
    const { from, to } = req.query;
    const data = await buildSummary(cooperativeId, { from, to, user: req.user });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/dashboard/export
 * Same numbers as /summary, flattened into a downloadable CSV.
 */
const exportCsv = async (req, res) => {
  try {
    const cooperativeId = resolveCooperativeScope(req);
    const { from, to } = req.query;
    const data = await buildSummary(cooperativeId, { from, to, user: req.user });

    const rows = [
      ['Metric', 'Value'],
      ['Total Members', data.members.total],
      ['Active Members', data.members.active],
      ['Total Farmers', data.farmers.total],
      ['Production Total Value (RWF)', data.production.total_value],
      ['Production Total Quantity', data.production.total_quantity],
      ['Production Record Count', data.production.record_count],
      ['Income (RWF)', data.finance.income],
      ['Expenses (RWF)', data.finance.expense],
      ['Savings (RWF)', data.finance.saving],
      ['Net Balance (RWF)', data.finance.net_balance],
      ['Active Loans', data.loans.active_count],
      ['Outstanding Loan Balance (RWF)', data.loans.outstanding_balance],
      ['Low Stock Items', data.inventory.low_stock_count],
    ];

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="scfmp-dashboard-summary.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { summary, exportCsv };
