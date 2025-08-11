import mongoose from 'mongoose';

const busSchema = new mongoose.Schema({
  plateNumber: { type: String, required: true, unique: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0,0] } // [lng, lat]
  },
  destination: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0,0] }
  },
  arrivalTime: { type: Date, default: null },
  arrivalRadius: { type: Number, default: 80 },
  lastSeen: Date,
  notifiedParents: [{ parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, type: String, notifiedAt: Date }]
}, { timestamps: true });

busSchema.index({ currentLocation: '2dsphere' });

export default mongoose.model('Bus', busSchema);
