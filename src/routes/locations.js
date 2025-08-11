import express from 'express';
import { getLocationHistory } from '../controllers/locationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.get('/bus/:busId/history', protect, getLocationHistory);
export default router;
