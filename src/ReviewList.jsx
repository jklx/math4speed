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
    if (isNaN(n)) return s
    return String(n)
  }
  
  return (
    <ul className={`review-list ${className}`}>
      {filtered.map((q) => {
        const handleClick = () => {
          if (q.type === 'schriftlich' && onSelectSchriftlich) {
            onSelectSchriftlich(q.id)
          }
        }
        if (q.type === 'primfaktorisierung') {
          return (
            <li key={q.id} onClick={handleClick}>
              Primfaktoren von {q.number} = {formatFactors(q.correct)} (Deine Antwort: {formatFactors(q.user)})
            </li>
          )
        }
        const op = getOperator(q)
        // For schriftlich, normalize padded zero strings to a compact number
        if (q.type === 'schriftlich') {
          const shown = normalizeNumberString(q.user)
          return (
            <li key={q.id} onClick={handleClick}>
              {q.a} {op} {q.b} = {q.correct} (Deine Antwort: {shown})
            </li>
          )
        }
        // Default numeric display for Einmaleins
        return (
          <li key={q.id} onClick={handleClick}>
            {q.a} {op} {q.b} = {q.correct} (Deine Antwort: {isNaN(q.user) ? '—' : normalizeNumberString(q.user)})
          </li>
        )
      })}
    </ul>
  )
}
