import { run, get } from '../config/database.js';

// One checklist row per application - an officer can revise it (re-upsert) any number of times
// before the application is actually approved, but reviewApplication() only ever reads the
// current row at the moment of approval.
export const ApplicationVerificationModel = {
  upsert: async (applicationId, reviewerId, { identity_confirmed, income_confirmed, documents_authentic, notes }) => {
    const existing = await get(`SELECT id FROM application_verifications WHERE application_id = ?`, [applicationId]);
    const values = [
      reviewerId,
      identity_confirmed ? 1 : 0,
      income_confirmed ? 1 : 0,
      documents_authentic ? 1 : 0,
      notes || null
    ];
    if (existing) {
      await run(
        `UPDATE application_verifications
         SET reviewer_id = ?, identity_confirmed = ?, income_confirmed = ?, documents_authentic = ?, notes = ?, verified_at = CURRENT_TIMESTAMP
         WHERE application_id = ?`,
        [...values, applicationId]
      );
    } else {
      await run(
        `INSERT INTO application_verifications (application_id, reviewer_id, identity_confirmed, income_confirmed, documents_authentic, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [applicationId, ...values]
      );
    }
  },

  getForApplication: async (applicationId) => {
    return await get(`SELECT * FROM application_verifications WHERE application_id = ?`, [applicationId]);
  }
};
