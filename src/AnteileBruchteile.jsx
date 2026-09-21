import React, { useEffect, useMemo, useRef, useState } from 'react'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'
import { formatDecimal } from './utils/formatNumber'
import { getAnteileBruchteileSolution } from './problems/anteileSolution'

function Fraction({ numerator, denominator }) {
  return <span className="fraction anteile-fraction"><span>{numerator}</span><span>{denominator}</span></span>
}

function FractionInput({ inputRef, value, onChange, onKeyDown, label, disabled }) {
  return <input ref={inputRef} className={`fraction-input${disabled ? ' fraction-input--disabled' : ''}`} value={value} onChange={onChange} onKeyDown={onKeyDown} inputMode="none" aria-label={label} disabled={disabled} />
}

function getFractionParts(value) {
  const match = String(value).match(/^(\d*)\s*\/?\s*(\d*)$/)
  return match ? [match[1], match[2]] : ['', '']
}

export function formatAnteileBruchteileAnswer(problem, value = problem.correct) {
  if (problem.variant === 'anteil') return String(value)
  return `${value} ${problem.answerUnit || problem.unit}`
}

function AnteileSolution({ problem }) {
  const solution = getAnteileBruchteileSolution(problem)
  const number = value => formatDecimal(value, { maximumFractionDigits: 4 })

  if (solution.kind === 'bruchteile') {
    return <div className="anteile-solution">
      <div className="anteile-solution-line">
        <span>(</span><strong>{number(solution.total)} {solution.totalUnit}</strong><span>:</span><strong>{solution.denominator}</strong><span>)</span><span>·</span><strong>{solution.numerator}</strong><span>=</span><strong>{number(solution.result)} {solution.resultUnit}</strong>
      </div>
    </div>
  }

  if (solution.kind === 'ganzes') {
    return <div className="anteile-solution">
      <div className="anteile-solution-line"><Fraction numerator={1} denominator={solution.denominator} /><span>von ? =</span><strong>{number(solution.onePart)} {solution.unit}</strong></div>
      <div className="anteile-solution-line"><span>Gesucht ist</span><strong>{number(solution.whole)} {solution.unit}.</strong></div>
    </div>
  }

  return <div className="anteile-solution">
    <div className="anteile-solution-line"><span>Der Bruchteil ist</span><strong>{number(solution.part)} {solution.partUnit}.</strong></div>
    <div className="anteile-solution-line"><span>Das Ganze ist</span><strong>{number(solution.whole)} {solution.wholeUnit}{solution.isConversion ? '' : '.'}</strong>{solution.isConversion && <><span>=</span><strong>{number(solution.wholeInPartUnit)} {solution.partUnit}.</strong></>}</div>
    <div className="anteile-solution-line"><span>Der Anteil ist</span><span className="anteile-solution-result"><Fraction numerator={solution.part} denominator={solution.wholeInPartUnit} /><span>.</span></span></div>
  </div>
}

