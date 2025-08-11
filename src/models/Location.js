import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  coords: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  speed: Number,
  heading: Number,
  recordedAt: { type: Date, default: Date.now }
});

locationSchema.index({ coords: '2dsphere' });

export default mongoose.model('Location', locationSchema);
