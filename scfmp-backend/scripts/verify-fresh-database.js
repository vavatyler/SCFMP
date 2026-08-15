'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');

const businessTables = [
  'cooperatives',
  'members',
  'farmers',
  'production',
  'loans',
  'transactions',
  'inventory_items',
  'inventory_transactions',
  'documents',
  'notifications',
  'products',
  'audit_logs',
  'refresh_tokens',
];

async function verify() {
  const [admins] = await sequelize.query(
    'SELECT email, role, status FROM users ORDER BY id'
  );
  const [credentialRows] = await sequelize.query(
    'SELECT password_hash FROM users WHERE email = :email LIMIT 1',
    { replacements: { email: process.env.INITIAL_ADMIN_EMAIL } }
  );
  const counts = {};

  for (const table of businessTables) {
    const [rows] = await sequelize.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    counts[table] = Number(rows[0].total);
  }

  process.stdout.write(`ADMIN_ROWS=${JSON.stringify(admins)}\n`);
  process.stdout.write(`BUSINESS_TABLE_COUNTS=${JSON.stringify(counts)}\n`);

  const credentialsValid = Boolean(
    credentialRows[0] &&
      (await bcrypt.compare(
        process.env.INITIAL_ADMIN_PASSWORD || '',
        credentialRows[0].password_hash
      ))
  );
  process.stdout.write(`ADMIN_CREDENTIALS_VALID=${credentialsValid}\n`);

  const token = jwt.sign({ type: 'verification' }, process.env.JWT_SECRET, {
    expiresIn: '1m',
  });
  jwt.verify(token, process.env.JWT_SECRET);
  process.stdout.write('JWT_CONFIGURATION_VALID=true\n');
}

verify()
  .catch((error) => {
    process.stderr.write(`VERIFY_FAILED=${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
