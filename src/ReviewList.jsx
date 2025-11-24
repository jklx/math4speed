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
        return (
          <li key={q.id} onClick={handleClick}>
            {q.a} {op} {q.b} = {q.correct} (Deine Antwort: {isNaN(q.user) ? '—' : q.user})
          </li>
        )
      })}
    </ul>
  )
}
