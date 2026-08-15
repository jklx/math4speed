import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'

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

function renderSolution(problem) {
  if (!problem.isRecurring) {
    const isMemorizedFraction = problem.variant === 'common' && problem.numerator < problem.denominator
    if (isMemorizedFraction) {
      return <div className="decimal-solution-steps">
        <div>{problem.direction === 'fraction-to-decimal'
          ? <>{renderFraction(problem.numerator, problem.denominator)} = {renderDecimalDisplay(problem.decimalDisplay)}</>
          : <>{renderDecimalDisplay(problem.decimalDisplay)} = {renderFraction(problem.numerator, problem.denominator)}</>}</div>
        <small>Auswendig lernen: Echte Brüche mit den Nennern 2, 3, 4, 5 und 8 gehören zu den häufigen Brüchen.</small>
      </div>
    }

    const divisor = greatestCommonDivisor(problem.numerator, problem.denominator)
    const reducedNumerator = problem.numerator / divisor
    const reducedDenominator = problem.denominator / divisor
    if (reducedDenominator === 1) {
      return <div className="decimal-solution-steps">
        <div>{problem.direction === 'fraction-to-decimal'
          ? <>{renderFraction(problem.numerator, problem.denominator)} = {renderFraction(reducedNumerator, 1)} = {reducedNumerator} = {renderDecimalDisplay(problem.decimalDisplay)}</>
          : <>{renderDecimalDisplay(problem.decimalDisplay)} = {renderFraction(reducedNumerator, 1)} = {reducedNumerator}</>}</div>
        <small>Der Bruch ergibt eine ganze Zahl und muss nicht erweitert werden.</small>
      </div>
    }
    const target = [10, 100, 1000].find(power => power % reducedDenominator === 0)
    const factor = target / reducedDenominator
    const expandedNumerator = reducedNumerator * factor

    if (problem.direction === 'fraction-to-decimal') {
      return <div className="decimal-solution-steps">
        <div>{renderFraction(problem.numerator, problem.denominator)}{divisor !== 1 && <> = {renderFraction(reducedNumerator, reducedDenominator)}</>}{factor !== 1 && <> = {renderFraction(expandedNumerator, target)}</>} = {renderDecimalDisplay(problem.decimalDisplay)}</div>
        {divisor !== 1 && <small>Erst gekürzt durch {divisor}.{factor !== 1 && ` Danach erweitert mit ${factor}.`}</small>}
        {divisor === 1 && factor !== 1 && <small>Erweitert mit {factor}.</small>}
      </div>
    }

    return <div className="decimal-solution-steps">
      <div>{renderDecimalDisplay(problem.decimalDisplay)} = {renderFraction(expandedNumerator, target)} = {renderFraction(reducedNumerator, reducedDenominator)}</div>
      {divisor !== 1 && <small>Gekürzt durch {divisor}.</small>}
    </div>
  }

  const match = problem.decimalDisplay.match(/^(\d+),(\d*)\((\d)\)$/)
  const [, whole, prefix, period] = match
  const wholeNumber = Number(whole)
  const prefixNumber = Number(prefix || 0)
  const prefixDenominator = 10 ** prefix.length
  const periodNumber = Number(period)
  const denominator = 9 * prefixDenominator
  const numerator = wholeNumber * denominator + prefixNumber * 9 + periodNumber
  const divisor = greatestCommonDivisor(numerator, denominator)
  const reducedNumerator = numerator / divisor
  const reducedDenominator = denominator / divisor

  if (problem.direction === 'fraction-to-decimal') {
    const wholePart = Math.floor(problem.numerator / problem.denominator)
    const remainder = problem.numerator % problem.denominator
    return <div className="decimal-solution-steps">
      <div>{renderFraction(problem.numerator, problem.denominator)} = {wholePart} + {renderFraction(remainder, problem.denominator)}</div>
      <div>= {renderDecimalDisplay(problem.decimalDisplay)}</div>
      {problem.numerator < problem.denominator && <small>Auswendig lernen: Echte Brüche mit dem Nenner 3 gehören zu den häufigen Brüchen.</small>}
    </div>
  }

  if (!prefix) {
    const periodDivisor = greatestCommonDivisor(periodNumber, 9)
    const periodNumerator = periodNumber / periodDivisor
    const periodDenominator = 9 / periodDivisor
    const combinedNumerator = wholeNumber * periodDenominator + periodNumerator
    return <div className="decimal-solution-steps">
      <div>{renderDecimalDisplay(problem.decimalDisplay)} = {whole} Ganze + {renderFraction(periodNumerator, periodDenominator)}</div>
      <div>= {renderFraction(wholeNumber * periodDenominator, periodDenominator)} + {renderFraction(periodNumerator, periodDenominator)}</div>
      <div>= {renderFraction(combinedNumerator, periodDenominator)}</div>
      {problem.numerator < problem.denominator && <small>Auswendig lernen: Echte Brüche mit dem Nenner 3 gehören zu den häufigen Brüchen.</small>}
    </div>
  }

  return <div className="decimal-solution-steps">
    <div>{renderDecimalDisplay(problem.decimalDisplay)} = {whole} Ganze + {renderFraction(prefixNumber, prefixDenominator)} + {renderFraction(periodNumber, denominator)}</div>
    <div>= {renderFraction(numerator, denominator)} = {renderFraction(reducedNumerator, reducedDenominator)}</div>
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
  return <input ref={inputRef} className={`fraction-input${disabled ? ' fraction-input--disabled' : ''}`} value={value} onChange={onChange} onKeyDown={onKeyDown} inputMode="numeric" aria-label={label} disabled={disabled} />
}

