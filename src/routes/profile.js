import express from "express";
import { getProfile, uploadProfilePhoto } from "../controllers/profileController.js";
import upload from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// POST /profiles/upload
router.post("/upload", protect, uploadProfilePhoto);

// GET /profiles/:userId
router.get("/:userId", protect, getProfile);

export default router;
