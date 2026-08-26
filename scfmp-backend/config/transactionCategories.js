const TRANSACTION_CATEGORIES = Object.freeze({
  income: Object.freeze([
    'Membership Fees',
    'Product Sales',
    'Grants',
    'Donations',
    'Other Income',
  ]),
  expense: Object.freeze([
    'Transport',
    'Salaries',
    'Agricultural Inputs',
    'Equipment',
    'Office Expenses',
    'Other Expense',
  ]),
  saving: Object.freeze([
    'Member Savings',
    'Group Savings',
    'Other Savings',
  ]),
});

const normalizeTransactionCategory = (category) =>
  typeof category === 'string' ? category.trim() : '';

const isConfiguredTransactionCategory = (type, category) => {
  const normalizedCategory = normalizeTransactionCategory(category);
  return (TRANSACTION_CATEGORIES[type] || []).includes(normalizedCategory);
};

module.exports = {
  TRANSACTION_CATEGORIES,
  normalizeTransactionCategory,
  isConfiguredTransactionCategory,
};
