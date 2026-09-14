import React, { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Game from './Game'
import Logo from './Logo'

export default function TrainingPage() {
  const [params] = useSearchParams()
  const { category } = useParams()
  const assignmentId = params.get('assignment')
  return assignmentId
    ? <AssignedTraining key={assignmentId} assignmentId={assignmentId} />
    : <Game key={category} isSinglePlayer={true} />
}

function AssignedTraining({ assignmentId }) {
  const [assignment, setAssignment] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/student/assignments/${encodeURIComponent(assignmentId)}`, {
      credentials: 'same-origin', signal: controller.signal
    }).then(async response => {
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Die Übung konnte nicht geladen werden.')
      setAssignment(body.assignment)
    }).catch(error => { if (error.name !== 'AbortError') setError(error.message) })
    return () => controller.abort()
  }, [assignmentId])
  if (assignment) return <Game isSinglePlayer={true} assignmentContext={assignment} />
  return <main className="management-page"><Logo /><section className="management-card">
    {error ? <><p role="alert" className="error">{error}</p><Link to="/">Zur Startseite</Link></> : <p role="status">Übung wird geladen…</p>}
  </section></main>
}
