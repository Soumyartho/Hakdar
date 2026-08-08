import { query, run, get } from '../config/database.js';

export const SchemeModel = {
  getAll: async () => {
    return await query(`SELECT * FROM welfare_schemes ORDER BY title ASC`);
  },

  getById: async (id) => {
    return await get(`SELECT * FROM welfare_schemes WHERE id = ?`, [id]);
  },

  create: async (scheme) => {
    const sql = `
      INSERT INTO welfare_schemes (title, description, department, benefits, application_steps, required_documents, rules, external_link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await run(sql, [
      scheme.title,
      scheme.description,
      scheme.department,
      scheme.benefits,
      JSON.stringify(scheme.application_steps),
      JSON.stringify(scheme.required_documents),
      JSON.stringify(scheme.rules),
      scheme.external_link
    ]);
    return result.id;
  }
};