export default function AnteileBruchteile({ problem, value = '', onChange, onEnter, showTick = false, crossedOut = false, mistakeFeedback = null, readOnly = false }) {
  const numericRef = useRef(null)
  const fractionRefs = useRef([])
  const [focused, setFocused] = useState(false)
  const locked = readOnly || Boolean(mistakeFeedback)
  const isFractionAnswer = problem.variant === 'anteil'
  const wholeUnit = problem.wholeUnit || problem.unit
  const partUnit = problem.partUnit || problem.unit
  const answerUnit = problem.answerUnit || problem.unit
  const fractionParts = useMemo(() => getFractionParts(value), [value])

  useEffect(() => {
    if (locked) return
    const frame = requestAnimationFrame(() => (isFractionAnswer ? fractionRefs.current[0] : numericRef.current)?.focus())
    return () => cancelAnimationFrame(frame)
  }, [problem.id, locked, isFractionAnswer])

  const handleNumericKey = event => {
    if (locked) { event.preventDefault(); return }
    if (event.key === 'Enter') { event.preventDefault(); onEnter?.(); return }
    if (event.key === 'Backspace') { event.preventDefault(); onChange?.(value.slice(0, -1)); return }
    if (/^[0-9]$/.test(event.key)) { event.preventDefault(); onChange?.(value + event.key); return }
  }

  const updateFractionPart = (index, nextValue) => {
    const next = [...fractionParts]
    next[index] = nextValue.replace(/\D/g, '')
    onChange?.(`${next[0]}/${next[1]}`)
  }

  const handleFractionKey = (event, index) => {
    if (locked) { event.preventDefault(); return }
    if (event.key === 'Enter') { event.preventDefault(); onEnter?.(); return }
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault()
      const start = event.currentTarget.selectionStart ?? fractionParts[index].length
      const end = event.currentTarget.selectionEnd ?? start
      updateFractionPart(index, fractionParts[index].slice(0, start) + event.key + fractionParts[index].slice(end))
      return
    }
    if ((event.key === '/' || event.key === ' ') && index === 0) {
      event.preventDefault()
      fractionRefs.current[1]?.focus()
      return
    }
    if (event.key === 'Backspace') {
      event.preventDefault()
      const start = event.currentTarget.selectionStart ?? fractionParts[index].length
      const end = event.currentTarget.selectionEnd ?? start
      if (start !== end) updateFractionPart(index, fractionParts[index].slice(0, start) + fractionParts[index].slice(end))
      else if (fractionParts[index]) updateFractionPart(index, fractionParts[index].slice(0, Math.max(0, start - 1)) + fractionParts[index].slice(start))
      else if (index === 1) fractionRefs.current[0]?.focus()
    }
  }

  const fractionInputProps = (index, label) => ({
    inputRef: element => { fractionRefs.current[index] = element },
    value: fractionParts[index],
    onChange: event => updateFractionPart(index, event.target.value),
    onKeyDown: event => handleFractionKey(event, index),
    label,
    disabled: locked,
  })

  const answerInput = isFractionAnswer
    ? <span className="fraction fraction--input anteile-fraction-input">
        <FractionInput {...fractionInputProps(0, 'Zähler')} />
        <FractionInput {...fractionInputProps(1, 'Nenner')} />
      </span>
    : <div
        ref={numericRef}
        tabIndex={locked ? -1 : 0}
        className={`math-input fake-input answer-input anteile-input${focused ? ' fake-input--focused' : ''}${locked ? ' fake-input--disabled' : ''}`}
        onKeyDown={handleNumericKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={`Ergebnis in ${answerUnit}`}
        aria-disabled={locked ? 'true' : 'false'}
      >
        {value}
        {!locked && focused && <span className="fake-input__cursor" aria-hidden />}
      </div>

  const answer = <div className={`anteile-answer${crossedOut || mistakeFeedback ? ' anteile-answer--wrong' : ''}`}>
    {answerInput}
    {!isFractionAnswer && <span className="anteile-unit">{answerUnit}</span>}
    {!locked && <InlineSubmitButton onClick={() => onEnter?.()} />}
  </div>

  const equation = problem.variant === 'bruchteile'
    ? problem.isConversion
      ? <><Fraction numerator={problem.numerator} denominator={problem.denominator} /><strong>{wholeUnit}</strong><span>=</span>{answer}</>
      : <><Fraction numerator={problem.numerator} denominator={problem.denominator} /><span>von</span><strong>{problem.whole} {wholeUnit}</strong><span>=</span>{answer}</>
    : problem.variant === 'anteil'
      ? <><strong>{problem.part} {partUnit}</strong><span>von</span><strong>{problem.whole} {wholeUnit}</strong><span>=</span>{answer}</>
      : <><Fraction numerator={problem.numerator} denominator={problem.denominator} /><span>von</span>{answer}<span>=</span><strong>{problem.part} {partUnit}</strong></>

  return (
    <div className="question-centered anteile-training">
      <p className="anteile-prompt">{problem.prompt}</p>
      <div className="einmaleins-row anteile-equation" aria-label={problem.expression}>{equation}</div>
      {isFractionAnswer && !readOnly && !mistakeFeedback && <p className="mixed-number-hint">Mit <kbd>/</kbd> oder Leertaste wechselst du zum Nenner. Kürzen ist noch nicht nötig.</p>}
      {mistakeFeedback?.correctAnswerDisplay && <div className="inline-feedback">
        <div className="inline-feedback__label">Richtige Lösung</div>
        <div className="inline-feedback__value">{isFractionAnswer ? <Fraction numerator={problem.numerator} denominator={problem.denominator} /> : <>{formatDecimal(problem.correct, { maximumFractionDigits: 4 })} {answerUnit}</>}</div>
        <div className="inline-feedback__label anteile-solution-label">Lösungsweg</div>
        <div className="inline-feedback__value"><AnteileSolution problem={problem} /></div>
      </div>}
      <TickMark visible={showTick} />
    </div>
  )
}
