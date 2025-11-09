import React, { useRef, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'
import ProgressBar from './ProgressBar'
import Logo from './Logo'

export default function AdminView() {
  const { roomId } = useParams()
  const { roomState, startGame, attemptAdminRejoin, getRoomState, isConnected } = useMultiplayer()
  const problemRefs = useRef({})
  const [toast, setToast] = useState(null)
  
  // Local settings state (only for admin)
  const [settings, setSettings] = useState({
    includeSquares11_20: false,
    includeSquares21_25: false
  });

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  // Request room state when component mounts or roomId changes
  useEffect(() => {
    if (!roomId || !isConnected) {
      console.log('[AdminView] Waiting for socket connection...', { roomId, isConnected });
      return;
    }
    
    console.log('[AdminView] Socket connected! roomId:', roomId, 'hasRoomState:', !!roomState);
    
    // Always attempt to rejoin as admin (validates our token)
    console.log('[AdminView] Attempting admin rejoin');
    attemptAdminRejoin(roomId);
    
    // Always request current room state to ensure we have fresh data
    console.log('[AdminView] Requesting room state');
    getRoomState(roomId);
  }, [roomId, isConnected]); // Wait for actual connection

  useEffect(() => {
    if (!roomState || !roomState.players) return
    roomState.players.forEach(p => {
      const el = problemRefs.current[p.id]
      if (el) {
        setTimeout(() => { el.scrollTop = el.scrollHeight }, 0)
      }
    })
  }, [roomState])

  if (!roomState) {
    return (
      <div className="admin-view">
        <div className="admin-inner">
          <div className="admin-content">
            <Logo />
            <header>
              <h2>Admin-Ansicht — Raum: <tt className="room-id">{roomId?.toLowerCase()}</tt></h2>
            </header>
            <div className="loading">Lade Raumdaten…</div>
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = () => {
    window.open(`/api/report/${roomId}`, '_blank')
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId.toLowerCase())
      .then(() => {
        setToast('Raum-Code kopiert')
        console.log('Room ID copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy:', err)
        setToast('Kopieren fehlgeschlagen')
      });
  }

  const copyJoinUrl = () => {
    const joinUrl = `${window.location.origin}/room/${roomId.toLowerCase()}`;
    navigator.clipboard.writeText(joinUrl)
      .then(() => {
        setToast('Beitritts-URL kopiert')
        console.log('Join URL copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy:', err)
        setToast('Kopieren fehlgeschlagen')
      });
  }

  // visible join URL for display
  const joinUrl = (typeof window !== 'undefined' && roomId)
    ? `${window.location.origin}/room/${roomId.toLowerCase()}`
    : ''

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
      {toast && (
        <div className="copy-toast" role="status">{toast}</div>
      )}
  <div className="admin-inner">
  <div className="admin-content">
  <Logo />
  <header>
          <div className="room-title">
            <h2>{roomState.adminName ? roomState.adminName : 'Admin-Ansicht'}</h2>
          </div>

          <div className="join-info">
            <div className="big-room-id">
              <tt className="room-id">{roomId?.toLowerCase()}</tt>
            </div>

              <div className="join-url">
                <a href={`/room/${roomId?.toLowerCase()}`} target="_blank" rel="noopener noreferrer">{joinUrl}</a>
              </div>

              <div className="join-actions">
              <button
                onClick={copyRoomId}
                className="copy-btn copy-large"
                title="Raum-Code kopieren"
              >
                ID kopieren
              </button>
              <button
                onClick={copyJoinUrl}
                className="copy-btn copy-large"
                title="Beitritts-URL kopieren"
              >
                URL kopieren
              </button>
            </div>

            <div className="join-instructions">Teile diesen Code oder die URL mit deinen Spieler:innen, damit sie beitreten können.</div>
          </div>
        </header>

        {roomState.status === 'waiting' && (
          <div className="settings-box">
            <h3>Aufgaben-Einstellungen</h3>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                className="app-input"
                checked={true}
                disabled={true}
              />
              <span>Einmaleins 1-10 (immer aktiv)</span>
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                className="app-input"
                checked={settings.includeSquares11_20}
                onChange={(e) => setSettings({
                  ...settings,
                  includeSquares11_20: e.target.checked
                })}
              />
              <span>Quadratzahlen 11-20 (z.B. 11², 15², 20²)</span>
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                className="app-input"
                checked={settings.includeSquares21_25}
                onChange={(e) => setSettings({
                  ...settings,
                  includeSquares21_25: e.target.checked
                })}
              />
              <span>Quadratzahlen 21-25 (z.B. 21², 23², 25²)</span>
            </label>
          </div>
        )}

        <div className="admin-actions">
          {roomState.status === 'waiting' && (
            <button className="big" onClick={() => startGame(roomId, settings)}>
              🚀 Spiel starten
            </button>
          )}
          {(
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
