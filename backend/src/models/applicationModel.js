import { run, get, query } from '../config/database.js';

const SELECT_WITH_SCHEME = `
  SELECT sa.*, ws.title AS scheme_title, ws.department AS scheme_department, ws.rules AS scheme_rules
  FROM scheme_applications sa
  JOIN welfare_schemes ws ON ws.id = sa.scheme_id
`;

export const ApplicationModel = {
  create: async (application) => {
    const sql = `
      INSERT INTO scheme_applications (citizen_id, scheme_id, declared_profile, eligibility_result, status, document_paths)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await run(sql, [
      application.citizen_id,
      application.scheme_id,
      JSON.stringify(application.declared_profile),
      JSON.stringify(application.eligibility_result),
      application.status || 'submitted',
      JSON.stringify(application.document_paths || [])
    ]);
    return result.id;
  },

  getById: async (id) => {
    return await get(`${SELECT_WITH_SCHEME} WHERE sa.id = ?`, [id]);
  },

  getByCitizenId: async (citizenId) => {
    return await query(`${SELECT_WITH_SCHEME} WHERE sa.citizen_id = ? ORDER BY sa.submitted_at DESC`, [citizenId]);
  },

  // Admins (department = 'All') see everything; a department officer only sees applications for
  // schemes belonging to their own department - mirrors the existing grievance category/department
  // convention, now actually enforced server-side rather than left to client-side filtering.
  getForDepartment: async (department) => {
    if (department === 'All') {
      return await query(`${SELECT_WITH_SCHEME} ORDER BY sa.submitted_at DESC`);
    }
    return await query(`${SELECT_WITH_SCHEME} WHERE ws.department = ? ORDER BY sa.submitted_at DESC`, [department]);
  },

  getApproved: async () => {
    return await query(`${SELECT_WITH_SCHEME} WHERE sa.status = 'approved'`);
  },

  getFlagged: async (department) => {
    if (!department || department === 'All') {
      return await query(`${SELECT_WITH_SCHEME} WHERE sa.status = 'flagged' ORDER BY sa.submitted_at DESC`);
    }
    return await query(
      `${SELECT_WITH_SCHEME} WHERE sa.status = 'flagged' AND ws.department = ? ORDER BY sa.submitted_at DESC`,
      [department]
    );
  },

  resetForAppeal: async (id, appealNote) => {
    await run(
      `UPDATE scheme_applications
       SET status = 'submitted', reviewed_by = NULL, reviewed_at = NULL,
           review_notes = COALESCE(review_notes || char(10), '') || ?
       WHERE id = ?`,
      [appealNote, id]
    );
  },

  // Duplicate/mutually-exclusive-claim detection needs to see every active (approved) claim
  // grouped by the underlying identity, not just by citizen_id - a fraudulent actor's whole point
  // is registering more than one citizen record, so the join has to key off aadhaar_hash.
  getApprovedGroupedByAadhaar: async () => {
    return await query(`
      SELECT sa.id AS application_id, sa.scheme_id, sa.citizen_id, c.aadhaar_hash, ws.title AS scheme_title
      FROM scheme_applications sa
      JOIN citizens c ON c.id = sa.citizen_id
      JOIN welfare_schemes ws ON ws.id = sa.scheme_id
      WHERE sa.status = 'approved'
    `);
  },

  updateStatus: async (id, status, reviewedBy, notes) => {
    await run(
      `UPDATE scheme_applications SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_notes = ? WHERE id = ?`,
      [status, reviewedBy || null, notes || null, id]
    );
  }
};
