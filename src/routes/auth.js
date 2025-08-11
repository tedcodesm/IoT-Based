import express from 'express';
import { register, login, updateDeviceToken } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.post('/device', protect, updateDeviceToken);
export default router;
