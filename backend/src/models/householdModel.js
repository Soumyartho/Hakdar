import { run, get, query } from '../config/database.js';

// A citizen's public-safe fields only (mirrors citizenModel.js:getById) - household members see
// each other's names/contact info, never Aadhaar hash/phone_encrypted/etc.
const MEMBER_FIELDS = 'id, full_name, phone_verified_at, dob, gender, aadhaar_last4, status';

export const HouseholdModel = {
  create: async (createdByCitizenId, address) => {
    const result = await run(
      `INSERT INTO households (created_by_citizen_id, address) VALUES (?, ?)`,
      [createdByCitizenId, address || null]
    );
    return result.id;
  },

  getById: async (id) => {
    return await get(`SELECT * FROM households WHERE id = ?`, [id]);
  },

  getCitizenHouseholdId: async (citizenId) => {
    const row = await get(`SELECT household_id FROM citizens WHERE id = ?`, [citizenId]);
    return row?.household_id || null;
  },

  getMembers: async (householdId) => {
    return await query(`SELECT ${MEMBER_FIELDS} FROM citizens WHERE household_id = ?`, [householdId]);
  },

  setCitizenHousehold: async (citizenId, householdId) => {
    await run(`UPDATE citizens SET household_id = ? WHERE id = ?`, [householdId, citizenId]);
  },

  createInvite: async (householdId, invitedCitizenId, invitedByCitizenId) => {
    const result = await run(
      `INSERT INTO household_invites (household_id, invited_citizen_id, invited_by_citizen_id) VALUES (?, ?, ?)`,
      [householdId, invitedCitizenId, invitedByCitizenId]
    );
    return result.id;
  },

  getPendingInviteForCitizen: async (invitedCitizenId) => {
    return await get(
      `SELECT * FROM household_invites WHERE invited_citizen_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1`,
      [invitedCitizenId]
    );
  },

  // Sent by a member of the given household, still awaiting a response - shown to the household
  // so they can see who they've invited and who hasn't answered yet.
  getPendingInvitesSentBy: async (householdId) => {
    return await query(
      `SELECT hi.*, c.full_name AS invited_full_name
       FROM household_invites hi
       JOIN citizens c ON c.id = hi.invited_citizen_id
       WHERE hi.household_id = ? AND hi.status = 'pending'`,
      [householdId]
    );
  },

  getInviteById: async (id) => {
    return await get(`SELECT * FROM household_invites WHERE id = ?`, [id]);
  },

  resolveInvite: async (id, status) => {
    await run(`UPDATE household_invites SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, id]);
  }
};
