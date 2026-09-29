import express from 'express';
import {
  createApplication,
  listMine,
  listForOfficer,
  listFlagged,
  reviewApplication,
  appealApplication,
  getVerificationDetails,
  saveChecklist,
  countersignApplication
} from '../controllers/applicationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireDepartment } from '../middleware/rbacMiddleware.js';
import { uploadDocuments } from '../middleware/documentUploadMiddleware.js';
import { ApplicationModel } from '../models/applicationModel.js';

const router = express.Router();

// Mirrors grievanceRoutes.js's own department-scoping fix: a department-scoped officer should
// only be able to act on applications for schemes in their own department, not any application by
// id just because they hold a valid officer token. This was previously missing here entirely.
const applicationDepartment = async (req) => {
  const application = await ApplicationModel.getById(req.params.id);
  return application?.scheme_department;
};

router.post('/', authMiddleware('citizen'), uploadDocuments.array('documents', 5), createApplication);
router.get('/mine', authMiddleware('citizen'), listMine);
router.post('/:id/appeal', authMiddleware('citizen'), appealApplication);

router.get('/', authMiddleware('officer'), listForOfficer);
router.get('/flagged', authMiddleware('officer'), listFlagged);
router.get('/:id/verifications', authMiddleware('officer'), requireDepartment(applicationDepartment), getVerificationDetails);
router.patch('/:id/checklist', authMiddleware('officer'), requireDepartment(applicationDepartment), saveChecklist);
router.patch('/:id/review', authMiddleware('officer'), requireDepartment(applicationDepartment), reviewApplication);
router.patch('/:id/countersign', authMiddleware('officer'), requireDepartment(applicationDepartment), countersignApplication);

export default router;
