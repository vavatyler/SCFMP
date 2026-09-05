const { Sequelize } = require('sequelize');

/**
 * Creates a fresh in-memory SQLite database with the ENTIRE model set loaded and
 * associated — mirroring models/index.js, but pointed at sqlite instead of MySQL.
 *
 * Using this in every integration test (instead of hand-picking a subset of models)
 * avoids a recurring bug: any model's associate() can reference any other model
 * (e.g. Cooperative references Document, Loan, Transaction, etc.), so loading only
 * "the models this test cares about" breaks as soon as an unrelated model gains a
 * new association. Loading everything, every time, sidesteps that entirely.
 */
const buildTestDb = async () => {
  const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });

  const modelFiles = [
    'Cooperative',
    'User',
    'Member',
    'Farmer',
    'FarmerGroup',
    'Product',
    'Production',
    'ProductionContribution',
    'Transaction',
    'Loan',
    'InventoryItem',
    'InventoryTransaction',
    'Document',
    'Notification',
    'PasswordResetToken',
    'RefreshToken',
    'AuditLog',
    'TeamMember',
    'Subscription',
  ];

  const models = {};
  modelFiles.forEach((name) => {
    models[name] = require(`../models/${name}`)(sequelize);
  });
  Object.values(models).forEach((m) => m.associate && m.associate(models));

  await sequelize.sync();

  return { sequelize, models };
};

module.exports = { buildTestDb };
