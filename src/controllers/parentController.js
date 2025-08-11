import User from '../models/User.js';

export const setPickup = async (req, res) => {
  const { lat, lng, radius, pickupEnabled } = req.body;
  const user = req.user;
  if (!lat || !lng) return res.status(400).json({ message: 'lat/lng required' });
  user.pickupLocation = { type: 'Point', coordinates: [lng, lat] };
  if (typeof radius === 'number') user.pickupRadius = radius;
  if (typeof pickupEnabled === 'boolean') user.pickupEnabled = pickupEnabled;
  await user.save();
  res.json({ success: true, pickupLocation: user.pickupLocation });
};

export const getMe = async (req, res) => {
  const user = req.user;
  res.json(user);
};
