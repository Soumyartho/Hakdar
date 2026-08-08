import { get } from '../config/database.js';

export const UserModel = {
  getByUsername: async (username) => {
    return await get(`SELECT * FROM users WHERE username = ?`, [username]);
  },

  getById: async (id) => {
    return await get(`SELECT id, username, role, department, created_at FROM users WHERE id = ?`, [id]);
  }
};
