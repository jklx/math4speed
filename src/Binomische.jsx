import React from 'react'
import AlgebraicInput from './AlgebraicInput'

const TickMark = ({ visible }) => (
  <svg viewBox="8 14 36 26" className="tick-svg tick-svg--small" aria-hidden style={{ visibility: visible ? 'visible' : 'hidden' }}>
    <path d="M14 27 l9 9 l16 -16" className="tick-check" />
  </svg>
)

export default function Binomische({ expression, value = '', onChange, onEnter, showTick = false }) {
  
  return (
    <div className="question-centered einmaleins-row" style={{ alignItems: 'flex-start' }}>
      <div className="expression" style={{ marginTop: '0.3rem' }}>
        <math display="inline" style={{ fontSize: '2rem' }}>
          <mrow>
            <mtext>{expression}</mtext>
            <mo style={{ margin: '0 0.2em' }}>=</mo>
          </mrow>
        </math>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <AlgebraicInput
          value={value}
          onChange={onChange}
          onEnter={onEnter}
          autoFocus={true}
          placeholder="Ergebnis..."
          className="app-input math-input"
          style={{ width: '300px', textAlign: 'left' }}
        />
      </div>
      <TickMark visible={showTick} />
    </div>
  )
}
