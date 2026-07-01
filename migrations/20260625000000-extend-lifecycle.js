'use strict';

// Extends the original schema to support the full loan lifecycle, the
// Gatekeeper's computed values, and the audit trail required for the
// human-in-the-loop fund release.
module.exports = {
  async up(queryInterface, Sequelize) {
    // --- applications: term, computed payment, status reason, updated_at ---
    await queryInterface.addColumn('applications', 'loan_term_months', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('applications', 'monthly_payment', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('applications', 'status_reason', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('applications', 'updated_at', {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
    await queryInterface.addIndex('applications', ['status']);

    // --- loan_agreements: e-sign audit record ---
    await queryInterface.createTable('loan_agreements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      application_id: {
        type: Sequelize.UUID,
        references: { model: 'applications', key: 'id' },
        onDelete: 'CASCADE',
      },
      document_hash: { type: Sequelize.STRING(128) },
      signed_at: { type: Sequelize.DATE },
      signed_ip: { type: Sequelize.STRING(45) },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // --- disbursements: manual ACH fund release ---
    await queryInterface.createTable('disbursements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      application_id: {
        type: Sequelize.UUID,
        references: { model: 'applications', key: 'id' },
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(10, 2) },
      released_by: { type: Sequelize.STRING(255) }, // operator identity
      ach_reference: { type: Sequelize.STRING(100) },
      status: { type: Sequelize.STRING(50), defaultValue: 'RELEASED' },
      released_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // --- audit_logs: every underwriter/admin action ---
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      actor: { type: Sequelize.STRING(255) },
      action: { type: Sequelize.STRING(100) },
      entity_type: { type: Sequelize.STRING(100) },
      entity_id: { type: Sequelize.UUID },
      detail: { type: Sequelize.JSONB },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('disbursements');
    await queryInterface.dropTable('loan_agreements');
    await queryInterface.removeIndex('applications', ['status']);
    await queryInterface.removeColumn('applications', 'updated_at');
    await queryInterface.removeColumn('applications', 'status_reason');
    await queryInterface.removeColumn('applications', 'monthly_payment');
    await queryInterface.removeColumn('applications', 'loan_term_months');
  },
};
