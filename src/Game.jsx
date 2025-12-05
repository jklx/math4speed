import React, { useEffect, useState, useRef } from 'react'
import Logo from './Logo'
import { useParams, useLocation } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'
import ProgressBar from './ProgressBar'
// Refactored imports
import { generateProblems } from './problems/generators'
import { validateSchriftlich, validatePrimfaktorisierung } from './problems/validate'
import { getPerformanceComment, getPerformanceMarkerPosition } from './utils/performanceFeedback'
import { getCategoryLabel } from './utils/categories'
import Schriftlich from './Schriftlich'
import Einmaleins from './Einmaleins'
import Primfaktorisierung from './Primfaktorisierung'
import ReviewList from './ReviewList'

export default function Game({ isSinglePlayer }) {
  const { roomId } = useParams()
  const location = useLocation();
  // Only use multiplayer hooks when NOT in single player mode
  const multiplayerContext = isSinglePlayer ? null : useMultiplayer();
  const { roomState, updateProgress, finishGame, username } = multiplayerContext || {};
  
  // Category selection (only for training mode)
  const category = isSinglePlayer && location.state && location.state.category
    ? location.state.category
    : 'einmaleins'; // 'einmaleins' | 'schriftlich' | 'primfaktorisierung'
  const multiplayerSettings = roomState?.settings || {};
  const multiplayerCategory = multiplayerSettings.category || 'einmaleins';
  const activeCategory = isSinglePlayer ? category : multiplayerCategory;
  const activeCategoryLabel = getCategoryLabel(activeCategory);
  
  // Settings for problem generation (only for training mode)
  const [settings, setSettings] = useState({
    includeSquares11_20: false,
    includeSquares21_25: false
  });
  
  // Problems will be generated when game starts, not before
  const [problems, setProblems] = useState([])

  const [started, setStarted] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [inputValue, setInputValue] = useState('')
  // removed legacy single carryValue, we now exclusively use carryDigits for carries/borrows
  // schriftlich input state lifted from component via onChange
  const [schriftlichInput, setSchriftlichInput] = useState({ digits: [], parsed: '', valid: false })
  // Multi-step undo support without premounting: keep a stack of snapshots
  // Unified history snapshots keyed by problem index; used for both undo and forward-restore
  const [snapshots, setSnapshots] = useState({}) // Record<number, { index, problem, schriftlichInput, inputValue }>
  const [restoreSnapshot, setRestoreSnapshot] = useState(null)
  const [selectedSchriftlichId, setSelectedSchriftlichId] = useState(null)
  const [reviewShowCorrect, setReviewShowCorrect] = useState(false)
  const [finished, setFinished] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)

  const inputRef = useRef(null)
  const countdownTimerRef = useRef(null)

  const renderCategoryDescription = (cat) => {
    if (cat === 'einmaleins') {
      return (
        <>
          <p>Du bekommst 50 Einmaleinsaufgaben. Aufgaben mit ·1 und ·10 kommen seltener vor.</p>
          <p>Die Uhr läuft während du antwortest. Für jede falsche Antwort gibt es am Ende 10 Strafsekunden.</p>
        </>
      )
    }
    if (cat === 'schriftlich') {
      return (
        <>
          <p>Du bekommst 15 schriftliche Rechenaufgaben (5 Addition, 5 Subtraktion, 5 Multiplikation).</p>
          <p>Die Uhr läuft während du antwortest. Für jede falsche Antwort gibt es am Ende 10 Strafsekunden.</p>
        </>
      )
    }
    if (cat === 'primfaktorisierung') {
      return (
        <>
          <p>Du bekommst 20 Zahlen, die du in ihre Primfaktoren zerlegen musst.</p>
  <p>Gib die Primfaktoren durch Leerzeichen getrennt ein (z. B. „2 2 3“ für 12).</p>
          <p>Die Uhr läuft während du antwortest. Für jede falsche Antwort gibt es am Ende 10 Strafsekunden.</p>
        </>
      )
    }
    return null
  }

  useEffect(() => {
    if (started && !finished) {
      inputRef.current?.focus()
    }
  }, [started, current, finished])

  // Reset schriftlich input container state when moving to a new problem
  useEffect(() => {
    setSchriftlichInput({ digits: [], parsed: '', valid: false })
  }, [current, started])


  useEffect(() => {
    if (!isSinglePlayer && roomState?.status === 'playing' && !started && !countdown) {
      handleStart()
    }
  }, [roomState?.status, started, countdown, isSinglePlayer])

  const handleStart = () => {
    // Generate problems when game starts (not before)
    const gameSettings = isSinglePlayer ? settings : multiplayerSettings;
    const gameCategory = isSinglePlayer ? category : multiplayerCategory;
    // Determine count based on category: schriftlich=15, primfaktorisierung=20, einmaleins=50
    const problemCount = gameCategory === 'schriftlich' ? 15 : gameCategory === 'primfaktorisierung' ? 20 : 50;
    const newProblems = generateProblems(problemCount, gameCategory, gameSettings);
    setProblems(newProblems);
    
    setStarted(false)
    setCountdown(3)
    setCurrent(0)
    setAnswers([])
    setInputValue('')
    setFinished(false)
    setStartTime(null)
    setEndTime(null)
    setSnapshots({})
    // clear any existing countdown timer before starting a new one
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev == null || prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
          }
          setStarted(true)
          setStartTime(Date.now())
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Live seconds state for UI updates
  const [liveSecondsState, setLiveSecondsState] = useState(0)
  useEffect(() => {
    if (!started || finished) return
    setLiveSecondsState(Math.floor(((Date.now()) - (startTime || Date.now())) / 1000))
    const interval = setInterval(() => {
      setLiveSecondsState(Math.floor(((Date.now()) - (startTime || Date.now())) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [started, finished, startTime])

  const liveSeconds = () => {
    if (!started) return 0
    if (finished) return Math.floor(((endTime || Date.now()) - (startTime || Date.now())) / 1000)
    return liveSecondsState
  }

  const submitAnswer = (overrideValueOrEvent) => {
    const overrideValue = typeof overrideValueOrEvent === 'string' ? overrideValueOrEvent : undefined
    const prob = problems[current]
    let parsed = ''
    let isCorrect = false

    if (prob.type === 'primfaktorisierung') {
      const candidateValue = overrideValue ?? inputValue
      const { isCorrect: ok, parsed: p } = validatePrimfaktorisierung(candidateValue, prob.factors)
      parsed = p
      isCorrect = ok
    } else if (prob.type === 'schriftlich') {
      const { isCorrect: ok, parsed: p } = validateSchriftlich(schriftlichInput.digits, prob.correctDigits)
      parsed = p
      isCorrect = ok
    } else {
      const candidateValue = overrideValue ?? inputValue
      parsed = Number(candidateValue)
      isCorrect = parsed === prob.correct
    }

  const newEntry = { ...prob, user: parsed, isCorrect, schriftlichSnapshot: prob.type === 'schriftlich' ? schriftlichInput : undefined }
    const newAnswers = [...answers, newEntry]
    setAnswers(newAnswers)
    // Store/overwrite snapshot for this index so we can undo and forward-restore later
    if (isSinglePlayer) {
      setSnapshots(prev => ({ ...prev, [current]: { index: current, problem: prob, schriftlichInput, inputValue } }))
    } else {
      setSnapshots({})
    }
  setInputValue('')
  setSchriftlichInput({ digits: [], parsed: '', valid: false })
    if (current + 1 >= problems.length) {
      // finalize and report
      const now = Date.now()
      setEndTime(now)
      // compute final elapsed seconds (raw)
      const rawSeconds = startTime ? Math.floor((now - startTime) / 1000) : 0
      // compute wrongs and penalty
      const wrongs = newAnswers.filter(a => !a.isCorrect).length
      const penaltySeconds = wrongs * 10
      const finalTimeWithPenalty = rawSeconds + penaltySeconds
      // send solved problems to server and finish (include penalty in reported time)
      if (roomId && !isSinglePlayer) {
        finishGame(roomId, finalTimeWithPenalty, wrongs)
        // Send final progress with all solved problems
        updateProgress(roomId, 100, newAnswers)
      }
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
      // If moving forward after undos, auto-restore the next problem from existing snapshot history
      if (isSinglePlayer) {
        const nextIndex = current + 1
  const nextSnap = snapshots[nextIndex]
        if (nextSnap) {
          setInputValue(nextSnap.inputValue || '')
          if (nextSnap.schriftlichInput) setSchriftlichInput(nextSnap.schriftlichInput)
          // Defer setting restoreSnapshot until after current updates
          setTimeout(() => setRestoreSnapshot(nextSnap), 0)
        }
      }
      if (roomId && !isSinglePlayer) {
        const progress = ((current + 1) / problems.length) * 100
        // Send current progress with all solved problems so far
        updateProgress(roomId, progress, newAnswers)
      }
    }
  }

  const undoLast = () => {
    // Undo last submission if any
    if (!answers.length) return
    const targetIndex = answers.length - 1
    const snap = snapshots[targetIndex]
    // Remove the last answer and prepare to restore the snapshot into the next mount
    setAnswers(prev => prev.slice(0, -1))
    setRestoreSnapshot(snap)
    // Restore simple input immediately and also restore lifted schriftlich snapshot for immediate submit
    setInputValue(snap?.inputValue || '')
    if (snap?.schriftlichInput) setSchriftlichInput(snap.schriftlichInput)
    setCurrent(targetIndex)
    // Clear finished state if we were finished
    setFinished(false)
    setEndTime(null)
    // focus will be handled after render; keep a small timeout to ensure DOM ready
    setTimeout(() => {
      const el = document.querySelector("input[tabindex='1']")
      if (el) el.focus()
    }, 0)
  }


  const wrongCount = answers.filter(a => !a.isCorrect).length
  const elapsed = finished ? Math.floor((endTime - startTime) / 1000) : liveSeconds()
  const penalty = wrongCount * 10
  const finalTime = finished ? elapsed + penalty : null

  const schriftlichAnswers = answers.filter(a => a.type === 'schriftlich')
  const selectedSchriftlich = selectedSchriftlichId == null
    ? null
    : schriftlichAnswers.find(a => a.id === selectedSchriftlichId) || null

  // Remove legacy focus/reset for schriftlich; handled by array-based effect above
  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
  }, [])

  // After restoring snapshot into a mounted problem, clear the restoreSnapshot so
  // it doesn't apply repeatedly. We wait a tick so the child can read the prop on mount.
  useEffect(() => {
    if (!restoreSnapshot) return
    if (restoreSnapshot.index !== current) return
    const t = setTimeout(() => setRestoreSnapshot(null), 0)
    return () => clearTimeout(t)
  }, [restoreSnapshot, current])

  return (
    <div className="app">
      <Logo />


      {!started && (
        <main className="center">
          {countdown === null ? (
            <>
              {isSinglePlayer ? (
                <>
                  <h2>Trainingsmodus</h2>
                  {renderCategoryDescription(category)}
                  {category === 'einmaleins' && (
                    <div className="settings-box">
                      <h3>Aufgaben</h3>
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={true}
                          disabled={true}
                        />
                        <span>Einmaleins 1-10</span>
                      </label>
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={settings.includeSquares11_20}
                          onChange={(e) => setSettings({...settings, includeSquares11_20: e.target.checked})}
                        />
                        <span>Quadratzahlen 11-20 (z.B. 11², 15², 20²)</span>
                      </label>
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={settings.includeSquares21_25}
                          onChange={(e) => setSettings({...settings, includeSquares21_25: e.target.checked})}
                        />
                        <span>Quadratzahlen 21-25 (z.B. 21², 23², 25²)</span>
                      </label>
                    </div>
                  )}
                  
                  <button onClick={handleStart} className="big">Starten</button>
                </>
              ) : (
                // multiplayer player waiting state
                <>
                  <p>Warte auf den Start durch den Admin...</p>
                  <p>Raum: <strong>{roomId?.toLowerCase()}</strong></p>
                  {username && <p>Dein Name: <strong>{username}</strong></p>}
                  <p>Kategorie: <strong>{activeCategoryLabel}</strong></p>
                  {renderCategoryDescription(multiplayerCategory)}
                </>
              )}
            </>
          ) : (
            <div className="countdown">
              {countdown}
            </div>
          )}
        </main>
      )}

      {started && !finished && (
        <main>
          <div className="top-row">
            <div>Aufgabe {current + 1} / {problems.length}</div>
            <div>Zeit: {formatTime(liveSeconds())}</div>
          </div>

          <div className="question">
            {problems[current].type === 'primfaktorisierung' ? (
              <Primfaktorisierung
                key={problems[current].id}
                number={problems[current].number}
                value={inputValue}
                onChange={setInputValue}
                onEnter={submitAnswer}
              />
            ) : problems[current].type === 'schriftlich' ? (
              <Schriftlich
                key={problems[current].id}
                aDigits={problems[current].aDigits}
                bDigits={problems[current].bDigits}
                summandsDigits={problems[current].summandsDigits}
                correctDigits={problems[current].correctDigits}
                partialProducts={problems[current].partialProducts}
                operation={problems[current].operation}
                onChange={setSchriftlichInput}
                onEnter={submitAnswer}
                initialState={restoreSnapshot && restoreSnapshot.index === current ? restoreSnapshot.schriftlichInput : undefined}
              />
            ) : problems[current].type === 'multiplication' ? (
              <Einmaleins
                key={problems[current].id}
                a={problems[current].a}
                b={problems[current].b}
                value={inputValue}
                onChange={setInputValue}
                onEnter={submitAnswer}
              />
            ) : null}
          </div>

          <div className="controls">
            {answers.length > 0 && isSinglePlayer ? (
              <button onClick={undoLast} className="big secondary">Zurück</button>
            ) : null}
            <button onClick={submitAnswer} className="big">Nächste</button>
          </div>
        </main>
      )}

      {finished && (
        <main>
          <h2>Ergebnis</h2>
          <div className="summary">
            <div>Rohzeit: {formatTime(elapsed)}</div>
            <div>Falsche Antworten: {wrongCount} (Strafe: {formatTime(penalty)})</div>
            <div className="final">Endzeit (mit Strafe): {formatTime(finalTime)}</div>

            <div className="performance">
              <ProgressBar finalTime={finalTime} category={activeCategory} getMarkerPosition={getPerformanceMarkerPosition} />
              <div className="performance-labels">
                <span>Hervorragend</span>
                <span>Gut</span>
                <span>Üben</span>
              </div>
              <div className="performance-comment">
                {getPerformanceComment(finalTime, activeCategory)}
              </div>
            </div>
          </div>

          <h3>Aufgabenübersicht</h3>
          <div className="review-container">
            <div className="review-column">
              <h4>Richtig gelöst ({answers.filter(a => a.isCorrect).length})</h4>
              <ReviewList
                answers={answers}
                isCorrect={true}
                onSelectSchriftlich={id => setSelectedSchriftlichId(id)}
              />
            </div>
            <div className="review-column">
              <h4>Falsch gelöst ({answers.filter(a => !a.isCorrect).length})</h4>
              <ReviewList
                answers={answers}
                isCorrect={false}
                onSelectSchriftlich={id => setSelectedSchriftlichId(id)}
              />
            </div>
          </div>

          {selectedSchriftlich && (
            <div className="schriftlich-review-detail">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0 }}>Detailansicht</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="toggle-group">
                    <button
                      type="button"
                      className={`toggle-btn${!reviewShowCorrect ? ' active' : ''}`}
                      onClick={() => setReviewShowCorrect(false)}
                    >
                      Meine Eingabe
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn${reviewShowCorrect ? ' active' : ''}`}
                      onClick={() => setReviewShowCorrect(true)}
                    >
                      Lösung
                    </button>
                  </div>
                  <button
                    type="button"
                    className="big secondary"
                    onClick={() => setSelectedSchriftlichId(null)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Schließen
                  </button>
                </div>
              </div>
              <Schriftlich
                key={`review-${selectedSchriftlich.id}`}
                aDigits={selectedSchriftlich.aDigits}
                bDigits={selectedSchriftlich.bDigits}
                summandsDigits={selectedSchriftlich.summandsDigits}
                correctDigits={selectedSchriftlich.correctDigits}
                partialProducts={selectedSchriftlich.partialProducts}
                operation={selectedSchriftlich.operation}
                initialState={selectedSchriftlich.schriftlichSnapshot}
                review
                showCorrect={reviewShowCorrect}
              />
            </div>
          )}

          {isSinglePlayer && (
            <div className="actions">
              <button onClick={handleStart} className="big">Nochmal versuchen</button>
            </div>
          )}
        </main>
      )}

    </div>
  )
}
