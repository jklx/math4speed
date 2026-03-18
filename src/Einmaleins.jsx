import React from 'react'

const TickMark = ({ visible }) => (
  <svg viewBox="8 14 36 26" className="tick-svg tick-svg--small" aria-hidden style={{ visibility: visible ? 'visible' : 'hidden' }}>
    <path d="M14 27 l9 9 l16 -16" className="tick-check" />
  </svg>
)

export default function Einmaleins({ a, b, value = '', onChange, onEnter, showTick = false }) {
  const handleKey = (e) => {
    if (e.key === 'Enter') {
      onEnter && onEnter()
    }
  }
  return (
    <div className="question-centered einmaleins-row">
      <div className="expression">{a} · {b} =</div>
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        className="app-input"
        autoFocus
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        onKeyDown={handleKey}
      />
      <TickMark visible={showTick} />
    </div>
  )
}
