import express from 'express';
import { setPickup, getMe } from '../controllers/parentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.put('/me/pickup', protect, setPickup);
router.get('/me', protect, getMe);
export default router;
