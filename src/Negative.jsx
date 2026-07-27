import React, { useRef, useEffect, useState } from 'react'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'

export default function Negative({ a, b, operator, value = '', onChange, onEnter, explicitPlus, showTick = false, crossedOut = false, mistakeFeedback = null }) {
  const ref = useRef(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => { ref.current?.focus() }, [])

  useEffect(() => {
    if (mistakeFeedback) return
    const activeElement = document.activeElement
    if (activeElement === document.body || activeElement === null) {
      const frame = requestAnimationFrame(() => ref.current?.focus())
      return () => cancelAnimationFrame(frame)
    }
  }, [value, mistakeFeedback])

  const handleKey = (e) => {
    if (mistakeFeedback) { e.preventDefault(); return }
    if (e.key === 'Enter') { e.preventDefault(); onEnter?.(); return }
    if (e.key === 'Backspace') { e.preventDefault(); onChange?.(value.slice(0, -1)); return }
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); onChange?.(value + e.key); return }
    if ((e.key === '-' || e.key === '\u2212') && value === '') { e.preventDefault(); onChange?.('\u2212') }
  }

  const renderOperand = (val) => {
    if (val < 0) {
      return (
        <mrow>
          <mo>(</mo>
          <mn>{String(val).replace('-', '−')}</mn>
          <mo>)</mo>
        </mrow>
      )
    }
    if (explicitPlus && val > 0) {
      return (
        <mrow>
          <mo>(</mo>
          <mn>+{val}</mn>
          <mo>)</mo>
        </mrow>
      )
    }
    return <mn>{val}</mn>
  }

  return (
    <div className="question-centered">
      <div className="einmaleins-row">
        <div className="expression">
          <math display="inline" style={{ fontSize: '2rem' }}>
            <mrow>
              {renderOperand(a)}
              <mo style={{ margin: '0 0.2em' }}>{operator}</mo>
              {renderOperand(b)}
              <mo style={{ margin: '0 0.2em' }}>=</mo>
            </mrow>
          </math>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            ref={ref}
            tabIndex={mistakeFeedback ? -1 : 0}
            className={`math-input fake-input answer-input${focused ? ' fake-input--focused' : ''}${mistakeFeedback ? ' fake-input--disabled' : ''}`}
            style={{ color: mistakeFeedback || crossedOut ? '#b91c1c' : undefined }}
            onKeyDown={handleKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-disabled={mistakeFeedback ? 'true' : 'false'}
          >
            {value}
            {!mistakeFeedback && focused && <span className="fake-input__cursor" aria-hidden />}
          </div>
          {!mistakeFeedback && <InlineSubmitButton onClick={() => onEnter?.()} />}
        </div>
      </div>
      {mistakeFeedback?.correctAnswerDisplay && (
        <div className="inline-feedback">
          <div className="inline-feedback__label">Richtige Lösung</div>
          <div className="inline-feedback__value">{mistakeFeedback.correctAnswerDisplay}</div>
        </div>
      )}
      <TickMark visible={showTick} />
    </div>
  )
}
