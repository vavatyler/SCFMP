'use strict';
const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');

const ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL || 'admin@smartnyamagabe.rw';

module.exports = {
  up: async (queryInterface) => {
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (!password || password.length < 12) {
      throw new Error(
        'INITIAL_ADMIN_PASSWORD must be set to a value of at least 12 characters before seeding.'
      );
    }

    const existingAdmin = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      {
        replacements: { email: ADMIN_EMAIL },
        type: QueryTypes.SELECT,
        plain: true,
      }
    );

    if (existingAdmin) {
      return;
    }

    const hashed = await bcrypt.hash(password, 12);

    await queryInterface.bulkInsert('users', [
      {
        cooperative_id: null,
        first_name: process.env.INITIAL_ADMIN_FIRST_NAME || 'SNDS',
        last_name: process.env.INITIAL_ADMIN_LAST_NAME || 'Admin',
        email: ADMIN_EMAIL,
        phone: null,
        password_hash: hashed,
        role: 'super_admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', { email: ADMIN_EMAIL });
  },
};
