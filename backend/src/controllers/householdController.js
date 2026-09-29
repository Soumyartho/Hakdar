import { HouseholdModel } from '../models/householdModel.js';
import { CitizenModel } from '../models/citizenModel.js';
import { hashPhone } from '../utils/cryptoUtil.js';

export const createHousehold = async (req, res) => {
  try {
    const existing = await HouseholdModel.getCitizenHouseholdId(req.user.id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already belong to a household' });
    }
    const { address } = req.body;
    const householdId = await HouseholdModel.create(req.user.id, address);
    await HouseholdModel.setCitizenHousehold(req.user.id, householdId);
    res.status(201).json({ success: true, message: 'Household created', data: { id: householdId } });
  } catch (error) {
    console.error('Error creating household:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Returns the citizen's own household (members + address) plus any invites relevant to them:
// ones they've sent that are still pending, and one waiting for their own response. A citizen
// with no household gets household: null rather than a 404 - "not in a household yet" is a
// normal, expected state, not an error.
export const getMyHousehold = async (req, res) => {
  try {
    const householdId = await HouseholdModel.getCitizenHouseholdId(req.user.id);
    const incomingInvite = await HouseholdModel.getPendingInviteForCitizen(req.user.id);

    if (!householdId) {
      return res.json({ success: true, data: { household: null, members: [], sentInvites: [], incomingInvite: incomingInvite || null } });
    }

    const household = await HouseholdModel.getById(householdId);
    const members = await HouseholdModel.getMembers(householdId);
    const sentInvites = await HouseholdModel.getPendingInvitesSentBy(householdId);

    res.json({ success: true, data: { household, members, sentInvites, incomingInvite: incomingInvite || null } });
  } catch (error) {
    console.error('Error fetching household:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const inviteMember = async (req, res) => {
  try {
    const householdId = await HouseholdModel.getCitizenHouseholdId(req.user.id);
    if (!householdId) {
      return res.status(400).json({ success: false, message: 'Create a household before inviting members' });
    }

    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const target = await CitizenModel.getByPhoneHash(hashPhone(phone));
    if (!target) {
      return res.status(404).json({ success: false, message: 'No citizen account is registered with that phone number' });
    }
    if (target.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You can't invite yourself" });
    }
    if (target.household_id) {
      return res.status(400).json({ success: false, message: 'That citizen already belongs to a household' });
    }

    const existingInvite = await HouseholdModel.getPendingInviteForCitizen(target.id);
    if (existingInvite && existingInvite.household_id === householdId) {
      return res.status(400).json({ success: false, message: 'An invite to this household is already pending for them' });
    }

    const inviteId = await HouseholdModel.createInvite(householdId, target.id, req.user.id);
    res.status(201).json({ success: true, message: 'Invite sent', data: { id: inviteId } });
  } catch (error) {
    console.error('Error inviting household member:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const respondToInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body;

    const invite = await HouseholdModel.getInviteById(id);
    if (!invite || invite.invited_citizen_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }
    if (invite.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This invite has already been resolved' });
    }

    if (accept) {
      await HouseholdModel.setCitizenHousehold(req.user.id, invite.household_id);
      await HouseholdModel.resolveInvite(id, 'accepted');
    } else {
      await HouseholdModel.resolveInvite(id, 'declined');
    }

    res.json({ success: true, message: accept ? 'Joined household' : 'Invite declined' });
  } catch (error) {
    console.error('Error responding to household invite:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
