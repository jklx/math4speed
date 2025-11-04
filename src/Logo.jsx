import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Logo() {
  const navigate = useNavigate()

  return (
    <div className="logo-header">
      <div className="logo-container">
        <h1 
          className="logo-text" 
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
          title="Zurück zum Hauptmenü"
        >
          <span className="logo-math">Math</span>
          <span className="logo-four">4</span>
          <span className="logo-speed">Speed</span>
        </h1>
        {/* Home button removed — logo text itself links to home */}
      </div>
    </div>
  )
}
