import React from 'react'
import { getOperator } from './utils/getOperator'
import { formatFactors } from './utils/formatFactors'

/**
 * ReviewList displays a list of answers (correct or incorrect).
 * 
 * Props:
 * - answers: array of answer objects
 * - isCorrect: boolean - true for correct answers, false for incorrect
 */
export default function ReviewList({ answers, isCorrect }) {
  const filtered = answers.filter(a => a.isCorrect === isCorrect)
  const className = isCorrect ? 'ok' : 'bad'
  
  return (
    <ul className={`review-list ${className}`}>
      {filtered.map((q) => {
        if (q.type === 'primfaktorisierung') {
          return (
            <li key={q.id}>
              Primfaktoren von {q.number} = {formatFactors(q.correct)} (Deine Antwort: {formatFactors(q.user)})
            </li>
          )
        }
        const op = getOperator(q)
        return (
          <li key={q.id}>
            {q.a} {op} {q.b} = {q.correct} (Deine Antwort: {isNaN(q.user) ? '—' : q.user})
          </li>
        )
      })}
    </ul>
  )
}
