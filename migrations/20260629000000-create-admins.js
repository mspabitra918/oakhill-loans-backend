'use strict';

// Admin/underwriter accounts for the back-office underwriting portal. Kept
// separate from `users` (loan applicants): admins authenticate with a hashed
// password and carry a role, applicants do not.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admins', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },

      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },

      // bcrypt hash — never store or log the raw password.
      password_hash: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      // 'admin' or 'underwriter' (mirrors the Role enum in src/common/constants.ts).
      role: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'admin',
      },

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admins');
  },
};
