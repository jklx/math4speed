const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { generateReport } = require('./pdfReport');

const app = express();
app.use(cors());
app.use(express.json());
const httpServer = createServer(app);
const ORIGIN = process.env.ORIGIN || '*';
const io = new Server(httpServer, {
  cors: {
    origin: ORIGIN,
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
    // generate a simple admin token so the admin can rejoin after reload
    const adminToken = Math.random().toString(36).substring(2, 14);
    // store admin separately; do NOT include admin in the players map
    rooms.set(roomId, {
      admin: socket.id,
      adminName: roomName,
      adminToken,
      players: new Map(),
      status: 'waiting', // waiting, playing, finished
      startTime: null
    });
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, isAdmin: true, adminName: roomName, adminToken });
    updateRoomState(roomId);
  });

  // allow an admin to rejoin using the secret token
  socket.on('rejoinAsAdmin', ({ roomId, adminToken, username }) => {
    console.log('[Server] rejoinAsAdmin requested for room:', roomId, 'by socket:', socket.id);
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room) {
      console.log('[Server] Room not found:', rid);
      socket.emit('error', 'Room not found');
      return;
    }
    if (!adminToken || adminToken !== room.adminToken) {
      console.log('[Server] Invalid admin token for room:', rid);
      socket.emit('error', 'Invalid admin token');
      return;
    }

    // assign this socket as admin
    room.admin = socket.id;
    if (username) room.adminName = username;
    
    // Clear the grace period flag if it exists
    if (room.adminDisconnectedAt) {
      console.log('[Server] Admin reconnected, clearing grace period for room:', rid);
      delete room.adminDisconnectedAt;
    }
    
    // ensure socket is in room
    socket.join(rid);
    console.log('[Server] Admin rejoined room:', rid);
    socket.emit('roomRejoined', { roomId: rid, isAdmin: true, adminName: room.adminName });
    updateRoomState(rid);
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

  // Allow clients (especially admin) to request current room state
  socket.on('getRoomState', (roomId) => {
    console.log('[Server] getRoomState requested for:', roomId, 'by socket:', socket.id);
    const rid = String(roomId).toLowerCase();
    const room = rooms.get(rid);
    if (!room) {
      console.log('[Server] Room not found:', rid);
      socket.emit('error', 'Room not found');
      return;
    }
    // Send room state directly to this socket
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
    console.log('[Server] Sending roomState to socket:', socket.id, 'state:', state);
    socket.emit('roomState', state);
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
    console.log('Client disconnected:', socket.id);
    // Walk rooms and clean up any references
    for (const [roomId, room] of rooms.entries()) {
      // If the admin disconnected
      if (room.admin === socket.id) {
        // Set a grace period before deleting the room
        // This allows admin to reload/reconnect without losing the room
        console.log(`[Server] Admin disconnected from room ${roomId}, setting 60s grace period`);
        room.adminDisconnectedAt = Date.now();
        room.previousAdminId = socket.id;
        
        // Delete room after 60 seconds if admin hasn't rejoined
        setTimeout(() => {
          const currentRoom = rooms.get(roomId);
          if (!currentRoom || !currentRoom.adminDisconnectedAt) {
            // Room was deleted or admin already rejoined
            return;
          }
          
          console.log(`[Server] Grace period expired for room ${roomId}, deleting room`);
          rooms.delete(roomId);
        }, 60000); // 60 second grace period
        
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

// PDF Report generation endpoint
app.get('/api/report/:roomId', (req, res) => {
  const roomId = String(req.params.roomId || '').toLowerCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const finishedPlayers = Array.from(room.players.values()).filter(p => p.score !== null);
  // sanitize / minimal copy to avoid leaking sockets or functions
  const exportPlayers = finishedPlayers.map(p => ({
    username: p.username,
    score: p.score,
    solved: (p.solved || []).map(s => ({ a: s.a, b: s.b, user: s.user, correct: s.correct }))
  }));

  generateReport(res, { id: roomId }, exportPlayers);
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});