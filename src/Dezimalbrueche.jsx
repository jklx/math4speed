import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'
import { getDecimalDenominatorSteps } from './problems/decimalFractions'

const PERIOD_MARKER = '\u2063'

function getFractionParts(value) {
  const match = String(value).match(/^(\d*)\s*\/?\s*(\d*)$/)
  return match ? [match[1], match[2]] : ['', '']
}

function normalizePeriodicNotation(value) {
  return String(value).replace(/\((\d+)\)/g, (_, period) => (
    `${PERIOD_MARKER}${period}`
  ))
}

function renderDecimalDisplay(display) {
  const match = String(display).match(/^(.*)\((\d+)\)(.*)$/)
  if (!match) return display
  return <>{match[1]}<span className="decimal-period-digit">{match[2]}</span>{match[3]}</>
}

function greatestCommonDivisor(a, b) {
  while (b) [a, b] = [b, a % b]
  return a
}

function renderFraction(numerator, denominator) {
  return <span className="fraction decimal-solution-fraction"><span>{numerator}</span><span>{denominator}</span></span>
}

function renderCorrectAnswer(problem, answer) {
  if (problem.direction === 'decimal-to-fraction') {
    const match = String(answer).match(/^(\d+)\s*\/\s*(\d+)$/)
    if (match) return renderFraction(match[1], match[2])
  }
  return renderDecimalDisplay(answer)
}

function hasTwoSolutionPaths(problem) {
  if (problem.isRecurring) return false
  if (problem.direction === 'decimal-to-fraction') {
    const digits = (problem.decimalDisplay.split(',')[1] || '').replace(/0+$/, '')
    // Splitting off whole units only helps when the fractional part simplifies.
    if (digits.length <= 1 || greatestCommonDivisor(Number(digits), 10 ** digits.length) === 1) return false
  }
  return problem.numerator > problem.denominator && problem.numerator % problem.denominator !== 0
}

export function renderSolution(problem) {
  const whole = Math.floor(problem.numerator / problem.denominator)
  const remainder = problem.numerator % problem.denominator
  const direct = renderDirectSolution(problem)
  if (!hasTwoSolutionPaths(problem)) return direct

  const divisor = greatestCommonDivisor(remainder, problem.denominator)
  const decimalToFraction = problem.direction === 'decimal-to-fraction'
  const fractionalDisplay = problem.decimalDisplay.replace(/^\d+,/, '0,')
  const reducedNumerator = remainder / divisor
  const reducedDenominator = problem.denominator / divisor
  const totalDivisor = greatestCommonDivisor(problem.numerator, problem.denominator)
  const operations = problem.isRecurring ? [] : getDecimalDenominatorSteps(problem.numerator, problem.denominator)
    .filter(step => step.operation).map(step => step.operation === 'reduce' ? 'Kürzen' : 'Erweitern')
  const directTitle = decimalToFraction
    ? problem.isRecurring ? 'Periodenbruch' : 'Zehnerbruch'
    : problem.isRecurring ? 'Division' : operations.join(' und ') || 'Ablesen'
  return <div className="decimal-solution-steps">
    <div className="decimal-solution-path" data-solution="mixed">
      <div className="inline-feedback__label">Lösungsweg über gemischte Zahl</div>
      {decimalToFraction ? <div>{renderDecimalDisplay(problem.decimalDisplay)} = {whole} + {renderDecimalDisplay(fractionalDisplay)} = {whole} + {renderFraction(reducedNumerator, reducedDenominator)} = {whole} {renderFraction(reducedNumerator, reducedDenominator)} = {renderFraction(problem.numerator / totalDivisor, problem.denominator / totalDivisor)}</div>
        : <div>{renderFraction(problem.numerator, problem.denominator)} = {whole} {renderFraction(reducedNumerator, reducedDenominator)} = {renderDecimalDisplay(problem.decimalDisplay)}</div>}
    </div>
    <div className="decimal-solution-path" data-solution="direct">
      <div className="inline-feedback__label">Lösungsweg über {directTitle}</div>
      {direct}
    </div>
  </div>
}

