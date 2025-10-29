import mongoose from "mongoose";
import Bus from "../models/Bus.js";
import User from "../models/User.js";
import { emitLocationUpdate } from "../services/socketService.js"; 
import { calculateDistance } from '../utils/geoUtils.js'; 

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

export const setCurrentLocation = async (req, res) => {
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
      return res.status(403).json({ message: "Only drivers can set locations" });
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

    
    bus.currentLocation = { type: "Point", coordinates: [lng, lat] };
    bus.arrivalRadius = radius || bus.arrivalRadius || 100; // Default to 100 meters if not provided
    bus.arrivalTime = null;

    await bus.save();
    res.json(bus);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getLocationByDriverId = async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== "driver") {
      return res.status(404).json({ message: "Driver not found" });
    }
    const bus = await Bus.findOne({ driver: driverId });
    if (!bus) {
      return res.status(404).json({ message: "No bus assigned to this driver" });
    }
    const [lng, lat] = bus.currentLocation?.coordinates || [0, 0];
    if (lng === 0 && lat === 0) {
      console.log(`No valid location for bus ${bus.plateNumber} (driver: ${driverId})`);
      return res.status(200).json({
        plateNumber: bus.plateNumber,
        currentLocation: null,
        radius: bus.arrivalRadius || 100,
      });
    }
    res.json({
      plateNumber: bus.plateNumber,
      currentLocation: { latitude: lat, longitude: lng },
      radius: bus.arrivalRadius || 100,
    });
  } catch (error) {
    console.error("Error in getLocationByDriverId:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateLocationViaRest = async (req, res) => {
  try {
    const { plateNumber } = req.params;
    const { lat, lng, speed, heading } = req.body;

    const bus = await Bus.findOne({ plateNumber });
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    // Update bus location
    bus.currentLocation = { type: "Point", coordinates: [lng, lat] };
    bus.speed = speed;
    bus.heading = heading;
    bus.lastSeen = new Date();

    // Check if bus is near destination
    if (bus.destination && bus.destination.coordinates) {
      const distance = calculateDistance(
        bus.currentLocation.coordinates,
        bus.destination.coordinates
      );
      if (distance <= bus.arrivalRadius && !bus.arrivalTime) {
        bus.arrivalTime = new Date();
        // Emit arrival notification
        global.io.to(`bus:${plateNumber}`).emit("arrivalNotification", {
          plateNumber,
          message: `Bus ${plateNumber} has arrived at its destination`,
          arrivalTime: bus.arrivalTime,
        });
      }
    }

    await bus.save();

    // Emit location update
    await emitLocationUpdate(plateNumber, {
      currentLocation: bus.currentLocation,
      speed: bus.speed,
      heading: bus.heading,
      lastSeen: bus.lastSeen,
    });

    res.json({ success: true, bus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
