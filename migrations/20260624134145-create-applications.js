'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('applications', {
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

      requested_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },

      loan_purpose: {
        type: Sequelize.TEXT,
      },

      gross_monthly_income: {
        type: Sequelize.DECIMAL(10, 2),
      },

      housing_status: {
        type: Sequelize.STRING(50),
      },

      monthly_housing_payment: {
        type: Sequelize.DECIMAL(10, 2),
      },

      other_monthly_debts: {
        type: Sequelize.DECIMAL(10, 2),
      },

      calculated_dti: {
        type: Sequelize.DECIMAL(5, 2),
      },

      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'PENDING',
      },

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('applications');
  },
};
