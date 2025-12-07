import React from 'react'
import { getOperator } from './utils/getOperator'
import { formatFactors } from './utils/formatFactors'

/**
 * ReviewList displays a list of answers (correct or incorrect).
 * 
 * Props:
 * - answers: array of answer objects
 * - isCorrect: boolean - true for correct answers, false for incorrect
 * - onSelectSchriftlich?: function(answerId) - called when a schriftlich item is clicked, with its global answer id
 */
export default function ReviewList({ answers, isCorrect, onSelectSchriftlich }) {
  const filtered = answers.filter(a => a.isCorrect === isCorrect)
  const className = isCorrect ? 'ok' : 'bad'
  const normalizeNumberString = (val) => {
    if (val == null) return '—'
    const s = String(val).trim()
    if (!s.length) return '—'
    // Normalize any zero-padded numeric strings like 0000 -> 0
    const n = parseInt(s, 10)
    if (isNaN(n)) return s.replace(/-/g, '−')
    return String(n).replace(/-/g, '−')
  }
  
  return (
    <ul className={`review-list ${className}`}>
      {filtered.map((q) => {
        const handleClick = () => {
          if (q.type === 'schriftlich' && onSelectSchriftlich) {
            onSelectSchriftlich(q.id)
          }
        }

        const renderCorrection = (correctValue) => {
          if (isCorrect) return null
          return <span style={{ color: 'var(--ok)', marginLeft: '10px', fontWeight: 'bold' }}>{correctValue}</span>
        }

        if (q.type === 'primfaktorisierung') {
          const displayValue = isCorrect ? formatFactors(q.correct) : formatFactors(q.user)
          return (
            <li key={q.id} onClick={handleClick}>
              Primfaktoren von {q.number} = {displayValue}
              {renderCorrection(formatFactors(q.correct))}
            </li>
          )
        }
        if (q.type === 'negative') {
          const renderOperand = (val) => {
            if (val < 0) {
              return (
                <mrow>
                  <mo>(</mo>
                  <mn>{String(val).replace('-', '−')}</mn>
                  <mo>)</mo>
                </mrow>
              )
            }
            if (q.explicitPlus && val > 0) {
              return (
                <mrow>
                  <mo>(</mo>
                  <mn>+{val}</mn>
                  <mo>)</mo>
                </mrow>
              )
            }
            return <mn>{val}</mn>
          }
          const displayValue = isCorrect ? q.correct : (isNaN(q.user) ? '—' : normalizeNumberString(q.user))
          return (
            <li key={q.id} onClick={handleClick} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <math display="inline">
                <mrow>
                  {renderOperand(q.a)}
                  <mo style={{ margin: '0 0.2em' }}>{q.operator}</mo>
                  {renderOperand(q.b)}
                  <mo style={{ margin: '0 0.2em' }}>=</mo>
                  <mn>{displayValue}</mn>
                </mrow>
              </math>
              {renderCorrection(q.correct)}
            </li>
          )
        }
        const op = getOperator(q)
        // For schriftlich, normalize padded zero strings to a compact number
        if (q.type === 'schriftlich') {
          const shown = normalizeNumberString(q.user)
          const displayValue = isCorrect ? q.correct : shown
          return (
            <li key={q.id} onClick={handleClick}>
              {q.a} {op} {q.b} = {displayValue}
              {renderCorrection(q.correct)}
            </li>
          )
        }
        // Default numeric display for Einmaleins
        const displayValue = isCorrect ? q.correct : (isNaN(q.user) ? '—' : normalizeNumberString(q.user))
        return (
          <li key={q.id} onClick={handleClick}>
            {q.a} {op} {q.b} = {displayValue}
            {renderCorrection(q.correct)}
          </li>
        )
      })}
    </ul>
  )
}
