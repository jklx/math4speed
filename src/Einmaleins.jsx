import React, { useRef, useEffect, useState } from 'react'

const TickMark = ({ visible }) => (
  <svg viewBox="8 14 36 26" className="tick-svg tick-svg--small" aria-hidden style={{ visibility: visible ? 'visible' : 'hidden' }}>
    <path d="M14 27 l9 9 l16 -16" className="tick-check" />
  </svg>
)

export default function Einmaleins({ a, b, value = '', onChange, onEnter, showTick = false }) {
  const ref = useRef(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => { ref.current?.focus() }, [])

  const handleKey = (e) => {
    if (e.key === 'Enter') { onEnter?.(); return }
    if (e.key === 'Backspace') { onChange?.(value.slice(0, -1)); return }
    if (/^[0-9]$/.test(e.key)) onChange?.(value + e.key)
  }

  return (
    <div className="question-centered einmaleins-row">
      <div className="expression">{a} · {b} =</div>
      <div
        ref={ref}
        tabIndex={0}
        className={`math-input fake-input${focused ? ' fake-input--focused' : ''}`}
        onKeyDown={handleKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {value}
        {focused && <span className="fake-input__cursor" aria-hidden />}
      </div>
      <TickMark visible={showTick} />
    </div>
  )
}
