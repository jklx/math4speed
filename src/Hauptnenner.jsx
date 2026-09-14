import React, { useEffect, useRef, useState } from 'react'
import Primfaktorisierung from './Primfaktorisierung'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'
import { parseHauptnennerInput, validateHauptnenner } from './problems/validate'

export default function Hauptnenner({ problem, value = '', onChange, onEnter, readOnly = false, mistakeFeedback = null, showTick = false }) {
  const [stage, setStage] = useState(0)
  const [hint, setHint] = useState('')
  const [checkedFields, setCheckedFields] = useState(null)
  const feedbackFields = mistakeFeedback ? validateHauptnenner(value, problem).fieldCorrect : checkedFields
  const hasError = field => !showTick && feedbackFields?.[field] === false
  useEffect(() => {
    if (!mistakeFeedback) return
    const fields = validateHauptnenner(value, problem).fieldCorrect
    setCheckedFields(fields)
    const firstError = ['first', 'second', 'lcm', 'result'].findIndex(field => !fields[field])
    if (firstError !== -1) setStage(firstError)
  }, [mistakeFeedback, value, problem])
  const values = parseHauptnennerInput(value)
  const latest = useRef(values)
  latest.current = values
  const resultRef = useRef(null)
  const locked = readOnly || Boolean(mistakeFeedback) || showTick
  const revealSolution = Boolean(mistakeFeedback) && !mistakeFeedback.canRetry
  useEffect(() => { if (stage === 3 && !locked) resultRef.current?.focus() }, [stage, locked])
  const update = (field, next) => {
    latest.current = { ...latest.current, [field]: next }
    onChange?.(JSON.stringify(latest.current))
  }
  const submit = () => {
    const missing = ['first', 'second', 'lcm', 'result'].findIndex(field => !latest.current[field].trim())
    if (missing !== -1) {
      setHint('Bitte fülle alle vier Schritte aus.')
      setStage(missing)
      return
    }
    setHint('')
    onEnter?.(JSON.stringify(latest.current))
  }
  const rows = [
    { field: 'first', number: problem.a, factors: problem.factorsA },
    { field: 'second', number: problem.b, factors: problem.factorsB },
    { field: 'lcm', number: problem.correct, factors: problem.lcmFactors, label: '' },
  ]
  return <div className="hauptnenner-training">
    <div className="instruction">Finde den Hauptnenner der beiden Brüche.</div>
    <div className="hauptnenner-fractions">
      <math aria-label={`1 durch ${problem.a} und 1 durch ${problem.b}`}><mfrac><mn>1</mn><mn>{problem.a}</mn></mfrac><mspace width="0.5em" /><mtext>und</mtext><mspace width="0.5em" /><mfrac><mn>1</mn><mn>{problem.b}</mn></mfrac></math>
    </div>
    <p className="instruction">Zerlege beide Nenner. Übernimm dann jeden Primfaktor in seiner höchsten vorkommenden Anzahl.</p>
    {rows.map((row, index) => <section className={`hauptnenner-step${hasError(row.field) ? ' hauptnenner-step--error' : ''}`} key={row.field}>
      <div className="hauptnenner-step-heading"><span>{index + 1}. {index < 2 ? 'Nenner zerlegen' : 'Primfaktoren für den Hauptnenner'}</span>
      </div>
      {hasError(row.field) && <p className="hauptnenner-step-error" role="status">{mistakeFeedback ? 'Hier liegt ein Fehler.' : 'Bitte überprüfe diesen Schritt.'}</p>}
      <Primfaktorisierung number={row.number} expressionLabel={row.label}
        instruction="" value={values[row.field]} readOnly={locked}
        autoFocus={stage === index} onFocus={() => { if (!locked) setStage(index) }}
        onChange={next => update(row.field, next)}
        onEnter={next => { update(row.field, next ?? latest.current[row.field]); if (latest.current[row.field].trim()) setStage(index + 1) }}
        mistakeFeedback={revealSolution && hasError(row.field) ? { userAnswerDisplay: values[row.field], correctAnswerDisplay: row.factors.join(' · ') } : null} />
    </section>)}
    <section className={`hauptnenner-step${hasError('result') ? ' hauptnenner-step--error' : ''}`}>
      <div className="hauptnenner-step-heading">4. Faktoren multiplizieren</div>
      {hasError('result') && <p className="hauptnenner-step-error" role="status">{mistakeFeedback ? 'Hier liegt ein Fehler.' : 'Bitte überprüfe diesen Schritt.'}</p>}
      <div className="factor-row"><label htmlFor={`hauptnenner-${problem.id}`}>Hauptnenner =</label>
        <input id={`hauptnenner-${problem.id}`} ref={resultRef} className="math-input answer-input hauptnenner-result" inputMode="numeric" value={values.result} readOnly={locked}
          onFocus={() => { if (!locked) setStage(3) }}
          onChange={event => update('result', event.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={event => {
            if (locked) return
            if (event.key === 'Enter') { event.preventDefault(); submit() }
            // The on-screen keyboard dispatches synthetic keydown events.
            else if (!event.nativeEvent.isTrusted && (/^[0-9]$/.test(event.key) || event.key === 'Backspace')) {
              event.preventDefault()
              update('result', event.key === 'Backspace' ? latest.current.result.slice(0, -1) : latest.current.result + event.key)
            }
          }} />
        {!locked && <InlineSubmitButton onClick={submit} />}<TickMark visible={showTick} />
      </div>
      {revealSolution && hasError('result') && <div className="inline-feedback">Richtiger Hauptnenner: <strong>{problem.correct}</strong></div>}
    </section>
    {hint && !locked && <p role="status">{hint}</p>}
  </div>
}
