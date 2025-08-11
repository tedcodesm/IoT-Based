import express from 'express';
import { createBus, getBuses, setDestination, updateLocationViaRest } from '../controllers/busController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();
router.post('/', protect, admin, createBus);
router.get('/', protect, getBuses);
router.put('/:plateNumber/destination', protect, admin, setDestination);
router.put('/:plateNumber/location', protect, updateLocationViaRest);
export default router;
