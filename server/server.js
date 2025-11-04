const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const PDFDocument = require('pdfkit');

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

// PDF Report generation endpoint
app.get('/api/report/:roomId', (req, res) => {
  const roomId = req.params.roomId.toLowerCase();
  const room = rooms.get(roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const finishedPlayers = Array.from(room.players.entries())
    .map(([id, data]) => ({ id, ...data }))
    .filter(p => p.score !== null)
    .sort((a, b) => a.score.time - b.score.time);

  if (finishedPlayers.length === 0) {
    return res.status(400).json({ error: 'No finished players in this room' });
  }

  // Create PDF
  const doc = new PDFDocument({ 
    size: 'A4',
    margin: 50
  });

  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="math4speed-report-${roomId}.pdf"`);

  // Pipe PDF to response
  doc.pipe(res);

  // Add title page
  doc.fontSize(24).font('Helvetica-Bold').text('Math4Speed Bericht', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica').text(`Raum: ${room.adminName || roomId}`, { align: 'center' });
  doc.fontSize(12).text(`Raum-Code: ${roomId}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Erstellt am: ${new Date().toLocaleString('de-DE')}`, { align: 'center' });
  doc.moveDown(2);

  // Summary table
  doc.fontSize(16).font('Helvetica-Bold').text('Zusammenfassung');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  
  const tableTop = doc.y;
  const colWidths = { rank: 40, name: 180, time: 80, wrong: 80, raw: 80 };
  let y = tableTop;
  // Table header (render with explicit X positions and handle overflow)
  doc.font('Helvetica-Bold');
  const startX = 50;
  const pageBottom = doc.page.height - doc.options.margin;

  function renderTableHeader(atY) {
    doc.font('Helvetica-Bold');
    doc.text('Rang', startX, atY);
    doc.text('Name', startX + colWidths.rank, atY);
    doc.text('Endzeit', startX + colWidths.rank + colWidths.name, atY);
    doc.text('Fehler', startX + colWidths.rank + colWidths.name + colWidths.time, atY);
    doc.text('Rohzeit', startX + colWidths.rank + colWidths.name + colWidths.time + colWidths.wrong, atY);
  }

  renderTableHeader(y);
  y += 20;
  doc.moveTo(startX, y).lineTo(startX + colWidths.rank + colWidths.name + colWidths.time + colWidths.wrong + colWidths.raw, y).stroke();
  y += 8;

  // Table rows
  doc.font('Helvetica');
  finishedPlayers.forEach((player, index) => {
    const rawTime = player.score.time - (player.score.wrongCount * 10);

    // Check for page overflow and create a new page with header if needed
    if (y + 20 > pageBottom) {
      doc.addPage();
      y = doc.y;
      renderTableHeader(y);
      y += 20;
      doc.moveTo(startX, y).lineTo(startX + colWidths.rank + colWidths.name + colWidths.time + colWidths.wrong + colWidths.raw, y).stroke();
      y += 8;
    }

    doc.text(`${index + 1}.`, startX, y);
    doc.text(player.username, startX + colWidths.rank, y);
    doc.text(`${player.score.time}s`, startX + colWidths.rank + colWidths.name, y);
    doc.text(`${player.score.wrongCount}`, startX + colWidths.rank + colWidths.name + colWidths.time, y);
    doc.text(`${rawTime}s`, startX + colWidths.rank + colWidths.name + colWidths.time + colWidths.wrong, y);
    y += 18;
  });

  // Individual player pages
  finishedPlayers.forEach((player, index) => {
    doc.addPage();
    
    // Player header
    doc.fontSize(20).font('Helvetica-Bold').text(player.username, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica').text(`Rang: ${index + 1} von ${finishedPlayers.length}`, { align: 'center' });
    doc.moveDown(1);

    // Score summary
    const rawTime = player.score.time - (player.score.wrongCount * 10);
    const penalty = player.score.wrongCount * 10;
    
    doc.fontSize(14).font('Helvetica-Bold').text('Ergebnis');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Rohzeit: ${rawTime} Sekunden`);
    doc.text(`Falsche Antworten: ${player.score.wrongCount} (Strafe: ${penalty}s)`);
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`Endzeit: ${player.score.time} Sekunden`);
    doc.moveDown(1);

    // Performance evaluation
    doc.fontSize(14).font('Helvetica-Bold').text('Bewertung');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    let comment = '';
    if (player.score.time <= 90) comment = 'Hervorragend! Du bist ein Einmaleins-Profi! ';
    else if (player.score.time <= 120) comment = 'Sehr gut! Fast perfekte Zeit! ';
    else if (player.score.time <= 150) comment = 'Gut gemacht! Du bist auf dem richtigen Weg! ';
    else if (player.score.time <= 180) comment = 'Nicht schlecht! Mit etwas Übung wird es noch besser! ';
    else comment = 'Weiter üben! Du schaffst das!';
    doc.text(comment);
    doc.moveDown(1);

    // Problem details if available
    if (player.solved && player.solved.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Aufgaben-Details');
      doc.moveDown(0.5);
      
      const correct = player.solved.filter(p => p.isCorrect);
      const incorrect = player.solved.filter(p => !p.isCorrect);
      
      doc.fontSize(11).font('Helvetica');
      doc.text(`Richtig gelöst: ${correct.length} von ${player.solved.length}`);
      doc.text(`Genauigkeit: ${((correct.length / player.solved.length) * 100).toFixed(1)}%`);
      doc.moveDown(0.5);

      if (incorrect.length > 0 && incorrect.length <= 20) {
        doc.fontSize(12).font('Helvetica-Bold').text('Falsch gelöste Aufgaben:');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        
        incorrect.forEach(prob => {
          const userAnswer = isNaN(prob.user) ? '(keine Antwort)' : prob.user;
          doc.text(`  ${prob.a} × ${prob.b} = ${prob.correct}  (Deine Antwort: ${userAnswer})`);
        });
      } else if (incorrect.length > 20) {
        doc.fontSize(10).font('Helvetica');
        doc.text(`${incorrect.length} Aufgaben wurden falsch beantwortet.`);
      }
    }

  });

  doc.end();
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});