import React, { useRef, useEffect, useState } from 'react'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'

export default function Einmaleins({ a, b, value = '', onChange, onEnter, showTick = false, crossedOut = false, mistakeFeedback = null }) {
  const ref = useRef(null)
  const [focused, setFocused] = useState(false)

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
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); onChange?.(value + e.key) }
  }

  return (
    <div className="question-centered">
      <div className="einmaleins-row">
        <math className="expression" aria-label={`${a} mal ${b} gleich`}>
          <mn>{a}</mn>
          <mo>&middot;</mo>
          <mn>{b}</mn>
          <mo>=</mo>
        </math>
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
