import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Logo from './Logo'
import Game from './Game'

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options })
  if (response.status === 204) return null
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Das hat nicht geklappt.')
  return body
}

function roomStatusLabel(status) {
  return ({ waiting: 'Anmeldung läuft', code_released: 'Startcode angezeigt', running: 'Test läuft', finished: 'Abgeschlossen' })[status] || 'Wird geladen…'
}

function studentStatusLabel(status) {
  return ({ pending: 'wartet auf Anmeldung', ready: 'angemeldet', absent: 'abwesend', started: 'Test gestartet', finished: 'abgeschlossen' })[status] || 'unbekannt'
}

async function sebRequestHash() {
  const security = window.SafeExamBrowser?.security
  if (!security) return null
  if (security.configKey) return security.configKey
  if (typeof security.updateKeys !== 'function') return null
  return new Promise(resolve => {
    const timeout = window.setTimeout(() => resolve(security.configKey || null), 1500)
    try {
      security.updateKeys(() => { window.clearTimeout(timeout); resolve(security.configKey || null) })
    } catch { window.clearTimeout(timeout); resolve(null) }
  })
}

export function TeacherExamRoom() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const requestedReturnTo = searchParams.get('returnTo')
  const returnTo = requestedReturnTo?.startsWith('/verwaltung') ? requestedReturnTo : '/verwaltung'
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [startCode, setStartCode] = useState(null)
  const navigate = useNavigate()
  const load = () => api(`/api/exam-rooms/${roomId}`).then(setData).catch(requestError => setError(requestError.message))
  useEffect(() => { load(); const timer = setInterval(load, 2500); return () => clearInterval(timer) }, [roomId])
  async function setAbsent(studentId, absent) { try { await api(`/api/exam-rooms/${roomId}/students/${studentId}/attendance`, { method: 'PATCH', body: JSON.stringify({ absent }) }); load() } catch (requestError) { setError(requestError.message) } }
  async function releaseCode() { try { setStartCode((await api(`/api/exam-rooms/${roomId}/release-code`, { method: 'POST' })).code); load() } catch (requestError) { setError(requestError.message) } }
  const [botsBusy, setBotsBusy] = useState(false)
  async function addBots() {
    setBotsBusy(true); setError(null)
    try { await api(`/api/exam-rooms/${roomId}/bots`, { method: 'POST' }); await load() }
    catch (requestError) { setError(requestError.message) }
    finally { setBotsBusy(false) }
  }
  const automaticStudents = data?.students?.filter(student => student.botProfile) || []
  const [resetting, setResetting] = useState(false)
  async function resetRehearsal() {
    if (!window.confirm('Probedurchlauf zurücksetzen? Die bisherigen Probe-Ergebnisse werden gelöscht. Schließe zuerst die Schüleransicht.')) return
    setResetting(true)
    try { await api(`/api/exam-rooms/${roomId}/reset-rehearsal`, { method: 'POST' }); setStartCode(null); setError(null); await load() }
    catch (requestError) { setError(requestError.message) }
    finally { setResetting(false) }
  }
  const studentLink = token ? `${window.location.origin}/pruefung/${roomId}?token=${encodeURIComponent(token)}` : null
  const sebConfigUrl = token ? `${window.location.origin}/api/exam-rooms/${roomId}/seb-config?token=${encodeURIComponent(token)}` : null
  const sebLink = sebConfigUrl?.replace(/^https:/, 'sebs:').replace(/^http:/, 'seb:')
  const pending = data?.students?.filter(student => student.status === 'pending').length || 0
  const observe = () => navigate(`/admin/${roomId}?persistent=1&token=${encodeURIComponent(token || '')}`)
  return <main className="management-page"><Logo /><Link to={returnTo}>← Zur Klasse</Link><section className="management-card"><h1>{data?.room?.title || 'Testraum'}</h1><p>Phase: {roomStatusLabel(data?.room?.status)}</p>{data?.room?.isRehearsal && <aside className="rehearsal-notice"><h2>Probedurchlauf</h2><p>Dieser Probedurchlauf verwendet ausschließlich fiktive Schüler. Die echte Klasse und ihre Ergebnisse bleiben unberührt.</p><p>{data.room.sebRequired ? 'Geräteprobe: Öffne den Zugang auf dem Schulgerät im Safe Exam Browser.' : 'Browserprobe: Öffne die Schüleransicht in einem neuen Tab und melde dich mit der Probe-Kennung an.'}</p><p>Probe-Kennung: <strong>{data.students.find(student => !student.botProfile)?.accessCode}</strong></p>{studentLink && <a className="management-link-button" href={data.room.sebRequired ? sebLink : studentLink} target="_blank" rel="noopener noreferrer">{data.room.sebRequired ? 'Safe Exam Browser öffnen' : 'Schüleransicht öffnen'}</a>}<p>Danach hier den Startcode anzeigen und in der Schüleransicht eingeben. Während der Bearbeitung kannst du den Live-Fortschritt beobachten.</p><div className="rehearsal-bots"><h3>Automatische Schüler</h3>{data.room.sebRequired ? <p>Die Automatik steht in der Browserprobe zur Verfügung. Die SEB-Geräteprobe wird auf dem Schulgerät durchgeführt.</p> : <><p>Mia rechnet schneller und macht etwa bei jeder siebten Aufgabe einen Fehler. Noah rechnet langsamer und macht etwa bei jeder vierten Aufgabe einen Fehler. Beide melden sich selbst an, warten auf deine Startfreigabe und geben am Ende der Testzeit ab.</p>{data.room.status === 'waiting' && <button className="big" disabled={botsBusy || resetting || (automaticStudents.length > 0 && data.automation?.active)} onClick={addBots}>{botsBusy ? 'Schüler werden hinzugefügt…' : automaticStudents.length ? data.automation?.active ? 'Automatische Schüler sind aktiv' : 'Automatik fortsetzen' : 'Automatische Schüler hinzufügen'}</button>}{automaticStudents.length > 0 && <p>{automaticStudents.length} automatische Schüler nehmen teil. Du kannst zusätzlich selbst rechnen oder den manuellen Probe-Schüler vor dem Start als abwesend markieren.</p>}{data.automation?.error && <p className="error" role="alert">{data.automation.error}</p>}{!automaticStudents.length && data.room.status !== 'waiting' && <p>Setze den Probedurchlauf zurück, um automatische Schüler hinzuzufügen.</p>}</>}</div><button className="management-link-button" disabled={resetting || botsBusy} onClick={resetRehearsal}>{resetting ? 'Wird zurückgesetzt…' : 'Probedurchlauf zurücksetzen'}</button></aside>}{studentLink && data?.room?.status === 'waiting' && !startCode && <div className="exam-qr"><img src={`/api/exam-rooms/${roomId}/qr?token=${encodeURIComponent(token)}&mode=${data?.room?.sebRequired ? 'seb' : 'web'}`} alt="QR-Code zum Testraum" /><p>QR-Code mit dem Schul-iPad scannen.</p><code className="exam-link">{data?.room?.sebRequired ? sebLink : studentLink}</code></div>}{!token && <p className="error">Der Start-Link ist nach einem Neuladen nicht mehr verfügbar. Erstelle bei Bedarf einen neuen Testraum.</p>}{startCode && <div className="exam-code"><span>Startcode – 60 Sekunden gültig</span><strong>{startCode}</strong></div>}{error && <p className="error">{error}</p>}</section><section className="management-card"><div className="section-toolbar"><div><h2>Anwesenheit</h2><p>Die Anmeldung wird laufend aktualisiert.</p></div>{['running', 'finished'].includes(data?.room?.status) && <button className="big" onClick={observe}>{data?.room?.status === 'finished' ? 'Ergebnisse ansehen' : 'Live-Fortschritt beobachten'}</button>}</div><ul className="management-list">{data?.students?.map(student => <li key={student.id} className={`attendance-row${student.status === 'ready' ? ' attendance-row--ready' : ''}${student.status === 'absent' ? ' attendance-row--absent' : ''}`}><div><strong>{student.displayName}</strong><span className="management-stat">{studentStatusLabel(student.status)}</span></div><label className="attendance-toggle"><input type="checkbox" checked={student.status === 'absent'} disabled={data?.room?.status !== 'waiting' || !['pending', 'absent'].includes(student.status)} onChange={event => setAbsent(student.id, event.target.checked)} /> Abwesend</label></li>)}</ul>{data?.room?.status === 'waiting' && <button className="big" disabled={pending > 0} onClick={releaseCode}>{pending > 0 ? `Noch ${pending} offen` : 'Startcode anzeigen'}</button>}</section></main>
}

