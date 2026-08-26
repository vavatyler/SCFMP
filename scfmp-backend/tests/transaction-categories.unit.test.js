const mockTransactionCreate = jest.fn();
const mockTransactionFindByPk = jest.fn();

jest.mock('../models', () => ({
  Transaction: {
    create: mockTransactionCreate,
    findByPk: mockTransactionFindByPk,
  },
  Member: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  Cooperative: {},
}));

jest.mock('../middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = {
      id: 7,
      role: req.get('x-test-role') || 'cooperative_manager',
      cooperative_id: Number(req.get('x-test-cooperative-id')) || 10,
    };
    next();
  },
}));

const express = require('express');
const request = require('supertest');
const transactionRoutes = require('../routes/transactionRoutes');

const app = express();
app.use(express.json());
app.use('/api/transactions', transactionRoutes);

const validTransaction = {
  type: 'income',
  category: 'Product Sales',
  amount: 15000,
  transaction_date: '2026-08-26',
};

describe('central transaction categories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionCreate.mockImplementation(async (values) => ({ id: 1, ...values }));
  });

  it('serves the centrally configured categories by transaction type', async () => {
    const response = await request(app).get('/api/transactions/categories').expect(200);

    expect(response.body.data).toEqual({
      income: ['Membership Fees', 'Product Sales', 'Grants', 'Donations', 'Other Income'],
      expense: [
        'Transport',
        'Salaries',
        'Agricultural Inputs',
        'Equipment',
        'Office Expenses',
        'Other Expense',
      ],
      saving: ['Member Savings', 'Group Savings', 'Other Savings'],
    });
  });

  it('trims and accepts a configured category for the selected type', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send({ ...validTransaction, category: '  Product Sales  ' })
      .expect(201);

    expect(mockTransactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      cooperative_id: 10,
      type: 'income',
      category: 'Product Sales',
    }));
    expect(response.body.data.category).toBe('Product Sales');
  });

  it.each([
    ['', 'income'],
    ['Coffee sales', 'income'],
    ['Transport', 'income'],
    ['Product Sales', 'expense'],
    ['Membership Fees', 'saving'],
    ['Member Savings', 'expense'],
    [123, 'income'],
  ])('rejects category %p for type %s', async (category, type) => {
    await request(app)
      .post('/api/transactions')
      .send({ ...validTransaction, type, category })
      .expect(400);

    expect(mockTransactionCreate).not.toHaveBeenCalled();
  });

  it('preserves an unchanged legacy category while rejecting a new arbitrary value', async () => {
    const legacyRecord = {
      id: 4,
      cooperative_id: 10,
      type: 'income',
      category: 'Coffee sales',
      loan_id: null,
      update: jest.fn(async (updates) => Object.assign(legacyRecord, updates)),
    };
    mockTransactionFindByPk.mockResolvedValue(legacyRecord);

    await request(app)
      .put('/api/transactions/4')
      .send({ category: 'Coffee sales', amount: 18000 })
      .expect(200);

    expect(legacyRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      category: 'Coffee sales',
      amount: 18000,
    }));

    await request(app)
      .put('/api/transactions/4')
      .send({ category: 'Unconfigured replacement' })
      .expect(400);
  });

  it('allows a legacy record to move to a configured category', async () => {
    const legacyRecord = {
      id: 5,
      cooperative_id: 10,
      type: 'expense',
      category: 'Fertilizer purchase',
      loan_id: null,
      update: jest.fn(async (updates) => Object.assign(legacyRecord, updates)),
    };
    mockTransactionFindByPk.mockResolvedValue(legacyRecord);

    await request(app)
      .put('/api/transactions/5')
      .send({ category: 'Agricultural Inputs' })
      .expect(200);

    expect(legacyRecord.update).toHaveBeenCalledWith({ category: 'Agricultural Inputs' });
  });

  it('validates edits against the stored type instead of trusting a submitted type', async () => {
    const expenseRecord = {
      id: 6,
      cooperative_id: 10,
      type: 'expense',
      category: 'Transport',
      loan_id: null,
      update: jest.fn(),
    };
    mockTransactionFindByPk.mockResolvedValue(expenseRecord);

    await request(app)
      .put('/api/transactions/6')
      .send({ type: 'income', category: 'Membership Fees' })
      .expect(400);

    expect(expenseRecord.update).not.toHaveBeenCalled();
  });
});
