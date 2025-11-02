import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const MultiplayerContext = createContext();

export function MultiplayerProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roomCheck, setRoomCheck] = useState({ roomId: null, exists: null, status: null });

  useEffect(() => {
    // Prefer explicit API URL via Vite env, fallback to same-origin
    const API_URL = import.meta.env.VITE_API_URL || undefined;
    const socket = io(API_URL, { path: '/socket.io' });
    
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    socket.on('roomCreated', ({ roomId, isAdmin, adminName }) => {
      setRoomId(roomId);
      setIsAdmin(isAdmin);
      setUsername(adminName); // Set admin's username from room name
      setError(null);
    });

    socket.on('roomJoined', ({ roomId, isAdmin }) => {
      setRoomId(roomId);
      setIsAdmin(isAdmin);
      setError(null);
    });

    socket.on('roomState', (state) => {
      setRoomState(state);
      // keep isAdmin state in sync with server-side admin assignment
      if (socket && socket.id) {
        setIsAdmin(state.admin === socket.id);
      }
    });

    socket.on('roomCheckResult', ({ roomId, exists, status }) => {
      setRoomCheck({ roomId, exists, status });
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = (username) => {
    // For creating a room we accept a room name (adminName). Do not overwrite client username.
    socket?.emit('createRoom', username);
  };

  const joinRoom = (roomId, username) => {
    setUsername(username);
    // normalize to lowercase before sending to server
    const rid = String(roomId).toLowerCase();
    socket?.emit('joinRoom', { roomId: rid, username });
  };

  const startGame = () => {
    if (!roomId || !isAdmin) return;
    socket?.emit('startGame', roomId);
  };

  const checkRoom = (roomIdToCheck) => {
    if (!socket) return;
    // normalize to lowercase before sending to server
    const rid = String(roomIdToCheck).toLowerCase();
    // clear previous
    setRoomCheck({ roomId: rid, exists: null, status: null });
    socket.emit('checkRoom', rid);
  };

  const updateProgress = (progress, solved = null) => {
    if (!roomId) return;
    // send both a numeric progress and the list of solved problems (with correctness)
    socket?.emit('updateProgress', { roomId, progress, solved });
  };

  const finishGame = (score, wrongCount) => {
    if (!roomId) return;
    socket?.emit('finishGame', { roomId, score, wrongCount });
  };

  return (
    <MultiplayerContext.Provider value={{
      socket,
      roomState,
      roomId,
      username,
      error,
      isAdmin,
      roomCheck,
      checkRoom,
      createRoom,
      joinRoom,
      startGame,
      updateProgress,
      finishGame
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  return useContext(MultiplayerContext);
}