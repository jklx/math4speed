import React from 'react'
import Hauptnenner from './Hauptnenner'
import Einmaleins from './Einmaleins'
import Negative from './Negative'
import Binomische from './Binomische'
import Primfaktorisierung from './Primfaktorisierung'
import GemischteZahlen from './GemischteZahlen'
import Dezimalbrueche from './Dezimalbrueche'
import ProzentGleichung from './ProzentGleichung'
import Schriftlich from './Schriftlich'
import SchriftlicheDivision from './SchriftlicheDivision'

const displayValue = value => value == null || value === '' ? '' : String(value).replace(/(\d)\.(?=\d)/g, '$1,').replace(/-/g, '−')

// Reuse the actual pupil components, with editing and autofocus disabled.
function ReviewedProblem({ answer, solution }) {
  const value = displayValue(solution ? answer.correct : answer.equationSnapshot?.resultValue ?? (answer.user === '(Gleichung falsch)' ? '' : answer.user))
  const props = { value, readOnly: true }
  switch (answer.type) {
    case 'hauptnenner': return <Hauptnenner problem={answer} readOnly value={JSON.stringify(solution ? { first: answer.factorsA.join(' '), second: answer.factorsB.join(' '), lcm: answer.lcmFactors.join(' '), result: String(answer.correct) } : answer.hauptnennerSnapshot ?? { result: String(answer.user ?? '') })} />
    case 'multiplication': return <Einmaleins {...props} a={answer.a} b={answer.b} />
    case 'negative': return <Negative {...props} a={answer.a} b={answer.b} operator={answer.operator} explicitPlus={answer.explicitPlus} />
    case 'binomische': return <Binomische {...props} expression={answer.expression} />
    case 'primfaktorisierung': return <Primfaktorisierung {...props} number={answer.number} />
    case 'gemischte-zahlen': return <GemischteZahlen {...props} problem={answer} />
    case 'dezimalbrueche': return <Dezimalbrueche {...props} problem={answer} />
    case 'prozent-gleichung': return <>
      <ProzentGleichung problem={answer} readOnly reviewValue={value} reviewEquation={solution ? answer.exampleEquation : answer.equationSnapshot?.equationValue} />
      {!solution && !answer.equationSnapshot && <p className="review-note">Der eingegebene Rechenansatz wurde nicht gespeichert.</p>}
    </>
    case 'schriftlich': {
      const shared = { review: true, showCorrect: solution, initialState: answer.schriftlichSnapshot }
      // Never invent intermediate calculations when only the final answer was stored.
      if (!solution && !answer.schriftlichSnapshot) return <>
        <div className="review-final-answer">Gespeichertes Ergebnis: <strong>{value || 'Keine Eingabe'}</strong></div>
        <p className="review-note">Zu dieser Antwort wurden keine Zwischenschritte gespeichert.</p>
      </>
      return answer.operation === 'divide'
        ? <SchriftlicheDivision {...shared} dividend={answer.a} divisor={answer.b} correctDigits={answer.correctDigits} divisionSteps={answer.divisionSteps} />
        : <Schriftlich {...shared} aDigits={answer.aDigits} bDigits={answer.bDigits} summandsDigits={answer.summandsDigits} correctDigits={answer.correctDigits} partialProducts={answer.partialProducts} operation={answer.operation} />
    }
    default: return <p>{answer.expression || answer.text || 'Aufgabe'} = {value || 'Keine Eingabe'}</p>
  }
}

export default function AnswerReview({ answer, inputLabel = 'Eingabe' }) {
  return <div className={`answer-review-grid${answer.type === 'schriftlich' ? ' answer-review-grid--written' : ''}`}>
    <section className={`answer-review-panel ${answer.isCorrect ? 'answer-review-panel--correct' : 'answer-review-panel--wrong'}`}>
      <h3>{inputLabel}</h3>
      <p className="answer-review-verdict">{answer.assisted ? (answer.type === 'hauptnenner' ? 'Teilweise gelöst – nach Verbesserung' : 'Mit Hilfe gelöst') : answer.isCorrect ? '✓ Richtig gelöst' : '✗ Falsch gelöst'}</p>
      <div className="question answer-review-question"><ReviewedProblem answer={answer} solution={false} /></div>
    </section>
    <section className="answer-review-panel">
      <h3>Richtige Lösung</h3><p className="answer-review-verdict" aria-hidden="true">Zum Vergleich</p>
      <div className="question answer-review-question"><ReviewedProblem answer={answer} solution /></div>
    </section>
  </div>
}
