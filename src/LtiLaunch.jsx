import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Logo from './Logo'
import Game from './Game'

export default function LtiLaunch() {
  const { launchId } = useParams()
  const [launch, setLaunch] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`/api/lti/launch-session/${encodeURIComponent(launchId)}`)
      .then(response => response.ok ? response.json() : response.json().then(body => Promise.reject(new Error(body.error))))
      .then(setLaunch)
      .catch(err => setError(err.message || 'Die LTI-Sitzung ist abgelaufen.'))
  }, [launchId])

  if (error) return <main className="app center"><Logo /><p className="error">{error}</p></main>
  if (!launch) return <main className="app center"><Logo /><p>Lade Math4Speed…</p></main>

  return <Game isSinglePlayer ltiActivity={launch.activity} />
}
