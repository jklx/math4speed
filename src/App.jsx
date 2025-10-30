import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MultiplayerProvider, useMultiplayer } from './MultiplayerContext'
import MultiplayerLobby from './MultiplayerLobby'
import Game from './Game'
import AdminView from './AdminView'
import UsernamePage from './UsernamePage'

function GameRouter() {
  const { roomId, isAdmin } = useMultiplayer()

  // In a room
  if (roomId) {
    // Admin goes to admin view
    if (isAdmin) {
      return <AdminView />
    }
    // Players go to game
    return <Game isSinglePlayer={false} />
  }

  // No room - redirect to lobby
  return <Navigate to="/" />
}

export default function App() {
  return (
    <MultiplayerProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing/Lobby */}
          <Route path="/" element={<MultiplayerLobby />} />
          
          {/* Training (single player) */}
          <Route path="/training" element={<Game isSinglePlayer={true} />} />
          
          {/* Join room with username */}
          <Route path="/room/:roomId" element={<UsernamePage />} />
          
          {/* Active game/admin (requires room context) */}
          <Route path="/play" element={<GameRouter />} />
        </Routes>
      </BrowserRouter>
    </MultiplayerProvider>
  )
}