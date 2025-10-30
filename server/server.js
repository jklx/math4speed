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
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms.set(roomId, {
      admin: socket.id,
      adminName: username,
      players: new Map([[socket.id, { username, score: null, progress: 0 }]]),
      status: 'waiting', // waiting, playing, finished
      startTime: null
    });
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, isAdmin: true });
    updateRoomState(roomId);
  });

  socket.on('joinRoom', ({ roomId, username }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('error', 'Game already in progress');
      return;
    }
    socket.join(roomId);
    room.players.set(socket.id, { username, score: null, progress: 0 });
    socket.emit('roomJoined', { roomId, isAdmin: false });
    updateRoomState(roomId);
  });

  socket.on('startGame', (roomId) => {
    const room = rooms.get(roomId);
    if (!room || room.admin !== socket.id) return;
    
    room.status = 'playing';
    room.startTime = Date.now();
    io.to(roomId).emit('gameStarted');
    updateRoomState(roomId);
  });

  // allow clients to check whether a room exists and its status
  socket.on('checkRoom', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('roomCheckResult', { roomId, exists: false, status: null });
      return;
    }
    socket.emit('roomCheckResult', { roomId, exists: true, status: room.status });
  });

  socket.on('updateProgress', ({ roomId, progress, solved }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.get(socket.id);
    if (player) {
      player.progress = progress;
      // Store solved problems (array) for admin view
      if (Array.isArray(solved)) {
        player.solved = solved;
      }
      updateRoomState(roomId);
    }
  });

  socket.on('finishGame', ({ roomId, score, wrongCount }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players.get(socket.id);
    if (player) {
      player.score = { time: score, wrongCount };
      player.progress = 100;
      
      // Check if all players finished
      const allFinished = Array.from(room.players.values())
        .every(p => p.score !== null);
      
      if (allFinished) {
        room.status = 'finished';
      }
      
      updateRoomState(roomId);
    }
  });

  socket.on('disconnect', () => {
    // Remove player from their room
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        
        // If admin left, assign new admin or close room
        if (room.admin === socket.id) {
          const nextPlayer = room.players.keys().next().value;
          if (nextPlayer) {
            room.admin = nextPlayer;
          } else {
            rooms.delete(roomId);
            continue;
          }
        }
        
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

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});