export default function Dezimalbrueche({ problem, value = '', onChange, onEnter, showTick = false, crossedOut = false, mistakeFeedback = null }) {
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
    initialInput?.focus()
  }, [])

  const updatePart = (index, nextValue) => {
    const next = [...parts]
    next[index] = nextValue.replace(/\D/g, '')
    onChange?.(`${next[0]}/${next[1]}`)
  }
  const fractionKey = (event, index) => {
    if (mistakeFeedback) { event.preventDefault(); return }
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
    if (mistakeFeedback) { event.preventDefault(); return }
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
      <p className="mixed-number-prompt">{decimalToFraction ? 'Wandle den Dezimalbruch in einen Bruch um.' : 'Wandle den Bruch in einen Dezimalbruch um.'}</p>
      <div className="einmaleins-row">
        <div className="expression mixed-number-expression">{decimalToFraction ? renderDecimalDisplay(problem.decimalDisplay) : fraction}<span className="mixed-number-equals">=</span></div>
        {decimalToFraction ? (
          <div className={`fraction-answer${crossedOut ? ' fraction-answer--wrong' : ''}`}>
            <span className="fraction fraction--input">
              <FractionInput inputRef={el => { fractionRefs.current[0] = el }} value={parts[0]} onChange={event => updatePart(0, event.target.value)} onKeyDown={event => fractionKey(event, 0)} label="Zähler" disabled={Boolean(mistakeFeedback)} />
              <FractionInput inputRef={el => { fractionRefs.current[1] = el }} value={parts[1]} onChange={event => updatePart(1, event.target.value)} onKeyDown={event => fractionKey(event, 1)} label="Nenner" disabled={Boolean(mistakeFeedback)} />
            </span>
            {!mistakeFeedback && <InlineSubmitButton onClick={() => onEnter?.()} />}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div ref={decimalRef} className={`math-input fake-input answer-input decimal-rich-input${mistakeFeedback ? ' fake-input--disabled' : ''}`} contentEditable={!mistakeFeedback} suppressContentEditableWarning onInput={handleDecimalInput} onKeyDown={decimalKey} role="textbox" aria-label="Dezimalbruch" />
            {!mistakeFeedback && <InlineSubmitButton onClick={() => onEnter?.()} />}
          </div>
        )}
      </div>
      {problem.isRecurring && <p className="mixed-number-hint">Die Periode wird mit einem Strich angezeigt. Eingabe z.&nbsp;B. als <kbd>0,(3)</kbd>.</p>}
      {mistakeFeedback?.correctAnswerDisplay && <div className="inline-feedback"><div className="inline-feedback__label">Richtige Lösung</div><div className="inline-feedback__value">{renderCorrectAnswer(problem, mistakeFeedback.correctAnswerDisplay)}</div><div className="inline-feedback__label decimal-hint-label">Lösungsweg</div><div className="inline-feedback__value">{renderSolution(problem)}</div></div>}
      <TickMark visible={showTick} />
    </div>
  )
}
