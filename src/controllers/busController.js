import Bus from '../models/Bus.js';

export const createBus = async (req, res) => {
  const { plateNumber, driverId, arrivalRadius } = req.body;
  const exists = await Bus.findOne({ plateNumber });
  if (exists) return res.status(400).json({ message: 'Bus exists' });
  const bus = await Bus.create({ plateNumber, driver: driverId, arrivalRadius });
  res.status(201).json(bus);
};

export const getBuses = async (req, res) => {
  const buses = await Bus.find().populate('driver', 'name email');
  res.json(buses);
};

export const setDestination = async (req, res) => {
  const { plateNumber } = req.params;
  const { lat, lng, radius } = req.body;
  const bus = await Bus.findOne({ plateNumber });
  if (!bus) return res.status(404).json({ message: 'Bus not found' });
  bus.destination = { type: 'Point', coordinates: [lng, lat] };
  bus.arrivalRadius = radius || bus.arrivalRadius || 80;
  bus.arrivalTime = null;
  await bus.save();
  res.json(bus);
};

export const updateLocationViaRest = async (req, res) => {
  // this endpoint mirrors socket updates
  const { plateNumber } = req.params;
  const { lat, lng, speed, heading } = req.body;
  const bus = await Bus.findOne({ plateNumber });
  if (!bus) return res.status(404).json({ message: 'Bus not found' });
  bus.currentLocation = { type: 'Point', coordinates: [lng, lat] };
  bus.speed = speed;
  bus.heading = heading;
  bus.lastSeen = new Date();
  await bus.save();
  // Note: for parity with sockets, you'd want to call the same internal handler or emit an event
  res.json({ success: true, bus });
};
