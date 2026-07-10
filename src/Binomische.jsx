import React from 'react'
import AlgebraicInput from './AlgebraicInput'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'

export default function Binomische({ expression, value = '', onChange, onEnter, showTick = false, crossedOut = false, mistakeFeedback = null }) {
  
  return (
    <div className="question-centered" style={{ alignItems: 'flex-start' }}>
      <div className="einmaleins-row" style={{ alignItems: 'flex-start' }}>
        <div className="expression" style={{ marginTop: '0.3rem' }}>
          <math display="inline" style={{ fontSize: '2rem' }}>
            <mrow>
              <mtext>{expression}</mtext>
              <mo style={{ margin: '0 0.2em' }}>=</mo>
            </mrow>
          </math>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlgebraicInput
            value={value}
            onChange={onChange}
            onEnter={onEnter}
            autoFocus={true}
            crossedOut={Boolean(mistakeFeedback) || crossedOut}
            readOnly={Boolean(mistakeFeedback)}
            placeholder="Ergebnis..."
            className="app-input math-input"
            style={{ width: '300px', textAlign: 'left' }}
          />
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
