import React, { useState } from 'react'
import AlgebraicInput from './AlgebraicInput'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'

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
// ─── Component ──────────────────────────────────────────────────────────────
export default function ProzentGleichung({ problem, onEnter, onEquationError, showTick, crossedOutEquation, mistakeFeedback }) {
  const [step, setStep] = useState(1)
  const [equationValue, setEquationValue] = useState('')
  const [equationRevealed, setEquationRevealed] = useState(false)
  const [resultValue, setResultValue] = useState('')

  const handleEquationEnter = () => {
    const trimmed = equationValue.trim()
    if (!trimmed) return

    const result = validateEquation(trimmed, problem.correct)

    if (!result.valid || !result.equalsCorrect) {
      onEquationError?.(trimmed)
      setEquationRevealed(true)
      setStep(2)
      return
    }

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
            onChange={setEquationValue}
            onEnter={handleEquationEnter}
            autoFocus={true}
            placeholder="z.B. 0,25·x = 75"
            className="app-input math-input"
            style={{ width: 'min(100%, 620px)', textAlign: 'left' }}
          />
          <InlineSubmitButton onClick={handleEquationEnter} />
        </div>
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
          crossedOut={crossedOutEquation || mistakeFeedback?.field === 'equation'}
          className=""
          style={{ flex: 1 }}
        />
        <TickMark visible={!equationRevealed} />
      </div>
      {mistakeFeedback?.field === 'equation' && mistakeFeedback.correctAnswerDisplay && (
        <div className="inline-feedback">
          <div className="inline-feedback__label">Richtige Lösung</div>
          <div className="inline-feedback__value">{mistakeFeedback.correctAnswerDisplay}</div>
        </div>
      )}
      {/* previously showed a revealed hint here; feedback is now inline in the main game UI */}

      {mistakeFeedback?.field !== 'equation' && (
        <>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlgebraicInput
                value={resultValue}
                onChange={setResultValue}
                onEnter={handleResultEnter}
                autoFocus={true}
                crossedOut={Boolean(mistakeFeedback?.field === 'result' && resultValue)}
                readOnly={Boolean(mistakeFeedback?.field === 'result')}
                placeholder="Ergebnis…"
                className="app-input math-input"
                style={{ width: 'clamp(160px, 28vw, 240px)', textAlign: 'left' }}
              />
              {!mistakeFeedback && <InlineSubmitButton onClick={handleResultEnter} />}
            </div>
            <TickMark visible={showTick} />
          </div>
          {mistakeFeedback?.field === 'result' && mistakeFeedback.correctAnswerDisplay && (
            <div className="inline-feedback">
              <div className="inline-feedback__label">Richtige Lösung</div>
              <div className="inline-feedback__value">{mistakeFeedback.correctAnswerDisplay}</div>
            </div>
          )}

          {mistakeFeedback && mistakeFeedback.field === 'result' && (
            <button onClick={mistakeFeedback.onContinue} className="big" style={{ marginTop: '0.75rem' }}>
              Weiter
            </button>
          )}
        </>
      )}

      {mistakeFeedback?.field === 'equation' && (
        <button onClick={mistakeFeedback.onContinue} className="big" style={{ marginTop: '0.75rem' }}>
          Weiter
        </button>
      )}
    </div>
  )
}
