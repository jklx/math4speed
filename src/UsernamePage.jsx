import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'

export default function UsernamePage() {
  const { roomId: urlRoomId } = useParams()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const { joinRoom, roomCheck, checkRoom, error, roomId } = useMultiplayer()

  // Check room on mount
  useEffect(() => {
    if (urlRoomId) {
      checkRoom(urlRoomId)
    }
  }, [urlRoomId])

  // After joining successfully (we get a roomId), redirect to /play
  useEffect(() => {
    if (roomId) {
      navigate('/play')
    }
  }, [roomId])

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
  return (
    <div className="username-page">
      <h2>Raum beitreten</h2>
      <p>Du trittst Raum <tt className="room-id">{urlRoomId.toLowerCase()}</tt> bei.</p>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="username-input">
        <input
          type="text"
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