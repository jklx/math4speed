import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AttemptCards, AssignmentGoal } from './AssignmentAttempts'
import { getCategoryLabel } from './utils/categories'

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options })
  if (response.status === 204) return null
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Das hat nicht geklappt.')
  return body
}

function assignmentTrainingUrl(assignment) {
  const query = new URLSearchParams({ assignment: assignment.id })
  return `/training/${assignment.category}?${query.toString()}`
}

const attemptDateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' })

function AssignmentCard({ assignment, onStart }) {
  const [deletedIds, setDeletedIds] = useState([])
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const attempts = (assignment.attempts || []).filter(attempt => !deletedIds.includes(attempt.id))
  async function deleteAttempt(attempt) {
    if (deletingId || !window.confirm(`Versuch vom ${attemptDateFormat.format(new Date(attempt.completedAt))} endgültig löschen? Er wird auch aus deiner Trainingsstatistik entfernt.`)) return
    setDeletingId(attempt.id)
    setDeleteError(null)
    try {
      await request(`/api/student/practice-sessions/${encodeURIComponent(attempt.id)}`, { method: 'DELETE' })
      setDeletedIds(previous => [...previous, attempt.id])
    } catch (error) { setDeleteError(error.message) }
    finally { setDeletingId(null) }
  }
  return (
    <article className="student-category student-category--assignment">
      <button type="button" className="student-assignment-title" onClick={onStart}>
        <span>{getCategoryLabel(assignment.category)}</span>
        <strong>{assignment.title}</strong>
      </button>
      <AttemptCards assignment={assignment} attempts={attempts} onDelete={deleteAttempt} deleting={deletingId !== null} />
      {deleteError && <p className="error" role="alert">{deleteError}</p>}
      <AssignmentGoal assignment={assignment} attempts={attempts} />
      <button type="button" className="student-assignment-action management-link-button" onClick={onStart}>{attempts.length ? 'Erneut üben' : 'Übung starten'} →</button>
    </article>
  )
}

function CodeLogin({ onLogin }) {
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setError(null)
    if (busy) return
    setBusy(true)
    try { onLogin((await request('/api/student/login', { method: 'POST', body: JSON.stringify({ accessCode }) })).student) }
    catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }
  return <section className="tile student-home student-home-login" aria-labelledby="student-login-title">
    <div className="tile-body">
      <h2 id="student-login-title" className="title">Für deine Klasse</h2>
      <form className="management-form student-login-form" onSubmit={submit}>
        <label>Meine Kennung<input className="app-input" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="z. B. blauerBär4" value={accessCode} onChange={event => setAccessCode(event.target.value)} required /></label>
        <button type="submit" className="big" disabled={busy}>{busy ? 'Anmelden…' : 'Anmelden'}</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  </section>
}

export default function StudentTraining() {
  const [student, setStudent] = useState(undefined)
  const [assignments, setAssignments] = useState(null)
  const [error, setError] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    request('/api/student/me').then(result => { if (active) setStudent(result.student) }).catch(() => { if (active) setStudent(null) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    setAssignments(null)
    setError(null)
    if (student) request('/api/student/assignments')
      .then(result => { if (active) setAssignments(result.assignments) })
      .catch(error => { if (active) setError(error.message) })
    return () => { active = false }
  }, [student])
  async function logout() {
    setLoggingOut(true)
    setError(null)
    try {
      await request('/api/student/logout', { method: 'POST' })
      setAssignments(null)
      setStudent(null)
    } catch (error) { setError(error.message) }
    finally { setLoggingOut(false) }
  }
  if (student === undefined) return <section className="tile student-home"><p role="status">Anmeldung wird geprüft…</p></section>
  if (!student) return <CodeLogin onLogin={setStudent} />
  return <section className="tile student-home" aria-labelledby="student-class-title">
    <div className="tile-body">
      <div className="management-header">
        <div><h2 id="student-class-title" className="title">Für deine Klasse</h2><p>Hallo, {student.displayName} · {student.className}</p></div>
        <button type="button" className="management-link-button" disabled={loggingOut} onClick={logout}>Abmelden</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {!assignments && !error && <p role="status">Übungen werden geladen…</p>}
      {assignments?.length === 0 && <p>Für deine Klasse gibt es noch keine Übungen. Du kannst unten frei trainieren.</p>}
      <div className="student-category-grid">{assignments?.map(assignment => <AssignmentCard key={`${student.id}:${assignment.id}`} assignment={assignment} onStart={() => navigate(assignmentTrainingUrl(assignment))} />)}</div>
    </div>
  </section>
}
