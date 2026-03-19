import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { CATEGORIES, getCategoryLabel, CATEGORY_GRADE_ORDER } from './utils/categories'

const categoryKeys = CATEGORY_GRADE_ORDER.flatMap(grade =>
  Object.entries(CATEGORIES)
    .filter(([, cfg]) => cfg.grade === grade)
    .map(([key]) => key)
)

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch {
    return ''
  }
}

export default function Leaderboard() {
  const { category: urlCategory } = useParams()
  const navigate = useNavigate()

  const [category, setCategory] = useState(
    urlCategory && CATEGORIES[urlCategory] ? urlCategory : categoryKeys[0]
  )
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leaderboard?category=${category}`)
      .then(r => r.json())
      .then(data => {
        setEntries(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setEntries([])
        setLoading(false)
      })
  }, [category])

  const selectCategory = (key) => {
    setCategory(key)
    navigate(`/leaderboard/${key}`, { replace: true })
  }

  const rankDisplay = (i) => {
    if (i === 0) return '🥇'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return i + 1
  }

  return (
    <div className="app">
      <Logo />
      <main>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0 }}>Rangliste</h2>
          <button className="big secondary" onClick={() => navigate(-1)}>Zurück</button>
        </div>

        <div className="leaderboard-category-tabs">
          {categoryKeys.map(key => (
            <button
              key={key}
              className={`toggle-btn${category === key ? ' active' : ''}`}
              onClick={() => selectCategory(key)}
            >
              {getCategoryLabel(key)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="center" style={{ marginTop: '2rem' }}>Lade…</div>
        ) : entries.length === 0 ? (
          <div className="center" style={{ marginTop: '2rem' }}>Noch keine Einträge für diese Kategorie.</div>
        ) : (
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Richtig</th>
                  <th>Fehler</th>
                  <th>Datum</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={i} className={i < 3 ? 'leaderboard-podium' : ''}>
                    <td className="leaderboard-rank">{rankDisplay(i)}</td>
                    <td className="leaderboard-name">{entry.username}</td>
                    <td className="leaderboard-score">{entry.score}</td>
                    <td className="leaderboard-wrong">{entry.wrongCount}</td>
                    <td className="leaderboard-date">{formatDate(entry.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
