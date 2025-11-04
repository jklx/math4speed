import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useMultiplayer } from './MultiplayerContext'
import ProgressBar from './ProgressBar'

export default function Game({ isSinglePlayer }) {
  const { roomState, roomId, updateProgress, finishGame, username } = useMultiplayer();
  const problems = useMemo(() => generateProblems(50), [])

  const [started, setStarted] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [finished, setFinished] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)

  const inputRef = useRef(null)

  useEffect(() => {
    if (started && !finished) {
      inputRef.current?.focus()
    }
  }, [started, current, finished])


  useEffect(() => {
    if (roomState?.status === 'playing' && !started && !countdown) {
      handleStart()
    }
  }, [roomState?.status, started, countdown])

  const handleStart = () => {
    setStarted(false)
    setCountdown(3)
    setCurrent(0)
    setAnswers([])
    setInputValue('')
    setFinished(false)
    setStartTime(null)
    setEndTime(null)
    let timerId = null
    timerId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerId)
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
    if (finished) return
    const prob = problems[current]
    const parsed = parseInt(inputValue, 10)
    const isCorrect = !isNaN(parsed) && parsed === prob.correct
    const newEntry = { ...prob, user: parsed, isCorrect }
    const newAnswers = [...answers, newEntry]
    setAnswers(newAnswers)
    setInputValue('')
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
      if (roomId) {
        finishGame(finalTimeWithPenalty, wrongs)
        // Send final progress with all solved problems
        updateProgress(100, newAnswers)
      }
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
      if (roomId) {
        const progress = ((current + 1) / problems.length) * 100
        // Send current progress with all solved problems so far
        updateProgress(progress, newAnswers)
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

  return (
    <div className="app">
      <header>
        <h1>Math4Speed — {problems.length} Einmaleinsaufgaben</h1>
        {roomId && <div className="room-info">Raum: {roomId.toLowerCase()}</div>}
        {username && <div className="player-name">Spieler: {username}</div>}
      </header>

      {!started && (
        <main className="center">
          {countdown === null ? (
            <>
              {isSinglePlayer ? (
                <>
                  <p>Du bekommst {problems.length} Einmaleinsaufgaben. Aufgaben mit ·1 und ·10 kommen seltener vor.</p>
                  <p>Die Uhr läuft während du antwortest. Für jede falsche Antwort gibt es am Ende 10 Strafsekunden.</p>
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
            <div className="expression">{problems[current].a} · {problems[current].b} =</div>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKey}
            />
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
                {answers.filter(a => a.isCorrect).map((q) => (
                  <li key={q.id}>
                    {q.a} · {q.b} = {q.correct} (Deine Antwort: {q.user})
                  </li>
                ))}
              </ul>
            </div>
            <div className="review-column">
              <h4>Falsch gelöst ({answers.filter(a => !a.isCorrect).length})</h4>
              <ul className="review-list bad">
                {answers.filter(a => !a.isCorrect).map((q) => (
                  <li key={q.id}>
                    {q.a} · {q.b} = {q.correct} (Deine Antwort: {isNaN(q.user) ? '—' : q.user})
                  </li>
                ))}
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

function generateProblems(count = 100) {
  // maximum unique combinations for 1..10 x 1..10
  const MAX_UNIQUE = 10 * 10;
  const target = Math.min(count, MAX_UNIQUE);

  // build a weighted pool: make non-(1 or 10) pairs more likely
  const pool = [];
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      const isRare = a === 1 || b === 1 || a === 10 || b === 10;
      // non-rare appear 4x, rare appear 1x -> makes rare pairs less frequent
      const weight = isRare ? 1 : 4;
      for (let i = 0; i < weight; i++) pool.push({ a, b });
    }
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const seen = new Set();
  const problems = [];
  let id = 1;
  for (const p of pool) {
    const key = `${p.a}x${p.b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    problems.push({ id: id++, a: p.a, b: p.b, correct: p.a * p.b });
    if (problems.length >= target) break;
  }

  // fallback: if pool exhausted (shouldn't happen) fill from all combos deterministically
  if (problems.length < target) {
    for (let a = 1; a <= 10 && problems.length < target; a++) {
      for (let b = 1; b <= 10 && problems.length < target; b++) {
        const key = `${a}x${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        problems.push({ id: id++, a, b, correct: a * b });
      }
    }
  }

  return problems;
}