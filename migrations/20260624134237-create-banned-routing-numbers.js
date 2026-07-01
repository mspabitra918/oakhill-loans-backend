'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('banned_routing_numbers', {
      routing_number: {
        type: Sequelize.STRING(9),
        primaryKey: true,
      },

      bank_name: {
        type: Sequelize.STRING,
      },

      reason: {
        type: Sequelize.STRING,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('banned_routing_numbers');
  },
};