import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Logo from './Logo'
import { AttemptCards, AssignmentGoal } from './AssignmentAttempts'
import { getAssignmentGoalProgress, getCategoryLabel } from './utils/categories'

export default function AssignmentProgress() {
  const { classId, assignmentId } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null); setData(null)
    fetch(`/api/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/progress`, { credentials: 'same-origin', signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Die Versuche konnten nicht geladen werden.')
        setData(body)
      }).catch(error => { if (error.name !== 'AbortError') setError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [classId, assignmentId, refresh])
  const students = data?.students || []
  const hasGoal = Boolean(data?.assignment.policy?.goal)
  const achieved = student => getAssignmentGoalProgress(data.assignment, student.attempts)?.achieved
  const visible = students.filter(student => filter === 'none' ? student.attempts.length === 0 : !hasGoal || filter === 'all' || (filter === 'achieved' ? achieved(student) : !achieved(student)))
  return <main className="management-page">
    <Logo />
    <Link to={`/verwaltung/klasse/${classId}?tab=assignments`}>← Zurück zu den Übungen</Link>
    <section className="management-card">
      <div className="section-toolbar"><div><h1>{data?.assignment.title || 'Übungsversuche'}</h1>{data && <p>{data.assignment.className} · {getCategoryLabel(data.assignment.category)}{data.assignment.archivedAt ? ' · archiviert' : ''}</p>}</div><button type="button" className="management-link-button" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Aktualisieren</button></div>
      {loading && <p role="status">Versuche werden geladen…</p>}
      {error && <p role="alert" className="error">{error}</p>}
      {data && <>
        <p>{hasGoal ? `${students.filter(achieved).length} von ${students.length} Schüler:innen haben das Ziel erfüllt.` : 'Für diese Übung ist kein Ziel festgelegt.'}</p>
        <label className="assignment-progress-filter">Anzeigen <select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Alle Schüler:innen</option>{hasGoal && <><option value="open">Ziel noch offen</option><option value="achieved">Ziel erfüllt</option></>}<option value="none">Noch kein Versuch</option></select></label>
        <div className="student-category-grid">{visible.map(student => <article className="student-category student-category--assignment" key={student.id}>
          <strong>{student.displayName}</strong>
          <AttemptCards assignment={data.assignment} attempts={student.attempts} />
          <AssignmentGoal assignment={data.assignment} attempts={student.attempts} />
        </article>)}</div>
        {visible.length === 0 && <p>{students.length === 0 ? 'In dieser Klasse sind noch keine Schüler:innen.' : 'Keine Schüler:innen für diesen Filter.'}</p>}
      </>}
    </section>
  </main>
}
