import express from "express";
import {
  createBus,
  getBuses,
  setDestination,
  updateLocationViaRest,
} from "../controllers/busController.js";
import { protect, admin } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();
router.post("/", protect, admin, createBus);
router.get("/", protect, getBuses);
router.put("/:plateNumber/destination", protect, setDestination);
router.put("/:plateNumber/location", protect, updateLocationViaRest);
// get all drivers
router.get("/users/drivers", async (req, res) => {
  try {
    const drivers = await User.find({ role: "driver" }).select("username _id");
    console.log("Drivers found:", drivers);

    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
