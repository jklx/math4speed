import React, { useEffect, useRef, useState } from 'react'
import Primfaktorisierung from './Primfaktorisierung'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'
import { parseHauptnennerInput, validateHauptnenner } from './problems/validate'

export default function Hauptnenner({ problem, value = '', onChange, onEnter, readOnly = false, mistakeFeedback = null, showTick = false }) {
  const [stage, setStage] = useState(0)
  const [hint, setHint] = useState('')
  const [checkedFields, setCheckedFields] = useState(null)
  const fieldsToFill = problem.mental ? ['result'] : ['first', 'second', ...(problem.c ? ['third'] : []), 'lcm', 'result']
  const resultStage = fieldsToFill.length - 1
  const feedbackFields = mistakeFeedback ? validateHauptnenner(value, problem).fieldCorrect : checkedFields
  const hasError = field => !showTick && feedbackFields?.[field] === false
  useEffect(() => {
    if (!mistakeFeedback) return
    const fields = validateHauptnenner(value, problem).fieldCorrect
    setCheckedFields(fields)
    const firstError = Object.keys(fields).findIndex(field => !fields[field])
    if (firstError !== -1) setStage(firstError)
  }, [mistakeFeedback, value, problem])
  const values = parseHauptnennerInput(value)
  const latest = useRef(values)
  latest.current = values
  const resultRef = useRef(null)
  const locked = readOnly || Boolean(mistakeFeedback) || showTick
  const revealSolution = Boolean(mistakeFeedback) && !mistakeFeedback.canRetry
  useEffect(() => { if ((problem.mental || stage === resultStage) && !locked) resultRef.current?.focus() }, [stage, locked, resultStage, problem.mental])
  const update = (field, next) => {
    latest.current = { ...latest.current, [field]: next }
    onChange?.(JSON.stringify(latest.current))
  }
  const submit = () => {
    const missing = fieldsToFill.findIndex(field => !(latest.current[field] ?? '').trim())
    if (missing !== -1) {
      setHint(problem.mental ? 'Bitte gib den Hauptnenner ein.' : `Bitte fülle alle ${fieldsToFill.length} Schritte aus.`)
      setStage(missing)
      return
    }
    setHint('')
    onEnter?.(JSON.stringify(latest.current))
  }
  const rows = problem.mental ? [] : [
    { field: 'first', number: problem.a, factors: problem.factorsA },
    { field: 'second', number: problem.b, factors: problem.factorsB },
    ...(problem.c ? [{ field: 'third', number: problem.c, factors: problem.factorsC }] : []),
    { field: 'lcm', number: problem.correct, factors: problem.lcmFactors, label: '' },
  ]
  return <div className="hauptnenner-training">
    <div className="instruction">{problem.mental ? 'Bestimme den Hauptnenner im Kopf.' : `Finde den Hauptnenner der ${problem.c ? 'drei' : 'beiden'} Brüche, also das kgV ihrer Nenner.`}</div>
    <div className="hauptnenner-fractions">
      <math aria-label={[problem.a, problem.b, ...(problem.c ? [problem.c] : [])].map(n => `1 durch ${n}`).join(' und ')}>{[problem.a, problem.b, ...(problem.c ? [problem.c] : [])].map((n, index) => <React.Fragment key={n}>{index > 0 && <><mspace width="0.5em" /><mtext>und</mtext><mspace width="0.5em" /></>}<mfrac><mn>1</mn><mn>{n}</mn></mfrac></React.Fragment>)}</math>
    </div>
    {!problem.mental && <p className="instruction">Zerlege {problem.c ? 'alle drei' : 'beide'} Nenner. Übernimm dann jeden Primfaktor in seiner höchsten vorkommenden Anzahl.</p>}
    {rows.map((row, index) => <section className={`hauptnenner-step${hasError(row.field) ? ' hauptnenner-step--error' : ''}`} key={row.field}>
      <div className="hauptnenner-step-heading"><span>{index + 1}. {row.field !== 'lcm' ? 'Nenner zerlegen' : 'Primfaktoren für den Hauptnenner'}</span>
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
      {!problem.mental && <div className="hauptnenner-step-heading">{fieldsToFill.length}. Faktoren multiplizieren</div>}
      {hasError('result') && <p className="hauptnenner-step-error" role="status">{mistakeFeedback ? 'Hier liegt ein Fehler.' : 'Bitte überprüfe diesen Schritt.'}</p>}
      <div className="factor-row"><label htmlFor={`hauptnenner-${problem.id}`}>Hauptnenner =</label>
        <input id={`hauptnenner-${problem.id}`} ref={resultRef} className="math-input answer-input hauptnenner-result" inputMode="numeric" value={values.result} readOnly={locked}
          onFocus={() => { if (!locked) setStage(resultStage) }}
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
