import { run, get, query } from '../config/database.js';

const SELECT_WITH_SCHEME = `
  SELECT sa.*, ws.title AS scheme_title, ws.department AS scheme_department, ws.rules AS scheme_rules
  FROM scheme_applications sa
  JOIN welfare_schemes ws ON ws.id = sa.scheme_id
`;

export const ApplicationModel = {
  create: async (application) => {
    const sql = `
      INSERT INTO scheme_applications (citizen_id, scheme_id, declared_profile, eligibility_result, status, document_paths, document_types)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await run(sql, [
      application.citizen_id,
      application.scheme_id,
      JSON.stringify(application.declared_profile),
      JSON.stringify(application.eligibility_result),
      application.status || 'submitted',
      JSON.stringify(application.document_paths || []),
      JSON.stringify(application.document_types || [])
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

  // Same as getFlagged, but also brings back every open fraud_flags row for each application so
  // the officer UI can actually show WHY something was flagged (rule + severity), not just that it
  // was. GROUP_CONCAT keeps this to one row per application without depending on SQLite's JSON1
  // extension being compiled in; flag_summary is parsed back into an array in the controller.
  getFlaggedWithReasons: async (department) => {
    const base = `
      SELECT sa.*, ws.title AS scheme_title, ws.department AS scheme_department, ws.rules AS scheme_rules,
        GROUP_CONCAT(ff.rule_triggered || '||' || ff.severity, ';;') AS flag_summary
      FROM scheme_applications sa
      JOIN welfare_schemes ws ON ws.id = sa.scheme_id
      LEFT JOIN fraud_flags ff ON ff.application_id = sa.id AND ff.resolved_at IS NULL
    `;
    if (!department || department === 'All') {
      return await query(`${base} WHERE sa.status = 'flagged' GROUP BY sa.id ORDER BY sa.submitted_at DESC`);
    }
    return await query(
      `${base} WHERE sa.status = 'flagged' AND ws.department = ? GROUP BY sa.id ORDER BY sa.submitted_at DESC`,
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
  },

  // Whether this application has EVER had a fraud flag opened against it, resolved or not - the
  // maker-checker trigger. A resolved flag still means someone else's judgment should double-check
  // the approval, not just the officer who investigated and cleared it.
  hasEverBeenFlagged: async (id) => {
    const row = await get(`SELECT 1 FROM fraud_flags WHERE application_id = ? LIMIT 1`, [id]);
    return !!row;
  },

  setPendingCountersign: async (id, reviewedBy, notes) => {
    await run(
      `UPDATE scheme_applications SET status = 'pending_countersign', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_notes = ? WHERE id = ?`,
      [reviewedBy, notes || null, id]
    );
  },

  countersign: async (id, secondReviewerId, finalStatus) => {
    await run(
      `UPDATE scheme_applications SET status = ?, second_reviewer_id = ?, second_reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [finalStatus, secondReviewerId, id]
    );
  },

  // Same "one identity, multiple approved claims" shape as getApprovedGroupedByAadhaar, but keyed
  // by household instead - catches separate family members (separate citizen records, separate
  // Aadhaar numbers) each claiming a scheme meant for one grant per household. Only rows with a
  // household_id are returned; the sweep itself decides which schemes are actually household-scoped.
  getApprovedGroupedByHousehold: async () => {
    return await query(`
      SELECT sa.id AS application_id, sa.scheme_id, sa.citizen_id, c.household_id, ws.title AS scheme_title, ws.rules AS scheme_rules
      FROM scheme_applications sa
      JOIN citizens c ON c.id = sa.citizen_id
      JOIN welfare_schemes ws ON ws.id = sa.scheme_id
      WHERE sa.status = 'approved' AND c.household_id IS NOT NULL
    `);
  },

  // A citizen who declares wildly different incomes across separate applications is a signal worth
  // surfacing even before either one is approved - but excludes already-terminal rejected/revoked
  // applications, which shouldn't be dragged back into "flagged" over a sweep finding.
  getIncomeDeclarationsByCitizen: async () => {
    return await query(
      `SELECT id AS application_id, citizen_id, declared_profile FROM scheme_applications WHERE status NOT IN ('rejected', 'revoked')`
    );
  }
};
