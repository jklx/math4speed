const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Room state management
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createRoom', (username) => {
    // username parameter is actually a room name provided by admin
    const roomName = username;
    // generate a lowercase 6-char room id
    const roomId = Math.random().toString(36).substring(2, 8).toLowerCase();
    // store admin separately; do NOT include admin in the players map
    rooms.set(roomId, {
      admin: socket.id,
      adminName: roomName,
      players: new Map(),
      status: 'waiting', // waiting, playing, finished
      startTime: null
    });
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, isAdmin: true, adminName: roomName });
    updateRoomState(roomId);
  });

  socket.on('joinRoom', ({ roomId, username }) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('error', 'Game already in progress');
      return;
    }
    socket.join(rid);
    room.players.set(socket.id, { username, score: null, progress: 0 });
    socket.emit('roomJoined', { roomId: rid, isAdmin: false });
    updateRoomState(rid);
  });

  socket.on('startGame', (roomId) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room || room.admin !== socket.id) return;
    
    room.status = 'playing';
    room.startTime = Date.now();
    io.to(rid).emit('gameStarted');
    updateRoomState(rid);
  });

  // allow clients to check whether a room exists and its status
  // allow clients to check whether a room exists and its status
  socket.on('checkRoom', (roomId) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room) {
      socket.emit('roomCheckResult', { roomId: rid, exists: false, status: null });
      return;
    }
    socket.emit('roomCheckResult', { roomId: rid, exists: true, status: room.status });
  });

  socket.on('updateProgress', ({ roomId, progress, solved }) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room || room.status === 'finished') return;
    
    const player = room.players.get(socket.id);
    if (player && !player.score) { // only update if player hasn't finished
      player.progress = progress;
      // Store solved problems (array) for admin view
      if (Array.isArray(solved)) {
        player.solved = solved;
      }
      updateRoomState(rid);
    }
  });

  socket.on('finishGame', ({ roomId, score, wrongCount }) => {
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room || room.status === 'finished') return;
    
    const player = room.players.get(socket.id);
    if (player && !player.score) { // only allow finishing once
      player.score = { time: score, wrongCount };
      player.progress = 100;
      
      // Check if all players finished
      const allFinished = Array.from(room.players.values())
        .every(p => p.score !== null);
      
      if (allFinished) {
        room.status = 'finished';
      }
      
      updateRoomState(rid);
    }
  });

  socket.on('disconnect', () => {
    // Walk rooms and clean up any references
    for (const [roomId, room] of rooms.entries()) {
      // If the admin disconnected
      if (room.admin === socket.id) {
        const nextPlayer = room.players.keys().next().value;
        if (nextPlayer) {
          // promote the next player to admin and remove them from players map
          room.admin = nextPlayer;
          room.players.delete(nextPlayer);
          // notify the promoted client that they are now admin
          io.to(nextPlayer).emit('promotedToAdmin');
          updateRoomState(roomId);
        } else {
          // no players left, remove the room
          rooms.delete(roomId);
        }
        continue;
      }

      // If a regular player disconnected, remove them
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        updateRoomState(roomId);
      }
    }
  });
});

function updateRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const state = {
    admin: room.admin,
    adminName: room.adminName,
    status: room.status,
    players: Array.from(room.players.entries()).map(([id, data]) => ({
      id,
      username: data.username,
      score: data.score,
      progress: data.progress,
      solved: data.solved || []
    }))
  };
  
  io.to(roomId).emit('roomState', state);
}

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});