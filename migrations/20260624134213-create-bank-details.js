'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bank_details', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      
      user_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },

      application_id: {
        type: Sequelize.UUID,
        references: {
          model: 'applications',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },

      bank_name: {
        type: Sequelize.STRING,
      },

      routing_number: {
        type: Sequelize.STRING(9),
      },

      account_number_encrypted: {
        type: Sequelize.TEXT,
      },

      account_age: {
        type: Sequelize.STRING(50),
      },

      api_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bank_details');
  },
};