const { Sequelize } = require('sequelize');
const defineLoan = require('../models/Loan');

describe('Loan balance auto-initialization', () => {
  // In-memory SQLite instance to test the model's beforeValidate hook logic
  // in isolation — no MySQL connection required for this test.
  const sequelize = new Sequelize('sqlite::memory:', { logging: false });
  const Loan = defineLoan(sequelize);

  beforeAll(async () => {
    await sequelize.sync();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('sets balance equal to principal_amount for a new loan', async () => {
    const loan = Loan.build({
      cooperative_id: 1,
      member_id: 1,
      principal_amount: 100000,
      interest_rate: 12,
      issue_date: '2026-06-01',
    });

    await loan.validate();

    expect(Number(loan.balance)).toBe(100000);
  });

  it('does not override an explicitly provided balance', async () => {
    const loan = Loan.build({
      cooperative_id: 1,
      member_id: 1,
      principal_amount: 100000,
      balance: 50000, // e.g. importing a loan that's already partially repaid
      issue_date: '2026-06-01',
    });

    await loan.validate();

    expect(Number(loan.balance)).toBe(50000);
  });
});
