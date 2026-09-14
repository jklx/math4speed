import AssignmentPolicyEditor from './AssignmentPolicyEditor'
import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Logo from './Logo'
import { CATEGORIES, getCategoryLabel, getCategoryDuration } from './utils/categories'
import { CategoryConfigurator, defaultCategorySettings } from './CategoryConfigurator'

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  if (response.status === 204) return null
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Die Anfrage konnte nicht verarbeitet werden.')
  return body
}

function suggestedExamTitle() {
  return `Test ${new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}`
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      onLogin(result.user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return <main className="management-page"><Logo /><section className="management-card management-login">
    <h1>Verwaltung</h1><p>Für Lehrkräfte und Administration.</p>
    <form onSubmit={submit} className="management-form">
      <label>Nutzername<input className="app-input" autoCapitalize="none" value={username} onChange={event => setUsername(event.target.value)} required /></label>
      <label>Passwort<input className="app-input" type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      {error && <p className="error">{error}</p>}
      <button className="big" disabled={busy}>{busy ? 'Anmelden…' : 'Anmelden'}</button>
    </form>
    <Link to="/">Zur Startseite</Link>
  </section></main>
}

function TeacherAdmin() {
  const [teachers, setTeachers] = useState([])
  const [form, setForm] = useState({ displayName: '', username: '', password: '' })
  const [error, setError] = useState(null)

  const load = () => api('/api/admin/teachers').then(result => setTeachers(result.teachers)).catch(requestError => setError(requestError.message))
  useEffect(() => { load() }, [])

  async function submit(event) {
    event.preventDefault(); setError(null)
    try {
      const result = await api('/api/admin/teachers', { method: 'POST', body: JSON.stringify(form) })
      setTeachers(current => [...current, result.teacher].sort((a, b) => a.displayName.localeCompare(b.displayName, 'de')))
      setForm({ displayName: '', username: '', password: '' })
    } catch (requestError) { setError(requestError.message) }
  }

  return <>
    <section className="management-card"><h2>Lehrkraft anlegen</h2><form onSubmit={submit} className="management-form management-form--inline">
      <label>Name<input className="app-input" value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} required /></label>
      <label>Nutzername<input className="app-input" autoCapitalize="none" value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} required /></label>
      <label>Startpasswort<input className="app-input" type="password" minLength="12" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required /></label>
      <button className="big">Anlegen</button>
    </form>{error && <p className="error">{error}</p>}</section>
    <section className="management-card"><h2>Lehrkräfte</h2><ul className="management-list">{teachers.map(teacher => <li key={teacher.id}><strong>{teacher.displayName}</strong><span>{teacher.username}</span></li>)}</ul></section>
  </>
}

