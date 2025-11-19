import React, { useRef, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'
import ProgressBar from './ProgressBar'
import Logo from './Logo'
import { getOperator } from './utils/getOperator'
import { getCategoryLabel } from './utils/categories'

export default function AdminView() {
  const { roomId } = useParams()
  const { roomState, startGame, attemptAdminRejoin, getRoomState, isConnected } = useMultiplayer()
  const problemRefs = useRef({})
  const [toast, setToast] = useState(null)
  
  // Local settings state (only for admin)
  const defaultSettings = {
    category: 'einmaleins',
    includeSquares11_20: false,
    includeSquares21_25: false
  }
  const [settings, setSettings] = useState(defaultSettings);

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

  useEffect(() => {
    if (roomState?.settings) {
      setSettings(prev => ({ ...defaultSettings, ...roomState.settings }))
    }
  }, [roomState?.settings])

  const renderCategoryInfo = (cat) => {
    if (cat === 'einmaleins') {
      return (
        <>
          <p>50 gemischte Einmaleins-Aufgaben. Aufgaben mit ·1 und ·10 kommen seltener vor.</p>
          <p>Optional können zusätzliche Quadratzahlen zugeschaltet werden.</p>
        </>
      )
    }
    if (cat === 'schriftlich') {
      return (
        <>
          <p>15 schriftliche Aufgaben: 5× Addition, 5× Subtraktion, 5× Multiplikation.</p>
          <p>Schüler:innen geben Zwischenergebnisse direkt in den Stellenwerttabellen ein.</p>
        </>
      )
    }
    if (cat === 'primfaktorisierung') {
      return (
        <>
          <p>20 Zahlen werden in Primfaktoren zerlegt. Antworten bitte mit Leerzeichen trennen (z.B. "2 2 3").</p>
        </>
      )
    }
    return null
  }

  const currentSettings = roomState?.status === 'waiting' ? settings : (roomState?.settings || settings)
  const currentCategoryLabel = getCategoryLabel(currentSettings.category)

  const handleStartClick = () => {
    if (!roomId) return
    const sanitized = settings.category === 'einmaleins'
      ? settings
      : { ...settings, includeSquares11_20: false, includeSquares21_25: false }
    startGame(roomId, sanitized)
  }

  const formatProblemPrompt = (problem) => {
    if (!problem) return 'Aufgabe'
    if (problem.type === 'primfaktorisierung') {
      return `Primfaktoren von ${problem.number}`
    }
    if (typeof problem.a !== 'undefined' && typeof problem.b !== 'undefined') {
      const op = getOperator(problem)
      return `${problem.a} ${op} ${problem.b}`
    }
    return 'Aufgabe'
  }

  const formatCorrectAnswer = (problem) => {
    if (!problem) return '—'
    if (problem.type === 'primfaktorisierung') return problem.correct || '—'
    if (typeof problem.correct !== 'undefined' && problem.correct !== null) return problem.correct
    return '—'
  }

  const formatUserAnswer = (problem) => {
    if (!problem) return '—'
    if (problem.type === 'primfaktorisierung') return problem.user || '—'
    if (problem.user === '' || problem.user === null || typeof problem.user === 'undefined') return '—'
    return problem.user
  }

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
        {/* Top header */}
        <div className="admin-header">
          <div className="admin-header-left">
            <Logo />
            <div className="room-title">
              <h2 className="logo-text room-name-text">{roomState.adminName ? roomState.adminName : 'Admin-Ansicht'}</h2>
            </div>
          </div>
          <div className="admin-header-right" />
        </div>

        {/* Main two-column layout */}
        <div className="admin-layout">
          {/* Sidebar */}
          <aside className="admin-sidebar">
            {roomState.status === 'waiting' && (
            <div className="card join-card">
              <div className="card-header">
                <div className="big-room-id">
                  <tt className="room-id">{roomId?.toLowerCase()}</tt>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={copyRoomId}
                    title="Raum-Code kopieren"
                    aria-label="Raum-Code kopieren"
                  >
                    {/* copy icon (overlapping rectangles) */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <rect x="9" y="7" width="9" height="12" rx="1.5" stroke="#334155" strokeWidth="1.5" fill="none" />
                      <rect x="4" y="4" width="9" height="12" rx="1.5" stroke="#334155" strokeWidth="1.5" fill="none" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="join-url">
                  <a href={`/room/${roomId?.toLowerCase()}`} target="_blank" rel="noopener noreferrer">{joinUrl}</a>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={copyJoinUrl}
                    title="Beitritts-URL kopieren"
                    aria-label="Beitritts-URL kopieren"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <rect x="9" y="7" width="9" height="12" rx="1.5" stroke="#334155" strokeWidth="1.5" fill="none" />
                      <rect x="4" y="4" width="9" height="12" rx="1.5" stroke="#334155" strokeWidth="1.5" fill="none" />
                    </svg>
                  </button>
                </div>
                <div className="join-instructions">Teile diesen Code oder die URL mit deinen Spieler:innen.</div>
                <div className="join-primary-action">
                  <button className="big" onClick={handleStartClick}>🚀 Spiel starten</button>
                </div>
              </div>
            </div>
            )}

            {roomState.status === 'waiting' && (
            <div className="card settings-card">
              <div className="card-header">
                <h3>Aufgaben-Einstellungen</h3>
              </div>
              <div className="card-body">
                <div className="category-selection">
                  <h4>Kategorie wählen</h4>
                  <div className="category-buttons">
                    {[
                      { value: 'einmaleins', label: 'Einmaleins' },
                      { value: 'schriftlich', label: 'Schriftlich rechnen' },
                      { value: 'primfaktorisierung', label: 'Primfaktorisierung' }
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`category-btn ${settings.category === option.value ? 'active' : ''}`}
                        onClick={() => setSettings(prev => ({ ...prev, category: option.value }))}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="category-details">
                  {renderCategoryInfo(settings.category)}
                </div>

                {settings.category === 'einmaleins' && (
                  <div className="einmaleins-toggles">
                    <label className="checkbox-label">
                      <input type="checkbox" className="app-input" checked={true} disabled={true} />
                      <span>Einmaleins 1-10 (immer aktiv)</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        className="app-input"
                        checked={settings.includeSquares11_20}
                        onChange={(e) => setSettings({ ...settings, includeSquares11_20: e.target.checked })}
                      />
                      <span>Quadratzahlen 11-20 (z.B. 11², 15², 20²)</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        className="app-input"
                        checked={settings.includeSquares21_25}
                        onChange={(e) => setSettings({ ...settings, includeSquares21_25: e.target.checked })}
                      />
                      <span>Quadratzahlen 21-25 (z.B. 21², 23², 25²)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            )}

            {stats && (
              <div className="card stats-card">
                <div className="card-header"><h3>📊 Raum-Statistiken</h3></div>
                <div className="card-body">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-label">Abgeschlossen</div>
                      <div className="stat-value blue">{stats.totalPlayers}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Ø Lösungszeit</div>
                      <div className="stat-value green">{stats.avgTime}<span className="stat-suffix">s</span></div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Ø Fehleranzahl</div>
                      <div className="stat-value red">{stats.avgErrors}</div>
                    </div>
                  </div>
                  <div className="stats-actions" style={{ marginTop: '0.75rem' }}>
                    <button className="big" onClick={handleDownloadPDF}>📄 PDF herunterladen</button>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Players grid */}
          <section className="players-grid">
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
                        <span>{formatProblemPrompt(problem)} = {formatUserAnswer(problem)}</span>
                        <span style={{ fontWeight: 'bold' }}>
                          {problem.isCorrect ? '✓' : `✗ (${formatCorrectAnswer(problem)})`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {player.score && (
                  <div className="player-score">
                    <div className="score-title">✓ Fertig!</div>
                    <div className="score-detail">Zeit: <strong>{player.score.time}s</strong></div>
                    <div className="score-detail">Fehler: <strong>{player.score.wrongCount}</strong></div>
                    <div className="score-progress">
                      <ProgressBar finalTime={player.score.time} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
