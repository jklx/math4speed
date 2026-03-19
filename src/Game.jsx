import React, { useEffect, useState, useRef } from 'react'

// Animated demo for Primfaktorisierung input explanation
// Shows: type "2", press SPACE → token appears, type "2", SPACE, type "3", ENTER
const DEMO_STEPS = [
  { type: 'type',  char: '2' },
  { type: 'key',   char: 'SPACE' },
  { type: 'type',  char: '2' },
  { type: 'key',   char: 'SPACE' },
  { type: 'type',  char: '3' },
  { type: 'key',   char: 'ENTER' },
  { type: 'pause' },
]

function PrimfaktorDemo() {
  const [step, setStep] = useState(0)
  const [tokens, setTokens] = useState([])
  const [draft, setDraft] = useState('')
  const [activeKey, setActiveKey] = useState(null)

  useEffect(() => {
    const s = DEMO_STEPS[step]
    const delay = s.type === 'pause' ? 1200 : 480

    const t = setTimeout(() => {
      if (s.type === 'type') {
        setDraft(prev => prev + s.char)
        setActiveKey(s.char)
        setTimeout(() => setActiveKey(null), 180)
      } else if (s.type === 'key') {
        setActiveKey(s.char)
        setTimeout(() => setActiveKey(null), 180)
        if (s.char === 'SPACE') {
          setTokens(prev => draft ? [...prev, draft] : prev)
          setDraft('')
        } else if (s.char === 'ENTER') {
          setTokens(prev => draft ? [...prev, draft] : prev)
          setDraft('')
        }
      } else if (s.type === 'pause') {
        setTokens([])
        setDraft('')
      }
      setStep(prev => (prev + 1) % DEMO_STEPS.length)
    }, delay)
    return () => clearTimeout(t)
  }, [step])

  const keys = ['2', '3', 'SPACE', 'ENTER']

  return (
    <div className="primfaktor-demo">
      <div className="primfaktor-demo__display">
        <span className="expression" style={{ whiteSpace: 'nowrap' }}>12 =</span>
        <div className="factor-input" style={{ pointerEvents: 'none', minWidth: 120 }}>
          {tokens.map((tok, i) => (
            <React.Fragment key={i}>
              <span className="factor-token">{tok}</span>
              <span className="factor-sep" aria-hidden>⋅</span>
            </React.Fragment>
          ))}
          <span className="primfaktor-demo__draft">{draft}<span className="primfaktor-demo__cursor" /></span>
        </div>
      </div>
      <div className="primfaktor-demo__keys">
        {keys.map(k => (
          <span key={k} className={`primfaktor-demo__key${activeKey === k ? ' primfaktor-demo__key--active' : ''}`}>
            {k === 'SPACE' ? '␣ Leertaste' : k === 'ENTER' ? '↵ Enter' : k}
          </span>
        ))}
      </div>
    </div>
  )
}
import Logo from './Logo'
import { useParams, useLocation, useSearchParams } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'
import ProgressBar from './ProgressBar'
// Refactored imports
import { generateProblems } from './problems/generators'
import { validateSchriftlich, validatePrimfaktorisierung, validatePolynomial } from './problems/validate'
import { getScoreComment, getScoreMarkerPosition } from './utils/performanceFeedback'
import { computePenaltySeconds } from './utils/penalty'
import { getCategoryLabel, CATEGORIES, getDefaultSettings, getCategoryPerformanceScore, getCategoryDuration } from './utils/categories'
import Schriftlich from './Schriftlich'
import Einmaleins from './Einmaleins'
import Primfaktorisierung from './Primfaktorisierung'
import Negative from './Negative'
import Binomische from './Binomische'
import ReviewList from './ReviewList'

const BATCH_SIZE = 100
const MAX_LIVES = 3

function playPling() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1046, ctx.currentTime)        // C6
    osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.06) // E6
    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.22)
    osc.onended = () => ctx.close()
  } catch {}
}

