'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },

      first_name: {
        type: Sequelize.STRING(100),
      },

      last_name: {
        type: Sequelize.STRING(100),
      },

      email: {
        type: Sequelize.STRING(255),
        unique: true,
      },

      phone: {
        type: Sequelize.STRING(20),
      },

      dob: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      ssn_encrypted: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      city: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      state: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      zip_code: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      tcpa_consent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      tcpa_timestamp: {
        type: Sequelize.DATE,
      },

      tcpa_ip_address: {
        type: Sequelize.STRING(45),
      },

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