function renderDirectSolution(problem) {
  if (!problem.isRecurring) {
    if (problem.direction === 'decimal-to-fraction') {
      const [whole, digits = ''] = problem.decimalDisplay.split(',')
      const denominator = 10 ** digits.length
      const numerator = Number(whole) * denominator + Number(digits)
      const divisor = greatestCommonDivisor(numerator, denominator)
      return <div className="decimal-solution-steps">
        <div>{renderDecimalDisplay(problem.decimalDisplay)} = {renderFraction(numerator, denominator)}{divisor > 1 && <> = {renderFraction(numerator / divisor, denominator / divisor)}</>}</div>
        <small>{digits.length} Nachkommastelle{digits.length !== 1 ? 'n' : ''}: Nenner {denominator}.{divisor > 1 ? ` Gekürzt durch ${divisor}.` : ' Der Bruch ist bereits vollständig gekürzt.'}</small>
      </div>
    }

    if (problem.numerator % problem.denominator === 0) {
      return <div className="decimal-solution-steps">
        <div>{renderFraction(problem.numerator, problem.denominator)} = {renderDecimalDisplay(problem.decimalDisplay)}</div>
        <small>Zähler durch Nenner teilen: Der Bruch ergibt eine ganze Zahl.</small>
      </div>
    }

    const steps = getDecimalDenominatorSteps(problem.numerator, problem.denominator)
    const target = steps[steps.length - 1].denominator
    return <div className="decimal-solution-steps">
      <div>{renderFraction(problem.numerator, problem.denominator)}{steps.map((step, index) => step.operation && <React.Fragment key={index}> = {renderFraction(step.numerator, step.denominator)}</React.Fragment>)} = {renderDecimalDisplay(problem.decimalDisplay)}</div>
      <small>{steps.map(step => step.operation === 'expand' ? `Erweitert mit ${step.factor}. ` : step.operation === 'reduce' ? `Gekürzt durch ${step.factor}. ` : '').join('')}Bei Nenner {target} hat die Dezimalzahl {Math.log10(target)} Nachkommastelle{target !== 10 ? 'n' : ''}.</small>
    </div>
  }

  const whole = Math.floor(problem.numerator / problem.denominator)
  const remainder = problem.numerator % problem.denominator
  const divisor = greatestCommonDivisor(remainder, problem.denominator)
  const fractionalDisplay = problem.decimalDisplay.replace(/^\d+,/, '0,')
  const knownFraction = renderFraction(remainder / divisor, problem.denominator / divisor)
  const totalDivisor = greatestCommonDivisor(problem.numerator, problem.denominator)

  if (problem.direction === 'fraction-to-decimal') {
    return <div className="decimal-solution-steps">
      <div>{renderFraction(problem.numerator, problem.denominator)}{whole > 0 && <> = {whole} {knownFraction} = {whole} + {renderDecimalDisplay(fractionalDisplay)}</>} = {renderDecimalDisplay(problem.decimalDisplay)}</div>
    </div>
  }

  return <div className="decimal-solution-steps">
    <div>{renderDecimalDisplay(problem.decimalDisplay)}{whole > 0 && <> = {whole} + {renderDecimalDisplay(fractionalDisplay)} = {whole} + {knownFraction} = {whole} {knownFraction}</>} = {renderFraction(problem.numerator / totalDivisor, problem.denominator / totalDivisor)}</div>
  </div>
}

function readDecimalEditorValue(editor) {
  return Array.from(editor.childNodes).map(node => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    const text = node.textContent || ''
    return node.classList.contains('decimal-period-digit') ? `${PERIOD_MARKER}${text}` : text
  }).join('')
}

function renderDecimalEditor(editor, rawValue) {
  editor.replaceChildren()
  const markerIndex = rawValue.indexOf(PERIOD_MARKER)
  if (markerIndex < 0) {
    editor.append(document.createTextNode(rawValue))
    return
  }
  const base = rawValue.slice(0, markerIndex)
  const period = rawValue.slice(markerIndex + 1)
  editor.append(document.createTextNode(base))
  const periodSpan = document.createElement('span')
  periodSpan.className = 'decimal-period-digit'
  periodSpan.textContent = period
  editor.append(periodSpan)
}

