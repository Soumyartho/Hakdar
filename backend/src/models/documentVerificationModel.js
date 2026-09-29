import { run, query } from '../config/database.js';

export const DocumentVerificationModel = {
  // ocr_matched is stored as 0/1/NULL since SQLite has no boolean type: NULL means "not checked"
  // (a PDF, or a document type with no heuristic), distinct from a checked-and-failed 0.
  create: async (applicationId, filePath, claimedType, checked, matched, reason) => {
    await run(
      `INSERT INTO document_verifications (application_id, file_path, claimed_type, ocr_matched, ocr_reason) VALUES (?, ?, ?, ?, ?)`,
      [applicationId, filePath, claimedType || null, checked ? (matched ? 1 : 0) : null, reason || null]
    );
  },

  getForApplication: async (applicationId) => {
    return await query(`SELECT * FROM document_verifications WHERE application_id = ? ORDER BY id ASC`, [applicationId]);
  },

  // Documents that the automated check explicitly flagged as NOT matching (ocr_matched = 0, not
  // NULL/"not checked") on an application an officer approved anyway - the routine sweep's way of
  // catching an automated signal that got rubber-stamped past at review time.
  getFailedForApprovedApplications: async () => {
    return await query(`
      SELECT dv.application_id, dv.claimed_type, dv.ocr_reason
      FROM document_verifications dv
      JOIN scheme_applications sa ON sa.id = dv.application_id
      WHERE dv.ocr_matched = 0 AND sa.status = 'approved'
    `);
  }
};
