import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const MultiplayerContext = createContext();

export function MultiplayerProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [roomCheck, setRoomCheck] = useState({ roomId: null, exists: null, status: null });
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Prefer explicit API URL via Vite env, fallback to same-origin
    const API_URL = import.meta.env.VITE_API_URL || undefined;
    const socket = io(API_URL, { path: '/socket.io' });
    
    socket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socket.on('error', (msg) => {
      console.log('[Context] Error from server:', msg);
      setError(msg);
    });

    socket.on('roomCreated', ({ roomId, isAdmin, adminName, adminToken }) => {
      console.log('[Context] roomCreated received:', { roomId, isAdmin, adminName });
      // Don't set username here - adminName is the room name, not the player's username
      setError(null);

      // store token for admin rejoin
      if (isAdmin && adminToken) {
        try {
          localStorage.setItem(`m4s_admin_${roomId}`, adminToken);
        } catch (e) {
          // ignore storage errors
        }
      }

      // navigate immediately when we set the room (embed roomId into path)
      try {
        if (isAdmin) navigate(`/admin/${roomId}`);
        else navigate(`/play/${roomId}`);
      } catch (e) {}
    });

    socket.on('roomJoined', ({ roomId, isAdmin }) => {
      setError(null);

      // navigate immediately when joining (embed roomId into path)
      try {
        if (isAdmin) navigate(`/admin/${roomId}`);
        else navigate(`/play/${roomId}`);
      } catch (e) {}
    });

    socket.on('roomRejoined', ({ roomId, isAdmin, adminName }) => {
      console.log('[Context] roomRejoined received:', { roomId, isAdmin, adminName });
      // Don't set username from adminName - that's the room name, not player username
      setError(null);
      // Don't navigate - we're already on the right page after reload
    });

    socket.on('roomState', (state) => {
      console.log('[Context] roomState received:', state);
      setRoomState(state);
    });

    socket.on('gameStarted', ({ settings }) => {
      console.log('[Context] gameStarted received with settings:', settings);
      // Update roomState with the settings so Game.jsx can use them
      setRoomState(prev => ({
        ...prev,
        settings,
        status: 'playing'
      }));
    });

    socket.on('roomCheckResult', ({ roomId, exists, status }) => {
      setRoomCheck({ roomId, exists, status });
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, []); // Empty deps - socket should only initialize once

  // Attempt admin rejoin - to be called by components with roomId from params
  const attemptAdminRejoin = (roomId) => {
    if (!socket || !roomId) return;

    const token = localStorage.getItem(`m4s_admin_${roomId}`);
    if (!token) {
      console.log('[Context] No admin token found for room:', roomId);
      return;
    }

    console.log('[Context] Attempting admin rejoin for room:', roomId, 'with token');
    
    if (socket.connected) {
      socket.emit('rejoinAsAdmin', { roomId, adminToken: token });
      return;
    }

    const onConnect = () => socket.emit('rejoinAsAdmin', { roomId, adminToken: token });
    socket.on('connect', onConnect);
    // Note: cleanup not needed here as this is a one-time rejoin attempt
  };

  // Navigation is performed immediately when the provider receives events

  const createRoom = (roomName) => {
    // roomName is the name of the room being created (not the admin's username)
    socket?.emit('createRoom', roomName);
  };

  const joinRoom = (roomId, username) => {
    setUsername(username);
    // normalize to lowercase before sending to server
    const rid = String(roomId).toLowerCase();
    socket?.emit('joinRoom', { roomId: rid, username });
  };

  const startGame = (roomId, settings = {}) => {
    if (!roomId) return;
    socket?.emit('startGame', { roomId, settings });
  };

  const checkRoom = (roomIdToCheck) => {
    if (!socket) return;
    // normalize to lowercase before sending to server
    const rid = String(roomIdToCheck).toLowerCase();
    // clear previous
    setRoomCheck({ roomId: rid, exists: null, status: null });
    socket.emit('checkRoom', rid);
  };

  const updateProgress = (roomId, progress, solved = null) => {
    if (!roomId) return;
    // send both a numeric progress and the list of solved problems (with correctness)
    socket?.emit('updateProgress', { roomId, progress, solved });
  };

  const finishGame = (roomId, score, wrongCount) => {
    if (!roomId) return;
    socket?.emit('finishGame', { roomId, score, wrongCount });
  };

  const getRoomState = (roomId) => {
    if (!roomId || !socket) {
      console.log('[Context] getRoomState called but no socket or roomId:', { roomId, hasSocket: !!socket });
      return;
    }
    console.log('[Context] Emitting getRoomState for:', roomId);
    socket.emit('getRoomState', roomId);
  };

  return (
    <MultiplayerContext.Provider value={{
      socket,
      roomState,
      username,
      error,
      roomCheck,
      isConnected,
      checkRoom,
      createRoom,
      joinRoom,
      startGame,
      updateProgress,
      finishGame,
      attemptAdminRejoin,
      getRoomState
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  return useContext(MultiplayerContext);
}