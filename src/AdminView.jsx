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
    window.open(`/api/report/${roomId}`, '_blank')
  }

  const allPlayersFinished = roomState.players.length > 0 && 
    roomState.players.every(p => p.score !== null)

  // Calculate statistics for finished players
  const finishedPlayers = roomState.players.filter(p => p.score !== null)
  const stats = finishedPlayers.length > 0 ? {
    avgTime: (finishedPlayers.reduce((sum, p) => sum + p.score.time, 0) / finishedPlayers.length).toFixed(1),
    avgErrors: (finishedPlayers.reduce((sum, p) => sum + p.score.wrongCount, 0) / finishedPlayers.length).toFixed(1),
    totalPlayers: finishedPlayers.length
  } : null

  return (
    <div className="admin-view">
      <div className="admin-inner">
        <div className="admin-content">
        <header>
          <h2>
            Admin-Ansicht — Raum: <tt className="room-id">{roomId?.toLowerCase()}</tt>
          </h2>
          {roomState.adminName && (
            <div className="room-name">
              Raum-Name: <strong>{roomState.adminName}</strong>
            </div>
          )}
        </header>

        <div className="admin-actions">
          {isAdmin && roomState.status === 'waiting' && (
            <button className="big" onClick={() => startGame()}>
              🚀 Spiel starten
            </button>
          )}
          {isAdmin && (
            <button className="big" onClick={handleDownloadPDF}>
              📄 PDF-Bericht herunterladen
            </button>
          )}
        </div>

        {stats && (
          <div className="admin-stats">
            <h3>📊 Raum-Statistiken</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Abgeschlossen</div>
                <div className="stat-value blue">{stats.totalPlayers}</div>
                <div className="stat-unit">
                  {stats.totalPlayers === 1 ? 'Spieler' : 'Spieler'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Ø Lösungszeit</div>
                <div className="stat-value green">
                  {stats.avgTime}<span className="stat-suffix">s</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Ø Fehleranzahl</div>
                <div className="stat-value red">{stats.avgErrors}</div>
              </div>
            </div>
          </div>
        )}
        </div>

        {roomState.players.filter(p => p.id !== roomState.admin).map(player => (
          <div key={player.id} className="player-card">
            <div className="player-card-header">
              <h3>
                {player.username}
                {player.id === roomState.admin && (
                  <span className="admin-badge">(Admin)</span>
                )}
              </h3>
              <span className={`progress-percent ${player.progress >= 100 ? 'complete' : 'active'}`}>
                {(player.progress || 0).toFixed(0)}%
              </span>
            </div>

            <div className="progress-wrapper">
              <ProgressBar progress={player.progress || 0} />
            </div>

            {player.solved && player.solved.length > 0 && (
              <div className="player-problems" ref={el => { problemRefs.current[player.id] = el }}>
                {player.solved.map((problem, idx) => (
                  <div key={idx} className={`problem-entry ${problem.isCorrect ? 'correct' : 'incorrect'}`}>
                    <span>{problem.a} · {problem.b} = {problem.user}</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {problem.isCorrect ? '✓' : `✗ (${problem.correct})`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {player.score && (
              <div className="player-score">
                <div className="score-title">✓ Fertig!</div>
                <div className="score-detail">
                  Zeit: <strong>{player.score.time}s</strong>
                </div>
                <div className="score-detail">
                  Fehler: <strong>{player.score.wrongCount}</strong>
                </div>
                <div className="score-progress">
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
