import React, { useEffect, useMemo, useState, useRef } from 'react'

function generateProblems(count = 100) {
  const problems = []
  function pick() {
    // pick a and b from 1..10
    const a = Math.floor(Math.random() * 10) + 1
    const b = Math.floor(Math.random() * 10) + 1
    return { a, b }
  }

  while (problems.length < count) {
    const { a, b } = pick()
    // make *1 and *10 rarer: if either factor is 1 or 10, accept only with probability 0.18
    if (a === 1 || b === 1 || a === 10 || b === 10) {
      if (Math.random() > 0.18) continue
    }
    problems.push({ id: problems.length + 1, a, b, correct: a * b })
  }
  return problems
}

export default function App() {
  // generate once
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
    if (finished) {
      setEndTime(Date.now())
    }
  }, [finished])

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
    setAnswers(a => [...a, { ...prob, user: parsed, isCorrect }])
    setInputValue('')
    if (current + 1 >= problems.length) {
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
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
    // Scale position from 0 to 100%, with 90s at 0% (best) and 210s at 100% (needs practice)
    const position = Math.min(100, Math.max(0, 
      ((totalSeconds - 90) / (210 - 90)) * 100
    ))
    return `${position}%`
  }

  return (
    <div className="app">
      <header>
        <h1>Mathe4Speed — jetzt geht's um Geschwindigkeit!</h1>
      </header>

      {!started && (
        <main className="center">
          {countdown === null ? (
            <>
              <p>Du bekommst {problems.length} Einmaleinsaufgaben. </p>
              <p>Die Uhr läuft während du antwortest. Für jede falsche Antwort gibt es am Ende 10 Strafsekunden.</p>
              <button onClick={handleStart} className="big">Starten</button>
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
              <div className="performance-bar">
                <div 
                  className="performance-marker" 
                  style={{ left: getPerformanceMarkerPosition(finalTime) }}
                />
              </div>
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

          <div className="actions">
            <button onClick={handleStart} className="big">Nochmal versuchen</button>
          </div>
        </main>
      )}

      <footer>
        <small>Viel Erfolg! Die App läuft lokal im Browser.</small>
      </footer>
    </div>
  )
}
