require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const app = require('./app');
const connectDB = require('./config/db');
const User = require('./models/User');
const ChatMessage = require('./models/ChatMessage');

const PORT = process.env.PORT || 5000;

const uploadsDir = path.join(__dirname, '..', 'uploads', 'users');
fs.mkdirSync(uploadsDir, { recursive: true });
const listingUploadsDir = path.join(__dirname, '..', 'uploads', 'listings');
fs.mkdirSync(listingUploadsDir, { recursive: true });

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join_room', async ({ roomId, token }) => {
    try {
      if (!roomId || !token) {
        socket.emit('chat_error', { message: 'roomId and token are required' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email status');
      if (!user || user.status === 'banned') {
        socket.emit('chat_error', { message: 'User not allowed for chat' });
        return;
      }

      socket.data.user = user;
      socket.data.roomId = roomId;
      socket.join(roomId);
      socket.emit('room_joined', { roomId, userId: user._id });
    } catch (error) {
      socket.emit('chat_error', { message: 'Invalid token or room join failed' });
    }
  });

  socket.on('send_message', async ({ roomId, token, message }) => {
    try {
      if (!roomId || !token || !message || !String(message).trim()) {
        socket.emit('chat_error', { message: 'roomId, token and message are required' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email status');
      if (!user || user.status === 'banned') {
        socket.emit('chat_error', { message: 'User not allowed for chat' });
        return;
      }

      const chatMessage = await ChatMessage.create({
        roomId,
        sender: user._id,
        message: String(message).trim(),
      });

      io.to(roomId).emit('receive_message', {
        _id: chatMessage._id,
        roomId: chatMessage.roomId,
        message: chatMessage.message,
        sender: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        createdAt: chatMessage.createdAt,
      });
    } catch (error) {
      socket.emit('chat_error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

