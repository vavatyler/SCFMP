'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  throw new Error('The backend .env file does not exist.');
}

const current = fs.readFileSync(envPath, 'utf8');
const additions = [];

if (!/^INITIAL_ADMIN_EMAIL=/m.test(current)) {
  additions.push('INITIAL_ADMIN_EMAIL=admin@smartnyamagabe.rw');
}

for (const [name, byteLength] of [
  ['INITIAL_ADMIN_PASSWORD', 24],
  ['JWT_SECRET', 48],
  ['JWT_REFRESH_SECRET', 48],
]) {
  if (new RegExp(`^${name}=`, 'm').test(current)) {
    process.stdout.write(`${name}_ALREADY_PRESENT=true\n`);
    continue;
  }

  const value = crypto.randomBytes(byteLength).toString('base64url');
  additions.push(`${name}="${value}"`);
  process.stdout.write(`${name}_CREATED=true\n`);
}

if (additions.length > 0) {
  const separator = current.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(envPath, `${separator}${additions.join('\n')}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
}
