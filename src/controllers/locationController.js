import Location from '../models/Location.js';

export const getLocationHistory = async (req, res) => {
  const { busId } = req.params;
  const history = await Location.find({ bus: busId }).sort({ recordedAt: 1 }).limit(10000);
  res.json(history);
};
