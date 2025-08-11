import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/controllers/authController.js';
import busRoutes from './src/routes/buses.js';
import locationRoutes from './src/routes/locations.js';
import parentRoutes from './src/routes/parents.js';
import { initSocket } from './src/services/socketService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST','PUT'] }
});

app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/parents', parentRoutes);

app.get('/', (req, res) => res.send('Bus tracker backend running'));

// initialize socket handlers and pass io
initSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
