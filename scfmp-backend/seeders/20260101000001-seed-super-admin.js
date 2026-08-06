'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const hashed = await bcrypt.hash('ChangeMe123!', 10);

    await queryInterface.bulkInsert('users', [
      {
        cooperative_id: null,
        first_name: 'SNDS',
        last_name: 'Admin',
        email: 'admin@smartnyamagabe.rw',
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
    await queryInterface.bulkDelete('users', { email: 'admin@smartnyamagabe.rw' });
  },
};