export function StudentExamWait() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [room, setRoom] = useState(null)
  const [accessCode, setAccessCode] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [needsLogin, setNeedsLogin] = useState(true)
  const load = () => { if (!token) return setError('Ungültiger Testlink.'); api(`/api/exam-rooms/${roomId}/wait?token=${encodeURIComponent(token)}`).then(result => { setRoom(result.room); setNeedsLogin(false) }).catch(requestError => { if (requestError.message === 'Bitte gib deine Kennung ein.') setNeedsLogin(true); else setError(requestError.message) }) }
  useEffect(() => { load(); const timer = setInterval(load, 2500); return () => clearInterval(timer) }, [roomId, token])
  async function login(event) { event.preventDefault(); setError(null); try { await api('/api/student/login', { method: 'POST', body: JSON.stringify({ accessCode }) }); await api(`/api/exam-rooms/${roomId}/ready`, { method: 'POST', body: JSON.stringify({ token, sebRequestHash: await sebRequestHash() }) }); setNeedsLogin(false); setError(null); load() } catch (requestError) { setError(requestError.message) } }
  async function start(event) { event.preventDefault(); try { const result = await api(`/api/exam-rooms/${roomId}/start`, { method: 'POST', body: JSON.stringify({ token, code }) }); navigate(`/pruefung/${roomId}/spielen?token=${encodeURIComponent(token)}`, { replace: true, state: { exam: result.exam } }) } catch (requestError) { setError(requestError.message) } }
  return <main className="management-page"><Logo /><section className="management-card management-login"><h1>{room?.title || 'Test'}</h1>{needsLogin ? <form className="management-form" onSubmit={login}><p>Gib deine Kennung ein und warte auf die Freigabe durch die Aufsicht.</p><label>Meine Kennung<input className="app-input" value={accessCode} onChange={event => setAccessCode(event.target.value)} required /></label><button className="big">Anmelden</button></form> : room?.status === 'waiting' ? <p>Du bist angemeldet. Bitte warte auf den Startcode.</p> : (room?.status === 'code_released' || (room?.status === 'running' && room?.studentStatus === 'ready')) ? <form className="management-form" onSubmit={start}><p>Gib den im Raum angezeigten Startcode ein.</p><label>Startcode<input className="app-input" inputMode="numeric" maxLength="6" value={code} onChange={event => setCode(event.target.value)} required /></label><button className="big">Test starten</button></form> : room?.status === 'running' && room?.studentStatus === 'started' ? <><p>Dein Bearbeitungsstand ist gespeichert.</p><button className="big" onClick={() => navigate(`/pruefung/${roomId}/spielen?token=${encodeURIComponent(token)}`)}>Test fortsetzen</button></> : room?.status === 'running' ? <p>Der Test läuft bereits. Bitte wende dich an die Aufsicht.</p> : room?.status === 'finished' || room?.studentStatus === 'finished' ? <p>Der Test ist abgeschlossen. Du kannst dieses Fenster schließen.</p> : <p>Testraum wird geladen…</p>}{error && <p className="error">{error}</p>}</section></main>
}

