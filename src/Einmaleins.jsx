import React from 'react'

/**
 * Einmaleins component renders a simple multiplication expression with an input.
 * Controlled by parent via value/onChange; handles Enter via onEnter.
 *
 * Props:
 * - a: number
 * - b: number
 * - value: string | number
 * - onChange: (value: string) => void
 * - onEnter?: () => void
 */
export default function Einmaleins({ a, b, value = '', onChange, onEnter }) {
  const handleKey = (e) => {
    if (e.key === 'Enter') {
      onEnter && onEnter()
    }
  }
  return (
    <>
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
    </>
  )
}
