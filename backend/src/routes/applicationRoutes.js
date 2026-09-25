import express from 'express';
import {
  createApplication,
  listMine,
  listForOfficer,
  listFlagged,
  reviewApplication,
  appealApplication
} from '../controllers/applicationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { uploadDocuments } from '../middleware/documentUploadMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware('citizen'), uploadDocuments.array('documents', 5), createApplication);
router.get('/mine', authMiddleware('citizen'), listMine);
router.post('/:id/appeal', authMiddleware('citizen'), appealApplication);

router.get('/', authMiddleware('officer'), listForOfficer);
router.get('/flagged', authMiddleware('officer'), listFlagged);
router.patch('/:id/review', authMiddleware('officer'), reviewApplication);

export default router;
