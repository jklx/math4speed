import React, { useState } from 'react'
import { MultiplayerProvider } from './MultiplayerContext'
import MultiplayerLobby from './MultiplayerLobby'
import Game from './Game'

export default function App() {
  const [mode, setMode] = useState('menu')

  return (
    <MultiplayerProvider>
      {mode === 'menu' ? (
        <MultiplayerLobby onSinglePlayer={() => setMode('single')} />
      ) : mode === 'single' ? (
        <Game isSinglePlayer={true} />
      ) : null}
    </MultiplayerProvider>
  )
}