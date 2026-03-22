import React, { useRef, useEffect, useState } from 'react'

const TickMark = ({ visible }) => (
  <svg viewBox="8 14 36 26" className="tick-svg tick-svg--small" aria-hidden style={{ visibility: visible ? 'visible' : 'hidden' }}>
    <path d="M14 27 l9 9 l16 -16" className="tick-check" />
  </svg>
)

export default function Negative({ a, b, operator, value = '', onChange, onEnter, explicitPlus, showTick = false }) {
  const ref = useRef(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => { ref.current?.focus() }, [])

  const handleKey = (e) => {
    if (e.key === 'Enter') { onEnter?.(); return }
    if (e.key === 'Backspace') { onChange?.(value.slice(0, -1)); return }
    if (/^[0-9]$/.test(e.key)) { onChange?.(value + e.key); return }
    if ((e.key === '-' || e.key === '\u2212') && value === '') onChange?.('\u2212')
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
    <div className="question-centered einmaleins-row">
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
      <div
        ref={ref}
        tabIndex={0}
        className={`math-input fake-input${focused ? ' fake-input--focused' : ''}`}
        onKeyDown={handleKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {value}
        {focused && <span className="fake-input__cursor" aria-hidden />}
      </div>
      <TickMark visible={showTick} />
    </div>
  )
}
