import React, { useState } from 'react'
import { MultiplayerProvider, useMultiplayer } from './MultiplayerContext'
import MultiplayerLobby from './MultiplayerLobby'
import Game from './Game'
import AdminView from './AdminView'

function InnerApp({ mode, setMode }) {
  const { roomId, isAdmin } = useMultiplayer()

  if (mode === 'single') return <Game isSinglePlayer={true} />
  if (!roomId) return <MultiplayerLobby onSinglePlayer={() => setMode('single')} />
  if (isAdmin) return <AdminView />
  return <Game isSinglePlayer={false} />
}

export default function App() {
  const [mode, setMode] = useState('menu')

  return (
    <MultiplayerProvider>
      <InnerApp mode={mode} setMode={setMode} />
    </MultiplayerProvider>
  )
}