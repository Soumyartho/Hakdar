import { run, query } from '../config/database.js';

export const FraudFlagModel = {
  create: async (applicationId, ruleTriggered, severity = 'medium') => {
    const result = await run(
      `INSERT INTO fraud_flags (application_id, rule_triggered, severity) VALUES (?, ?, ?)`,
      [applicationId, ruleTriggered, severity]
    );
    return result.id;
  },

  getOpenForApplication: async (applicationId, ruleTriggered) => {
    return await query(
      `SELECT * FROM fraud_flags WHERE application_id = ? AND rule_triggered = ? AND resolved_at IS NULL`,
      [applicationId, ruleTriggered]
    );
  },

  listOpen: async () => {
    return await query(`
      SELECT ff.*, sa.citizen_id, sa.scheme_id, ws.title AS scheme_title
      FROM fraud_flags ff
      JOIN scheme_applications sa ON sa.id = ff.application_id
      JOIN welfare_schemes ws ON ws.id = sa.scheme_id
      WHERE ff.resolved_at IS NULL
      ORDER BY ff.detected_at DESC
    `);
  },

  resolve: async (id, resolvedBy, resolution) => {
    await run(
      `UPDATE fraud_flags SET resolved_by = ?, resolved_at = CURRENT_TIMESTAMP, resolution = ? WHERE id = ?`,
      [resolvedBy, resolution, id]
    );
  }
};
