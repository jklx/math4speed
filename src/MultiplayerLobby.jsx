import React, { useState, useEffect } from 'react';
import { useMultiplayer } from './MultiplayerContext';

function JoinRoomControls({ roomCode, name, setName, joinRoom }) {
  const { roomCheck } = useMultiplayer();

  // show appropriate UI depending on roomCheck state
  const checkingThis = roomCheck.roomId === roomCode;

  if (checkingThis && roomCheck.exists === false) {
    return <div className="hint" style={{ color: 'var(--bad)', marginTop: 8 }}>Raum {roomCode} wurde nicht gefunden.</div>
  }

  if (checkingThis && roomCheck.exists === true && roomCheck.status !== 'waiting') {
    return <div className="hint" style={{ color: '#d97706', marginTop: 8 }}>Spiel läuft bereits (Status: {roomCheck.status}). Beitreten nicht möglich.</div>
  }

  // either still checking or exists & waiting
  return (
    <>
      <input
        type="text"
        placeholder="Dein Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginTop: 8 }}
      />
      <div className="tile-actions">
        <button
          className="big"
          onClick={() => joinRoom(roomCode, name)}
          disabled={!name || !(roomCheck.roomId === roomCode && roomCheck.exists === true && roomCheck.status === 'waiting')}
        >
          Beitreten
        </button>
      </div>
      {checkingThis && roomCheck.exists === null && <div className="hint">Prüfe Raum…</div>}
    </>
  );
}

export default function MultiplayerLobby({ onSinglePlayer }) {
  const [showJoin, setShowJoin] = useState(false);
  const [inputUsername, setInputUsername] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const { createRoom, joinRoom, roomState, roomId, error, isAdmin, startGame, roomCheck, checkRoom } = useMultiplayer();

  // Landing tile states
  const [joinTileRoom, setJoinTileRoom] = useState('');
  const [joinTileName, setJoinTileName] = useState('');
  const [createTileName, setCreateTileName] = useState('');

  // when joinTileRoom becomes 6 chars, trigger a server-side room check
  useEffect(() => {
    if (joinTileRoom.length === 6) {
      checkRoom(joinTileRoom);
    }
  }, [joinTileRoom]);

  

  return (
    <div className="lobby">
      <h2>Mathe4Speed Multiplayer</h2>
      {error && <div className="error">{error}</div>}

      <div className="menu-grid">
        <div className="tile big">
          <div className="tile-body">
            <div className="title">Trainieren</div>
            <div className="subtitle">Einzelspieler: Übe so oft du möchtest und verbessere deine Zeit.</div>
            <div className="tile-actions">
              <button className="big" onClick={onSinglePlayer}>Jetzt trainieren</button>
            </div>
          </div>
        </div>
        <div className="menu-row">
          <div className="tile">
            <div>
              <div className="title">Raum beitreten</div>
              <div className="subtitle">Gib zuerst den Raum-Code ein (6 Zeichen), anschließend deinen Namen.</div>
              <div className="tile-body">
                <input
                  type="text"
                  placeholder="Raum-Code (z. B. abc123)"
                  value={joinTileRoom}
                  onChange={(e) => setJoinTileRoom(e.target.value)}
                  maxLength={6}
                />
                {joinTileRoom.length === 6 && (
                  <JoinRoomControls
                    roomCode={joinTileRoom}
                    name={joinTileName}
                    setName={setJoinTileName}
                    joinRoom={joinRoom}
                  />
                )}
                <div className="hint">Raum-Code ist 6 Zeichen lang.</div>
              </div>
            </div>
          </div>
          <div className="tile">
            <div>
                  <div className="title">Neuen Raum erstellen</div>
                  <div className="subtitle">Erstelle einen Raum (Raum-Name) und werde Admin. Andere können mit dem Code beitreten.</div>
              <div className="tile-body">
                    <input
                      type="text"
                      placeholder="Raum-Name"
                      value={createTileName}
                      onChange={(e) => setCreateTileName(e.target.value)}
                    />
                <div className="tile-actions">
                  <button
                    className="big"
                        onClick={() => createRoom(createTileName)}
                    disabled={!createTileName}
                  >
                    Raum erstellen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}