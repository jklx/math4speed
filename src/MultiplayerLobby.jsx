import React, { useState, useEffect } from 'react';
import Logo from './Logo'
import { useMultiplayer } from './MultiplayerContext';
import { Link, useNavigate } from 'react-router-dom';
import { getCategoryLabel } from './utils/categories';
import TrainingCategorySelection from './TrainingCategorySelection';
import StudentTraining from './StudentTraining';

function JoinRoomStatus({ roomCode }) {
  const { roomCheck } = useMultiplayer();
  
  // show appropriate UI depending on roomCheck state
  const checkingThis = roomCheck.roomId === roomCode;

  if (checkingThis && roomCheck.exists === false) {
    return <div className="hint" style={{ color: 'var(--bad)', marginTop: 8 }}>Raum {roomCode} wurde nicht gefunden.</div>
  }

  if (checkingThis && roomCheck.exists === true && roomCheck.status !== 'waiting') {
    return <div className="hint" style={{ color: '#d97706', marginTop: 8 }}>Spiel läuft bereits. Beitreten nicht möglich.</div>
  }

  if (checkingThis && roomCheck.exists === true && roomCheck.status === 'waiting') {
    const categoryLabel = roomCheck.settings?.category
      ? getCategoryLabel(roomCheck.settings.category)
      : null;
    return (
      <div className="tile-actions">
        {categoryLabel && (
          <div className="hint">Kategorie: {categoryLabel}</div>
        )}
        <button
          type="submit"
          className="big"
        >
          Weiter zum Beitreten
        </button>
      </div>
    )
  }

  if (checkingThis && roomCheck.exists === null) {
    return <div className="hint">Prüfe Raum…</div>
  }

  return null;
}

export default function MultiplayerLobby() {
  const navigate = useNavigate();
  const { error, checkRoom, roomCheck } = useMultiplayer();

  // Landing tile states
  const [joinTileRoom, setJoinTileRoom] = useState('');

  // If we got into a room, redirect to game/admin
  // navigation is handled centrally in MultiplayerContext

  // when joinTileRoom becomes 6 chars, trigger a server-side room check
  useEffect(() => {
    if (joinTileRoom.length === 6) {
      checkRoom(joinTileRoom);
    }
  }, [joinTileRoom]);

  

  return (
    <div className="app">
      <div className="lobby">
        <Logo />
        <nav className="lobby-navigation" aria-label="Schnellzugriff"><Link to="/verwaltung">Lehrkraft-Login</Link></nav>
        {error && <div className="error">{error}</div>}

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
        <div className="menu-row">
          <div className="tile">
            <div>
              <div className="title">Raum beitreten</div>
              <div className="subtitle">Gib zuerst den Raum-Code ein (6 Zeichen), anschließend deinen Namen.</div>
              <div className="tile-body">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (joinTileRoom.length === 6 && 
                      roomCheck.roomId === joinTileRoom && 
                      roomCheck.exists && 
                      roomCheck.status === 'waiting') {
                    navigate(`/room/${joinTileRoom.toLowerCase()}`);
                  }
                }}>
                  <input
                    type="text"
                    className="app-input"
                    placeholder="Raum-Code"
                    value={joinTileRoom}
                    onChange={(e) => setJoinTileRoom(e.target.value)}
                    maxLength={6}
                  />
                  {joinTileRoom.length === 6 && (
                    <JoinRoomStatus
                      roomCode={joinTileRoom}
                    />
                  )}
                  <div className="hint">Raum-Code ist 6 Zeichen lang.</div>
                </form>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