export default function Game({ isSinglePlayer }) {
  const { roomId, category: urlCategory } = useParams()
  const location = useLocation();
  // Only use multiplayer hooks when NOT in single player mode
  const multiplayerContext = isSinglePlayer ? null : useMultiplayer();
  const { roomState, updateProgress, finishGame, username, getRoomState, isConnected } = multiplayerContext || {};
  
  // Fetch room state if missing (e.g. on refresh)
  useEffect(() => {
    if (!isSinglePlayer && roomId && isConnected) {
      // We request state even if we have it, to ensure it's fresh, 
      // but critically when we don't have it (refresh)
      getRoomState(roomId)
    }
  }, [isSinglePlayer, roomId, isConnected])

  // Category selection (only for training mode)
  const category = isSinglePlayer 
    ? (urlCategory || (location.state && location.state.category) || 'einmaleins')
    : 'einmaleins'; // 'einmaleins' | 'schriftlich' | 'primfaktorisierung'
  const multiplayerSettings = roomState?.settings || {};
  const multiplayerCategory = multiplayerSettings.category || 'einmaleins';
  const activeCategory = isSinglePlayer ? category : multiplayerCategory;
  const activeCategoryLabel = getCategoryLabel(activeCategory);
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Settings for problem generation (only for training mode)
  const [settings, setSettings] = useState(() => {
    const defaults = getDefaultSettings('einmaleins');
    if (!isSinglePlayer) return defaults;
    
    const initial = { ...defaults };
    searchParams.forEach((value, key) => {
      if (key in initial) {
        if (value === 'true') initial[key] = true;
        else if (value === 'false') initial[key] = false;
        else initial[key] = value;
      }
    });
    return initial;
  });

  // Sync settings to URL
  useEffect(() => {
    if (!isSinglePlayer) return;
    
    const defaults = getDefaultSettings('einmaleins');
    const params = {};
    
    Object.keys(settings).forEach(key => {
      if (settings[key] !== defaults[key]) {
        params[key] = settings[key];
      }
    });
    
    setSearchParams(params, { replace: true });
  }, [settings, isSinglePlayer, setSearchParams]);
  
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
  const [selectedSchriftlichId, setSelectedSchriftlichId] = useState(null)
  const [reviewShowCorrect, setReviewShowCorrect] = useState(false)
  const [finished, setFinished] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  const [toast, setToast] = useState(null)
  const [flashResult, setFlashResult] = useState(null) // 'correct' | null
  const [mistakeState, setMistakeState] = useState(null) // null | { userAnswerDisplay, correctAnswerDisplay }
  const [gameEndReason, setGameEndReason] = useState('time') // 'time' | 'lives'
  const [leaderboardQualifies, setLeaderboardQualifies] = useState(null) // null | true | false
  const [leaderboardName, setLeaderboardName] = useState('')
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState(null) // null = not loaded yet

  const inputRef = useRef(null)
  const countdownTimerRef = useRef(null)
  const gameTimerRef = useRef(null)
  const gameSettingsRef = useRef({})
  const pauseTimerRef = useRef(false)
  const gameDurationRef = useRef(300)
  const weiterButtonRef = useRef(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => setToast('Link kopiert!'))
      .catch(() => setToast('Fehler beim Kopieren'))
  }

  const renderCategoryDescription = (cat) => {
    const mins = CATEGORIES[cat]?.durationMinutes ?? 5
    if (cat === 'einmaleins') {
      return (
        <>
          <p>Du hast {mins} Minuten Zeit, so viele Einmaleins-Aufgaben wie möglich richtig zu lösen.</p>
          <p>Aufgaben mit ·1 und ·10 kommen seltener vor.</p>
        </>
      )
    }
    if (cat === 'schriftlich') {
      return (
        <>
          <p>Du hast {mins} Minuten Zeit, so viele schriftliche Rechenaufgaben wie möglich zu lösen.</p>
        </>
      )
    }
    if (cat === 'primfaktorisierung') {
      return (
        <>
          <p>Du hast {mins} Minuten Zeit, so viele Zahlen wie möglich in ihre Primfaktoren zu zerlegen.</p>
          <p>Erst 10 Einmaleins-Zahlen, dann 5 Zahlen bis 100, danach bis 200.</p>
          <p>Gib die Primfaktoren durch Leerzeichen getrennt ein (z.&nbsp;B. „2 2 3" für 12).</p>
          <PrimfaktorDemo />
        </>
      )
    }
    if (cat === 'negative') {
      return (
        <>
          <p>Du hast {mins} Minuten Zeit, so viele Aufgaben mit negativen Zahlen (+, −, ·, ∶) wie möglich zu lösen.</p>
        </>
      )
    }
    if (cat === 'binomische') {
      return (
        <>
          <p>Du hast {mins} Minuten Zeit, so viele binomische Formeln wie möglich auszumultiplizieren.</p>
          <p>Multipliziere die Terme aus und vereinfache das Ergebnis vollständig.</p>
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
    
    // Sanitize settings for single player schriftlich to ensure at least one type is selected
    // (The generator handles this fallback too, but good to be explicit)
    let finalSettings = gameSettings;
    if (isSinglePlayer && gameCategory === 'schriftlich') {
      if (!settings.schriftlichAdd && !settings.schriftlichSubtract && !settings.schriftlichMultiply) {
        finalSettings = { ...settings, schriftlichAdd: true, schriftlichSubtract: true, schriftlichMultiply: true };
      }
    }

    gameSettingsRef.current = finalSettings
    gameDurationRef.current = getCategoryDuration(gameCategory)
    const newProblems = generateProblems(BATCH_SIZE, gameCategory, finalSettings);
    setProblems(newProblems);

    setStarted(false)
    setCountdown(3)
    setCurrent(0)
    setAnswers([])
    setInputValue('')
    setFinished(false)
    setTimeLeft(gameDurationRef.current)
    setMistakeState(null)
    setGameEndReason('time')
    setLeaderboardQualifies(null)
    setLeaderboardName('')
    setLeaderboardSubmitted(false)
    setLeaderboardData(null)
    pauseTimerRef.current = false
    // clear any existing countdown and game timers before starting a new one
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
      gameTimerRef.current = null
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

  // countdown while game is running
  const [timeLeft, setTimeLeft] = useState(gameDurationRef.current)
  useEffect(() => {
    if (!started || finished) return
    if (gameTimerRef.current) clearInterval(gameTimerRef.current)
    gameTimerRef.current = setInterval(() => {
      if (pauseTimerRef.current) return
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(gameTimerRef.current)
          gameTimerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current)
        gameTimerRef.current = null
      }
    }
  }, [started, finished])

  // Finish game when timer reaches zero
  useEffect(() => {
    if (timeLeft === 0 && started && !finished) {
      const correct = answers.filter(a => a.isCorrect).length
      const wrong = answers.filter(a => !a.isCorrect).length
      if (roomId && !isSinglePlayer) {
        finishGame(roomId, correct, wrong)
        updateProgress(roomId, 100, answers)
      }
      setGameEndReason('time')
      setFinished(true)
    }
  }, [timeLeft, started, finished])

  const formatCorrectAnswer = (prob) => {
    if (prob.type === 'primfaktorisierung') return prob.factors.join(' · ')
    if (prob.type === 'binomische') return prob.correct.replace(/\^2/g, '²')
    return String(prob.correct)
  }

  const submitAnswer = (overrideValueOrEvent) => {
    const overrideValue = typeof overrideValueOrEvent === 'string' ? overrideValueOrEvent : undefined
    if (flashResult === 'correct') return // block resubmission during tick display
    const prob = problems[current]
    let parsed = ''
    let isCorrect = false

    // In production, block submitting completely empty answers; allow in dev
    const isDev = !!import.meta.env.DEV
    if (!isDev) {
      if (prob.type === 'primfaktorisierung') {
        const candidateValue = (((overrideValue ?? inputValue)) || '').trim()
        if (!candidateValue.length) return
      } else if (prob.type === 'schriftlich') {
        // Use lifted validity flag from Schriftlich
        if (!schriftlichInput?.valid) return
      } else {
        const candidateValue = ((overrideValue ?? inputValue) || '')
        if (!String(candidateValue).trim().length) return
      }
    }

    if (prob.type === 'primfaktorisierung') {
      const candidateValue = (overrideValue ?? inputValue)
      const { isCorrect: ok, parsed: p } = validatePrimfaktorisierung(candidateValue, prob.factors)
      parsed = p
      isCorrect = ok
    } else if (prob.type === 'binomische') {
      const candidateValue = (overrideValue ?? inputValue)
      const { isCorrect: ok, parsed: p } = validatePolynomial(candidateValue, prob.correct, prob.variable)
      parsed = p
      isCorrect = ok
    } else if (prob.type === 'schriftlich') {
      const { isCorrect: ok, parsed: p } = validateSchriftlich(schriftlichInput.digits, prob.correctDigits)
      parsed = p
      isCorrect = ok
    } else {
      const candidateValue = overrideValue ?? inputValue
      const sanitized = String(candidateValue).replace(/−/g, '-')
      parsed = Number(sanitized)
      isCorrect = parsed === prob.correct
    }

    const newEntry = { ...prob, user: parsed, isCorrect, schriftlichSnapshot: prob.type === 'schriftlich' ? schriftlichInput : undefined }
    const newAnswers = [...answers, newEntry]
    setAnswers(newAnswers)

    if (isCorrect) {
      playPling()
      // Show tick on current problem for 250ms, then advance
      setFlashResult('correct')
      const nextIndex = current + 1
      const needsMore = nextIndex + 20 >= problems.length
      const additionalProblems = needsMore
        ? generateProblems(BATCH_SIZE, activeCategory, gameSettingsRef.current)
        : null
      const progressAtSubmit = (roomId && !isSinglePlayer)
        ? Math.min(99, ((gameDurationRef.current - timeLeft) / gameDurationRef.current) * 100)
        : 0
      setTimeout(() => {
        setFlashResult(null)
        setInputValue('')
        setSchriftlichInput({ digits: [], parsed: '', valid: false })
        if (additionalProblems) {
          setProblems(prev => {
            const offset = prev.length
            return [...prev, ...additionalProblems.map(p => ({ ...p, id: p.id + offset }))]
          })
        }
        setCurrent(nextIndex)
        if (roomId && !isSinglePlayer) {
          updateProgress(roomId, progressAtSubmit, newAnswers)
        }
      }, 250)
    } else {
      // Wrong answer: show mistake panel and pause timer
      const rawUserAnswer = prob.type === 'schriftlich'
        ? String(schriftlichInput?.parsed ?? '?')
        : String(overrideValue ?? inputValue ?? '').trim() || String(parsed ?? '?')
      const userAnswerDisplay = prob.type === 'primfaktorisierung'
        ? rawUserAnswer.trim().split(/\s+/).filter(Boolean).join(' · ')
        : prob.type === 'binomische'
          ? rawUserAnswer.replace(/\^2/g, '²').replace(/\^3/g, '³')
          : rawUserAnswer
      setMistakeState({
        userAnswerDisplay,
        correctAnswerDisplay: formatCorrectAnswer(prob)
      })
      pauseTimerRef.current = true
    }
  }

  const dismissMistake = () => {
    const newWrongCount = answers.filter(a => !a.isCorrect).length
    setMistakeState(null)
    pauseTimerRef.current = false
    if (newWrongCount >= MAX_LIVES) {
      const correct = answers.filter(a => a.isCorrect).length
      if (roomId && !isSinglePlayer) {
        finishGame(roomId, correct, newWrongCount)
        updateProgress(roomId, 100, answers)
      }
      setGameEndReason('lives')
      setFinished(true)
      return
    }
    setInputValue('')
    setSchriftlichInput({ digits: [], parsed: '', valid: false })
    const nextIndex = current + 1
    if (nextIndex + 20 >= problems.length) {
      const moreProblems = generateProblems(BATCH_SIZE, activeCategory, gameSettingsRef.current)
      setProblems(prev => {
        const offset = prev.length
        return [...prev, ...moreProblems.map(p => ({ ...p, id: p.id + offset }))]
      })
    }
    setCurrent(nextIndex)

    if (roomId && !isSinglePlayer) {
      const progress = Math.min(99, ((gameDurationRef.current - timeLeft) / gameDurationRef.current) * 100)
      updateProgress(roomId, progress, answers)
    }
  }

  const correctCount = answers.filter(a => a.isCorrect).length
  const wrongCount = answers.filter(a => !a.isCorrect).length
  const scoreRange = getCategoryPerformanceScore(activeCategory)
  // bump key changes every time a correct answer is added, triggering re-animation
  const scoreBumpKey = correctCount

  const schriftlichAnswers = answers.filter(a => a.type === 'schriftlich')
  const selectedSchriftlich = selectedSchriftlichId == null
    ? null
    : schriftlichAnswers.find(a => a.id === selectedSchriftlichId) || null

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current)
        gameTimerRef.current = null
      }
    }
  }, [])

  // Check whether the just-finished single-player score qualifies for the top 10
  useEffect(() => {
    if (!finished || !isSinglePlayer) return
    const cc = answers.filter(a => a.isCorrect).length
    const wc = answers.filter(a => !a.isCorrect).length
    fetch(`/api/leaderboard?category=${activeCategory}`)
      .then(r => r.json())
      .then(board => {
        setLeaderboardData(board)
        const qualifies = board.length < 10 ||
          cc > board[9].score ||
          (cc === board[9].score && wc < board[9].wrongCount)
        setLeaderboardQualifies(qualifies)
      })
      .catch(() => setLeaderboardQualifies(false))
  }, [finished])

  const submitLeaderboard = () => {
    const name = leaderboardName.trim()
    if (!name) return
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: name,
        category: activeCategory,
        score: correctCount,
        wrongCount
      })
    })
    .then(() =>
      fetch(`/api/leaderboard?category=${activeCategory}`).then(r => r.json())
    )
    .then(board => {
      setLeaderboardData(board)
      setLeaderboardSubmitted(true)
    })
    .catch(() => setLeaderboardSubmitted(true))
  }

  // Auto-focus Weiter button when mistake panel appears so Enter dismisses it
  useEffect(() => {
    if (mistakeState) {
      requestAnimationFrame(() => weiterButtonRef.current?.focus())
    }
  }, [mistakeState])

  return (
    <div className="app">
      <Logo />
      {toast && (
        <div className="copy-toast" role="status">{toast}</div>
      )}

      {!started && (
        <main className="center">
          {!isSinglePlayer && !roomState ? (
            <div className="loading">Lade Raumdaten...</div>
          ) : countdown === null ? (
            <>
              {isSinglePlayer ? (
                <>
                  <h2>Trainingsmodus</h2>
                  {renderCategoryDescription(category)}
                  {CATEGORIES[category] && CATEGORIES[category].settings.length > 0 && (
                    <div className="settings-box">
                      <h3>Aufgaben</h3>
                      <div className={`${category}-toggles`} style={{ marginTop: 0, borderLeft: 'none', paddingLeft: 0 }}>
                        {CATEGORIES[category].settings.map(setting => (
                          <label key={setting.key} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={settings[setting.key] ?? setting.defaultValue}
                              disabled={setting.disabled}
                              onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.checked })}
                            />
                            <span>{setting.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
                    <button onClick={handleStart} className="big">Starten</button>
                    <button onClick={copyLink} className="big secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Link kopieren
                      <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <rect x="9" y="7" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <rect x="4" y="4" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      </svg>
                    </button>
                  </div>
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
            <div className="score-counter">
              <span className="score-counter__label">Richtig</span>
              <span key={scoreBumpKey} className={`score-counter__value${correctCount > 0 ? ' score-counter__value--bump' : ''}`}>{correctCount}</span>
            </div>
            <div className="lives" aria-label="Leben">
              {Array.from({ length: MAX_LIVES }, (_, i) => (
                <span key={i} className={`life-icon${i < wrongCount ? ' life-icon--used' : ' life-icon--remaining'}`} aria-hidden>✕</span>
              ))}
            </div>
            <div className="score-timer">Zeit: {formatTime(timeLeft)}</div>
          </div>

          {mistakeState ? (
            <div className="mistake-panel">
              <div className="mistake-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Falsch!
              </div>
              <div className="mistake-answers">
                <div className="mistake-answer mistake-answer--wrong">
                  <span className="mistake-answer__label">Deine Antwort</span>
                  <span className="mistake-answer__value">{mistakeState.userAnswerDisplay}</span>
                </div>
                <div className="mistake-answer mistake-answer--correct">
                  <span className="mistake-answer__label">Richtige Antwort</span>
                  <span className="mistake-answer__value">{mistakeState.correctAnswerDisplay}</span>
                </div>
              </div>
              <button ref={weiterButtonRef} onClick={dismissMistake} className="big">Weiter</button>
            </div>
          ) : (
            <>
              <div className="question">
                {flashResult === 'correct' && problems[current].type === 'schriftlich' && (
                  <div className="tick-inline" aria-hidden>
                    <svg viewBox="0 0 52 52" className="tick-svg">
                      <circle cx="26" cy="26" r="24" className="tick-circle" />
                      <path d="M14 27 l9 9 l16 -16" className="tick-check" />
                    </svg>
                  </div>
                )}
                {problems[current].type === 'primfaktorisierung' ? (
                  <Primfaktorisierung
                    key={problems[current].id}
                    number={problems[current].number}
                    value={inputValue}
                    onChange={setInputValue}
                    onEnter={submitAnswer}
                    showTick={flashResult === 'correct'}
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
                  />
                ) : problems[current].type === 'multiplication' ? (
                  <Einmaleins
                    key={problems[current].id}
                    a={problems[current].a}
                    b={problems[current].b}
                    value={inputValue}
                    onChange={setInputValue}
                    onEnter={submitAnswer}
                    showTick={flashResult === 'correct'}
                  />
                ) : problems[current].type === 'negative' ? (
                  <Negative
                    key={problems[current].id}
                    a={problems[current].a}
                    b={problems[current].b}
                    operator={problems[current].operator}
                    value={inputValue}
                    onChange={setInputValue}
                    onEnter={submitAnswer}
                    explicitPlus={problems[current].explicitPlus}
                    showTick={flashResult === 'correct'}
                  />
                ) : problems[current].type === 'binomische' ? (
                  <Binomische
                    key={problems[current].id}
                    expression={problems[current].expression}
                    value={inputValue}
                    onChange={setInputValue}
                    onEnter={submitAnswer}
                    showTick={flashResult === 'correct'}
                  />
                ) : null}
              </div>

              <div className="controls">
                <button onClick={submitAnswer} className="big">Nächste</button>
              </div>
            </>
          )}
        </main>
      )}

      {finished && (
        <main>
          <h2>Ergebnis</h2>
          <div className="summary">
            <div className="result-score-hero">
              <span className="result-score-number">{correctCount}</span>
              <span className="result-score-label">richtig gelöst</span>
            </div>
            <div className="result-meta">
              <span>Falsch: <strong>{wrongCount}</strong></span>
              <span>Gesamt: <strong>{answers.length}</strong></span>
            </div>

            <div className="performance">
              <ProgressBar finalTime={correctCount} range={scoreRange} getMarkerPosition={getScoreMarkerPosition} scoreMode />
              <div className="performance-labels">
                <span className="performance-label performance-label-left">
                  <span>Üben</span>
                  <span>{scoreRange[0]}</span>
                </span>
                <span className="performance-label performance-label-center">
                  <span>Gut</span>
                </span>
                <span className="performance-label performance-label-right">
                  <span>Hervorragend</span>
                  <span>{scoreRange[1]}</span>
                </span>
              </div>
              <div className="performance-comment">
                {getScoreComment(correctCount, scoreRange)}
              </div>
            </div>
          </div>

          {isSinglePlayer && leaderboardQualifies === true && !leaderboardSubmitted && (
            <div className="leaderboard-qualify-box">
              <div className="leaderboard-qualify-title">&#127942; Top 10!</div>
              <p>Du hast dich für die Rangliste qualifiziert. Gib deinen Namen ein:</p>
              <form
                onSubmit={e => { e.preventDefault(); submitLeaderboard(); }}
                style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}
              >
                <input
                  className="app-input"
                  type="text"
                  placeholder="Dein Name"
                  value={leaderboardName}
                  onChange={e => setLeaderboardName(e.target.value)}
                  maxLength={30}
                  autoFocus
                />
                <button type="submit" className="big" disabled={!leaderboardName.trim()}>Eintragen</button>
              </form>
            </div>
          )}
          {isSinglePlayer && leaderboardSubmitted && (
            <div className="leaderboard-qualify-box leaderboard-qualify-box--submitted">
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--ok)', marginBottom: '0.5rem' }}>✓ Eingetragen!</div>
            </div>
          )}

          {isSinglePlayer && leaderboardData !== null && (
            <div className="inline-leaderboard">
              <h3>Rangliste &ndash; {activeCategoryLabel}</h3>
              {leaderboardData.length === 0 ? (
                <p style={{ color: '#888', margin: 0 }}>Noch keine Einträge.</p>
              ) : (
                <div className="leaderboard-table-wrap">
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
                      {leaderboardData.map((entry, i) => {
                        const isNew = leaderboardSubmitted &&
                          entry.username === leaderboardName.trim() &&
                          entry.score === correctCount &&
                          entry.wrongCount === wrongCount
                        return (
                          <tr key={i} className={`${i < 3 ? 'leaderboard-podium' : ''}${isNew ? ' leaderboard-new-entry' : ''}`}>
                            <td className="leaderboard-rank">
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                            </td>
                            <td className="leaderboard-name">{entry.username}</td>
                            <td className="leaderboard-score">{entry.score}</td>
                            <td className="leaderboard-wrong">{entry.wrongCount}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {isSinglePlayer && (
            <div className="actions">
              <button onClick={handleStart} className="big">Nochmal versuchen</button>
            </div>
          )}

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
                <button
                  type="button"
                  className="big secondary"
                  onClick={() => setSelectedSchriftlichId(null)}
                  style={{ marginRight: '0.5rem' }}
                >
                  Schließen
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                <div>
                  <h5 style={{ marginTop: 0 }}>Meine Eingabe</h5>
                  <Schriftlich
                    key={`review-user-${selectedSchriftlich.id}`}
                    aDigits={selectedSchriftlich.aDigits}
                    bDigits={selectedSchriftlich.bDigits}
                    summandsDigits={selectedSchriftlich.summandsDigits}
                    correctDigits={selectedSchriftlich.correctDigits}
                    partialProducts={selectedSchriftlich.partialProducts}
                    operation={selectedSchriftlich.operation}
                    initialState={selectedSchriftlich.schriftlichSnapshot}
                    review
                    showCorrect={false}
                  />
                </div>
                <div>
                  <h5 style={{ marginTop: 0 }}>Lösung</h5>
                  <Schriftlich
                    key={`review-solution-${selectedSchriftlich.id}`}
                    aDigits={selectedSchriftlich.aDigits}
                    bDigits={selectedSchriftlich.bDigits}
                    summandsDigits={selectedSchriftlich.summandsDigits}
                    correctDigits={selectedSchriftlich.correctDigits}
                    partialProducts={selectedSchriftlich.partialProducts}
                    operation={selectedSchriftlich.operation}
                    initialState={selectedSchriftlich.schriftlichSnapshot}
                    review
                    showCorrect={true}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      )}

    </div>
  )
}
