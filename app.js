const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected');
  let currentRoom = null;

  socket.on('set-username', (username) => {
    socket.username = username;
  });

  socket.on('create-room', (roomId) => {
    if (rooms.has(roomId)) {
      socket.emit('room-creation-failed', 'Room already exists');
    } else {
      currentRoom = roomId;
      rooms.set(roomId, new Set([socket.id]));
      socket.join(roomId);
      socket.emit('room-created', roomId);
      io.to(roomId).emit('user-joined', Array.from(rooms.get(roomId)));
    }
  });

  socket.on('join-room', (roomId) => {
    if (rooms.has(roomId)) {
      currentRoom = roomId;
      socket.join(roomId);
      rooms.get(roomId).add(socket.id);
      socket.emit('room-joined', roomId);
      io.to(roomId).emit('user-joined', Array.from(rooms.get(roomId)));
    } else {
      socket.emit('room-join-failed', 'Room does not exist');
    }
  });

  socket.on('send-message', ({ roomId, message, iv }) => {
    io.to(roomId).emit('new-message', { sender: socket.username || socket.id, message, iv });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(currentRoom);
        } else {
          io.to(currentRoom).emit('user-left', Array.from(room));
        }
      }
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
