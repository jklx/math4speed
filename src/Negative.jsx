import React from 'react'

const TickMark = ({ visible }) => (
  <svg viewBox="8 14 36 26" className="tick-svg tick-svg--small" aria-hidden style={{ visibility: visible ? 'visible' : 'hidden' }}>
    <path d="M14 27 l9 9 l16 -16" className="tick-check" />
  </svg>
)

export default function Negative({ a, b, operator, value = '', onChange, onEnter, explicitPlus, showTick = false }) {
  const handleKey = (e) => {
    if (e.key === 'Enter') {
      onEnter && onEnter()
    }
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
      <input
        type="text"
        inputMode="numeric"
        className="app-input math-input"
        autoFocus
        value={value}
        onChange={e => onChange && onChange(e.target.value.replace('-', '−'))}
        onKeyDown={handleKey}
      />
      <TickMark visible={showTick} />
    </div>
  )
}
