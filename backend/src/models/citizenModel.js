import { run, get } from '../config/database.js';

export const CitizenModel = {
  getByPhoneHash: async (phoneHash) => {
    return await get(`SELECT * FROM citizens WHERE phone_hash = ?`, [phoneHash]);
  },

  getByAadhaarHash: async (aadhaarHash) => {
    return await get(`SELECT * FROM citizens WHERE aadhaar_hash = ?`, [aadhaarHash]);
  },

  getById: async (id) => {
    return await get(
      `SELECT id, full_name, phone_encrypted, phone_verified_at, dob, gender, address, aadhaar_last4, status, created_at
       FROM citizens WHERE id = ?`,
      [id]
    );
  },

  create: async (citizen) => {
    const sql = `
      INSERT INTO citizens (full_name, phone_hash, phone_encrypted, dob, gender, address, aadhaar_hash, aadhaar_last4, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await run(sql, [
      citizen.full_name,
      citizen.phone_hash,
      citizen.phone_encrypted,
      citizen.dob || null,
      citizen.gender || null,
      citizen.address || null,
      citizen.aadhaar_hash,
      citizen.aadhaar_last4,
      citizen.status || 'active'
    ]);
    return result.id;
  },

  markPhoneVerified: async (id) => {
    await run(`UPDATE citizens SET phone_verified_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  }
};
