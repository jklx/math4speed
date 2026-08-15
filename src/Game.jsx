import React, { useEffect, useState, useRef } from 'react'
import { formatDecimal, formatPercent } from './utils/formatNumber'

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

// Animated demo for Binomische input explanation
// Shows: type "x^2+6x+9" for the expression (x+3)², then Enter
const BINOM_DEMO_STEPS = [
  { type: 'type', char: 'x' },
  { type: 'type', char: '^' },
  { type: 'type', char: '2' },
  { type: 'type', char: '+' },
  { type: 'type', char: '6' },
  { type: 'type', char: 'x' },
  { type: 'type', char: '+' },
  { type: 'type', char: '9' },
  { type: 'key',  char: 'ENTER' },
  { type: 'pause' },
]

function BinomischeDemo() {
  const [step, setStep] = useState(0)
  const [text, setText] = useState('')
  const [activeKey, setActiveKey] = useState(null)

  useEffect(() => {
    const s = BINOM_DEMO_STEPS[step]
    const delay = s.type === 'pause' ? 1200 : 460

    const t = setTimeout(() => {
      if (s.type === 'type') {
        setText(prev => prev + s.char)
        setActiveKey(s.char)
        setTimeout(() => setActiveKey(null), 180)
      } else if (s.type === 'key') {
        setActiveKey(s.char)
        setTimeout(() => setActiveKey(null), 180)
        if (s.char === 'ENTER') setText('')
      } else if (s.type === 'pause') {
        setText('')
      }
      setStep(prev => (prev + 1) % BINOM_DEMO_STEPS.length)
    }, delay)
    return () => clearTimeout(t)
  }, [step])

  // Render text: ^X becomes a superscript; lone ^ shown in accent colour
  const renderText = (str) => {
    const parts = []
    let i = 0
    while (i < str.length) {
      if (str[i] === '^') {
        if (i + 1 < str.length) {
          parts.push(<sup key={i}>{str[i + 1]}</sup>)
          i += 2
        } else {
          parts.push(<span key={i} style={{ color: 'var(--accent)' }}>^</span>)
          i++
        }
      } else {
        parts.push(str[i])
        i++
      }
    }
    return parts
  }

  const keys = ['x', '^', '2', '+', '6', '9', 'ENTER']

  return (
    <div className="primfaktor-demo">
      <div className="primfaktor-demo__display">
        <span className="expression" style={{ whiteSpace: 'nowrap' }}>
          (x+3)² =
        </span>
        <span className="primfaktor-demo__draft">
          {renderText(text)}<span className="primfaktor-demo__cursor" />
        </span>
      </div>
      <div className="primfaktor-demo__keys">
        {keys.map(k => (
          <span key={k} className={`primfaktor-demo__key${activeKey === k ? ' primfaktor-demo__key--active' : ''}`}>
            {k === 'ENTER' ? '↵ Enter' : k}
          </span>
        ))}
      </div>
    </div>
  )
}

import Logo from './Logo'
import VirtualKeyboard from './VirtualKeyboard'
import { useParams, useLocation, useSearchParams } from 'react-router-dom'
import { useMultiplayer } from './MultiplayerContext'
import ProgressBar from './ProgressBar'
// Refactored imports
import { generateProblems } from './problems/generators'
import { validateSchriftlich, validatePrimfaktorisierung, validatePolynomial } from './problems/validate'
import { getScoreComment, getScoreMarkerPosition } from './utils/performanceFeedback'
import { getCategoryLabel, CATEGORIES, getDefaultSettings, getCategoryPerformanceScore, getCategoryDuration } from './utils/categories'
import Schriftlich from './Schriftlich'
import SchriftlicheDivision from './SchriftlicheDivision'
import Einmaleins from './Einmaleins'
import Primfaktorisierung from './Primfaktorisierung'
import Negative from './Negative'
import Binomische from './Binomische'
import ProzentGleichung from './ProzentGleichung'
import GemischteZahlen from './GemischteZahlen'
import Dezimalbrueche from './Dezimalbrueche'
import ReviewList from './ReviewList'

