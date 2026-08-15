import React from 'react'
import { getOperator } from './utils/getOperator'
import { formatFactors } from './utils/formatFactors'
import { formatDecimal } from './utils/formatNumber'

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
  const formatGermanDecimalString = (value) => {
    if (value == null) return '—'
    const n = Number(value)
    if (isFinite(n)) {
      return formatDecimal(n, { maximumFractionDigits: 4 })
    }
    const s = String(value).trim()
    if (!s.length) return '—'
    return s.replace(/\./g, ',').replace(/-/g, '−')
  }
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
        if (q.type === 'binomische') {
          const displayValue = isCorrect ? formatGermanDecimalString(q.correct) : formatGermanDecimalString(q.user)
          return (
            <li key={q.id} onClick={handleClick}>
              {q.expression} = {displayValue}
              {renderCorrection(formatGermanDecimalString(q.correct))}
            </li>
          )
        }
        if (q.type === 'prozent-gleichung') {
          const displayResult = isCorrect ? String(q.correct) : (isNaN(q.user) ? '—' : String(q.user))
          const shortText = q.text.length > 55 ? q.text.slice(0, 55) + '…' : q.text
          return (
            <li key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <span style={{ fontSize: '0.8em', color: 'var(--text-secondary, #888)', lineHeight: 1.3 }}>{shortText}</span>
              <span>x = {displayResult}{q.unit ? ' ' + q.unit : ''}{renderCorrection(`x = ${q.correct}${q.unit ? ' ' + q.unit : ''}`)}</span>
            </li>
          )
        }
        if (q.type === 'gemischte-zahlen') {
          const displayValue = isCorrect ? q.correct : (q.user || '—')
          return (
            <li key={q.id} onClick={handleClick}>
              {q.direction === 'mixed-to-improper'
                ? `${q.whole} ${q.numerator}/${q.denominator} = ${displayValue}`
                : `${q.improperNumerator}/${q.denominator} = ${displayValue}`}
              {renderCorrection(q.correct)}
            </li>
          )
        }
        if (q.type === 'dezimalbrueche') {
          const displayValue = isCorrect ? q.correct : (q.user || '—')
          return (
            <li key={q.id} onClick={handleClick}>
              {q.direction === 'decimal-to-fraction'
                ? `${q.decimalDisplay} = ${displayValue}`
                : `${q.numerator}/${q.denominator} = ${displayValue}`}
              {renderCorrection(q.correct)}
            </li>
          )
        }
        const op = getOperator(q)
        const displayOperator = op === '-' ? '−' : op
        // For schriftlich, normalize padded zero strings to a compact number
        if (q.type === 'schriftlich') {
          const shown = normalizeNumberString(q.user)
          const displayValue = isCorrect ? q.correct : shown
          return (
            <li key={q.id} onClick={handleClick}>
              {q.a} {displayOperator} {q.b} = {displayValue}
              {renderCorrection(q.correct)}
            </li>
          )
        }
        // Default numeric display for Einmaleins
        const displayValue = isCorrect ? q.correct : (isNaN(q.user) ? '—' : normalizeNumberString(q.user))
        return (
          <li key={q.id} onClick={handleClick}>
            {q.a} {displayOperator} {q.b} = {displayValue}
            {renderCorrection(q.correct)}
          </li>
        )
      })}
    </ul>
  )
}
