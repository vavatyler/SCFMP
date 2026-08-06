const { Op, fn, col } = require('sequelize');
const { Transaction, Member, Cooperative } = require('../models');

/**
 * Resolves which cooperative_id a request is scoped to.
 * super_admin can view any cooperative via ?cooperative_id=; everyone else is locked to their own.
 */
const resolveCooperativeScope = (req) => {
  if (req.user.role === 'super_admin') {
    return req.query.cooperative_id || req.body.cooperative_id || null;
  }
  return req.user.cooperative_id;
};

/**
 * GET /api/transactions
 * Optional filters: ?type=  &member_id=  &from=YYYY-MM-DD  &to=YYYY-MM-DD
 */
const list = async (req, res) => {
  try {
    const { type, member_id, from, to, page = 1, limit = 20 } = req.query;
    const cooperativeId = resolveCooperativeScope(req);

    const where = {};
    if (cooperativeId) where.cooperative_id = cooperativeId;
    if (type) where.type = type;
    if (member_id) where.member_id = member_id;
    if (from || to) {
      where.transaction_date = {};
      if (from) where.transaction_date[Op.gte] = from;
      if (to) where.transaction_date[Op.lte] = to;
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { rows, count } = await Transaction.findAndCountAll({
      where,
      include: [
        { model: Member, as: 'member', attributes: ['id', 'first_name', 'last_name'] },
        { model: Cooperative, as: 'cooperative', attributes: ['id', 'name'] },
      ],
      order: [['transaction_date', 'DESC']],
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
    const record = await Transaction.findByPk(req.params.id, {
      include: [
        { model: Member, as: 'member', attributes: ['id', 'first_name', 'last_name'] },
        { model: Cooperative, as: 'cooperative', attributes: ['id', 'name'] },
      ],
    });
    if (!record) return res.status(404).json({ success: false, message: 'Transaction not found' });

    if (req.user.role !== 'super_admin' && record.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/transactions
 * Records income, expense, or saving. Loan-related transactions are created
 * automatically by the loan controller (disbursement/repayment), not here.
 */
const create = async (req, res) => {
  try {
    const { type, category, amount, description, transaction_date, member_id } = req.body;

    if (!['income', 'expense', 'saving'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type must be one of: income, expense, saving (loan transactions are created via the loans endpoints)',
      });
    }

    const cooperative_id =
      req.user.role === 'super_admin' ? req.body.cooperative_id : req.user.cooperative_id;
    if (!cooperative_id) {
      return res.status(400).json({ success: false, message: 'cooperative_id is required' });
    }

    if (member_id) {
      const member = await Member.findByPk(member_id);
      if (!member || member.cooperative_id !== Number(cooperative_id)) {
        return res
          .status(400)
          .json({ success: false, message: 'member_id does not belong to this cooperative' });
      }
    }

    const record = await Transaction.create({
      cooperative_id,
      member_id: member_id || null,
      type,
      category,
      amount,
      description,
      transaction_date,
      recorded_by: req.user.id,
    });

    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const record = await Transaction.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Transaction not found' });

    if (req.user.role !== 'super_admin' && record.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (record.loan_id) {
      return res.status(400).json({
        success: false,
        message: 'Loan-linked transactions cannot be edited directly — adjust via the loan endpoints',
      });
    }

    const { cooperative_id, loan_id, type, ...safeUpdates } = req.body;
    await record.update(safeUpdates);

    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const record = await Transaction.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Transaction not found' });

    if (req.user.role !== 'super_admin' && record.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (record.loan_id) {
      return res.status(400).json({
        success: false,
        message: 'Loan-linked transactions cannot be deleted directly',
      });
    }

    await record.destroy();
    return res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/transactions/summary
 * Powers the dashboard cards from the architecture doc: Income, Expenses, etc.
 * Optional ?from= &to= to scope to a date range (e.g. a reporting period).
 */
const summary = async (req, res) => {
  try {
    const cooperativeId = resolveCooperativeScope(req);
    const { from, to } = req.query;

    const where = {};
    if (cooperativeId) where.cooperative_id = cooperativeId;
    if (from || to) {
      where.transaction_date = {};
      if (from) where.transaction_date[Op.gte] = from;
      if (to) where.transaction_date[Op.lte] = to;
    }

    const rows = await Transaction.findAll({
      where,
      attributes: ['type', [fn('SUM', col('amount')), 'total']],
      group: ['type'],
      raw: true,
    });

    const totals = { income: 0, expense: 0, saving: 0, loan_disbursement: 0, loan_repayment: 0 };
    rows.forEach((r) => {
      totals[r.type] = parseFloat(r.total);
    });
    totals.net_balance = totals.income - totals.expense;

    return res.status(200).json({ success: true, data: totals });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, getById, create, update, remove, summary };
