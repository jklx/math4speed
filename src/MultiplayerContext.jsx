import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const MultiplayerContext = createContext();

export function MultiplayerProvider({ children }) {
  const persistentConnection = useRef(null);
  const [socket, setSocket] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

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

    socket.on('roomJoined', ({ username }) => {
      setError(null);
      setRoomState(null);
      if (username) setUsername(username);
    });

    socket.on('roomState', (state) => {
      console.log('[Context] roomState received:', state);
      setRoomState(state);
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, []); // Empty deps - socket should only initialize once

  // Session cookies may have changed since the lobby opened its socket.
  // Refresh once per exam/role; subsequent reconnect effects only rejoin.
  const refreshPersistentConnection = key => {
    if (!socket || persistentConnection.current === key) return;
    persistentConnection.current = key;
    setError(null);
    setRoomState(null);
    socket.disconnect().connect();
  };

  const openPersistentRoom = (roomId) => {
    if (!roomId) return;
    refreshPersistentConnection(`teacher:${roomId}`);
    socket?.emit('openPersistentRoom', { roomId });
  };

  const joinPersistentRoom = (roomId, token) => {
    if (!roomId || !token) return;
    refreshPersistentConnection(`student:${roomId}:${token}`);
    socket?.emit('joinPersistentRoom', { roomId, token });
  };

  const updateProgress = (roomId, progress, solved = null) => {
    if (!roomId) return;
    // send both a numeric progress and the list of solved problems (with correctness)
    socket?.emit('updateProgress', { roomId, progress, solved });
  };

  const recordExamAnswer = (roomId, position, entry) => {
    if (!roomId || !Number.isInteger(position)) return;
    socket?.emit('recordExamAnswer', { roomId, position, entry });
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
      isConnected,
      openPersistentRoom,
      joinPersistentRoom,
      updateProgress,
      recordExamAnswer,
      finishGame,
      getRoomState
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  return useContext(MultiplayerContext);
}
