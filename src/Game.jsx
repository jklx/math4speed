import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'
import ProgressBar from './ProgressBar'
// Refactored imports
import { generateProblems } from './problems/generators'
import { validateSchriftlich, validatePrimfaktorisierung } from './problems/validate'
import Schriftlich from './Schriftlich'
import Einmaleins from './Einmaleins'
import Primfaktorisierung from './Primfaktorisierung'

export default function Game({ isSinglePlayer }) {
  const { roomId } = useParams()
  const location = useLocation();
  // Only use multiplayer hooks when NOT in single player mode
  const multiplayerContext = isSinglePlayer ? null : useMultiplayer();
  const { roomState, updateProgress, finishGame, username } = multiplayerContext || {};
  
  // Category selection (only for training mode)
  const [category, setCategory] = useState(() => {
    if (isSinglePlayer && location.state && location.state.category) {
      return location.state.category;
    }
    return 'einmaleins';
  }); // 'einmaleins' | 'schriftlich' | 'primfaktorisierung'
  
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
  const [finished, setFinished] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)

  const inputRef = useRef(null)
  const countdownTimerRef = useRef(null)

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
    const gameSettings = isSinglePlayer ? settings : (roomState?.settings || {});
    const gameCategory = isSinglePlayer ? category : 'einmaleins'; // multiplayer only supports einmaleins for now
    // Determine count based on category: schriftlich=10, primfaktorisierung=20, einmaleins=50
    const problemCount = gameCategory === 'schriftlich' ? 10 : gameCategory === 'primfaktorisierung' ? 20 : 50;
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

  const liveSeconds = () => {
    if (!started) return 0
    const now = finished ? endTime : Date.now()
    return Math.floor(((now || Date.now()) - (startTime || Date.now())) / 1000)
  }

  const submitAnswer = () => {
    const prob = problems[current]
    let parsed = ''
    let isCorrect = false

    if (prob.type === 'primfaktorisierung') {
      const { isCorrect: ok, parsed: p } = validatePrimfaktorisierung(inputValue, prob.factors)
      parsed = p
      isCorrect = ok
    } else if (prob.type === 'schriftlich') {
      const { isCorrect: ok, parsed: p, valid } = validateSchriftlich(schriftlichInput.digits, prob.correctDigits)
      if (!valid) {
        const el = document.getElementById('res-0')
        if (el) {
          el.focus()
          el.style.background = '#ffebee'
          setTimeout(() => (el.style.background = ''), 300)
        }
        return
      }
      parsed = p
      isCorrect = ok
    } else {
      parsed = Number(inputValue)
      isCorrect = parsed === prob.correct
    }

    const newEntry = { ...prob, user: parsed, isCorrect }
    const newAnswers = [...answers, newEntry]
    setAnswers(newAnswers)
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
      if (roomId && !isSinglePlayer) {
        const progress = ((current + 1) / problems.length) * 100
        // Send current progress with all solved problems so far
        updateProgress(roomId, progress, newAnswers)
      }
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      submitAnswer()
    }
  }

  const wrongCount = answers.filter(a => !a.isCorrect).length
  const elapsed = finished ? Math.floor((endTime - startTime) / 1000) : liveSeconds()
  const penalty = wrongCount * 10
  const finalTime = finished ? elapsed + penalty : null

  const getPerformanceComment = (totalSeconds) => {
    if (totalSeconds <= 90) return "Hervorragend! Du bist ein Einmaleins-Profi! 🏆"
    if (totalSeconds <= 120) return "Sehr gut! Fast perfekte Zeit! 🌟"
    if (totalSeconds <= 150) return "Gut gemacht! Du bist auf dem richtigen Weg! 👍"
    if (totalSeconds <= 180) return "Nicht schlecht! Mit etwas Übung wird es noch besser! 💪"
    return "Weiter üben! Du schaffst das! 🎯"
  }

  const getPerformanceMarkerPosition = (totalSeconds) => {
    const position = Math.min(100, Math.max(0, 
      ((totalSeconds - 90) / (210 - 90)) * 100
    ))
    return `${position}%`
  }

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

  return (
    <div className="app">


      {!started && (
        <main className="center">
          {countdown === null ? (
            <>
              {isSinglePlayer ? (
                <>
                  <h2>Trainingsmodus</h2>
                  
                  {category === 'einmaleins' && (
                    <>
                      <p>Du bekommst 50 Einmaleinsaufgaben. Aufgaben mit ·1 und ·10 kommen seltener vor.</p>
                      <p>Die Uhr läuft während du antwortest. Für jede falsche Antwort gibt es am Ende 10 Strafsekunden.</p>
                      
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
                    </>
                  )}

                  {category === 'schriftlich' && (
                    <>
                      <p>Du bekommst 10 schriftliche Rechenaufgaben (5 Addition, 5 Subtraktion).</p>
                      <p>Die Uhr läuft während du antwortest. Für jede falsche Antwort gibt es am Ende 10 Strafsekunden.</p>
                    </>
                  )}

                  {category === 'primfaktorisierung' && (
                    <>
                      <p>Du bekommst 20 Zahlen, die du in ihre Primfaktoren zerlegen musst.</p>
                      <p>Gib die Primfaktoren durch Leerzeichen getrennt ein (z.B. "2 2 3" für 12).</p>
                      <p>Die Uhr läuft während du antwortest. Für jede falsche Antwort gibt es am Ende 10 Strafsekunden.</p>
                    </>
                  )}
                  
                  <button onClick={handleStart} className="big">Starten</button>
                </>
              ) : (
                // multiplayer player waiting state
                <>
                  <p>Warte auf den Start durch den Admin...</p>
                  <p>Raum: <strong>{roomId?.toLowerCase()}</strong></p>
                  {username && <p>Dein Name: <strong>{username}</strong></p>}
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
                correctDigits={problems[current].correctDigits}
                operation={problems[current].operation}
                onChange={setSchriftlichInput}
                onEnter={submitAnswer}
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
              <ProgressBar finalTime={finalTime} />
              <div className="performance-labels">
                <span>Hervorragend</span>
                <span>Gut</span>
                <span>Üben</span>
              </div>
              <div className="performance-comment">
                {getPerformanceComment(finalTime)}
              </div>
            </div>
          </div>

          <h3>Aufgabenübersicht</h3>
          <div className="review-container">
            <div className="review-column">
              <h4>Richtig gelöst ({answers.filter(a => a.isCorrect).length})</h4>
              <ul className="review-list ok">
                {answers.filter(a => a.isCorrect).map((q) => {
                  if (q.type === 'primfaktorisierung') {
                    return (
                      <li key={q.id}>
                        Primfaktoren von {q.number} = {q.correct} (Deine Antwort: {q.user})
                      </li>
                    );
                  }
                  let op = '·';
                  if (q.type === 'add' || q.operation === 'add') op = '+';
                  else if (q.type === 'subtract' || q.operation === 'subtract') op = '−';
                  else if (q.type === 'divide') op = '÷';
                  else if (q.type === 'multiplication') op = '·';
                  return (
                    <li key={q.id}>
                      {q.a} {op} {q.b} = {q.correct} (Deine Antwort: {q.user})
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="review-column">
              <h4>Falsch gelöst ({answers.filter(a => !a.isCorrect).length})</h4>
              <ul className="review-list bad">
                {answers.filter(a => !a.isCorrect).map((q) => {
                  if (q.type === 'primfaktorisierung') {
                    return (
                      <li key={q.id}>
                        Primfaktoren von {q.number} = {q.correct} (Deine Antwort: {q.user || '—'})
                      </li>
                    );
                  }
                  let op = '·';
                  if (q.type === 'add' || q.operation === 'add') op = '+';
                  else if (q.type === 'subtract' || q.operation === 'subtract') op = '−';
                  else if (q.type === 'divide') op = '÷';
                  else if (q.type === 'multiplication') op = '·';
                  return (
                    <li key={q.id}>
                      {q.a} {op} {q.b} = {q.correct} (Deine Antwort: {isNaN(q.user) ? '—' : q.user})
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {isSinglePlayer && (
            <div className="actions">
              <button onClick={handleStart} className="big">Nochmal versuchen</button>
            </div>
          )}
        </main>
      )}

      <footer>
        <small>Viel Erfolg! Die App läuft lokal im Browser.</small>
      </footer>
    </div>
  )
}
