import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'
import Logo from './Logo'
import { getOperator } from './utils/getOperator'
import { CATEGORIES, getCategoryPerformanceScore, getCategoryProblemCount, getDefaultSettings } from './utils/categories'
import { formatDecimal } from './utils/formatNumber'
import { CategoryConfigurator } from './CategoryConfigurator'
import TemporaryRoomDashboard from './TemporaryRoomDashboard'
import AnswerDetailDialog from './AnswerDetailDialog'

function PersistentAdminView() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const persistent = searchParams.get('persistent') === '1'
  const testToken = searchParams.get('token')
  const teacherRoomUrl = persistent ? `/pruefungsraum/${roomId}?token=${encodeURIComponent(testToken || '')}` : `/admin/${roomId}`
  const { error: connectionError, roomState, startGame, attemptAdminRejoin, getRoomState, isConnected, updateSettings, openPersistentRoom } = useMultiplayer()
  const playerRowRefs = useRef(new Map())
  const previousPlayerPositions = useRef(new Map())
  const previousPlayerOrder = useRef([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [toast, setToast] = useState(null)
  const [testData, setTestData] = useState(null)
  const [testError, setTestError] = useState(null)
  const [startCode, setStartCode] = useState(null)
  
  // Local settings state (only for admin)
  const [settings, setSettings] = useState(() => ({
    category: 'einmaleins',
    ...getDefaultSettings('einmaleins')
  }));

  // Helper to update settings locally AND on server
  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    updateSettings(roomId, newSettings);
  };

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
    
    if (persistent) {
      openPersistentRoom(roomId)
      return
    }
    attemptAdminRejoin(roomId);
    getRoomState(roomId);
  }, [roomId, isConnected, persistent]); // Wait for actual connection

  useEffect(() => {
    if (!persistent || !roomId) return
    const load = async () => {
      try {
        const response = await fetch(`/api/exam-rooms/${roomId}`, { credentials: 'same-origin' })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Testraum konnte nicht geladen werden.')
        setTestData(body)
      } catch (error) { setTestError(error.message) }
    }
    load()
    const timer = window.setInterval(load, 5000)
    return () => window.clearInterval(timer)
  }, [persistent, roomId])

  useEffect(() => {
    if (roomState?.settings) {
      setSettings(prev => ({ ...prev, ...roomState.settings }))
    }
  }, [roomState?.settings])

  const renderCategoryInfo = (cat) => {
    const mins = CATEGORIES[cat]?.durationMinutes ?? 5
    if (cat === 'einmaleins') {
      return (
        <>
          <p>Die Schüler:innen haben {mins} Minuten Zeit, so viele Einmaleins-Aufgaben wie möglich zu lösen.</p>
          <p>Optional können zusätzliche Quadratzahlen zugeschaltet werden.</p>
        </>
      )
    }
    if (cat === 'schriftlich' || cat === 'schriftlich-add' || cat === 'schriftlich-subtract' || cat === 'schriftlich-multiply' || cat === 'schriftlich-divide') {
      const opLabel = cat === 'schriftlich-add' ? 'Additions' : cat === 'schriftlich-subtract' ? 'Subtraktions' : cat === 'schriftlich-multiply' ? 'Multiplikations' : cat === 'schriftlich-divide' ? 'Divisions' : ''
      return (
        <>
          <p>Die Schüler:innen haben {mins} Minuten Zeit, so viele schriftliche {opLabel}aufgaben wie möglich zu lösen.</p>
          <p>Schüler:innen geben Zwischenergebnisse direkt in den Stellenwerttabellen ein.</p>
        </>
      )
    }
    if (cat === 'primfaktorisierung') {
      return (
        <>
          <p>Die Schüler:innen haben {mins} Minuten Zeit, so viele Zahlen wie möglich in Primfaktoren zu zerlegen. Erst 10 Einmaleins-Zahlen, dann 5 Zahlen bis 100, danach bis 200. Antworten bitte mit Leerzeichen trennen (z.&nbsp;B. „2 2 3").</p>
        </>
      )
    }
    if (cat === 'negative') {
      return (
        <>
          <p>Die Schüler:innen haben {mins} Minuten Zeit, so viele Aufgaben mit negativen Zahlen (+, −, ·, ∶) wie möglich zu lösen.</p>
        </>
      )
    }
    if (cat === 'binomische') {
      return (
        <>
          <p>Die Schüler:innen haben {mins} Minuten Zeit, so viele binomische Formeln wie möglich auszumultiplizieren.</p>
        </>
      )
    }
    return null
  }

  const handleStartClick = () => {
    if (!roomId) return
    startGame(roomId, settings)
  }

  const formatProblemPrompt = (problem) => {
    if (!problem) return 'Aufgabe'
    if (problem.expression) return problem.expression
    if (problem.text) return problem.text
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

  const setAbsent = async (studentId, absent) => {
    try {
      const response = await fetch(`/api/exam-rooms/${roomId}/students/${studentId}/attendance`, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ absent }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Status konnte nicht geändert werden.')
    } catch (error) { setTestError(error.message) }
  }

  const releaseCode = async () => {
    try {
      const response = await fetch(`/api/exam-rooms/${roomId}/release-code`, { method: 'POST', credentials: 'same-origin' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Startcode konnte nicht erstellt werden.')
      setStartCode(body.code)
    } catch (error) { setTestError(error.message) }
  }

  const players = roomState?.players?.filter(p => p.id !== roomState.admin) || []
  const selectedPlayer = players.find(player => player.id === selectedAnswer?.playerId)
  const selectedProblem = selectedPlayer?.solved?.[selectedAnswer?.position]
  const expectedProblemCount = getCategoryProblemCount(roomState?.settings?.category || settings.category)
  const sortedPlayers = [...players].sort((a, b) => {
    const correctA = (a.solved || []).filter(problem => problem.isCorrect).length
    const correctB = (b.solved || []).filter(problem => problem.isCorrect).length
    return correctB - correctA || a.username.localeCompare(b.username, 'de')
  })

  useLayoutEffect(() => {
    if (!roomState) {
      previousPlayerPositions.current.clear()
      previousPlayerOrder.current = []
      return
    }

    const currentPositions = new Map()
    const currentOrder = sortedPlayers.map(player => player.id)
    const orderChanged = currentOrder.some((playerId, index) => previousPlayerOrder.current[index] !== playerId)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (orderChanged) {
      playerRowRefs.current.forEach(element => {
        element.getAnimations().forEach(animation => animation.cancel())
      })
    }

    playerRowRefs.current.forEach((element, playerId) => {
      const currentTop = element.getBoundingClientRect().top
      const previousTop = previousPlayerPositions.current.get(playerId)
      currentPositions.set(playerId, currentTop)

      const previousIndex = previousPlayerOrder.current.indexOf(playerId)
      const currentIndex = currentOrder.indexOf(playerId)

      if (!reduceMotion && previousTop !== undefined && previousIndex !== currentIndex) {
        element.animate(
          [
            { transform: `translateY(${previousTop - currentTop}px)` },
            { transform: 'translateY(0)' }
          ],
          { duration: 280, easing: 'ease-out' }
        )
      }
    })

    previousPlayerPositions.current = currentPositions
    previousPlayerOrder.current = currentOrder
  }, [roomState, sortedPlayers])

  if (!roomState) {
    return (
      <div className="admin-view">
        <div className="admin-inner">
          <div className="admin-content">
            <Logo />
            <header>
              <h2>Admin-Ansicht — Raum: <tt className="room-id">{roomId?.toLowerCase()}</tt></h2>
            </header>
            <div className="loading">{testError || connectionError ? <p className="error" role="alert">{testError || connectionError}</p> : isConnected ? 'Lade Raumdaten…' : 'Verbindung zur Live-Ansicht wird hergestellt…'}</div><Link to={teacherRoomUrl}>Zurück zum Testraum</Link>
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

  // Filter out admin from players list for stats and display
  const totalPlayerCount = players.length
  const finishedPlayerList = players.filter(p => p.score !== null)
  const connectedPlayerCount = players.filter(p => p.connected !== false).length
  const disconnectedPlayerCount = players.filter(p => p.connected === false).length
  const finishedPlayerCount = finishedPlayerList.length

  // Calculate statistics for finished players
  const stats = finishedPlayerList.length > 0 ? {
    avgScore: formatDecimal(finishedPlayerList.reduce((sum, p) => sum + p.score.time, 0) / finishedPlayerList.length, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
    avgErrors: formatDecimal(finishedPlayerList.reduce((sum, p) => sum + p.score.wrongCount, 0) / finishedPlayerList.length, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
    totalPlayers: finishedPlayerList.length
  } : null

  // Leaderboard: sorted by correct count (descending - higher is better)
  const leaderboard = [...finishedPlayerList].sort((a, b) => b.score.time - a.score.time)
  const category = roomState.settings?.category || settings.category
  const [, expectedHighScore] = getCategoryPerformanceScore(category)
  const participantScores = players.map(player => ({
    id: player.id,
    username: player.username,
    score: (player.solved || []).filter(problem => problem.isCorrect).length
  }))
  const scoreAxisMax = Math.max(expectedHighScore, 1, ...participantScores.map(player => player.score))
  const dotsAtScore = new Map()
  const scoreDots = participantScores.map(player => {
    const level = dotsAtScore.get(player.score) || 0
    dotsAtScore.set(player.score, level + 1)
    return { ...player, level }
  })

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
        <Link to={teacherRoomUrl}>← {persistent ? 'Zum Testraum' : 'Zur Raumanmeldung'}</Link>

        {selectedProblem && <AnswerDetailDialog answer={selectedProblem} studentName={selectedPlayer.username} position={selectedAnswer.position} total={selectedPlayer.solved.length} onClose={() => setSelectedAnswer(null)} onPrevious={() => setSelectedAnswer(value => ({ ...value, position: value.position - 1 }))} onNext={() => setSelectedAnswer(value => ({ ...value, position: value.position + 1 }))} />}
        {/* Main two-column layout */}
        <div className="admin-layout">
          {/* Sidebar */}
          <aside className="admin-sidebar">
            
            {/* Player Count Card - Always Visible */}
            <div className="card player-count-card">
              <div className="card-header"><h3>👥 Spieler</h3></div>
              <div className="card-body">
                <div className="stat-row">
                  <span>Im Raum:</span>
                  <strong>{totalPlayerCount}</strong>
                </div>
                {roomState.status !== 'waiting' && (
                  <>
                    <div className="stat-row">
                      <span>Verbunden:</span>
                      <strong>{connectedPlayerCount}</strong>
                    </div>
                    {disconnectedPlayerCount > 0 && (
                      <div className="stat-row">
                        <span>Getrennt:</span>
                        <strong>{disconnectedPlayerCount}</strong>
                      </div>
                    )}
                    <div className="stat-row">
                      <span>Abgegeben:</span>
                      <strong>{finishedPlayerCount}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {persistent && (
            <div className="card join-card">
              <div className="card-header"><h3>Testaufsicht</h3></div>
              <div className="card-body">
                <div className="join-instructions">{roomState.databaseStatus === 'finished' ? 'Der Test ist abgeschlossen. Die gespeicherten Ergebnisse bleiben hier einsehbar.' : 'Die Klassenliste und der Arbeitsfortschritt werden live aktualisiert.'}</div>
                {startCode && <div className="exam-code"><span>Startcode – 60 Sekunden gültig</span><strong>{startCode}</strong></div>}
                {testError && <p className="error">{testError}</p>}
                {roomState.databaseStatus === 'waiting' && <button className="big" disabled={(testData?.students || []).some(student => student.status === 'pending')} onClick={releaseCode}> {(testData?.students || []).some(student => student.status === 'pending') ? 'Anmeldung noch nicht vollständig' : 'Startcode anzeigen'}</button>}
                {roomState.databaseStatus === 'code_released' && <p className="management-stat">Der Startcode wird im Raum angezeigt.</p>}
                {roomState.databaseStatus === 'running' && <p className="management-stat">Der Test läuft.</p>}
              </div>
            </div>
            )}

            {!persistent && roomState.status === 'waiting' && (
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
                      <div className="stat-label">Ø Richtig</div>
                      <div className="stat-value green">{stats.avgScore}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Ø Fehleranzahl</div>
                      <div className="stat-value red">{stats.avgErrors}</div>
                    </div>
                  </div>
                  <div className="score-beam-card" aria-label="Verteilung der richtigen Antworten">
                    <div className="score-beam-heading">
                      <strong>Ergebnisse der Teilnehmer:innen</strong>
                      <span>0–{scoreAxisMax} richtig</span>
                    </div>
                    <div className="score-beam">
                      <div className="score-beam-line" />
                      {scoreDots.map(player => (
                        <span
                          key={player.id}
                          className="score-beam-dot"
                          role="img"
                          aria-label={`${player.username}: ${player.score} richtig`}
                          title={`${player.username}: ${player.score} richtig`}
                          style={{
                            '--score-position': `${(player.score / scoreAxisMax) * 100}%`,
                            '--stack-level': player.level
                          }}
                        />
                      ))}
                      <span className="score-beam-label score-beam-label--start">0</span>
                      <span className="score-beam-label score-beam-label--end">{scoreAxisMax}</span>
                    </div>
                  </div>
                  <div className="stats-actions" style={{ marginTop: '0.75rem' }}>
                    <button className="big" onClick={handleDownloadPDF}>📄 PDF herunterladen</button>
                  </div>
                </div>
              </div>
            )}

            {leaderboard.length > 0 && (
              <div className="card leaderboard-card">
                <div className="card-header"><h3>🏆 Bestenliste</h3></div>
                <div className="card-body p-0">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Richtig</th>
                        <th>Fehler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((p, i) => (
                        <tr key={p.id}>
                          <td>{i + 1}.</td>
                          <td className="truncate" title={p.username}>{p.username}</td>
                          <td>{p.score.time}</td>
                          <td>{p.score.wrongCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </aside>

          {/* Registered players */}
          <section className="players-grid" aria-label="Nutzerliste">
            {players.length === 0 && (
              <p className="players-empty">Noch hat sich niemand registriert.</p>
            )}
            {sortedPlayers.map(player => {
              const solved = player.solved || []
              const correctCount = player.score?.time ?? solved.filter(problem => problem.isCorrect).length
              const wrongCount = player.score?.wrongCount ?? solved.filter(problem => problem.isCorrect === false).length
              const hasCurrentProblem = roomState.status === 'playing' && !player.score && player.connected !== false
              const statusLabel = persistent
                ? ({ pending: 'wartet auf Anmeldung', ready: 'angemeldet', absent: 'abwesend', started: 'bearbeitet', finished: 'abgeschlossen' })[player.status] || 'bereit'
                : player.score
                ? 'Abgegeben'
                : player.connected === false
                  ? 'Verbindung weg'
                  : 'Aktiv'

              return (
              <div
                key={player.id}
                className="player-card"
                ref={element => {
                  if (element) playerRowRefs.current.set(player.id, element)
                  else playerRowRefs.current.delete(player.id)
                }}
              >
                <div className="player-card-header">
                  <h3>
                    {player.username}
                    {player.id === roomState.admin && (
                      <span className="admin-badge">(Admin)</span>
                    )}
                  </h3>
                  <span className={`player-status ${player.score ? 'complete' : player.connected === false ? 'offline' : 'active'}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="player-progress-summary">
                  <span>{solved.length} / {expectedProblemCount} bearbeitet</span>
                  <span className="correct-count">{correctCount} richtig</span>
                  <span className="wrong-count">{wrongCount} falsch</span>
                </div>

                {persistent && roomState.databaseStatus === 'waiting' && ['pending', 'absent'].includes(player.status) && (
                  <label className="attendance-toggle"><input type="checkbox" checked={player.status === 'absent'} onChange={event => setAbsent(player.id, event.target.checked)} /> Abwesend</label>
                )}

                <div className="player-progress-scroll" aria-label={`${solved.length} bearbeitete Aufgaben von erwarteten ${expectedProblemCount}: ${correctCount} richtig, ${wrongCount} falsch`}>
                  <div className="player-progress">
                    {solved.map((problem, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAnswer({ playerId: player.id, position: idx })}
                        aria-haspopup="dialog"
                        className={`progress-segment ${problem.assisted ? 'assisted' : problem.isCorrect ? 'correct' : 'incorrect'}`}
                        aria-label={`Aufgabe ${idx + 1}: ${problem.assisted ? 'mit Hilfe gelöst' : problem.isCorrect ? 'richtig' : 'falsch'}. ${formatProblemPrompt(problem)}. Lösung: ${formatCorrectAnswer(problem)}.`}
                        title={`Aufgabe ${idx + 1}: ${formatProblemPrompt(problem)}. Lösung: ${formatCorrectAnswer(problem)}`}
                      >
                        <span className="progress-tooltip" role="tooltip">
                          <strong>Aufgabe {idx + 1}</strong>
                          <span>{formatProblemPrompt(problem)}</span>
                          <span>Eigene Antwort: {formatUserAnswer(problem)}</span>
                          <span>Lösung: {formatCorrectAnswer(problem)}</span>
                          {problem.assisted && <span>Mit Hilfe gelöst</span>}
                        </span>
                      </button>
                    ))}
                    {hasCurrentProblem && (
                      <span className="progress-segment progress-segment--current" aria-label="Aktuell bearbeitete Aufgabe" />
                    )}
                  </div>
                </div>

                <div className="player-live-stats" aria-label={`Zwischenstand von ${player.username}`}>
                  <div>
                    <span>Gelöst</span>
                    <strong>{solved.length}</strong>
                  </div>
                  <div>
                    <span>Richtig</span>
                    <strong>{correctCount}</strong>
                  </div>
                  <div>
                    <span>Fehler</span>
                    <strong>{wrongCount}</strong>
                  </div>
                </div>

                {solved.length > 0 && (
                  <div className="player-problems">
                    {solved.map((problem, idx) => (
                      <button type="button" onClick={() => setSelectedAnswer({ playerId: player.id, position: idx })} aria-haspopup="dialog" key={idx} className={`problem-entry ${problem.isCorrect ? 'correct' : 'incorrect'}`}>
                        <span>{formatProblemPrompt(problem)} = {formatUserAnswer(problem)}</span>
                        <span style={{ fontWeight: 'bold' }}>
                          {problem.isCorrect ? '✓' : `✗ (${formatCorrectAnswer(problem)})`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {player.score && (
                  <div className="player-score">
                    <div className="score-title">✓ Abgegeben</div>
                    <div className="score-detail">Richtig: <strong>{player.score.time}</strong></div>
                    <div className="score-detail">Fehler: <strong>{player.score.wrongCount}</strong></div>
                  </div>
                )}
              </div>
              )
            })}
          </section>
        </div>
      </div>
    </div>
  )
}

export default function AdminView() {
  const [searchParams] = useSearchParams()
  return searchParams.get('persistent') === '1' || searchParams.get('observe') === '1' ? <PersistentAdminView /> : <TemporaryRoomDashboard />
}
