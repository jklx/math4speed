import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayer } from './MultiplayerContext';

function JoinRoomStatus({ roomCode }) {
  const { roomCheck } = useMultiplayer();
  const navigate = useNavigate();
  
  // show appropriate UI depending on roomCheck state
  const checkingThis = roomCheck.roomId === roomCode;

  if (checkingThis && roomCheck.exists === false) {
    return <div className="hint" style={{ color: 'var(--bad)', marginTop: 8 }}>Raum {roomCode} wurde nicht gefunden.</div>
  }

  if (checkingThis && roomCheck.exists === true && roomCheck.status !== 'waiting') {
    return <div className="hint" style={{ color: '#d97706', marginTop: 8 }}>Spiel läuft bereits. Beitreten nicht möglich.</div>
  }

  if (checkingThis && roomCheck.exists === true && roomCheck.status === 'waiting') {
    return (
      <div className="tile-actions">
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
  const { createRoom, roomId, error, checkRoom, roomCheck } = useMultiplayer();

  // Landing tile states
  const [joinTileRoom, setJoinTileRoom] = useState('');
  const [createTileName, setCreateTileName] = useState('');

  // If we got into a room, redirect to game/admin
  useEffect(() => {
    if (roomId) {
      navigate('/play');
    }
  }, [roomId]);

  // when joinTileRoom becomes 6 chars, trigger a server-side room check
  useEffect(() => {
    if (joinTileRoom.length === 6) {
      checkRoom(joinTileRoom);
    }
  }, [joinTileRoom]);

  

  return (
    <div className="lobby">
      <h2>Math4Speed Multiplayer</h2>
      {error && <div className="error">{error}</div>}

      <div className="menu-grid">
        <div className="tile big">
          <div className="tile-body">
            <div className="title">Trainieren</div>
            <div className="subtitle">Einzelspieler: Übe so oft du möchtest und verbessere deine Zeit.</div>
            <div className="tile-actions">
              <button className="big" onClick={() => navigate('/training')}>Jetzt trainieren</button>
            </div>
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
                    placeholder="Raum-Code (z. B. abc123)"
                    value={joinTileRoom}
                    onChange={(e) => setJoinTileRoom(e.target.value)}
                    maxLength={6}
                    autoFocus
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
          <div className="tile">
            <div>
                  <div className="title">Neuen Raum erstellen</div>
                  <div className="subtitle">Erstelle einen Raum (Raum-Name) und werde Admin. Andere können mit dem Code beitreten.</div>
              <div className="tile-body">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (createTileName) {
                    createRoom(createTileName);
                  }
                }}>
                  <input
                    type="text"
                    placeholder="Raum-Name"
                    value={createTileName}
                    onChange={(e) => setCreateTileName(e.target.value)}
                    required
                  />
                  <div className="tile-actions">
                    <button
                      type="submit"
                      className="big"
                      disabled={!createTileName}
                    >
                      Raum erstellen
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}