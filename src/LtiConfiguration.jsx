import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Logo from './Logo'
import { CATEGORIES } from './utils/categories'

export default function LtiConfiguration() {
  const { sessionId } = useParams()
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: 'Math4Speed-Übung',
    category: 'einmaleins',
    durationSeconds: 300,
    maxScore: 20,
    assessmentMode: false,
    sebRequired: false
  })

  useEffect(() => {
    fetch(`/api/lti/configuration-session/${encodeURIComponent(sessionId)}`)
      .then(response => response.ok ? response.json() : response.json().then(body => Promise.reject(new Error(body.error))))
      .then(setSession)
      .catch(err => setError(err.message || 'Die Konfigurationssitzung konnte nicht geladen werden.'))
  }, [sessionId])

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`/api/lti/configuration-session/${encodeURIComponent(sessionId)}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Die Aktivität konnte nicht erstellt werden.')
      const postForm = document.createElement('form')
      postForm.method = 'post'
      postForm.action = result.returnUrl
      const jwt = document.createElement('input')
      jwt.type = 'hidden'
      jwt.name = 'JWT'
      jwt.value = result.jwt
      postForm.appendChild(jwt)
      document.body.appendChild(postForm)
      postForm.submit()
    } catch (err) {
      setError(err.message || 'Die Aktivität konnte nicht erstellt werden.')
      setSubmitting(false)
    }
  }

  if (error && !session) {
    return <main className="app center"><Logo /><p className="error">{error}</p></main>
  }

  return (
    <main className="app center">
      <Logo />
      <section className="settings-box" style={{ width: 'min(100%, 42rem)', textAlign: 'left' }}>
        <h1 style={{ marginTop: 0 }}>Math4Speed-Aktivität einrichten</h1>
        {session && <p className="subtitle">Kurs: {session.course}</p>}
        <form onSubmit={submit}>
          <label className="checkbox-label" style={{ display: 'grid', gap: '0.35rem', marginBottom: '1rem' }}>
            <span>Name der Aktivität</span>
            <input className="app-input" value={form.title} maxLength={120} onChange={event => update('title', event.target.value)} required />
          </label>
          <label className="checkbox-label" style={{ display: 'grid', gap: '0.35rem', marginBottom: '1rem' }}>
            <span>Thema</span>
            <select className="app-input" value={form.category} onChange={event => update('category', event.target.value)}>
              {Object.entries(CATEGORIES).map(([key, category]) => <option key={key} value={key}>{category.label}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <label className="checkbox-label" style={{ display: 'grid', gap: '0.35rem', flex: 1 }}>
              <span>Zeitlimit (Minuten)</span>
              <input className="app-input" type="number" min="1" max="120" value={form.durationSeconds / 60} onChange={event => update('durationSeconds', Number(event.target.value) * 60)} required />
            </label>
            <label className="checkbox-label" style={{ display: 'grid', gap: '0.35rem', flex: 1 }}>
              <span>Maximalpunkte</span>
              <input className="app-input" type="number" min="1" max="1000" value={form.maxScore} onChange={event => update('maxScore', Number(event.target.value))} required />
            </label>
          </div>
          <label className="checkbox-label" style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={form.assessmentMode} onChange={event => update('assessmentMode', event.target.checked)} />
            <span>Als Prüfung durchführen</span>
          </label>
          <label className="checkbox-label" style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', opacity: form.assessmentMode ? 1 : 0.55 }}>
            <input type="checkbox" checked={form.sebRequired} disabled={!form.assessmentMode} onChange={event => update('sebRequired', event.target.checked)} />
            <span>Safe Exam Browser voraussetzen</span>
          </label>
          {error && <p className="error">{error}</p>}
          <button className="big" type="submit" disabled={submitting}>{submitting ? 'Erstelle Aktivität…' : 'Aktivität zu Moodle hinzufügen'}</button>
        </form>
      </section>
    </main>
  )
}
