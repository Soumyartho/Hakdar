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

const router = express.Router();

router.get('/', getGrievances);
router.get('/:trackingId', getGrievanceByTrackingId);
router.post('/', upload.single('attachment'), createGrievance);
router.patch('/:id/status', authMiddleware, updateGrievanceStatus);
router.patch('/:id/resolve', authMiddleware, resolveGrievance);

export default router;
