import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'
import { getCategoryLabel } from './utils/categories'

export default function UsernamePage() {
  const { roomId: urlRoomId } = useParams()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const { joinRoom, roomCheck, checkRoom, error } = useMultiplayer()

  // Check room when URL param is present and socket is connected
  const { isConnected } = useMultiplayer()
  useEffect(() => {
    if (urlRoomId && isConnected) {
      checkRoom(urlRoomId)
    }
  }, [urlRoomId, isConnected])


  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username || roomCheck.exists !== true || roomCheck.status !== 'waiting') return
    
    setIsJoining(true)
    joinRoom(urlRoomId, username)
  }

  // Room doesn't exist - go back to lobby
  if (roomCheck.exists === false) {
    navigate('/')
    return null
  }

  // Room exists but game in progress
  if (roomCheck.exists && roomCheck.status !== 'waiting') {
    return (
      <div className="username-page">
        <h2>Spiel läuft bereits</h2>
        <p>Das Spiel in Raum <tt className="room-id">{urlRoomId.toLowerCase()}</tt> läuft bereits.</p>
        <button className="big" onClick={() => navigate('/')}>Zurück zum Hauptmenü</button>
      </div>
    )
  }

  // Room exists and waiting, or still checking
  const selectedCategory = roomCheck?.settings?.category
    ? getCategoryLabel(roomCheck.settings.category)
    : null

  return (
    <div className="username-page">
      <h2>Raum beitreten</h2>
      <p>Du trittst Raum <tt className="room-id">{urlRoomId.toLowerCase()}</tt> bei.</p>
      {selectedCategory && (
        <p>Ausgewählte Kategorie: <strong>{selectedCategory}</strong></p>
      )}
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="username-input">
        <input
          type="text"
          className="app-input"
          placeholder="Dein Name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isJoining}
          autoFocus
          required
        />
        <button
          type="submit"
          className="big"
          disabled={!username || roomCheck.exists !== true || roomCheck.status !== 'waiting' || isJoining}
        >
          {isJoining ? 'Trete bei...' : 'Beitreten'}
        </button>
      </form>
      
      {roomCheck.exists === null && <div className="hint">Prüfe Raum…</div>}
    </div>
  )
}