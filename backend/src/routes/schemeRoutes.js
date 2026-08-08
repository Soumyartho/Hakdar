import express from 'express';
import { getSchemes, getSchemeById, matchSchemes } from '../controllers/schemeController.js';

const router = express.Router();

router.get('/', getSchemes);
router.get('/:id', getSchemeById);
router.post('/match', matchSchemes);

export default router;
