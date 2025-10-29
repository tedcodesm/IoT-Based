// import Bus from '../models/Bus.js';
// import Location from '../models/Location.js';
// import User from '../models/User.js';
// import { getDistanceMeters } from '../utils/distance.js';
// import { sendFCM, initFCM } from './notificationService.js';
// import dotenv from 'dotenv';
// dotenv.config();

// const ARRIVAL_COOLDOWN_SEC = parseInt(process.env.ARRIVAL_COOLDOWN_SEC || '60', 10);
// const PICKUP_NOTIFY_COOLDOWN_SEC = parseInt(process.env.PICKUP_NOTIFY_COOLDOWN_SEC || '300', 10);

// let ioRef;

// export function initSocket(io) {
//   ioRef = io;
//   initFCM();
//   io.on('connection', (socket) => {
//     console.log('socket connected', socket.id);

//     socket.on('join_bus_room', ({ plateNumber }) => {
//       if (!plateNumber) return;
//       socket.join(plateNumber);
//       console.log(`${socket.id} joined bus room ${plateNumber}`);
//     });

//     socket.on('join_parent_room', ({ parentId }) => {
//       if (!parentId) return;
//       socket.join(`parent_${parentId}`);
//       console.log(`${socket.id} joined parent room parent_${parentId}`);
//     });

//     socket.on('bus_location_update', async (data) => {
//       try {
//         await handleLocationUpdate(data, io);
//       } catch (err) {
//         console.error('handleLocationUpdate error', err);
//       }
//     });

//     socket.on('disconnect', () => console.log('socket disconnected', socket.id));
//   });
// }

// async function handleLocationUpdate(data, io) {
//   // data: { plateNumber, lat, lng, speed, heading }
//   const { plateNumber, lat, lng, speed, heading } = data;
//   if (!plateNumber || typeof lat !== 'number' || typeof lng !== 'number') return;

//   const bus = await Bus.findOne({ plateNumber });
//   if (!bus) return;

//   // update bus current loc
//   bus.currentLocation = { type: 'Point', coordinates: [lng, lat] };
//   bus.speed = speed;
//   bus.heading = heading;
//   bus.lastSeen = new Date();
//   await bus.save();

//   // store history
//   await Location.create({ bus: bus._id, coords: { type: 'Point', coordinates: [lng, lat] }, speed, heading });

//   // emit updates to listeners
//   io.to(plateNumber).emit('bus_location', { plateNumber, lat, lng, speed, heading, lastSeen: bus.lastSeen });
//   io.emit('bus_location_global', { plateNumber, lat, lng, speed, heading, lastSeen: bus.lastSeen });

//   // check arrival at destination
//   if (bus.destination && Array.isArray(bus.destination.coordinates) && bus.destination.coordinates.length === 2) {
//     const [destLng, destLat] = bus.destination.coordinates;
//     const distToDest = getDistanceMeters(lat, lng, destLat, destLng);
//     if (!bus.arrivalTime && distToDest <= (bus.arrivalRadius || 80)) {
//       // set arrivalTime, but ensure cooldown to prevent rapid overwrites
//       const now = new Date();
//       const lastNotified = bus.notifiedParents && bus.notifiedParents.find(n => n.type === 'arrival_marker')?.notifiedAt;
//       if (!lastNotified || (now - new Date(lastNotified)) / 1000 > ARRIVAL_COOLDOWN_SEC) {
//         bus.arrivalTime = now;
//         // mark arrival_marker to prevent duplicates
//         bus.notifiedParents.push({ parentId: null, type: 'arrival_marker', notifiedAt: now });
//         await bus.save();

//         io.emit('bus_arrived', { plateNumber, arrivalTime: bus.arrivalTime });
//         // notify all parents who have pickupEnabled (or all parents in system)
//         notifyParentsOnSchoolArrival(bus);
//       }
//     }
//   }

//   // check parents near pickup points
//   // Query parents with pickupEnabled & pickupLocation exists
//   const parents = await User.find({ role: 'parent', pickupEnabled: true, 'pickupLocation.coordinates.1': { $exists: true } });

//   for (const parent of parents) {
//     if (!parent.pickupLocation || !Array.isArray(parent.pickupLocation.coordinates)) continue;
//     const [pLng, pLat] = parent.pickupLocation.coordinates;
//     const dist = getDistanceMeters(lat, lng, pLat, pLng);
//     const radius = parent.pickupRadius || 50;

//     // check if we notified this parent for pickup recently
//     const notified = bus.notifiedParents && bus.notifiedParents.find(n => String(n.parentId) === String(parent._id) && n.type === 'pickup');
//     const now = new Date();
//     const canNotify = !notified || ((now - new Date(notified.notifiedAt)) / 1000) > PICKUP_NOTIFY_COOLDOWN_SEC;

//     if (dist <= radius && canNotify) {
//       // send socket + push
//       io.to(`parent_${parent._id}`).emit('pickup_nearby', { plateNumber, lat, lng, dist });
//       if (parent.deviceTokens && parent.deviceTokens.length) {
//         sendFCM(parent.deviceTokens, { title: 'Bus is near', body: `Bus ${bus.plateNumber} is ${Math.round(dist)}m away` }, { type: 'pickup', plateNumber, dist: Math.round(dist) });
//       }

//       // record notification
//       bus.notifiedParents = bus.notifiedParents || [];
//       bus.notifiedParents.push({ parentId: parent._id, type: 'pickup', notifiedAt: new Date() });
//       await bus.save();
//     }
//   }
// }

// async function notifyParentsOnSchoolArrival(bus) {
//   // choose target parents: for simplicity, notify all parents who enabled pickup
//   const parents = await User.find({ role: 'parent', pickupEnabled: true });
//   for (const parent of parents) {
//     // socket
//     if (ioRef) ioRef.to(`parent_${parent._id}`).emit('school_arrival', { plateNumber: bus.plateNumber, arrivalTime: bus.arrivalTime });
//     if (parent.deviceTokens && parent.deviceTokens.length) {
//       sendFCM(parent.deviceTokens, { title: 'Bus arrived at school', body: `Bus ${bus.plateNumber} has arrived at school at ${bus.arrivalTime.toISOString()}` }, { type: 'arrival', plateNumber: bus.plateNumber });
//     }
//   }
// }
import Bus from "../models/Bus.js";

export const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Join a room for a specific bus based on plateNumber
    socket.on("joinBusRoom", (plateNumber) => {
      socket.join(`bus:${plateNumber}`);
      console.log(`Client ${socket.id} joined bus room: ${plateNumber}`);
    });

    // Handle client disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};

// Function to emit location updates to clients in a specific bus room
export const emitLocationUpdate = async (plateNumber, locationData) => {
  try {
    const io = global.io; // Access the io instance (make sure it's set in server.js)
    if (!io) {
      console.error("Socket.IO instance not available");
      return;
    }

    // Emit the location update to all clients in the bus's room
    io.to(`bus:${plateNumber}`).emit("locationUpdate", {
      plateNumber,
      currentLocation: locationData.currentLocation,
      speed: locationData.speed,
      heading: locationData.heading,
      lastSeen: locationData.lastSeen,
    });
  } catch (error) {
    console.error("Error emitting location update:", error);
  }
};