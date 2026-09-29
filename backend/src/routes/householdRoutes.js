import express from 'express';
import { createHousehold, getMyHousehold, inviteMember, respondToInvite } from '../controllers/householdController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware('citizen'));

router.post('/', createHousehold);
router.get('/mine', getMyHousehold);
router.post('/invite', inviteMember);
router.post('/invites/:id/respond', respondToInvite);

export default router;
