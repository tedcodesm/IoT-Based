import mongoose from "mongoose";
import Bus from "../models/Bus.js";
import User from "../models/User.js";

export const createBus = async (req, res) => {
  try {
    const { plateNumber, driver, arrivalRadius } = req.body;

    if (!mongoose.Types.ObjectId.isValid(driver)) {
      return res.status(400).json({ message: "Invalid driver ID" });
    }
    if (!plateNumber || !driver) {
      return res.status(400).json({ message: "Plate number and driver are required" });
    }
  
    const existingBus = await Bus.findOne({ plateNumber });
    if (existingBus) {
      return res.status(400).json({ message: "Bus with this plate number already exists" });
    }

    const bus = await Bus.create({
      plateNumber,
      driver,
      arrivalRadius
    });

    res.status(201).json(bus);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


export const getBuses = async (req, res) => {
  const buses = await Bus.find().populate("driver", "username email");
  res.json(buses);
};

export const setDestination = async (req, res) => {
  try {
    const { plateNumber } = req.params;
    const { lat, lng, radius } = req.body;

    // Get authenticated user (assuming middleware decoded token into req.user)
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check role
    if (user.role !== "driver") {
      return res.status(403).json({ message: "Only drivers can set destinations" });
    }

    // Find bus
    const bus = await Bus.findOne({ plateNumber });
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    // Ensure the driver is assigned to this bus
    if (bus.driver.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "You are not assigned to this bus" });
    }

    // Update destination
    bus.destination = { type: "Point", coordinates: [lng, lat] };
    bus.arrivalRadius = radius || bus.arrivalRadius || 80;
    bus.arrivalTime = null;

    await bus.save();
    res.json(bus);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateLocationViaRest = async (req, res) => {
  // this endpoint mirrors socket updates
  const { plateNumber } = req.params;
  const { lat, lng, speed, heading } = req.body;
  const bus = await Bus.findOne({ plateNumber });
  if (!bus) return res.status(404).json({ message: "Bus not found" });
  bus.currentLocation = { type: "Point", coordinates: [lng, lat] };
  bus.speed = speed;
  bus.heading = heading;
  bus.lastSeen = new Date();
  await bus.save();
  // Note: for parity with sockets, you'd want to call the same internal handler or emit an event
  res.json({ success: true, bus });
};
