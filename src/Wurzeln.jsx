import React from 'react'
import AlgebraicInput from './AlgebraicInput'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'
import RootInputDisplay from './components/RootInputDisplay'
import RootExpression from './components/RootExpression'
import FormattedRootText from './components/FormattedRootText'
import WurzelnSolution from './components/WurzelnSolution'

export default function Wurzeln({ problem, value = '', onChange, onEnter, showTick = false, mistakeFeedback, readOnly = false }) {
  return <div className="question-centered">
    {problem.variable && <p>Für diese Aufgabe gilt: {problem.variable} &gt; 0.</p>}
    <div className="einmaleins-row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
      <span role="math" style={{ fontSize: '2rem' }} aria-label={problem.expression}><RootExpression nodes={problem.nodes ?? problem.expression} /> =</span>
      <AlgebraicInput value={value} onChange={onChange} onEnter={onEnter} autoFocus={!readOnly}
        enableRoots
        renderValue={(text, cursorIndex, showCursor) => readOnly || mistakeFeedback
          ? <FormattedRootText>{text}</FormattedRootText>
          : <RootInputDisplay value={text} cursorIndex={cursorIndex} showCursor={showCursor} />}
        readOnly={readOnly || Boolean(mistakeFeedback)} crossedOut={Boolean(mistakeFeedback)}
        placeholder="Ergebnis…" className="app-input math-input" style={{ width: '220px', textAlign: 'left' }} />
      {!readOnly && !mistakeFeedback && <InlineSubmitButton onClick={() => onEnter?.()} />}
    </div>
    {!readOnly && <p className="review-note">Vollständig vereinfachen. Wurzel mit dem √-Knopf einfügen; Hochzahl als <kbd>x^2</kbd> eingeben.</p>}
    {mistakeFeedback && <div className="inline-feedback"><div className="inline-feedback__label">Richtige Lösung</div><div className="inline-feedback__value"><FormattedRootText>{mistakeFeedback.correctAnswerDisplay}</FormattedRootText></div></div>}
    {mistakeFeedback && <WurzelnSolution problem={problem} />}
    <TickMark visible={showTick} />
  </div>
}
