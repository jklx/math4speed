import React, { useMemo, useState, useEffect } from 'react';
import Logo from './Logo'
import { useMultiplayer } from './MultiplayerContext';
import { useNavigate } from 'react-router-dom';
import { getCategoryLabel, CATEGORIES, CATEGORY_GRADE_ORDER } from './utils/categories';

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
  const { createRoom, error, checkRoom, roomCheck } = useMultiplayer();

  // Landing tile states
  const [joinTileRoom, setJoinTileRoom] = useState('');
  const [createTileName, setCreateTileName] = useState('');

  const categoryGroups = useMemo(() => {
    const grouped = Object.entries(CATEGORIES).reduce((result, [key, config]) => {
      const grade = config.grade || 'Weitere Kategorien';
      if (!result[grade]) result[grade] = [];
      result[grade].push({ key, ...config });
      return result;
    }, {});

    return [...CATEGORY_GRADE_ORDER, ...Object.keys(grouped).filter(grade => !CATEGORY_GRADE_ORDER.includes(grade))]
      .filter(grade => grouped[grade]?.length)
      .map(grade => ({
        grade,
        categories: grouped[grade]
      }));
  }, []);

  // If we got into a room, redirect to game/admin
  // navigation is handled centrally in MultiplayerContext

  // when joinTileRoom becomes 6 chars, trigger a server-side room check
  useEffect(() => {
    if (joinTileRoom.length === 6) {
      checkRoom(joinTileRoom);
    }
  }, [joinTileRoom]);

  const navigateToTraining = (categoryKey, subcategorySettings) => {
    const params = new URLSearchParams(subcategorySettings || {});
    const query = params.toString();
    navigate(query ? `/training/${categoryKey}?${query}` : `/training/${categoryKey}`);
  }
  

  return (
    <div className="app">
      <div className="lobby">
        <Logo />
        {error && <div className="error">{error}</div>}

      <div className="menu-grid">
        <div className="tile big">
          <div className="tile-body">
            <div className="title">Trainieren</div>
            <div className="category-selection category-selection-wide category-selection-minimal">
              <div className="category-grade-groups">
                {categoryGroups.map(({ grade, categories }) => (
                  <section key={grade} className="category-grade-group">
                    <div className="category-grade-header">{grade}</div>
                    <div className="category-buttons category-buttons-grid">
                      {categories.map((config) => (
                        config.subcategories?.length ? (
                          <div key={config.key} className="category-btn category-card category-card-static" role="group" aria-label={config.label}>
                            <span className="category-card-title">{config.label}</span>
                            <div className="category-subactions">
                              {config.subcategories.map((subcategory) => (
                                <button
                                  key={subcategory.key}
                                  type="button"
                                  className="category-subbtn"
                                  onClick={() => navigateToTraining(config.key, subcategory.settings)}
                                  aria-label={`${config.label} ${subcategory.label}`}
                                >
                                  {subcategory.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button 
                            key={config.key}
                            className="category-btn category-card"
                            onClick={() => navigateToTraining(config.key)}
                            type="button"
                          >
                            <span>{config.label}</span>
                          </button>
                        )
                      ))}
                    </div>
                  </section>
                ))}
              </div>
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
                    className="app-input"
                    placeholder="Raum-Code"
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
                    className="app-input"
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
    </div>
  );
}