function ClassDetail({ selectedClass, onBack }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [students, setStudents] = useState([])
  const [regeneratingCodes, setRegeneratingCodes] = useState(new Set())
  const [progress, setProgress] = useState(new Map())
  const [assignments, setAssignments] = useState([])
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentPolicy, setAssignmentPolicy] = useState({})
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [policyError, setPolicyError] = useState(null)
  const [policySaving, setPolicySaving] = useState(false)
  const [assignmentCategory, setAssignmentCategory] = useState('einmaleins')
  const [assignmentSettings, setAssignmentSettings] = useState(() => defaultCategorySettings('einmaleins'))
  const [exams, setExams] = useState([])
  const [examTitle, setExamTitle] = useState('')
  const [examCategory, setExamCategory] = useState('einmaleins')
  const [examSettings, setExamSettings] = useState(() => defaultCategorySettings('einmaleins'))
  const [examMinutes, setExamMinutes] = useState(() => getCategoryDuration('einmaleins') / 60)
  const [examSebRequired, setExamSebRequired] = useState(false)
  const [names, setNames] = useState('')
  const [error, setError] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [showArchivedAssignments, setShowArchivedAssignments] = useState(false)
  const [showArchivedExams, setShowArchivedExams] = useState(false)
  useEffect(() => {
    api(`/api/classes/${selectedClass.id}/students`).then(result => setStudents(result.students)).catch(requestError => setError(requestError.message))
    api(`/api/classes/${selectedClass.id}/progress`).then(result => setProgress(new Map(result.progress.map(item => [item.studentId, item])))).catch(requestError => setError(requestError.message))
    api(`/api/classes/${selectedClass.id}/assignments`).then(result => setAssignments(result.assignments)).catch(requestError => setError(requestError.message))
    api(`/api/classes/${selectedClass.id}/exams`).then(result => setExams(result.exams)).catch(requestError => setError(requestError.message))
  }, [selectedClass.id])
  useEffect(() => {
    const refresh = () => api(`/api/classes/${selectedClass.id}/exams`).then(result => setExams(result.exams)).catch(requestError => setError(requestError.message))
    const timer = window.setInterval(refresh, 5000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [selectedClass.id])
  async function importNames(event) {
    event.preventDefault(); setError(null)
    const parsed = names.split(/\r?\n/).map(name => name.trim()).filter(Boolean)
    try {
      const result = await api(`/api/classes/${selectedClass.id}/students/import`, { method: 'POST', body: JSON.stringify({ names: parsed }) })
      setStudents(current => [...current, ...result.students].sort((a, b) => a.displayName.localeCompare(b.displayName, 'de')))
      setNames('')
    } catch (requestError) { setError(requestError.message) }
  }
  async function createAssignment(event) {
    event.preventDefault(); setError(null)
    try {
      const result = await api(`/api/classes/${selectedClass.id}/assignments`, { method: 'POST', body: JSON.stringify({ title: assignmentTitle, category: assignmentCategory, settings: assignmentSettings, policy: assignmentPolicy }) })
      setAssignments(current => [result.assignment, ...current]); setAssignmentTitle(''); setAssignmentPolicy({}); return true
    } catch (requestError) { setError(requestError.message); return false }
  }
  async function saveAssignmentPolicy(event) {
    event.preventDefault()
    if (policySaving) return
    setPolicySaving(true); setPolicyError(null)
    try {
      const result = await api(`/api/assignments/${editingPolicy.id}`, { method: 'PATCH', body: JSON.stringify({ title: editingPolicy.title, settings: editingPolicy.settings, policy: editingPolicy.policy }) })
      setAssignments(current => current.map(item => item.id === editingPolicy.id ? result.assignment : item))
      setEditingPolicy(null)
    } catch (error) { setPolicyError(error.message) }
    finally { setPolicySaving(false) }
  }
  async function archiveAssignment(assignmentId) {
    try { await api(`/api/assignments/${assignmentId}/archive`, { method: 'POST' }); setAssignments(current => current.map(item => item.id === assignmentId ? { ...item, archivedAt: new Date().toISOString() } : item)) }
    catch (requestError) { setError(requestError.message) }
  }
  async function restoreAssignment(assignmentId) {
    try { await api(`/api/assignments/${assignmentId}/restore`, { method: 'POST' }); setAssignments(current => current.map(item => item.id === assignmentId ? { ...item, archivedAt: null } : item)) }
    catch (requestError) { setError(requestError.message) }
  }
  async function deleteAssignment(assignmentId) {
    if (!window.confirm('Übung endgültig löschen? Die zugehörigen Trainingszuordnungen gehen verloren.')) return
    try { await api(`/api/assignments/${assignmentId}`, { method: 'DELETE' }); setAssignments(current => current.filter(item => item.id !== assignmentId)) }
    catch (requestError) { setError(requestError.message) }
  }
  async function createExam(event) {
    event.preventDefault(); setError(null)
    try {
      const result = await api(`/api/classes/${selectedClass.id}/exams`, { method: 'POST', body: JSON.stringify({ title: examTitle, category: examCategory, settings: examSettings, durationSeconds: Number(examMinutes) * 60, sebRequired: examSebRequired }) })
      setExams(current => [result.exam, ...current]); setExamTitle(''); setExamSebRequired(false); return true
    } catch (requestError) { setError(requestError.message); return false }
  }
  async function archiveExam(examId) {
    try { await api(`/api/exams/${examId}/archive`, { method: 'POST' }); setExams(current => current.map(item => item.id === examId ? { ...item, archivedAt: new Date().toISOString() } : item)) }
    catch (requestError) { setError(requestError.message) }
  }
  async function restoreExam(examId) {
    try { await api(`/api/exams/${examId}/restore`, { method: 'POST' }); setExams(current => current.map(item => item.id === examId ? { ...item, archivedAt: null } : item)) }
    catch (requestError) { setError(requestError.message) }
  }
  async function deleteExam(examId) {
    if (!window.confirm('Test endgültig löschen? Zugehörige Testräume und Ergebnisse werden gelöscht.')) return
    try { await api(`/api/exams/${examId}`, { method: 'DELETE' }); setExams(current => current.filter(item => item.id !== examId)) }
    catch (requestError) { setError(requestError.message) }
  }
  async function regenerateStudentCode(studentId) {
    if (regeneratingCodes.has(studentId)) return
    setRegeneratingCodes(current => new Set(current).add(studentId))
    setError(null)
    try {
      const result = await api(`/api/classes/${selectedClass.id}/students/${studentId}/regenerate-code`, { method: 'POST' })
      setStudents(current => current.map(student => student.id === studentId ? { ...student, accessCode: result.student.accessCode } : student))
    } catch (requestError) { setError(requestError.message) }
    finally { setRegeneratingCodes(current => { const next = new Set(current); next.delete(studentId); return next }) }
  }
  async function deleteStudent(studentId) {
    if (!window.confirm('Schüler:in endgültig löschen? Trainings- und Testdaten dieser Person werden gelöscht.')) return
    try { await api(`/api/classes/${selectedClass.id}/students/${studentId}`, { method: 'DELETE' }); setStudents(current => current.filter(item => item.id !== studentId)); setProgress(current => { const next = new Map(current); next.delete(studentId); return next }) }
    catch (requestError) { setError(requestError.message) }
  }
  async function deleteClass() {
    if (!window.confirm(`Klasse „${selectedClass.name}“ endgültig löschen? Alle Schüler:innen, Übungen, Tests und Ergebnisse werden gelöscht.`)) return
    try { await api(`/api/classes/${selectedClass.id}`, { method: 'DELETE' }); onBack() }
    catch (requestError) { setError(requestError.message) }
  }
  const [rehearsalBusy, setRehearsalBusy] = useState(false)
  async function openRehearsal(examId, mode = 'browser') {
    setRehearsalBusy(true); setError(null)
    try {
      const result = await api(`/api/exams/${examId}/rehearsal`, { method: 'POST', body: JSON.stringify({ mode }) })
      const returnTo = `/verwaltung/klasse/${selectedClass.id}?tab=tests`
      navigate(`/pruefungsraum/${result.room.id}?token=${encodeURIComponent(result.room.accessToken)}&returnTo=${encodeURIComponent(returnTo)}`)
    } catch (requestError) { setError(requestError.message) }
    finally { setRehearsalBusy(false) }
  }
  async function openRoom(examId) {
    try {
      const result = await api(`/api/exams/${examId}/rooms`, { method: 'POST' })
      const returnTo = `/verwaltung/klasse/${selectedClass.id}?tab=tests`
      navigate(`/pruefungsraum/${result.room.id}?token=${encodeURIComponent(result.room.accessToken)}&returnTo=${encodeURIComponent(returnTo)}`)
    }
    catch (requestError) { setError(requestError.message) }
  }
  async function observeResults(examId) {
    try {
      const result = await api(`/api/exams/${examId}/rooms`, { method: 'POST' })
      navigate(`/admin/${result.room.id}?persistent=1&token=${encodeURIComponent(result.room.accessToken)}`)
    } catch (requestError) { setError(requestError.message) }
  }
  const selector = (category, setCategory, setSettings) => <label>Kategorie<select value={category} onChange={event => { setCategory(event.target.value); setSettings(defaultCategorySettings(event.target.value)) }}>{Object.keys(CATEGORIES).map(key => <option key={key} value={key}>{getCategoryLabel(key)}</option>)}</select></label>
  const requestedTab = searchParams.get('tab')
  const defaultTab = selectedClass.studentCount ? 'assignments' : 'configuration'
  const tab = ['assignments', 'tests', 'configuration'].includes(requestedTab) ? requestedTab : defaultTab
  const setTab = nextTab => setSearchParams({ tab: nextTab })
  return <>
    <button type="button" className="management-link-button" onClick={onBack}>← Klassen</button>
    <section className="management-card class-header"><div><h1>{selectedClass.name}</h1><p>Klasse, Übungen und Tests verwalten.</p></div><button className="management-danger-button" onClick={deleteClass}>Klasse löschen</button></section>
    <nav className="class-tabs" aria-label="Klassenverwaltung"><button className={tab === 'assignments' ? 'active' : ''} onClick={() => setTab('assignments')}>Übungen</button><button className={tab === 'tests' ? 'active' : ''} onClick={() => setTab('tests')}>Tests</button><button className={tab === 'configuration' ? 'active' : ''} onClick={() => setTab('configuration')}>Klassenkonfiguration</button></nav>
    {error && <p className="error">{error}</p>}
    {tab === 'configuration' && <section className="management-card"><h2>Schüler:innen ({students.length})</h2><p>Füge Namen zeilenweise ein. Für jede Person entsteht eine merkbare Kennung.</p><form onSubmit={importNames} className="management-form"><label>Schülernamen<textarea value={names} onChange={event => setNames(event.target.value)} rows="7" placeholder={'Mia Muster\nNoah Beispiel'} required /></label><button className="big">Kennungen erzeugen</button></form><ul className="management-list management-list--codes">{students.map(student => { const stats = progress.get(student.id); const minutes = Math.floor((stats?.durationSeconds || 0) / 60); return <li key={student.id}><div><strong>{student.displayName}</strong><span className="management-stat">{stats?.sessionCount || 0} Trainings · {minutes} Min. · {stats?.correctCount || 0} richtig</span></div><div className="student-code-actions"><code aria-live="polite">{student.accessCode}</code><button type="button" className="management-link-button student-code-reset" disabled={regeneratingCodes.has(student.id)} onClick={() => regenerateStudentCode(student.id)} aria-label={`Zugangscode für ${student.displayName} neu vergeben`} title="Neue Kennung erzeugen – die bisherige wird ungültig">{regeneratingCodes.has(student.id) ? '…' : '↻'}</button></div><button className="management-danger-button" onClick={() => deleteStudent(student.id)}>Löschen</button></li> })}</ul></section>}
    {tab === 'assignments' && <section className="management-card"><div className="section-toolbar"><div><h2>Übungen</h2><p>Aktive Übungen erscheinen im persönlichen Training der Klasse.</p></div><button className="big" onClick={() => setDialog('assignment')}>+ Übung hinzufügen</button></div><label className="archive-toggle"><input type="checkbox" checked={showArchivedAssignments} onChange={event => setShowArchivedAssignments(event.target.checked)} /> Archivierte Übungen einblenden</label><ul className="management-list">{assignments.filter(item => showArchivedAssignments || !item.archivedAt).map(assignment => <li key={assignment.id}><div><strong>{assignment.title}</strong><span className="management-stat">{getCategoryLabel(assignment.category)}{assignment.archivedAt ? ' · archiviert' : ''}</span></div><div><Link className="management-link-button" to={`/verwaltung/klasse/${selectedClass.id}/uebung/${assignment.id}`}>Versuche ansehen</Link><button className="management-link-button" onClick={() => { setEditingPolicy({ ...assignment, policy: assignment.policy || {} }); setPolicyError(null) }}>Einstellungen</button>{assignment.archivedAt ? <button className="management-link-button" onClick={() => restoreAssignment(assignment.id)}>Reaktivieren</button> : <button className="management-link-button" onClick={() => archiveAssignment(assignment.id)}>Archivieren</button>}<button className="management-danger-button" onClick={() => deleteAssignment(assignment.id)}>Löschen</button></div></li>)}{!assignments.some(item => showArchivedAssignments || !item.archivedAt) && <li>{showArchivedAssignments ? 'Noch keine Übung erstellt.' : 'Keine aktive Übung. Archivierte Übungen kannst du oben einblenden.'}</li>}</ul></section>}
    {tab === 'tests' && <section className="management-card"><div className="section-toolbar"><div><h2>Tests</h2><p>Erstelle einen Test und öffne ihn für die beaufsichtigte Durchführung.</p></div><button className="big" onClick={() => { if (!examTitle) setExamTitle(suggestedExamTitle()); setExamMinutes(getCategoryDuration(examCategory) / 60); setDialog('exam') }}>+ Test hinzufügen</button></div><label className="archive-toggle"><input type="checkbox" checked={showArchivedExams} onChange={event => setShowArchivedExams(event.target.checked)} /> Archivierte Tests einblenden</label><ul className="management-list">{exams.filter(item => showArchivedExams || !item.archivedAt).map(exam => <li key={exam.id}><div><strong>{exam.title}</strong><span className="management-stat">{getCategoryLabel(exam.category)} · {Math.round(exam.durationSeconds / 60)} Min.{exam.sebRequired ? ' · Safe Exam Browser' : ''}{exam.roomStatus === 'finished' ? ' · abgeschlossen' : ''}{exam.archivedAt ? ' · archiviert' : ''}</span></div><div>{exam.archivedAt ? <button className="management-link-button" onClick={() => restoreExam(exam.id)}>Reaktivieren</button> : <><button className="management-link-button" onClick={() => openRoom(exam.id)}>Test öffnen</button><button className="management-link-button" disabled={rehearsalBusy} onClick={() => openRehearsal(exam.id)}>Probedurchlauf</button>{exam.sebRequired && <button className="management-link-button" disabled={rehearsalBusy} onClick={() => openRehearsal(exam.id, 'seb')}>SEB-Geräteprobe</button>}{exam.roomStatus === 'finished' && <button className="management-link-button" onClick={() => observeResults(exam.id)}>Ergebnisse ansehen</button>}<button className="management-link-button" onClick={() => archiveExam(exam.id)}>Archivieren</button></>}<button className="management-danger-button" onClick={() => deleteExam(exam.id)}>Löschen</button></div></li>)}{!exams.some(item => showArchivedExams || !item.archivedAt) && <li>{showArchivedExams ? 'Noch kein Test erstellt.' : 'Kein aktiver Test. Archivierte Tests kannst du oben einblenden.'}</li>}</ul></section>}
    {editingPolicy && <div className="dialog-backdrop"><section className="activity-dialog" role="dialog" aria-modal="true" aria-label="Übungseinstellungen bearbeiten"><button className="dialog-close" type="button" aria-label="Dialog schließen" disabled={policySaving} onClick={() => setEditingPolicy(null)}>×</button><h2>Übungseinstellungen</h2><form className="activity-editor" onSubmit={saveAssignmentPolicy}><label>Titel<input className="app-input" value={editingPolicy.title} maxLength={120} required onChange={event => setEditingPolicy(value => ({ ...value, title: event.target.value }))} /></label><p className="management-stat">{getCategoryLabel(editingPolicy.category)}</p><CategoryConfigurator category={editingPolicy.category} values={editingPolicy.settings || defaultCategorySettings(editingPolicy.category)} onChange={settings => setEditingPolicy(value => ({ ...value, settings }))} compact /><AssignmentPolicyEditor category={editingPolicy.category} value={editingPolicy.policy} onChange={policy => setEditingPolicy(value => ({ ...value, policy }))} />{policyError && <p role="alert" className="error">{policyError}</p>}<button className="big" disabled={policySaving}>{policySaving ? 'Speichern…' : 'Speichern'}</button></form></section></div>}
    {dialog === 'assignment' && <div className="dialog-backdrop" role="presentation"><section className="activity-dialog" role="dialog" aria-modal="true" aria-label="Übung hinzufügen"><button className="dialog-close" type="button" aria-label="Dialog schließen" onClick={() => setDialog(null)}>×</button><h2>Übung hinzufügen</h2><form onSubmit={async event => { if (await createAssignment(event)) setDialog(null) }} className="activity-editor"><label>Titel<input className="app-input" value={assignmentTitle} onChange={event => setAssignmentTitle(event.target.value)} placeholder="z. B. Einmaleins wiederholen" required /></label>{selector(assignmentCategory, category => { setAssignmentCategory(category); setAssignmentPolicy(value => ({ ...value, ratingThresholds: null })) }, setAssignmentSettings)}<CategoryConfigurator category={assignmentCategory} values={assignmentSettings} onChange={setAssignmentSettings} compact /><AssignmentPolicyEditor category={assignmentCategory} value={assignmentPolicy} onChange={setAssignmentPolicy} />{error && <p className="error" role="alert">{error}</p>}<button className="big">Übung bereitstellen</button></form></section></div>}
    {dialog === 'exam' && <div className="dialog-backdrop" role="presentation"><section className="activity-dialog" role="dialog" aria-modal="true" aria-label="Test hinzufügen"><button className="dialog-close" type="button" aria-label="Dialog schließen" onClick={() => setDialog(null)}>×</button><h2>Test hinzufügen</h2><form onSubmit={async event => { if (await createExam(event)) setDialog(null) }} className="activity-editor"><label>Titel<input className="app-input" value={examTitle} onChange={event => setExamTitle(event.target.value)} placeholder="z. B. Kopfrechnen 1" required /></label>{selector(examCategory, category => { setExamCategory(category); setExamMinutes(getCategoryDuration(category) / 60) }, setExamSettings)}<label>Bearbeitungszeit in Minuten<input className="app-input" type="number" min="1" max="120" value={examMinutes} onChange={event => setExamMinutes(event.target.value)} required /></label><label className="seb-toggle"><input type="checkbox" checked={examSebRequired} onChange={event => setExamSebRequired(event.target.checked)} /><span><strong>Safe Exam Browser erzwingen</strong><small>Der Test kann nur mit der vom Testraum bereitgestellten SEB-Konfiguration gestartet werden.</small></span></label><CategoryConfigurator category={examCategory} values={examSettings} onChange={setExamSettings} compact /><button className="big">Test anlegen</button></form></section></div>}
  </>
}

function TeacherClasses() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const load = () => api('/api/classes').then(result => setClasses(result.classes)).catch(requestError => setError(requestError.message))
  useEffect(() => { load() }, [])
  async function createClass(event) {
    event.preventDefault(); setError(null)
    try {
      const result = await api('/api/classes', { method: 'POST', body: JSON.stringify({ name }) })
      setClasses(current => [result.class, ...current]); setName('')
    } catch (requestError) { setError(requestError.message) }
  }
  async function deleteClass(classId) {
    if (!window.confirm('Klasse endgültig löschen? Alle Schüler:innen, Übungen, Tests und Ergebnisse werden gelöscht.')) return
    try { await api(`/api/classes/${classId}`, { method: 'DELETE' }); setClasses(current => current.filter(item => item.id !== classId)) }
    catch (requestError) { setError(requestError.message) }
  }
  const selectedClass = classId ? classes.find(item => item.id === classId) : null
  useEffect(() => { if (classId && classes.length && !selectedClass) navigate('/verwaltung', { replace: true }) }, [classId, classes, selectedClass, navigate])
  if (selectedClass) return <ClassDetail selectedClass={selectedClass} onBack={() => navigate('/verwaltung')} />
  return <>
    <section className="management-card"><h1>Meine Klassen</h1><form onSubmit={createClass} className="management-form management-form--inline"><label>Klassenname<input className="app-input" value={name} onChange={event => setName(event.target.value)} required /></label><button className="big">Klasse anlegen</button></form>{error && <p className="error">{error}</p>}</section>
    <section className="management-card"><ul className="management-list">{classes.map(item => <li key={item.id}><button className="management-class" onClick={() => navigate(`/verwaltung/klasse/${item.id}`)}><strong>{item.name}</strong><span>{item.studentCount} Schüler:innen</span></button><button className="management-danger-button" onClick={() => deleteClass(item.id)}>Löschen</button></li>)}{!classes.length && <li>Noch keine Klasse angelegt.</li>}</ul></section>
  </>
}

export default function ManagementPortal() {
  const [user, setUser] = useState(undefined)
  useEffect(() => { api('/api/auth/me').then(result => setUser(result.user)).catch(() => setUser(null)) }, [])
  if (user === undefined) return null
  if (!user) return <Login onLogin={setUser} />
  return <main className="management-page"><Logo /><div className="management-header"><div><h1>{user.role === 'admin' ? 'Administration' : `Hallo, ${user.displayName}`}</h1><p>{user.role === 'admin' ? 'Lehrkraft-Konten verwalten' : 'Klassen und Schülerkennungen verwalten'}</p></div><button className="management-link-button" onClick={async () => { await api('/api/auth/logout', { method: 'POST' }); setUser(null) }}>Abmelden</button></div>{user.role === 'admin' ? <TeacherAdmin /> : <TeacherClasses />}</main>
}
