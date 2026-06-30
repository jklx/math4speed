import React, { useState } from 'react'
import AlgebraicInput from './AlgebraicInput'

// ─── Equation evaluator (safe, no eval) ────────────────────────────────────
// Evaluates one side of a linear equation in x for a given x value.
function evalSide(expr, xVal) {
  let s = expr
    .trim()
    .replace(/,/g, '.')
    .replace(/−/g, '-')
    .replace(/·/g, '*')
    .replace(/\s/g, '')

  // Implicit multiplication: 0.25x → 0.25*x, 2(x) → 2*(x)
  s = s.replace(/(\d)(x)/gi, '$1*$2').replace(/(\d)\(/g, '$1*(').replace(/\)(x)/gi, ')*$2')

  let pos = 0

  const cur = () => s[pos]

  function parseAddSub() {
    let sign = 1
    if (cur() === '-') { pos++; sign = -1 }
    let val = sign * parseMulDiv()
    while (pos < s.length && (cur() === '+' || cur() === '-')) {
      const op = cur(); pos++
      val = op === '+' ? val + parseMulDiv() : val - parseMulDiv()
    }
    return val
  }

  function parseMulDiv() {
    let val = parseAtom()
    while (pos < s.length && (cur() === '*' || cur() === '/')) {
      const op = cur(); pos++
      const rhs = parseAtom()
      val = op === '*' ? val * rhs : val / rhs
    }
    return val
  }

  function parseAtom() {
    if (cur() === '(') {
      pos++
      const val = parseAddSub()
      if (cur() === ')') pos++
      return val
    }
    if (cur() === 'x' || cur() === 'X') { pos++; return xVal }
    const start = pos
    while (pos < s.length && /[\d.]/.test(cur())) pos++
    if (pos === start) throw new Error(`unexpected char "${cur()}" at pos ${pos}`)
    return parseFloat(s.slice(start, pos))
  }

  return parseAddSub()
}

/**
 * Validates the student's equation string against the expected answer.
 * Returns { valid, equalsCorrect }
 *   valid        – equation has '=', contains 'x', and is parseable
 *   equalsCorrect – equation is satisfied by x=expectedX AND is not a tautology
 *                  (i.e. does NOT hold for a clearly different x value)
 */
function validateEquation(equationStr, expectedX) {
  const s = equationStr.replace(/\s/g, '')
  if (!s.includes('=')) return { valid: false, reason: 'no_equals' }
  if (!/x/i.test(s)) return { valid: false, reason: 'no_x' }
  const eqIdx = s.indexOf('=')
  const leftStr = s.slice(0, eqIdx)
  const rightStr = s.slice(eqIdx + 1)
  if (!leftStr || !rightStr) return { valid: false, reason: 'bad_format' }
  try {
    // Check 1: equation holds for the correct x
    const lv = evalSide(leftStr, expectedX)
    const rv = evalSide(rightStr, expectedX)
    if (Math.abs(lv - rv) > 0.01) return { valid: true, equalsCorrect: false }

    // Check 2: must NOT hold for a different x — reject tautologies like x=x
    const altX = expectedX === 0 ? 1 : expectedX * 2 + 7
    const lv2 = evalSide(leftStr, altX)
    const rv2 = evalSide(rightStr, altX)
    if (Math.abs(lv2 - rv2) < 0.01) return { valid: false, reason: 'tautology' }

    return { valid: true, equalsCorrect: true }
  } catch {
    return { valid: false, reason: 'parse_error' }
  }
}

// ─── Small tick mark (like in Binomische) ──────────────────────────────────
const TickMark = ({ visible }) => (
  <svg viewBox="8 14 36 26" className="tick-svg tick-svg--small" aria-hidden style={{ visibility: visible ? 'visible' : 'hidden' }}>
    <path d="M14 27 l9 9 l16 -16" className="tick-check" />
  </svg>
)

