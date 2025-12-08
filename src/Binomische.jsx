import React from 'react'
import AlgebraicInput from './AlgebraicInput'

export default function Binomische({ expression, value = '', onChange, onEnter }) {
  
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
    </div>
  )
}
