import React, { useState, useEffect, useRef } from 'react';
import { useMultiplayer } from './MultiplayerContext';
import Game from './Game';
import ProgressBar from './ProgressBar';

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

  // refs to each player's problems container so we can auto-scroll to latest
  const problemRefs = useRef({});

  // When roomState updates, scroll each problems container to the bottom
  useEffect(() => {
    if (!(isAdmin && roomState && roomState.players)) return;
    roomState.players.forEach(p => {
      const el = problemRefs.current[p.id];
      if (el) {
        // small timeout to ensure DOM updated
        setTimeout(() => {
          el.scrollTop = el.scrollHeight;
        }, 0);
      }
    });
  }, [roomState, isAdmin]);

  if (roomState) {
    // If the game is playing and this client is a regular player, show the Game component
    if (roomState.status === 'playing' && !isAdmin) {
      return <Game isSinglePlayer={false} />
    }

    if (isAdmin && roomState.status === 'playing') {
      return (
        <div className="admin-view">
          <h2>Admin-Ansicht - Raum: <tt>{roomId}</tt></h2>
          <div className="admin-grid">
            {roomState.players
              .filter(player => player.id !== roomState.admin)
              .map(player => (
                <div key={player.id} className="player-card">
                  <h3>
                    <span>{player.username}</span>
                    <span>{(player.progress || 0).toFixed(0)}%</span>
                  </h3>
                  {/* show live progress fill */}
                  <div style={{ marginBottom: 6 }}>
                    <ProgressBar progress={player.progress || 0} />
                  </div>
                  {player.solved && player.solved.length > 0 && (
                    // render full history but keep container small so last 5 are visible
                    <div
                      className="player-problems"
                      ref={el => { problemRefs.current[player.id] = el }}
                    >
                      {player.solved.map((problem, idx) => (
                        <div 
                          key={idx} 
                          className={`problem-entry ${problem.isCorrect ? 'correct' : 'incorrect'}`}
                        >
                          <span>{problem.a} · {problem.b} = {problem.user}</span>
                          <span>{problem.isCorrect ? '✓' : `✗ (${problem.correct})`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {player.score && (
                    <>
                      <div style={{ marginTop: 8 }}>
                        Fertig: {player.score.time}s ({player.score.wrongCount} Fehler)
                      </div>
                      {/* show the performance gradient + marker for finished players */}
                      <div style={{ marginTop: 8 }}>
                        <ProgressBar finalTime={player.score.time} />
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>
      );
    }

      

    return (
      <div className="lobby">
        <h2>Raum: <tt>{roomId}</tt></h2>
        <div className="players-list">
          <h3>Spieler:</h3>
          {roomState.players.map(player => (
            <div key={player.id} className="player-row">
              <span>{player.username} {player.id === roomState.admin && '(Admin)'}</span>
              {roomState.status === 'playing' && (
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${player.progress}%` }}></div>
                </div>
              )}
              {player.score && (
                <span>Zeit: {player.score.time}s ({player.score.wrongCount} Fehler)</span>
              )}
            </div>
          ))}
        </div>
        {isAdmin && roomState.status === 'waiting' && (
          <button className="big" onClick={startGame}>Spiel starten</button>
        )}
        {!isAdmin && roomState.status === 'waiting' && (
          <p>Warte auf den Start durch den Admin...</p>
        )}
      </div>
    );
  }

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
                  placeholder="Raum-Code (z. B. ABC123)"
                  value={joinTileRoom}
                  onChange={(e) => setJoinTileRoom(e.target.value.toUpperCase())}
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
              <div className="subtitle">Erstelle einen Raum und werde Admin. Andere können mit dem Code beitreten.</div>
              <div className="tile-body">
                <input
                  type="text"
                  placeholder="Dein Name"
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