// ─── Component ──────────────────────────────────────────────────────────────
export default function ProzentGleichung({ problem, onEnter, onEquationError, showTick }) {
  const [step, setStep] = useState(1)
  const [equationValue, setEquationValue] = useState('')
  const [equationError, setEquationError] = useState(null)
  const [equationRevealed, setEquationRevealed] = useState(false)
  const [resultValue, setResultValue] = useState('')

  const handleEquationEnter = () => {
    const trimmed = equationValue.trim()
    if (!trimmed) return

    const result = validateEquation(trimmed, problem.correct)

    if (!result.valid) {
      const msg =
        result.reason === 'no_equals'   ? 'Die Gleichung muss ein „=" enthalten.' :
        result.reason === 'no_x'        ? 'Die Gleichung muss die Variable x enthalten.' :
        result.reason === 'bad_format'  ? 'Die Gleichung hat kein linkes oder rechtes Ergebnis.' :
        result.reason === 'tautology'   ? 'Diese Gleichung gilt für jedes x – bitte stelle eine konkrete Gleichung auf.' :
        'Die Gleichung konnte nicht ausgewertet werden – bitte überprüfen.'
      setEquationError(msg)
      return
    }

    if (!result.equalsCorrect) {
      onEquationError?.()
      setEquationValue(problem.exampleEquation || '')
      setEquationRevealed(true)
      setEquationError(null)
      setStep(2)
      return
    }

    setEquationError(null)
    setStep(2)
  }

  const handleResultEnter = () => {
    const val = resultValue.trim()
    if (!val) return
    // Normalize German decimal comma before passing to submitAnswer
    onEnter(val.replace(',', '.'))
  }

  // ── Step 1: equation input ─────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="question-centered prozent-gleichung">
        <p className="prozent-problem-text">{problem.text}</p>

        <div className="prozent-step-label">Stelle eine Gleichung für <strong>x</strong> auf:</div>
        <div className="prozent-equation-row">
          <AlgebraicInput
            value={equationValue}
            onChange={val => { setEquationValue(val); setEquationError(null) }}
            onEnter={handleEquationEnter}
            autoFocus={true}
            placeholder="z.B. 0,25·x = 75"
            className="app-input math-input"
            style={{ width: '340px', textAlign: 'left' }}
          />
        </div>

        {equationError && (
          <div className="prozent-equation-error" role="alert">{equationError}</div>
        )}

        <button onClick={handleEquationEnter} className="big" style={{ marginTop: '0.75rem' }}>
          Gleichung bestätigen
        </button>
      </div>
    )
  }

  // ── Step 2: compute and enter x ───────────────────────────────────────
  return (
    <div className="question-centered prozent-gleichung">
      <p className="prozent-problem-text prozent-problem-text--secondary">{problem.text}</p>

      <div className={`prozent-equation-confirmed${equationRevealed ? ' prozent-equation-confirmed--revealed' : ''}`}>
        <AlgebraicInput
          value={equationValue}
          onChange={() => {}}
          onEnter={() => {}}
          readOnly={true}
          className=""
          style={{ flex: 1 }}
        />
        <TickMark visible={!equationRevealed} />
      </div>
      {equationRevealed && (
        <div className="prozent-equation-revealed-hint">Richtige Gleichung eingetragen – Fehler gezählt.</div>
      )}

      <div className="prozent-step-label">
        Berechne <strong>x</strong>
        {problem.unit ? ` (in ${problem.unit})` : ''}:
      </div>
      {(problem.variant === 'findeProzentsatz' || problem.variant === 'findeFaktor') && (
        <div className="hint" style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          Du kannst das Ergebnis als Dezimalzahl (z.B. 0,2) oder Prozent (z.B. 20%) angeben.
        </div>
      )}

      <div className="einmaleins-row" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <div className="expression">
          <math display="inline" style={{ fontSize: '2rem' }}>
            <mrow>
              <mi>x</mi>
              <mo style={{ margin: '0 0.2em' }}>=</mo>
            </mrow>
          </math>
        </div>
        <AlgebraicInput
          value={resultValue}
          onChange={setResultValue}
          onEnter={handleResultEnter}
          autoFocus={true}
          placeholder="Ergebnis…"
          className="app-input math-input"
          style={{ width: '160px', textAlign: 'left' }}
        />
        <TickMark visible={showTick} />
      </div>

      <button onClick={handleResultEnter} className="big" style={{ marginTop: '0.75rem' }}>
        Lösung einreichen
      </button>
    </div>
  )
}
