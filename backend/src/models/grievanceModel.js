import { query, run, get } from '../config/database.js';

export const GrievanceModel = {
  getAll: async () => {
    return await query(`SELECT * FROM grievances ORDER BY created_at DESC`);
  },

  getById: async (id) => {
    return await get(`SELECT * FROM grievances WHERE id = ?`, [id]);
  },

  getByTrackingId: async (trackingId) => {
    return await get(`SELECT * FROM grievances WHERE tracking_id = ?`, [trackingId]);
  },

  create: async (g) => {
    const sql = `
      INSERT INTO grievances (tracking_id, title, description, category, latitude, longitude, attachment_path, sla_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await run(sql, [
      g.tracking_id,
      g.title,
      g.description,
      g.category,
      g.latitude,
      g.longitude,
      g.attachment_path,
      g.sla_deadline
    ]);
    return result.id;
  },

  updateStatus: async (id, status, escalation_level, sla_deadline) => {
    const sql = `
      UPDATE grievances 
      SET status = ?, escalation_level = ?, sla_deadline = ?
      WHERE id = ?
    `;
    const result = await run(sql, [status, escalation_level, sla_deadline, id]);
    return result.changes;
  },

  resolve: async (id, notes) => {
    const sql = `
      UPDATE grievances
      SET status = 'Resolved', resolution_notes = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await run(sql, [notes, id]);
    return result.changes;
  },

  getPendingEscalation: async () => {
    // Select open complaints where current time is past SLA deadline
    const now = new Date().toISOString();
    return await query(
      `SELECT * FROM grievances WHERE status != 'Resolved' AND status NOT LIKE 'Escalated_Level_2' AND datetime(sla_deadline) < datetime(?)`,
      [now]
    );
  }
};
