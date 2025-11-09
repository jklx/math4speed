import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'
import ProgressBar from './ProgressBar'

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
  // schriftlich digit arrays
  const [answerDigits, setAnswerDigits] = useState([])
  const [carryDigits, setCarryDigits] = useState([])
  const [finished, setFinished] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)

  const inputRef = useRef(null)
  const countdownTimerRef = useRef(null)
  // Helper to right-align digits into a fixed number of columns
  const padLeft = (arr, total) => {
    const missing = Math.max(0, total - arr.length)
    return Array(missing).fill(null).concat(arr)
  }

  useEffect(() => {
    if (started && !finished) {
      inputRef.current?.focus()
    }
  }, [started, current, finished])

  // Initialize arrays and focus rightmost when a schriftlich task starts
  useEffect(() => {
    if (!started) return;
    const prob = problems[current];
    if (prob && prob.type === 'schriftlich') {
      const cols = prob.correctDigits.length;
      setAnswerDigits(Array(cols).fill(''));
      setCarryDigits(Array(cols).fill(''));
      // Focus the rightmost result input after render
      setTimeout(() => {
        const el = document.getElementById(`res-${cols - 1}`);
        if (el) el.focus();
      }, 0);
    }
  }, [started, current]);


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
    let parsed, isCorrect

    if (prob.type === 'primfaktorisierung') {
      const user = inputValue.trim().split(/\s+/).map(Number).sort((a,b)=>a-b)
      const correct = [...prob.factors].sort((a,b)=>a-b)
      isCorrect = JSON.stringify(user) === JSON.stringify(correct)
      parsed = inputValue
    } else if (prob.type === 'schriftlich') {
      // Convert answerDigits (strings) to numbers, treating empty as 0
      const userDigits = answerDigits.map(d => d === '' ? 0 : Number(d))
      const correctDigits = prob.correctDigits
      
      // Check if at least one non-zero digit is entered (to prevent submitting all empty)
      const hasAnyDigit = answerDigits.some(d => d !== '')
      
      if (!hasAnyDigit) {
        // Flash first input if nothing entered
        const el = document.getElementById(`res-0`);
        if (el) {
          el.focus();
          el.style.background = '#ffebee';
          setTimeout(() => el.style.background = '', 300);
        }
        return
      }
      
      // Compare digit by digit (both as numbers now, empty = 0)
      isCorrect = JSON.stringify(userDigits) === JSON.stringify(correctDigits)
      parsed = answerDigits.map(d => d === '' ? '0' : d).join('')
    } else {
      parsed = Number(inputValue)
      isCorrect = parsed === prob.correct
    }
    
    const newEntry = { ...prob, user: parsed, isCorrect }
    const newAnswers = [...answers, newEntry]
    setAnswers(newAnswers)
  setInputValue('')
  setAnswerDigits([])
  setCarryDigits([])
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
              <>
                <div className="expression">Primfaktoren von {problems[current].number} =</div>
                <input
                  ref={inputRef}
                  type="text"
                  className="app-input"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="z.B. 2 2 3"
                />
              </>
            ) : problems[current].type === 'schriftlich' ? (
              (() => {
                const cols = problems[current].correctDigits.length
                const totalCols = cols + 2 // add padding on both sides
                const aCells = padLeft(problems[current].aDigits, cols)
                const bCells = padLeft(problems[current].bDigits, cols)
                const isAdd = problems[current].operation === 'add'
                // Arrays are initialized via useEffect when current changes
                const focusLeft = (base, i, prefix) => {
                  if (i > 0) {
                    const el = document.getElementById(`${prefix}-${i-1}`)
                    if (el) el.focus()
                  }
                }
                const handleKeyDown = (e, isCarry, i) => {
                  const currentTab = parseInt(e.target.tabIndex);
                  
                  // Arrow key navigation (normal direction)
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                      // Right arrow goes to next column right (tabIndex - 2)
                      const next = document.querySelector(`[tabindex='${currentTab - 2}']`);
                    if (next) next.focus();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                      // Left arrow goes to next column left (tabIndex + 2)
                      const next = document.querySelector(`[tabindex='${currentTab + 2}']`);
                    if (next) next.focus();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    // Move between carry and result in same column
                    const targetId = isCarry ? `res-${i}` : `carry-${i}`;
                    const el = document.getElementById(targetId);
                    if (el) el.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    // Move between carry and result in same column
                    const targetId = isCarry ? `res-${i}` : `carry-${i}`;
                    const el = document.getElementById(targetId);
                    if (el) el.focus();
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    submitAnswer();
                  }
                }
                return (
                  <div className="schriftlich-grid-container">
                    <div className="schriftlich-grid" style={{gridTemplateColumns: `repeat(${totalCols}, 50px)`, gridTemplateRows: `repeat(4, 50px)`}}>
                      {/* Row 1: first number (minuend or first addend) */}
                      <div className="grid-cell" />
                      {aCells.map((d,i)=>(<div key={`a-${i}`} className="grid-cell digit">{d ?? ''}</div>))}
                      <div className="grid-cell" />

                      {isAdd ? (
                        <>
                          {/* Row 2: second addend */}
                          <div className="grid-cell" />
                          {bCells.map((d,i)=>(<div key={`b-${i}`} className="grid-cell digit">{d ?? ''}</div>))}
                          <div className="grid-cell" />

                          {/* Row 3: plus sign and carries */}
                          <div className="grid-cell plus">+</div>
                          {Array.from({length: cols}).map((_, i)=>(
                            <div key={`c-${i}`} className="grid-cell">
                              <input
                                id={`carry-${i}`}
                                className="digit-input red small"
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                tabIndex={2*(cols-1-i)+1}
                                value={carryDigits[i] || ''}
                                onChange={e=>{
                                  const v=e.target.value.replace(/[^0-9]/g,'').slice(0,1)
                                  setCarryDigits(prev=>{const arr=[...prev];arr[i]=v;return arr})
                                  // Auto-advance disabled:
                                  // if (v) {
                                  //   const currentTab = e.target.tabIndex;
                                  //   const next = document.querySelector(`[tabindex='${currentTab+1}']`);
                                  //   if (next) next.focus();
                                  // }
                                }}
                                onKeyDown={e => handleKeyDown(e, true, i)}
                              />
                            </div>
                          ))}
                          <div className="grid-cell" />
                        </>
                      ) : (
                        <>
                          {/* Row 2: borrow row (between minuend and subtrahend) shows 'I' markers */}
                          <div className="grid-cell" />
                          {Array.from({length: cols}).map((_, i)=>(
                            <div key={`borr-${i}`} className="grid-cell" onClick={()=>{
                              setCarryDigits(prev=>{
                                const arr=[...prev];
                                arr[i] = arr[i] === 'I' ? '' : 'I';
                                return arr;
                              })
                            }}>
                              <div className="borrow-cell">
                                {carryDigits[i] === 'I' ? <span className="borrow-mark" /> : null}
                              </div>
                            </div>
                          ))}
                          <div className="grid-cell" />

                          {/* Row 3: minus sign and second number (subtrahend) */}
                          <div className="grid-cell plus">−</div>
                          {bCells.map((d,i)=>(<div key={`b-${i}`} className="grid-cell digit">{d ?? ''}</div>))}
                          <div className="grid-cell" />
                        </>
                      )}

                      {/* Row 4: result row with thick top border */}
                      <div className="grid-cell result-sep" />
                      {Array.from({length: cols}).map((_, i)=>(
                        <div key={`r-${i}`} className="grid-cell result-sep">
                          <input
                            id={`res-${i}`}
                            className="digit-input blue"
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            tabIndex={2*(cols-1-i)+2}
                            value={answerDigits[i] || ''}
                            onChange={e=>{
                              const v=e.target.value.replace(/[^0-9]/g,'').slice(0,1)
                              setAnswerDigits(prev=>{const arr=[...prev];arr[i]=v;return arr})
                              // Auto-advance disabled (addition):
                              // if (v) {
                              //   const currentTab = e.target.tabIndex;
                              //   const advance = 1;
                              //   const next = document.querySelector(`[tabindex='${currentTab+advance}']`);
                              //   if (next) next.focus();
                              // }
                            }}
                            onKeyDown={e => {
                              if (!isAdd && (e.key === 'i' || e.key === 'I' || e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar')) {
                                e.preventDefault();
                                const targetIndex = i-1;
                                if (targetIndex >= 0) {
                                  setCarryDigits(prev => {
                                    const arr = [...prev];
                                    arr[targetIndex] = arr[targetIndex] === 'I' ? '' : 'I';
                                    return arr;
                                  });
                                }
                                return;
                              }
                              handleKeyDown(e, false, i);
                            }}
                            ref={i===cols-1?inputRef:null}
                          />
                        </div>
                      ))}
                      <div className="grid-cell result-sep" />
                    </div>
                    {/* separator now handled via border-top on result-sep cells */}
                  </div>
                )
              })()
            ) : (
              <>
                <div className="expression">
                  {problems[current].a} 
                  {problems[current].type === 'add' && ' + '}
                  {problems[current].type === 'subtract' && ' − '}
                  {(problems[current].type === 'multiply' || problems[current].type === 'multiplication') && ' · '}
                  {problems[current].type === 'divide' && ' ÷ '}
                  {problems[current].b} =
                </div>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKey}
                />
              </>
            )}
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
                  const op = q.type === 'add' ? '+' : q.type === 'subtract' ? '−' : q.type === 'divide' ? '÷' : '·';
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
                  const op = q.type === 'add' ? '+' : q.type === 'subtract' ? '−' : q.type === 'divide' ? '÷' : '·';
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

