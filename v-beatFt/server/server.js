const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.on('game-state', (data) => {
    socket.broadcast.emit('update-game', data);
  });
  socket.on('disconnect', () => console.log(`User disconnected: ${socket.id}`));
});

server.listen(3000, () => console.log('Socket.io server running on port 3000'));
