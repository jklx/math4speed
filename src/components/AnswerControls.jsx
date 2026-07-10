import React from 'react'

export function TickMark({ visible }) {
  return (
    <svg
      viewBox="8 14 36 26"
      className="tick-svg tick-svg--small"
      aria-hidden
      style={{ visibility: visible ? 'visible' : 'hidden' }}
    >
      <path d="M14 27 l9 9 l16 -16" className="tick-check" />
    </svg>
  )
}

export function InlineSubmitButton({ onClick }) {
  return (
    <button
      type="button"
      className="inline-submit-btn"
      onClick={onClick}
      title="Antwort einreichen"
      aria-label="Antwort einreichen"
    >
      {'\u21b5'}
    </button>
  )
}