export function StudentExamGame() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [resumeConfirmed, setResumeConfirmed] = useState(false)
  useEffect(() => {
    if (!token) return
    api(`/api/exam-rooms/${roomId}/current?token=${encodeURIComponent(token)}`)
      .then(result => setSession(result.exam))
      .catch(requestError => setError(requestError.message))
  }, [roomId, token])
  if (!token) return <main className="management-page"><section className="management-card"><p className="error">Ungültiger Testlink.</p></section></main>
  if (error) return <main className="management-page"><section className="management-card"><p className="error">{error}</p><Link to={`/pruefung/${roomId}?token=${encodeURIComponent(token)}`}>Zurück zum Testraum</Link></section></main>
  if (!session) return <main className="management-page"><section className="management-card"><p>Testraum wird geladen…</p></section></main>
  if (session.taskPlan?.length && !resumeConfirmed) return <main className="management-page"><section className="management-card management-login"><h1>Test fortsetzen</h1><p>Dein Bearbeitungsstand und die verbleibende Zeit sind gespeichert.</p><button className="big" onClick={() => setResumeConfirmed(true)}>Test fortsetzen</button></section></main>
  return <>{session.isRehearsal && <div className="rehearsal-notice" role="status">Probedurchlauf · Probe-Schüler · Diese Ergebnisse gehören nicht zur echten Klasse.</div>}<Game isSinglePlayer={false} persistentToken={token} persistentSession={session} /></>
}
