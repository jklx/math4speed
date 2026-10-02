import React from 'react'
import AlgebraicInput from './AlgebraicInput'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'
import RootSign from './components/RootSign'
import RootInputDisplay from './components/RootInputDisplay'

export function RootExpression({ nodes }) {
  if (Array.isArray(nodes)) return <span>{nodes.map((node, index) => <RootExpression key={index} nodes={node} />)}</span>
  if (typeof nodes !== 'object' || nodes === null) return <span>{nodes}</span>
  if (nodes.root) return <RootSign>{nodes.root}</RootSign>
  if (nodes.base) return <span>(<RootExpression nodes={nodes.base} />)<sup>{nodes.exponent}</sup></span>
  return <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em' }}><span style={{ borderBottom: '1.5px solid currentColor', padding: '0 0.15em 0.08em' }}><RootExpression nodes={nodes.numerator} /></span><span style={{ padding: '0.08em 0.15em 0' }}><RootExpression nodes={nodes.denominator} /></span></span>
}

export default function Wurzeln({ problem, value = '', onChange, onEnter, showTick = false, mistakeFeedback, readOnly = false }) {
  return <div className="question-centered">
    {problem.variable && <p>Für diese Aufgabe gilt: {problem.variable} &gt; 0.</p>}
    <div className="einmaleins-row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
      <span role="math" style={{ fontSize: '2rem' }} aria-label={problem.expression}><RootExpression nodes={problem.nodes ?? problem.expression} /> =</span>
      <AlgebraicInput value={value} onChange={onChange} onEnter={onEnter} autoFocus={!readOnly}
        enableRoots
        renderValue={(text, cursorIndex, showCursor) => <RootInputDisplay value={text} cursorIndex={cursorIndex} showCursor={showCursor} />}
        readOnly={readOnly || Boolean(mistakeFeedback)} crossedOut={Boolean(mistakeFeedback)}
        placeholder="Ergebnis…" className="app-input math-input" style={{ width: '220px', textAlign: 'left' }} />
      {!readOnly && !mistakeFeedback && <InlineSubmitButton onClick={() => onEnter?.()} />}
    </div>
    {!readOnly && <p className="review-note">Vollständig vereinfachen. Wurzel: √5 oder sqrt(5); Hochzahl: x^2.</p>}
    {mistakeFeedback && <div className="inline-feedback"><div className="inline-feedback__label">Richtige Lösung</div><div className="inline-feedback__value">{mistakeFeedback.correctAnswerDisplay}</div></div>}
    <TickMark visible={showTick} />
  </div>
}
