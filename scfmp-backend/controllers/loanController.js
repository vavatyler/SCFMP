const { Loan, Member, Transaction, sequelize } = require('../models');

const resolveCooperativeScope = (req) => {
  if (req.user.role === 'super_admin') {
    return req.query.cooperative_id || req.body.cooperative_id || null;
  }
  return req.user.cooperative_id;
};

const getOwnMemberId = async (userId) => {
  const member = await Member.findOne({ where: { user_id: userId }, attributes: ['id'] });
  return member?.id || -1;
};

const list = async (req, res) => {
  try {
    const { status, member_id, page = 1, limit = 20 } = req.query;
    const cooperativeId = resolveCooperativeScope(req);

    const where = {};
    if (cooperativeId) where.cooperative_id = cooperativeId;
    if (status) where.status = status;
    if (req.user.role === 'farmer') where.member_id = await getOwnMemberId(req.user.id);
    else if (member_id) where.member_id = member_id;

    const offset = (Number(page) - 1) * Number(limit);

    const { rows, count } = await Loan.findAndCountAll({
      where,
      include: [{ model: Member, as: 'member', attributes: ['id', 'first_name', 'last_name'] }],
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
    const loan = await Loan.findByPk(req.params.id, {
      include: [
        { model: Member, as: 'member', attributes: ['id', 'first_name', 'last_name'] },
        { model: Transaction, as: 'transactions' },
      ],
    });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    if (
      req.user.role !== 'super_admin' &&
      (loan.cooperative_id !== req.user.cooperative_id ||
        (req.user.role === 'farmer' && loan.member_id !== (await getOwnMemberId(req.user.id))))
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: loan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/loans
 * Issues a new loan AND records the disbursement as a transaction, atomically.
 */
const create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { member_id, principal_amount, interest_rate, issue_date, due_date } = req.body;

    const cooperative_id =
      req.user.role === 'super_admin' ? req.body.cooperative_id : req.user.cooperative_id;
    if (!cooperative_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'cooperative_id is required' });
    }

    const member = await Member.findByPk(member_id);
    if (!member || member.cooperative_id !== Number(cooperative_id)) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'member_id does not belong to this cooperative' });
    }

    const loan = await Loan.create(
      {
        cooperative_id,
        member_id,
        principal_amount,
        interest_rate: interest_rate || 0,
        issue_date,
        due_date,
        recorded_by: req.user.id,
      },
      { transaction: t }
    );

    const disbursement = await Transaction.create(
      {
        cooperative_id,
        member_id,
        loan_id: loan.id,
        type: 'loan_disbursement',
        category: 'Loan disbursement',
        amount: principal_amount,
        description: `Loan #${loan.id} disbursed`,
        transaction_date: issue_date,
        recorded_by: req.user.id,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({ success: true, data: { loan, disbursement } });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/loans/:id/repay
 * Records a repayment: creates a loan_repayment transaction AND reduces the loan balance,
 * atomically. Marks the loan 'paid' once the balance reaches zero.
 */
const repay = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { amount, repayment_date } = req.body;

    const loan = await Loan.findByPk(req.params.id, { transaction: t });
    if (!loan) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }
    if (req.user.role !== 'super_admin' && loan.cooperative_id !== req.user.cooperative_id) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (loan.status === 'paid') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'This loan is already fully paid' });
    }

    const repaymentAmount = parseFloat(amount);
    if (repaymentAmount <= 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: 'Repayment amount must be greater than 0' });
    }

    const newBalance = Math.max(0, parseFloat(loan.balance) - repaymentAmount);

    const repayment = await Transaction.create(
      {
        cooperative_id: loan.cooperative_id,
        member_id: loan.member_id,
        loan_id: loan.id,
        type: 'loan_repayment',
        category: 'Loan repayment',
        amount: repaymentAmount,
        description: `Repayment for loan #${loan.id}`,
        transaction_date: repayment_date,
        recorded_by: req.user.id,
      },
      { transaction: t }
    );

    loan.balance = newBalance;
    if (newBalance === 0) loan.status = 'paid';
    await loan.save({ transaction: t });

    await t.commit();
    return res.status(200).json({ success: true, data: { loan, repayment } });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const loan = await Loan.findByPk(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    if (req.user.role !== 'super_admin' && loan.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // principal_amount and balance can't be edited directly — only via repay() or corrections by super_admin
    const { cooperative_id, member_id, principal_amount, balance, ...safeUpdates } = req.body;
    await loan.update(safeUpdates);

    return res.status(200).json({ success: true, data: loan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, getById, create, repay, update };
