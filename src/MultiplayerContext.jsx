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
    const socket = io('http://localhost:3000');
    
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    socket.on('roomCreated', ({ roomId, isAdmin }) => {
      setRoomId(roomId);
      setIsAdmin(isAdmin);
      setError(null);
    });

    socket.on('roomJoined', ({ roomId, isAdmin }) => {
      setRoomId(roomId);
      setIsAdmin(isAdmin);
      setError(null);
    });

    socket.on('roomState', (state) => {
      setRoomState(state);
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
    setUsername(username);
    socket?.emit('createRoom', username);
  };

  const joinRoom = (roomId, username) => {
    setUsername(username);
    socket?.emit('joinRoom', { roomId, username });
  };

  const startGame = () => {
    if (!roomId || !isAdmin) return;
    socket?.emit('startGame', roomId);
  };

  const checkRoom = (roomIdToCheck) => {
    if (!socket) return;
    // clear previous
    setRoomCheck({ roomId: roomIdToCheck, exists: null, status: null });
    socket.emit('checkRoom', roomIdToCheck);
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