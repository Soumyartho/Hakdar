import express from 'express';
import {
  getGrievances,
  getGrievanceByTrackingId,
  createGrievance,
  updateGrievanceStatus,
  resolveGrievance
} from '../controllers/grievanceController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireDepartment } from '../middleware/rbacMiddleware.js';
import { GrievanceModel } from '../models/grievanceModel.js';

const router = express.Router();

// A department-scoped officer may only act on grievances in their own category/department - this
// previously wasn't enforced server-side at all (any valid officer token could touch any grievance).
const grievanceDepartment = async (req) => {
  const grievance = await GrievanceModel.getById(req.params.id);
  return grievance?.category;
};

router.get('/', getGrievances);
router.get('/:trackingId', getGrievanceByTrackingId);
router.post('/', upload.single('attachment'), createGrievance);
router.patch('/:id/status', authMiddleware('officer'), requireDepartment(grievanceDepartment), updateGrievanceStatus);
router.patch('/:id/resolve', authMiddleware('officer'), requireDepartment(grievanceDepartment), resolveGrievance);

export default router;
