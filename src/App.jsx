import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MultiplayerProvider } from './MultiplayerContext'
import MultiplayerLobby from './MultiplayerLobby'
import Game from './Game'
import AdminView from './AdminView'
import UsernamePage from './UsernamePage'

export default function App() {
  return (
    <BrowserRouter>
      <MultiplayerProvider>
        <Routes>
          {/* Landing/Lobby */}
          <Route path="/" element={<MultiplayerLobby />} />
          
          {/* Training (single player) */}
          <Route path="/training" element={<Game isSinglePlayer={true} />} />
          
          {/* Join room with username */}
          <Route path="/room/:roomId" element={<UsernamePage />} />
          
          {/* Active game/admin (separate routes for admin and players) */}
          <Route path="/play/:roomId" element={<Game isSinglePlayer={false} />} />
          <Route path="/admin/:roomId" element={<AdminView />} />
          </Routes>
      </MultiplayerProvider>
    </BrowserRouter>
  )
}