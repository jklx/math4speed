import React from 'react'
import { getCategoryRatingThresholds } from './utils/categories'

export default function AssignmentPolicyEditor({ category, value = {}, onChange }) {
  const goal = value.goal
  const thresholds = value.ratingThresholds || getCategoryRatingThresholds(category)
  return <section className="assignment-policy-editor">
    <h3>Übungsziel und Bewertung</h3>
    <label>Optionales Ziel<select value={goal?.type || 'none'} onChange={event => onChange({ ...value, goal: event.target.value === 'none' ? null : event.target.value === 'either' ? { type: 'either', attempts: goal?.type === 'attempts' ? goal.value : 3, rating: goal?.type === 'rating' ? goal.value : 3 } : { type: event.target.value, value: goal?.type === 'either' ? goal[event.target.value] : 3 } })}>
      <option value="none">Kein Ziel</option><option value="attempts">Mindestens X Versuche</option><option value="rating">Mindestens X von 5 Sternen</option>
      <option value="either">Versuche oder Sterne – eine Bedingung genügt</option>
    </select></label>
    {goal?.type === 'either' ? <>
      <label>Mindestens so viele abgeschlossene Versuche<input className="app-input" type="number" min="1" max="1000" step="1" required value={goal.attempts} onChange={event => onChange({ ...value, goal: { ...goal, attempts: event.target.value === '' ? '' : Number(event.target.value) } })} /></label>
      <strong>ODER</strong>
      <label>Mindestens so viele Sterne in einem Versuch<input className="app-input" type="number" min="1" max="5" step="1" required value={goal.rating} onChange={event => onChange({ ...value, goal: { ...goal, rating: event.target.value === '' ? '' : Number(event.target.value) } })} /></label>
    </> : goal && <label>{goal.type === 'attempts' ? 'Abgeschlossene Versuche' : 'Sterne in mindestens einem Versuch'}<input className="app-input" type="number" min="1" max={goal.type === 'rating' ? 5 : 1000} step="1" required value={goal.value} onChange={event => onChange({ ...value, goal: { ...goal, value: event.target.value === '' ? '' : Number(event.target.value) } })} /></label>}
    <p className="management-stat">Gelöschte Versuche zählen nicht zum Ziel. Für ein Sterneziel zählt der beste gespeicherte Versuch.</p>
    <h4>Bewertungsgrenzen</h4>
    <p className="management-stat">Richtige Antworten pro Versuch. Unterhalb der ersten Grenze: 1 Stern – Weiterüben. Änderungen gelten auch für bisherige Versuche.</p>
    <div className="assignment-rating-inputs">
      {['OK', 'Gut', 'Super', 'Hervorragend'].map((label, index) => <label key={label}>{index + 2} Sterne · {label}<input className="app-input" type="number" min={index === 0 ? 1 : Number(thresholds[index - 1]) + 1} max="10000" step="1" required value={thresholds[index]} onChange={event => onChange({ ...value, ratingThresholds: thresholds.map((threshold, position) => position === index ? (event.target.value === '' ? '' : Number(event.target.value)) : threshold) })} /></label>)}
    </div>
    <button type="button" className="management-link-button" onClick={() => onChange({ ...value, ratingThresholds: null })}>Kategorievorgaben verwenden</button>
    <span className="management-stat">{value.ratingThresholds ? 'Eigene Grenzen für diese Übung' : 'Vorgaben der Kategorie'}</span>
  </section>
}
