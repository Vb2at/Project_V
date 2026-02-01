const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('game-state', (data) => {
    socket.broadcast.emit('update-game', data);
  });
});

server.listen(3000, () => console.log('Socket.io server running on port 3000'));