const BATCH_SIZE = 100
export default function Game({ isSinglePlayer }) {
  const { roomId, category: urlCategory } = useParams()
  const location = useLocation();
  // Only use multiplayer hooks when NOT in single player mode
  const multiplayerContext = isSinglePlayer ? null : useMultiplayer();
  const { roomState, updateProgress, finishGame, username, getRoomState, attemptPlayerRejoin, isConnected } = multiplayerContext || {};
  
  // Fetch room state if missing (e.g. on refresh)
  useEffect(() => {
    if (!isSinglePlayer && roomId && isConnected) {
      attemptPlayerRejoin?.(roomId)
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
    const defaults = getDefaultSettings();
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
    
    const defaults = getDefaultSettings();
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
  const [schriftlichCheckMode, setSchriftlichCheckMode] = useState(false)
  const [selectedSchriftlichId, setSelectedSchriftlichId] = useState(null)
  const [finished, setFinished] = useState(false)
  const [, setStartTime] = useState(null)
  const [toast, setToast] = useState(null)
  const [flashResult, setFlashResult] = useState(null) // 'correct' | null
  const [mistakeState, setMistakeState] = useState(null) // null | { userAnswerDisplay, correctAnswerDisplay }
  const [leaderboardQualifies, setLeaderboardQualifies] = useState(null) // null | true | false
  const [leaderboardName, setLeaderboardName] = useState('')
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState(null) // null = not loaded yet
  const [connectionLost, setConnectionLost] = useState(false)

  const inputRef = useRef(null)
  const lastGameInputRef = useRef(null)
  const countdownTimerRef = useRef(null)
  const gameTimerRef = useRef(null)
  const gameSettingsRef = useRef({})
  const pauseTimerRef = useRef(false)
  const gameDurationRef = useRef(300)
  const weiterButtonRef = useRef(null)
  const hasConnectedToRoomRef = useRef(false)

  useEffect(() => {
    if (isSinglePlayer) return

    if (isConnected) {
      hasConnectedToRoomRef.current = true
      setConnectionLost(false)
    } else if (hasConnectedToRoomRef.current) {
      setConnectionLost(true)
    }
  }, [isSinglePlayer, isConnected])

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
    if (cat === 'schriftlich' || cat === 'schriftlich-add' || cat === 'schriftlich-subtract' || cat === 'schriftlich-multiply' || cat === 'schriftlich-divide') {
      const opLabel = cat === 'schriftlich-add' ? 'Additions' : cat === 'schriftlich-subtract' ? 'Subtraktions' : cat === 'schriftlich-multiply' ? 'Multiplikations' : cat === 'schriftlich-divide' ? 'Divisions' : ''
      return (
        <>
          <p>Du hast {mins} Minuten Zeit, so viele schriftliche {opLabel}aufgaben wie möglich zu lösen.</p>
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
    if (cat === 'gemischte-zahlen') {
      return (
        <>
          <p>Du hast {mins} Minuten Zeit, gemischte Zahlen und unechte Brüche ineinander umzuwandeln.</p>
          <p>Gib einen Bruch als <kbd>11/4</kbd> und eine gemischte Zahl als <kbd>2 3/4</kbd> ein.</p>
        </>
      )
    }
    if (cat === 'dezimalbrueche') {
      return (
        <>
          <p>Du hast {mins} Minuten Zeit, Brüche und Dezimalbrüche ineinander umzuwandeln.</p>
          <p>Wähle die Aufgabentypen aus, die du üben möchtest. Bei periodischen Dezimalzahlen nutze z.&nbsp;B. <kbd>0,(3)</kbd>.</p>
        </>
      )
    }
    if (cat === 'binomische') {
      return (
        <>
          <p>Du hast {mins} Minuten Zeit, so viele binomische Formeln wie möglich auszumultiplizieren.</p>
          <p>Multipliziere die Terme aus und vereinfache das Ergebnis vollständig. Hochzahlen mit <kbd>^</kbd> eingeben (z.&nbsp;B. <kbd>x^2</kbd> für x²).</p>
          <BinomischeDemo />
        </>
      )
    }
    if (cat === 'prozent-gleichung') {
      return (
        <>
          <p>Du hast {mins} Minuten Zeit, Prozentaufgaben durch Aufstellen und Lösen von Gleichungen zu bearbeiten.</p>
          <p><strong>Schritt 1:</strong> Lies den Text und stelle eine Gleichung für <strong>x</strong> auf. Je nach Aufgabe kann x der Grundwert, der Prozentwert oder der Prozentsatz sein:</p>
          <ul style={{textAlign:'left', lineHeight:1.8}}>
            <li>Grundwert gesucht: <kbd>0,25·x = 75</kbd></li>
            <li>Prozentwert gesucht: <kbd>x = 0,25·300</kbd></li>
            <li>Prozentsatz gesucht: <kbd>x/100·300 = 75</kbd></li>
          </ul>
          <p><strong>Schritt 2:</strong> Löse die Gleichung und trage den Wert von <strong>x</strong> ein.</p>
          <p>Kommazahlen mit Komma: <kbd>0,25</kbd>. Multiplikation mit <kbd>*</kbd> oder direkt <kbd>0,25x</kbd>.</p>
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

  useEffect(() => {
    const hasActiveGame = (started || countdown !== null) && !finished
    if (!hasActiveGame) return

    const warnBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [started, countdown, finished])

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
    
    // The new schriftlich-* category keys pass directly to generateProblems;
    // no settings sanitisation needed since the generator ignores settings for them.
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
    setSchriftlichCheckMode(false)
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
        updateProgress(roomId, 100, answers)
        // Persist the final task list before the room can switch to "finished".
        finishGame(roomId, correct, wrong)
      }
      setFinished(true)
    }
  }, [timeLeft, started, finished])

  const formatCorrectAnswer = (prob) => {
    if (prob.type === 'primfaktorisierung') return prob.factors.join(' · ')
    if (prob.type === 'binomische') return prob.correct.replace(/\^2/g, '²')
    if (prob.type === 'prozent-gleichung') {
      if (prob.variant === 'findeFaktor' || prob.variant === 'findeProzentsatz') {
        return `x = ${formatDecimal(prob.correct, { maximumFractionDigits: 4 })} (= ${prob.p}%)`
      }
      return `x = ${formatDecimal(prob.correct, { maximumFractionDigits: 4 })}${prob.unit ? ' ' + prob.unit : ''}`
    }
    if (prob.type === 'gemischte-zahlen') return prob.correct
    if (prob.type === 'dezimalbrueche') return prob.correct
    return String(prob.correct)
  }

  const formatCorrectAnswerOptions = (prob) => {
    if (prob.type === 'prozent-gleichung' && (prob.variant === 'findeFaktor' || prob.variant === 'findeProzentsatz')) {
      return [
        `x = ${formatDecimal(prob.correct, { maximumFractionDigits: 4 })}`,
        'oder',
        `x = ${formatPercent(prob.p, { maximumFractionDigits: 4 })}`
      ]
    }
    return [formatCorrectAnswer(prob)]
  }

  const recordEquationError = (userEquation) => {
    const prob = problems[current]
    const newEntry = { ...prob, user: '(Gleichung falsch)', isCorrect: false }
    const newAnswers = [...answers, newEntry]
    setAnswers(newAnswers)
    // Show inline mistake: display student's equation and the correct example equation
    const userDisplay = userEquation ? String(userEquation).replace(/\./g, ',') : '(Gleichung falsch)'
    const correctDisplay = prob.exampleEquation || formatCorrectAnswer(prob)
    setMistakeState({ userAnswerDisplay: userDisplay, correctAnswerDisplay: correctDisplay, field: 'equation' })
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
      const { isCorrect: ok, parsed: p } = validatePolynomial(candidateValue, prob.correct)
      parsed = p
      isCorrect = ok
    } else if (prob.type === 'schriftlich') {
      const { isCorrect: ok, parsed: p } = validateSchriftlich(schriftlichInput.digits, prob.correctDigits)
      parsed = p
      isCorrect = ok
    } else if (prob.type === 'prozent-gleichung') {
      const candidateValue = String(overrideValue ?? inputValue ?? '').trim()
      const normalized = candidateValue.replace(/−/g, '-').replace(/,/g, '.')
      if (prob.variant === 'findeFaktor' || prob.variant === 'findeProzentsatz') {
        // Accept 0.3, 30%, or 30/100 — all meaning the same factor
        let decimal
        if (normalized.endsWith('%')) {
          decimal = parseFloat(normalized) / 100
        } else if (normalized.includes('/')) {
          const parts = normalized.split('/')
          decimal = parseFloat(parts[0]) / parseFloat(parts[1])
        } else {
          decimal = parseFloat(normalized)
        }
        parsed = decimal
        isCorrect = isFinite(decimal) && Math.abs(decimal - prob.correct) < 0.001
      } else {
        // Strip unit symbols (e.g. €, $, letters) — keep digits, decimal point, minus
        const numericOnly = normalized.replace(/[^\d.-]/g, '')
        parsed = Number(numericOnly)
        isCorrect = isFinite(parsed) && Math.abs(parsed - prob.correct) < 0.001
      }
    } else if (prob.type === 'gemischte-zahlen') {
      const candidateValue = String(overrideValue ?? inputValue ?? '').trim()
      if (prob.direction === 'mixed-to-improper') {
        const match = candidateValue.match(/^(\d+)\s*\/\s*(\d+)$/)
        if (match && Number(match[2]) !== 0) {
          const numerator = Number(match[1])
          const denominator = Number(match[2])
          parsed = `${numerator}/${denominator}`
          isCorrect = numerator * prob.denominator === prob.improperNumerator * denominator
        }
      } else {
        const match = candidateValue.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
        if (match && Number(match[3]) !== 0 && Number(match[2]) < Number(match[3])) {
          const whole = Number(match[1])
          const numerator = Number(match[2])
          const denominator = Number(match[3])
          parsed = `${whole} ${numerator}/${denominator}`
          isCorrect = (whole * denominator + numerator) * prob.denominator === prob.improperNumerator * denominator
        }
      }
    } else if (prob.type === 'dezimalbrueche') {
      const candidateValue = String(overrideValue ?? inputValue ?? '').trim()
      if (prob.direction === 'decimal-to-fraction') {
        const match = candidateValue.match(/^(\d+)\s*\/\s*(\d+)$/)
        if (match && Number(match[2]) !== 0) {
          const numerator = Number(match[1])
          const denominator = Number(match[2])
          parsed = `${numerator}/${denominator}`
          isCorrect = numerator * prob.denominator === prob.numerator * denominator
        }
      } else if (prob.isRecurring) {
        const normalized = candidateValue.replace(/\s/g, '')
        const alternate = prob.decimalDisplay.replace(/\((\d+)\)/, (_, period) => `${period.repeat(3)}...`)
        const overline = prob.decimalDisplay.replace(/\((\d+)\)/g, (_, period) => period.split('').map(digit => `${digit}\u0305`).join(''))
        const markedOverline = prob.decimalDisplay.replace(/\((\d+)\)/g, (_, period) => `\u2063${period}`)
        parsed = candidateValue
        isCorrect = normalized === prob.decimalDisplay || normalized === overline || normalized === markedOverline || normalized === alternate
      } else {
        const decimal = Number(candidateValue.replace(',', '.'))
        parsed = candidateValue
        isCorrect = Number.isFinite(decimal) && Math.abs(decimal - prob.numerator / prob.denominator) < 0.000001
      }
    } else {
      const candidateValue = overrideValue ?? inputValue
      const sanitized = String(candidateValue).replace(/−/g, '-')
      parsed = Number(sanitized)
      isCorrect = parsed === prob.correct
    }

    // Schriftlich and Prozentrechnung mit Gleichungen allow one correction on
    // the current task. Keep that task as one progress entry and make its
    // assisted completion visible instead of showing a red and a green entry.
    const previousAnswer = answers[answers.length - 1]
    const canBeCorrected = prob.type === 'schriftlich' || prob.type === 'prozent-gleichung'
    const wasCorrected = canBeCorrected && isCorrect && previousAnswer?.id === prob.id && previousAnswer.isCorrect === false
    const newEntry = {
      ...prob,
      user: parsed,
      isCorrect,
      assisted: wasCorrected,
      schriftlichSnapshot: prob.type === 'schriftlich' ? schriftlichInput : undefined
    }
    const newAnswers = wasCorrected
      ? [...answers.slice(0, -1), newEntry]
      : [...answers, newEntry]

    if (isCorrect) {
      setAnswers(newAnswers)
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
        setSchriftlichCheckMode(false)
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
    } else if (prob.type === 'schriftlich') {
      // For schriftlich: record the strike, mark wrong cells in-place
      setAnswers(newAnswers)
      pauseTimerRef.current = true
      setSchriftlichCheckMode(true)
    } else {
      // Wrong answer: show mistake panel and pause timer
      setAnswers(newAnswers)
      const rawUserAnswer = String(overrideValue ?? inputValue ?? '').trim() || String(parsed ?? '?')
      const userAnswerDisplay = prob.type === 'primfaktorisierung'
        ? rawUserAnswer.trim().split(/\s+/).filter(Boolean).join(' · ')
        : prob.type === 'binomische'
          ? rawUserAnswer.replace(/\^2/g, '²').replace(/\^3/g, '³')
        : prob.type === 'prozent-gleichung'
            ? (prob.variant === 'findeFaktor' || prob.variant === 'findeProzentsatz')
              ? `x = ${rawUserAnswer}`
              : `x = ${rawUserAnswer}${prob.unit ? ' ' + prob.unit : ''}`
            : prob.type === 'gemischte-zahlen'
              ? rawUserAnswer
            : prob.type === 'dezimalbrueche'
              ? rawUserAnswer
            : rawUserAnswer
      setMistakeState({
        userAnswerDisplay,
        correctAnswerDisplay: formatCorrectAnswerOptions(prob).join('\n'),
        field: prob.type === 'prozent-gleichung' ? 'result' : 'other'
      })
      pauseTimerRef.current = true
    }
  }

  const dismissMistake = () => {
    setMistakeState(null)
    pauseTimerRef.current = false
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
    const [minScore] = getCategoryPerformanceScore(activeCategory)
    if (cc < minScore) {
      setLeaderboardQualifies(false)
      return
    }
    fetch(`/api/leaderboard?category=${activeCategory}`)
      .then(r => r.json())
      .then(board => {
        setLeaderboardData(board)
        const qualifies = board.length < 20 ||
          cc > board[19].score ||
          (cc === board[19].score && wc < board[19].wrongCount)
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

  // The visible continue button receives focus after an error, so Enter activates it.
  useEffect(() => {
    if (!mistakeState) return
    requestAnimationFrame(() => weiterButtonRef.current?.focus())
  }, [mistakeState])

  // Virtual keyboard visibility: OS heuristic for default, persisted in a cookie.
  // Android / iOS → show by default. Windows / macOS → hide by default.
  const [showVirtualKB, setShowVirtualKB] = useState(() => {
    if (typeof window === 'undefined') return false
    // Check cookie first
    const cookie = document.cookie.split('; ').find(r => r.startsWith('vkb='))
    if (cookie) return cookie.split('=')[1] === '1'
    // OS heuristic
    const ua = navigator.userAgent
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)
    return isMobile
  })

  const toggleVirtualKB = () => {
    setShowVirtualKB(v => {
      const next = !v
      document.cookie = `vkb=${next ? '1' : '0'};path=/;max-age=31536000;samesite=strict`
      return next
    })
  }

  // If a real (trusted) keyboard event is detected, auto-hide the virtual keyboard
  useEffect(() => {
    const handlePhysicalKey = (e) => {
      if (e.isTrusted && e.key && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setShowVirtualKB(prev => {
          if (!prev) return prev
          document.cookie = `vkb=0;path=/;max-age=31536000;samesite=strict`
          return false
        })
      }
    }
    window.addEventListener('keydown', handlePhysicalKey)
    return () => window.removeEventListener('keydown', handlePhysicalKey)
  }, [])

  // Track the last focused game input element so virtual keyboard can restore focus
  useEffect(() => {
    if (!started || finished) return
    const handler = (e) => {
      const t = e.target
      if (t && t !== document.body && t.tagName !== 'BUTTON' && t.tagName !== 'A') {
        lastGameInputRef.current = t
      }
    }
    document.addEventListener('focusin', handler, true)
    return () => document.removeEventListener('focusin', handler, true)
  }, [started, finished])

  const handleVirtualKey = (key) => {
    let el = document.activeElement
    // Fall back to last known game input if nothing is focused, or if a button/link
    // has stolen focus (happens on touch devices where mousedown fires after focus)
    if (!el || el === document.body || el.tagName === 'BUTTON' || el.tagName === 'A') {
      el = lastGameInputRef.current
      if (el) el.focus()
      el = document.activeElement
    }
    if (!el || el === document.body) return
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  }

  const handleSchriftlichSubmit = () => {
    if (schriftlichCheckMode) {
      setSchriftlichCheckMode(false)
      pauseTimerRef.current = false
    }
    submitAnswer()
  }

  return (
    <div className="app">
      <Logo />
      {toast && (
        <div className="copy-toast" role="status">{toast}</div>
      )}
      {connectionLost && (
        <div className="connection-lost-notice" role="alert">
          <span aria-hidden="true">!</span>
          Verbindung zum Server unterbrochen. Wir versuchen, dich wieder zu verbinden.
        </div>
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
                <div className="waiting-room">
                  <div className="waiting-animation" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p className={`waiting-connection ${isConnected ? 'connected' : 'connecting'}`} role="status">
                    <span aria-hidden="true" />
                    {isConnected ? 'Mit dem Server verbunden' : 'Verbindung wird hergestellt'}
                  </p>
                  <h2>{isConnected ? 'Alles bereit!' : 'Einen Moment bitte …'}</h2>
                  <p className="waiting-room-message">
                    {isConnected
                      ? 'Warte auf den Start durch deine Lehrkraft.'
                      : 'Wir verbinden dich mit dem Raum.'}
                  </p>
                  <div className="waiting-room-details">
                    <span>Raum <strong>{roomId?.toLowerCase()}</strong></span>
                    {username && <span>Du bist <strong>{username}</strong></span>}
                    <span>Kategorie <strong>{activeCategoryLabel}</strong></span>
                  </div>
                  {renderCategoryDescription(multiplayerCategory)}
                </div>
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
            <div className="player-game-progress" aria-label={`${answers.length} Aufgaben bearbeitet: ${correctCount} richtig, ${wrongCount} falsch`}>
              <div className="player-progress">
                {answers.map((answer, index) => (
                  <span
                    key={`${answer.id}-${index}`}
                    className={`progress-segment ${answer.assisted ? 'assisted' : answer.isCorrect ? 'correct' : 'incorrect'}`}
                    aria-label={`Aufgabe ${index + 1}: ${answer.assisted ? 'mit Hilfe gelöst' : answer.isCorrect ? 'richtig' : 'falsch'}`}
                    title={answer.assisted ? 'Mit Hilfe gelöst' : answer.isCorrect ? 'Richtig' : 'Falsch'}
                  />
                ))}
                {!mistakeState && (
                  <span className="progress-segment progress-segment--current" aria-label="Aktuell bearbeitete Aufgabe" />
                )}
              </div>
            </div>
            <div className="score-timer">Zeit: {formatTime(timeLeft)}</div>
          </div>

          <>
            <>
              <div className={`question${flashResult === 'correct' ? ' question--correct' : ''}${mistakeState || schriftlichCheckMode ? ' question--wrong' : ''}`}>
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
                    crossedOut={Boolean(mistakeState)}
                    mistakeFeedback={mistakeState}
                  />
                ) : problems[current].type === 'schriftlich' ? (
                  <>
                  {problems[current].operation === 'divide' ? <SchriftlicheDivision
                    key={problems[current].id}
                    dividend={problems[current].a}
                    divisor={problems[current].b}
                    correctDigits={problems[current].correctDigits}
                    divisionSteps={problems[current].divisionSteps}
                    onChange={setSchriftlichInput}
                    onEnter={handleSchriftlichSubmit}
                    checkMode={schriftlichCheckMode}
                  /> : <Schriftlich
                    key={problems[current].id}
                      aDigits={problems[current].aDigits}
                      bDigits={problems[current].bDigits}
                      summandsDigits={problems[current].summandsDigits}
                      correctDigits={problems[current].correctDigits}
                      partialProducts={problems[current].partialProducts}
                      operation={problems[current].operation}
                      onChange={setSchriftlichInput}
                    onEnter={handleSchriftlichSubmit}
                    checkMode={schriftlichCheckMode}
                  />}
                    {schriftlichCheckMode && (
                      <p className="schriftlich-correction-hint">Noch nicht ganz richtig — bitte korrigiere die falschen Zahlen.</p>
                    )}
                    <div className="question-bottom-actions">
                      <button
                        type="button"
                        className="big schriftlich-check-button"
                        onClick={handleSchriftlichSubmit}
                        disabled={!schriftlichInput?.valid || flashResult === 'correct'}
                      >
                        Prüfen
                      </button>
                    </div>
                  </>
                ) : problems[current].type === 'multiplication' ? (
                  <Einmaleins
                    key={problems[current].id}
                    a={problems[current].a}
                    b={problems[current].b}
                    value={inputValue}
                    onChange={setInputValue}
                    onEnter={submitAnswer}
                    showTick={flashResult === 'correct'}
                    crossedOut={Boolean(mistakeState)}
                    mistakeFeedback={mistakeState}
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
                    crossedOut={Boolean(mistakeState)}
                    mistakeFeedback={mistakeState}
                  />
                ) : problems[current].type === 'gemischte-zahlen' ? (
                  <GemischteZahlen
                    key={problems[current].id}
                    problem={problems[current]}
                    value={inputValue}
                    onChange={setInputValue}
                    onEnter={submitAnswer}
                    showTick={flashResult === 'correct'}
                    crossedOut={Boolean(mistakeState)}
                    mistakeFeedback={mistakeState}
                  />
                ) : problems[current].type === 'dezimalbrueche' ? (
                  <Dezimalbrueche
                    key={problems[current].id}
                    problem={problems[current]}
                    value={inputValue}
                    onChange={setInputValue}
                    onEnter={submitAnswer}
                    showTick={flashResult === 'correct'}
                    crossedOut={Boolean(mistakeState)}
                    mistakeFeedback={mistakeState}
                  />
                ) : problems[current].type === 'binomische' ? (
                  <Binomische
                    key={problems[current].id}
                    expression={problems[current].expression}
                    value={inputValue}
                    onChange={setInputValue}
                    onEnter={submitAnswer}
                    showTick={flashResult === 'correct'}
                    crossedOut={Boolean(mistakeState)}
                    mistakeFeedback={mistakeState}
                  />
                ) : problems[current].type === 'prozent-gleichung' ? (
                  <ProzentGleichung
                    key={problems[current].id}
                    problem={problems[current]}
                    onEnter={submitAnswer}
                    onEquationError={recordEquationError}
                    showTick={flashResult === 'correct'}
                    crossedOutEquation={false}
                    crossedOutResult={mistakeState?.field === 'result'}
                    mistakeFeedback={mistakeState?.field === 'equation' || mistakeState?.field === 'result' ? { ...mistakeState, onContinue: dismissMistake } : null}
                    continueButtonRef={weiterButtonRef}
                  />
                ) : null}
                {mistakeState && problems[current].type !== 'prozent-gleichung' && (
                  <div className="question-bottom-actions">
                    <button ref={weiterButtonRef} onClick={dismissMistake} className="big">Weiter</button>
                  </div>
                )}
              </div>

              <div className="controls">
                <button
                  className="virtual-kb-toggle"
                  onMouseDown={e => e.preventDefault()}
                  onClick={toggleVirtualKB}
                  aria-label={showVirtualKB ? 'Tastatur ausblenden' : 'Tastatur einblenden'}
                  title={showVirtualKB ? 'Tastatur ausblenden' : 'Tastatur einblenden'}
                >
                  <svg aria-hidden width="1.3em" height="1.3em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="6" y1="9" x2="6" y2="9" strokeWidth="3"/>
                    <line x1="10" y1="9" x2="10" y2="9" strokeWidth="3"/>
                    <line x1="14" y1="9" x2="14" y2="9" strokeWidth="3"/>
                    <line x1="18" y1="9" x2="18" y2="9" strokeWidth="3"/>
                    <line x1="6" y1="13" x2="6" y2="13" strokeWidth="3"/>
                    <line x1="10" y1="13" x2="10" y2="13" strokeWidth="3"/>
                    <line x1="14" y1="13" x2="14" y2="13" strokeWidth="3"/>
                    <line x1="18" y1="13" x2="18" y2="13" strokeWidth="3"/>
                    <line x1="8" y1="17" x2="16" y2="17" strokeWidth="3"/>
                  </svg>
                </button>
              </div>
              {showVirtualKB && !mistakeState && (
                <VirtualKeyboard
                  category={problems[current]?.type}
                  variable={problems[current]?.variable}
                  onKey={handleVirtualKey}
                />
              )}
            </>

        </>
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
              <div className="leaderboard-qualify-title">&#127942; Top 20!</div>
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
                  {selectedSchriftlich.operation === 'divide' ? <SchriftlicheDivision
                    key={`review-user-${selectedSchriftlich.id}`}
                    dividend={selectedSchriftlich.a}
                    divisor={selectedSchriftlich.b}
                    correctDigits={selectedSchriftlich.correctDigits}
                    divisionSteps={selectedSchriftlich.divisionSteps}
                    initialState={selectedSchriftlich.schriftlichSnapshot}
                    review
                  /> : <Schriftlich
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
                  />}
                </div>
                <div>
                  <h5 style={{ marginTop: 0 }}>Lösung</h5>
                  {selectedSchriftlich.operation === 'divide' ? <SchriftlicheDivision
                    key={`review-solution-${selectedSchriftlich.id}`}
                    dividend={selectedSchriftlich.a}
                    divisor={selectedSchriftlich.b}
                    correctDigits={selectedSchriftlich.correctDigits}
                    divisionSteps={selectedSchriftlich.divisionSteps}
                    initialState={selectedSchriftlich.schriftlichSnapshot}
                    review
                    showCorrect
                  /> : <Schriftlich
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
                  />}
                </div>
              </div>
            </div>
          )}
        </main>
      )}

    </div>
  )
}
