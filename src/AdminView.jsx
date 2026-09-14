import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'
import Logo from './Logo'
import { getOperator } from './utils/getOperator'
import { getCategoryPerformanceScore, getCategoryProblemCount, getDefaultSettings } from './utils/categories'
import { formatDecimal } from './utils/formatNumber'
import AnswerDetailDialog from './AnswerDetailDialog'

export default function AdminView() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const testToken = searchParams.get('token')
  const teacherRoomUrl = `/pruefungsraum/${roomId}?token=${encodeURIComponent(testToken || '')}`
  const { error: connectionError, roomState, isConnected, openPersistentRoom } = useMultiplayer()
  const playerRowRefs = useRef(new Map())
  const previousPlayerPositions = useRef(new Map())
  const previousPlayerOrder = useRef([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [testData, setTestData] = useState(null)
  const [testError, setTestError] = useState(null)
  const [startCode, setStartCode] = useState(null)
  
  // Local settings state (only for admin)
  const [settings, setSettings] = useState(() => ({
    category: 'einmaleins',
    ...getDefaultSettings('einmaleins')
  }));

  // Request room state when component mounts or roomId changes
  useEffect(() => {
    if (!roomId || !isConnected) {
      console.log('[AdminView] Waiting for socket connection...', { roomId, isConnected });
      return;
    }
    
    console.log('[AdminView] Socket connected! roomId:', roomId, 'hasRoomState:', !!roomState);
    
    openPersistentRoom(roomId)
  }, [roomId, isConnected]); // Wait for actual connection

  useEffect(() => {
    if (!roomId) return
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
  }, [roomId])

  useEffect(() => {
    if (roomState?.settings) {
      setSettings(prev => ({ ...prev, ...roomState.settings }))
    }
  }, [roomState?.settings])

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
        <Link to={teacherRoomUrl}>← Zum Testraum</Link>

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
              const statusLabel = ({ pending: 'wartet auf Anmeldung', ready: 'angemeldet', absent: 'abwesend', started: 'bearbeitet', finished: 'abgeschlossen' })[player.status] || 'bereit'

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

                {roomState.databaseStatus === 'waiting' && ['pending', 'absent'].includes(player.status) && (
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
