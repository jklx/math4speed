import React from 'react';
import Logo from './Logo'
import { Link } from 'react-router-dom';
import TrainingCategorySelection from './TrainingCategorySelection';
import StudentTraining from './StudentTraining';

export default function MultiplayerLobby() {
  return (
    <div className="app">
      <div className="lobby">
        <Logo />
        <nav className="lobby-navigation" aria-label="Schnellzugriff"><Link to="/verwaltung">Lehrkraft-Login</Link></nav>

      <div className="menu-grid">
        <StudentTraining />
        <div className="tile big">
          <div className="tile-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <div className="title" style={{ marginBottom: 0 }}>Freies Training</div>
              <a href="/leaderboard" style={{ fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>🏆 Rangliste</a>
            </div>
            <TrainingCategorySelection />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
