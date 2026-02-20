import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { assertConnectionAccess } from './controllers/chatController.js';
import { DoctorChatMessage } from './models/DoctorChatMessage.js';

dotenv.config();

async function main() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
  app.use(limiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/prescriptions', prescriptionRoutes);

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use(notFound);
  app.use(errorHandler);

  const port = process.env.PORT || 4000;
  await connectDB(process.env.MONGODB_URI);

  // Socket.io server with CORS aligned to API
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: true, credentials: true },
    transports: ['websocket', 'polling']
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      socket.userRole = payload.role;
      return next();
    } catch (err) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const safeReq = { userId: socket.userId, userRole: socket.userRole };

    socket.on('joinConnection', async (payload, ack) => {
      try {
        const { connectionId } = payload || {};
        await assertConnectionAccess(safeReq, connectionId);
        socket.join(`conn:${connectionId}`);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, message: err.message });
      }
    });

    socket.on('sendMessage', async (payload, ack) => {
      try {
        const { connectionId, message, clientId } = payload || {};
        if (!message || !connectionId) {
          return ack?.({ ok: false, message: 'message and connectionId required' });
        }
        const { connection, role } = await assertConnectionAccess(safeReq, connectionId);
        const from = role === 'doctor' ? 'doctor' : 'user';
        const docMsg = await DoctorChatMessage.create({
          connection: connection._id,
          user: connection.user,
          doctor: connection.doctor,
          from,
          message: message.trim(),
          senderUser: socket.userId,
          deliveredAt: new Date()
        });
        const data = { ...docMsg.toObject(), clientId };
        io.to(`conn:${connectionId}`).emit('messageCreated', data);
        ack?.({ ok: true, message: data });
      } catch (err) {
        ack?.({ ok: false, message: err.message });
      }
    });

    socket.on('markRead', async (payload, ack) => {
      try {
        const { connectionId } = payload || {};
        await assertConnectionAccess(safeReq, connectionId);
        const now = new Date();
        await DoctorChatMessage.updateMany(
          { connection: connectionId, readAt: { $in: [null, undefined] }, from: { $ne: (socket.userRole === 'doctor' ? 'doctor' : 'user') } },
          { $set: { readAt: now } }
        );
        io.to(`conn:${connectionId}`).emit('messagesRead', { connectionId, readAt: now, reader: socket.userId });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, message: err.message });
      }
    });

    socket.on('disconnect', () => {
      // default socket.io reconnection handles retries
    });
  });

  server.listen(port, () => console.log(`Server listening on ${port}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
