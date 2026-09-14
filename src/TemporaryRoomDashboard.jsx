import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Logo from './Logo'
import { useMultiplayer } from './MultiplayerContext'
import { getCategoryLabel } from './utils/categories'

function roomStatusLabel(status) {
  return ({ waiting: 'Anmeldung läuft', playing: 'Raum läuft', finished: 'Abgeschlossen' })[status] || 'Wird geladen…'
}

export default function TemporaryRoomDashboard() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { roomState, error, isConnected, attemptAdminRejoin, getRoomState, startGame } = useMultiplayer()
  const [adminToken, setAdminToken] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try { setAdminToken(localStorage.getItem(`m4s_admin_${roomId}`) || '') } catch { setAdminToken('') }
  }, [roomId])

  useEffect(() => {
    if (!roomId || !isConnected) return
    attemptAdminRejoin(roomId)
    getRoomState(roomId)
  }, [roomId, isConnected])

  const joinUrl = useMemo(() => typeof window === 'undefined' ? '' : `${window.location.origin}/room/${roomId?.toLowerCase()}`, [roomId])
  const qrUrl = adminToken ? `/api/rooms/${roomId}/qr?adminToken=${encodeURIComponent(adminToken)}` : null
  const players = roomState?.players || []
  const canStart = roomState?.status === 'waiting' && players.length > 0

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { setCopied(false) }
  }

  if (!roomState) {
    return <main className="management-page"><Logo /><section className="management-card"><h1>Raum wird geladen…</h1>{error && <p className="error">{error}</p>}</section></main>
  }

  return <main className="management-page room-dashboard">
    <Logo />
    <Link to="/">← Zur Startseite</Link>
    <section className="management-card">
      <h1>{getCategoryLabel(roomState.settings?.category || 'einmaleins')}</h1>
      <p className="room-dashboard__status">{roomStatusLabel(roomState.status)}</p>
      {roomState.status === 'waiting' && <><div className="exam-qr">{qrUrl && <img src={qrUrl} alt="QR-Code zum Beitreten" />}<p>QR-Code scannen oder den Link öffnen.</p><code className="exam-link">{joinUrl}</code><button className="management-link-button" onClick={copyLink}>{copied ? 'Link kopiert' : 'Link kopieren'}</button></div><p className="management-stat">Schüler:innen wählen beim Beitreten ihren Namen selbst.</p></>}
      {error && <p className="error">{error}</p>}
    </section>
    <section className="management-card">
      <div className="section-toolbar"><div><h2>Anmeldungen ({players.length})</h2><p>Die Liste aktualisiert sich direkt, sobald jemand beitritt.</p></div>{roomState.status === 'waiting' && <button className="big" disabled={!canStart} onClick={() => startGame(roomId, roomState.settings)}>Raum starten</button>}</div>
      <ul className="management-list">
        {players.map(player => <li key={player.id} className={player.connected ? 'attendance-row attendance-row--ready' : 'attendance-row'}><div><strong>{player.username}</strong><span className="management-stat">{player.connected ? 'angemeldet' : 'Verbindung unterbrochen'}</span></div></li>)}
        {!players.length && <li>Noch niemand angemeldet.</li>}
      </ul>
      {roomState.status === 'playing' && <div className="section-toolbar"><p className="management-stat">Der Raum läuft; weitere Anmeldungen sind gesperrt.</p><button className="big" onClick={() => navigate(`/admin/${roomId}?observe=1`)}>Live-Fortschritt beobachten</button></div>}
    </section>
  </main>
}
