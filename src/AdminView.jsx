import React, { useRef, useEffect } from 'react'
import { useMultiplayer } from './MultiplayerContext'
import ProgressBar from './ProgressBar'

export default function AdminView() {
  const { roomState, roomId, startGame, isAdmin } = useMultiplayer()
  const problemRefs = useRef({})

  useEffect(() => {
    if (!roomState || !roomState.players) return
    roomState.players.forEach(p => {
      const el = problemRefs.current[p.id]
      if (el) {
        setTimeout(() => { el.scrollTop = el.scrollHeight }, 0)
      }
    })
  }, [roomState])

  if (!roomState) return null

  const handleDownloadPDF = () => {
    window.open(`http://localhost:3001/api/report/${roomId}`, '_blank')
  }

  const allPlayersFinished = roomState.players.length > 0 && 
    roomState.players.every(p => p.score !== null)

  return (
    <div className="admin-view">
      <header>
        <h2>Admin-Ansicht — Raum: <tt className="room-id">{roomId?.toLowerCase()}</tt></h2>
        {roomState.adminName && <div style={{ color: '#444', marginTop: 6 }}>Raum-Name: <strong>{roomState.adminName}</strong></div>}
      </header>

      <div style={{ margin: '0 1rem 1rem 1rem' }}>
        {isAdmin && roomState.status === 'waiting' && (
          <button className="big" onClick={() => startGame()}>Spiel starten</button>
        )}
        {isAdmin && (
          <button className="big" onClick={handleDownloadPDF} style={{ marginLeft: '0.5rem' }}>
            📄 PDF-Bericht herunterladen
          </button>
        )}
      </div>

      <div className="admin-grid">
        {roomState.players.filter(p => p.id !== roomState.admin).map(player => (
          <div key={player.id} className="player-card">
            <h3 style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{player.username}{player.id === roomState.admin ? ' (Admin)' : ''}</span>
              <span>{(player.progress || 0).toFixed(0)}%</span>
            </h3>

            <div style={{ marginBottom: 6 }}>
              <ProgressBar progress={player.progress || 0} />
            </div>

            {player.solved && player.solved.length > 0 && (
              <div className="player-problems" ref={el => { problemRefs.current[player.id] = el }}>
                {player.solved.map((problem, idx) => (
                  <div key={idx} className={`problem-entry ${problem.isCorrect ? 'correct' : 'incorrect'}`}>
                    <span>{problem.a} · {problem.b} = {problem.user}</span>
                    <span>{problem.isCorrect ? '✓' : `✗ (${problem.correct})`}</span>
                  </div>
                ))}
              </div>
            )}

            {player.score && (
              <div style={{ marginTop: 8 }}>
                Fertig: {player.score.time}s ({player.score.wrongCount} Fehler)
                <div style={{ marginTop: 8 }}>
                  <ProgressBar finalTime={player.score.time} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