function generateProblems(count = 100, category = 'einmaleins', settings = {}) {
  if (category === 'einmaleins') {
    return generateEinmaleinsProblems(count, settings);
  } else if (category === 'schriftlich') {
    return generateSchriftlichProblems(count);
  } else if (category === 'primfaktorisierung') {
    return generatePrimfaktorisierungProblems(count);
  }
  return [];
}

function generateEinmaleinsProblems(count = 100, settings = {}) {
  const { includeSquares11_20 = false, includeSquares21_25 = false } = settings;
  
  // base pool: 1..10 x 1..10
  const pool = [];
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      const isRare = a === 1 || b === 1 || a === 10 || b === 10;
      // non-rare appear 4x, rare appear 1x -> makes rare pairs less frequent
      const weight = isRare ? 1 : 4;
      for (let i = 0; i < weight; i++) pool.push({ a, b });
    }
  }

  // Add squares 11-20 if enabled
  if (includeSquares11_20) {
    for (let n = 11; n <= 20; n++) {
      // add each square multiple times for good representation
      for (let i = 0; i < 3; i++) pool.push({ a: n, b: n });
    }
  }

  // Add squares 21-25 if enabled
  if (includeSquares21_25) {
    for (let n = 21; n <= 25; n++) {
      // add each square multiple times for good representation
      for (let i = 0; i < 3; i++) pool.push({ a: n, b: n });
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
    problems.push({ id: id++, a: p.a, b: p.b, correct: p.a * p.b, type: 'multiplication' });
    if (problems.length >= count) break;
  }

  // fallback: if pool exhausted fill from base combos deterministically
  if (problems.length < count) {
    for (let a = 1; a <= 10 && problems.length < count; a++) {
      for (let b = 1; b <= 10 && problems.length < count; b++) {
        const key = `${a}x${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        problems.push({ id: id++, a, b, correct: a * b, type: 'multiplication' });
      }
    }
  }

  return problems;
}

function generateSchriftlichProblems(count = 10) {
  const problems = [];
  // Half addition, half subtraction
  const halfCount = Math.floor(count / 2);
  for (let i = 0; i < count; i++) {
    const operation = i < halfCount ? 'add' : 'subtract';
    let a, b, correct;
    if (operation === 'add') {
      a = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
      b = Math.floor(Math.random() * 9000) + 1000;
      correct = a + b;
    } else {
      a = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
      b = Math.floor(Math.random() * (a - 1000)) + 1000; // ensure b < a
      if (b >= a) b = a - 1; // safety
      correct = a - b;
    }
    problems.push({
      id: i + 1,
      a,
      b,
      correct,
      type: 'schriftlich',
      operation, // 'add' | 'subtract'
      aDigits: String(a).padStart(4, '0').split('').map(Number),
      bDigits: String(b).padStart(4, '0').split('').map(Number),
      correctDigits: String(correct).padStart(operation === 'add' ? 5 : 4, '0').split('').map(Number)
    });
  }
  return problems;
}

function generatePrimfaktorisierungProblems(count = 20) {
  const problems = [];
  
  // Helper: get prime factors of n
  const getPrimeFactors = (n) => {
    const factors = [];
    let d = 2;
    while (n > 1) {
      while (n % d === 0) {
        factors.push(d);
        n /= d;
      }
      d++;
      if (d * d > n && n > 1) {
        factors.push(n);
        break;
      }
    }
    return factors;
  };
  
  for (let i = 0; i < count; i++) {
    // Generate numbers between 12 and 200 that have interesting factorizations
    const num = Math.floor(Math.random() * 189) + 12; // 12-200
    const factors = getPrimeFactors(num);
    
    problems.push({
      id: i + 1,
      number: num,
      correct: factors.join(' '),
      factors: factors,
      type: 'primfaktorisierung'
    });
  }
  
  return problems;
}