function getEditorSelection(editor) {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return null
  const range = selection.getRangeAt(0)
  const startRange = range.cloneRange()
  startRange.selectNodeContents(editor)
  startRange.setEnd(range.startContainer, range.startOffset)
  const endRange = range.cloneRange()
  endRange.selectNodeContents(editor)
  endRange.setEnd(range.endContainer, range.endOffset)
  return { start: startRange.toString().length, end: endRange.toString().length }
}

function setEditorCaret(editor, offset) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
  let remaining = offset
  let node = walker.nextNode()
  while (node) {
    if (remaining <= node.textContent.length) {
      const range = document.createRange()
      range.setStart(node, remaining)
      range.collapse(true)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }
    remaining -= node.textContent.length
    node = walker.nextNode()
  }
}

function FractionInput({ inputRef, value, onChange, onKeyDown, label, disabled }) {
  return <input ref={inputRef} className={`fraction-input${disabled ? ' fraction-input--disabled' : ''}`} value={value} onChange={onChange} onKeyDown={onKeyDown} inputMode="none" aria-label={label} disabled={disabled} />
}

export default function Dezimalbrueche({ problem, value = '', onChange, onEnter, showTick = false, crossedOut = false, mistakeFeedback = null, readOnly = false, reductionSteps = [] }) {
  const decimalToFraction = problem.direction === 'decimal-to-fraction'
  const fractionRefs = useRef([])
  const decimalRef = useRef(null)
  const pendingCursorRef = useRef(null)
  const parts = useMemo(() => getFractionParts(value), [value])

  useLayoutEffect(() => {
    if (decimalToFraction || !decimalRef.current) return
    const editor = decimalRef.current
    if (readDecimalEditorValue(editor) === value) return
    renderDecimalEditor(editor, value)
    const cursor = pendingCursorRef.current
    if (cursor != null && document.activeElement === editor) {
      setEditorCaret(editor, Math.min(cursor, value.replaceAll(PERIOD_MARKER, '').length))
    }
    pendingCursorRef.current = null
  }, [decimalToFraction, value])

  useEffect(() => {
    const initialInput = decimalToFraction ? fractionRefs.current[0] : decimalRef.current
    if (!readOnly) initialInput?.focus()
  }, [reductionSteps.length])

  const updatePart = (index, nextValue) => {
    const next = [...parts]
    next[index] = nextValue.replace(/\D/g, '')
    onChange?.(`${next[0]}/${next[1]}`)
  }
  const fractionKey = (event, index) => {
    if (readOnly || mistakeFeedback) { event.preventDefault(); return }
    if (event.key === 'Enter') { event.preventDefault(); onEnter?.(); return }
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault()
      const start = event.currentTarget.selectionStart ?? parts[index].length
      const end = event.currentTarget.selectionEnd ?? start
      updatePart(index, parts[index].slice(0, start) + event.key + parts[index].slice(end))
      return
    }
    if (event.key === '/' && index === 0) { event.preventDefault(); fractionRefs.current[1]?.focus(); return }
    if (event.key === 'Backspace') {
      event.preventDefault()
      const start = event.currentTarget.selectionStart ?? parts[index].length
      const end = event.currentTarget.selectionEnd ?? start
      if (start !== end) updatePart(index, parts[index].slice(0, start) + parts[index].slice(end))
      else if (parts[index]) updatePart(index, parts[index].slice(0, Math.max(0, start - 1)) + parts[index].slice(start))
      else if (index > 0) fractionRefs.current[index - 1]?.focus()
    }
  }
  const commitDecimalValue = (nextValue, cursor) => {
    const normalized = normalizePeriodicNotation(nextValue)
    pendingCursorRef.current = cursor
    onChange?.(normalized)
  }
  const decimalKey = event => {
    if (readOnly || mistakeFeedback) { event.preventDefault(); return }
    if (event.key === 'Enter') { event.preventDefault(); onEnter?.(); return }
    if (event.isTrusted) return
    const selection = getEditorSelection(event.currentTarget)
    if (!selection) return
    const rawIndex = position => {
      let visible = 0
      for (let i = 0; i < value.length; i++) {
        if (value[i] === PERIOD_MARKER) continue
        if (visible === position) return i
        visible++
      }
      return value.length
    }
    const start = rawIndex(selection.start)
    const end = rawIndex(selection.end)
    if (/^[0-9,().]$/.test(event.key)) {
      event.preventDefault()
      commitDecimalValue(value.slice(0, start) + event.key + value.slice(end), selection.start + 1)
    }
    if (event.key === 'Backspace') {
      event.preventDefault()
      const deleteFrom = start === end ? Math.max(0, start - 1) : start
      commitDecimalValue(value.slice(0, deleteFrom) + value.slice(end), Math.max(0, selection.start - 1))
    }
  }
  const handleDecimalInput = event => {
    const selection = getEditorSelection(event.currentTarget)
    commitDecimalValue(readDecimalEditorValue(event.currentTarget), selection?.start ?? value.length)
  }

  const fraction = <span className="fraction"><span>{problem.numerator}</span><span>{problem.denominator}</span></span>
  return (
    <div className="question-centered">
      <p className="mixed-number-prompt">{decimalToFraction ? 'Wandle den Dezimalbruch in einen vollständig gekürzten Bruch um.' : 'Wandle den Bruch in einen Dezimalbruch um.'}</p>
      <div className="einmaleins-row decimal-answer-row">
        <div className="expression mixed-number-expression">{decimalToFraction ? renderDecimalDisplay(problem.decimalDisplay) : fraction}<span className="mixed-number-equals">=</span></div>
        {decimalToFraction && reductionSteps.map((step, index) => {
          const [numerator, denominator] = getFractionParts(step)
          return <span className="decimal-reduction-step" key={index}>{renderFraction(numerator, denominator)}<span className="mixed-number-equals">=</span></span>
        })}
        {decimalToFraction ? (
          <div className={`fraction-answer${crossedOut ? ' fraction-answer--wrong' : ''}`}>
            <span className="fraction fraction--input">
              <FractionInput inputRef={el => { fractionRefs.current[0] = el }} value={parts[0]} onChange={event => updatePart(0, event.target.value)} onKeyDown={event => fractionKey(event, 0)} label="Zähler" disabled={readOnly || Boolean(mistakeFeedback)} />
              <FractionInput inputRef={el => { fractionRefs.current[1] = el }} value={parts[1]} onChange={event => updatePart(1, event.target.value)} onKeyDown={event => fractionKey(event, 1)} label="Nenner" disabled={readOnly || Boolean(mistakeFeedback)} />
            </span>
            {!readOnly && !mistakeFeedback && <InlineSubmitButton onClick={() => onEnter?.()} />}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div ref={decimalRef} className={`math-input fake-input answer-input decimal-rich-input${mistakeFeedback ? ' fake-input--disabled' : ''}`} contentEditable={!readOnly && !mistakeFeedback} inputMode="none" suppressContentEditableWarning onInput={handleDecimalInput} onKeyDown={decimalKey} role="textbox" aria-label="Dezimalbruch" />
            {!readOnly && !mistakeFeedback && <InlineSubmitButton onClick={() => onEnter?.()} />}
          </div>
        )}
      </div>
      {decimalToFraction && reductionSteps.length > 0 && !mistakeFeedback && !showTick && <p className="mixed-number-hint" role="status">Der Bruch ist richtig. Kürze weiter, bis Zähler und Nenner keinen gemeinsamen Teiler mehr haben.</p>}
      {problem.isRecurring && <p className="mixed-number-hint">Die Periode wird mit einem Strich angezeigt. Eingabe z.&nbsp;B. als <kbd>0,(3)</kbd>.</p>}
      {mistakeFeedback?.correctAnswerDisplay && <div className="inline-feedback">
        <div className="inline-feedback__label">Richtige Lösung</div>
        <div className="inline-feedback__value">{renderCorrectAnswer(problem, mistakeFeedback.correctAnswerDisplay)}</div>
        {!hasTwoSolutionPaths(problem) && <div className="inline-feedback__label decimal-hint-label">Lösungsweg</div>}
        <div className={`inline-feedback__value${hasTwoSolutionPaths(problem) ? ' decimal-hint-label' : ''}`}>{renderSolution(problem)}</div>
      </div>}
      <TickMark visible={showTick} />
    </div>
  )
}
