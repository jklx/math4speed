import React, { useEffect, useMemo, useRef } from 'react'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'

function getParts(value, isMixed) {
  const match = isMixed
    ? String(value).match(/^(\d*)\s*(\d*)\s*\/?\s*(\d*)$/)
    : String(value).match(/^(\d*)\s*\/?\s*(\d*)$/)

  if (!match) return isMixed ? ['', '', ''] : ['', '']
  return isMixed ? [match[1], match[2], match[3]] : [match[1], match[2]]
}

function FractionInput({ inputRef, value, onChange, onKeyDown, label, disabled }) {
  return (
    <input
      ref={inputRef}
      className={`fraction-input${disabled ? ' fraction-input--disabled' : ''}`}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      inputMode="numeric"
      aria-label={label}
      disabled={disabled}
    />
  )
}

export default function GemischteZahlen({ problem, value = '', onChange, onEnter, showTick = false, crossedOut = false, mistakeFeedback = null }) {
  const isMixedToImproper = problem.direction === 'mixed-to-improper'
  const fieldRefs = useRef([])
  const parts = useMemo(() => getParts(value, !isMixedToImproper), [value, isMixedToImproper])

  useEffect(() => { fieldRefs.current[0]?.focus() }, [])

  const updatePart = (index, nextValue) => {
    const next = [...parts]
    next[index] = nextValue.replace(/\D/g, '')
    onChange?.(isMixedToImproper ? `${next[0]}/${next[1]}` : `${next[0]} ${next[1]}/${next[2]}`)
  }

  const moveTo = (index) => fieldRefs.current[index]?.focus()
  const handleKey = (event, index) => {
    if (mistakeFeedback) { event.preventDefault(); return }
    if (event.key === 'Enter') { event.preventDefault(); onEnter?.(); return }
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault()
      const start = event.currentTarget.selectionStart ?? parts[index].length
      const end = event.currentTarget.selectionEnd ?? start
      updatePart(index, parts[index].slice(0, start) + event.key + parts[index].slice(end))
      return
    }
    if ((event.key === '/' || event.key === ' ') && index < parts.length - 1) {
      event.preventDefault()
      moveTo(index + 1)
      return
    }
    if (event.key === 'Backspace') {
      event.preventDefault()
      const start = event.currentTarget.selectionStart ?? parts[index].length
      const end = event.currentTarget.selectionEnd ?? start
      if (start !== end) updatePart(index, parts[index].slice(0, start) + parts[index].slice(end))
      else if (parts[index]) updatePart(index, parts[index].slice(0, Math.max(0, start - 1)) + parts[index].slice(start))
      else if (index > 0) moveTo(index - 1)
    }
  }

  const inputProps = (index, label) => ({
    inputRef: element => { fieldRefs.current[index] = element },
    value: parts[index],
    onChange: event => updatePart(index, event.target.value),
    onKeyDown: event => handleKey(event, index),
    label,
    disabled: Boolean(mistakeFeedback)
  })

  const given = isMixedToImproper
    ? <><span>{problem.whole}</span><span className="fraction"><span>{problem.numerator}</span><span>{problem.denominator}</span></span></>
    : <span className="fraction"><span>{problem.improperNumerator}</span><span>{problem.denominator}</span></span>

  return (
    <div className="question-centered">
      <p className="mixed-number-prompt">
        {isMixedToImproper ? 'Wandle die gemischte Zahl in einen Bruch um.' : 'Wandle den Bruch in eine gemischte Zahl um.'}
      </p>
      <div className="einmaleins-row">
        <div className="expression mixed-number-expression">{given}<span className="mixed-number-equals">=</span></div>
        <div className={`fraction-answer${crossedOut ? ' fraction-answer--wrong' : ''}`}>
          {!isMixedToImproper && <FractionInput {...inputProps(0, 'Ganze Zahl')} />}
          <span className="fraction fraction--input">
            <FractionInput {...inputProps(isMixedToImproper ? 0 : 1, 'Zähler')} />
            <FractionInput {...inputProps(isMixedToImproper ? 1 : 2, 'Nenner')} />
          </span>
          {!mistakeFeedback && <InlineSubmitButton onClick={() => onEnter?.()} />}
        </div>
      </div>
      <p className="mixed-number-hint">Mit <kbd>/</kbd> oder Leertaste wechselst du zum nächsten Feld.</p>
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
