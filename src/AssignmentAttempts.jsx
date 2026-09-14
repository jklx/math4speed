import React from 'react'
import { getCategoryAttemptRating, getAssignmentGoalProgress } from './utils/categories'

const attemptDateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' })

export function AttemptCards({ assignment, attempts, onDelete, deleting = false }) {
  return (
    <span className="student-attempts">
        {attempts.length === 0 && <span className="student-attempts-heading">Noch kein abgeschlossener Versuch</span>}
        {attempts.map(attempt => {
          const rating = getCategoryAttemptRating(assignment.category, attempt.correctCount, assignment.policy?.ratingThresholds)
          return (
            <span className={`student-attempt student-attempt--${rating.stars}`} key={attempt.id}>
              <span className="student-attempt-header">
                <span className="student-attempt-date"><time dateTime={attempt.completedAt}>{attemptDateFormat.format(new Date(attempt.completedAt))}</time></span>
                {onDelete && <button type="button" className="student-attempt-delete" disabled={deleting} onClick={() => onDelete(attempt)} aria-label={`Versuch vom ${attemptDateFormat.format(new Date(attempt.completedAt))} löschen`} title="Versuch löschen">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg>
                </button>}
              </span>
              <span className="student-attempt-result"><span className="student-attempt-correct">{attempt.correctCount} richtig</span><span>{attempt.wrongCount} falsch</span></span>
              <span className="student-attempt-rating" title="Einschätzung anhand der richtigen Antworten und der Bewertungsgrenzen dieser Kategorie.">{rating.label}</span>
              <span className="student-attempt-stars" role="img" aria-label={`${rating.stars} von 5 Sternen`}><span aria-hidden="true">{'★'.repeat(rating.stars)}<span className="student-attempt-stars-empty">{'☆'.repeat(5 - rating.stars)}</span></span></span>
            </span>
          )
        })}
      </span>
  )
}

export function AssignmentGoal({ assignment, attempts }) {
  const goalProgress = getAssignmentGoalProgress(assignment, attempts)
  return <>
    {goalProgress && <div className={`assignment-goal${goalProgress.achieved ? ' assignment-goal--achieved' : ''}`} role="status">
        <span>Ziel: {goalProgress.type === 'either'
          ? `mindestens ${goalProgress.attemptsTarget} ${goalProgress.attemptsTarget === 1 ? 'Versuch' : 'Versuche'} oder ${goalProgress.ratingTarget}/5 Sterne`
          : goalProgress.type === 'attempts'
            ? `mindestens ${goalProgress.target} ${goalProgress.target === 1 ? 'Versuch' : 'Versuche'}`
            : `mindestens ${goalProgress.target}/5 Sterne`}</span>
        <strong>{goalProgress.achieved ? '✓ Ziel erfüllt' : 'Noch offen'}</strong>
      </div>}
  </>
}
