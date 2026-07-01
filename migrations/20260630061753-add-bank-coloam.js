'use strict';

// Individual application controls & access:
//  - is_locked: set true on Approve (FUNDED) / Decline (DECLINED). A locked
//    application can no longer have its status changed or be re-actioned.
//  - decline_reason: optional reason captured at decline, surfaced in the
//    adverse action notice.
//  - document_request_token / *_expires_at: the secure, single-link token sent
//    to the applicant by the "Collect Documents" action so they can upload
//    files directly to their own application without authenticating.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bank_details', 'bank_username', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('bank_details', 'bank_password', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bank_details', 'bank_username');
    await queryInterface.removeColumn('bank_details', 'bank_password');
  },
};
