import React from 'react'

/**
 * Primfaktorisierung component renders the prime factorization prompt with input.
 * Controlled by parent via value/onChange; handles Enter via onEnter.
 *
 * Props:
 * - number: number (the value to factorize)
 * - value: string
 * - onChange: (value: string) => void
 * - onEnter?: () => void
 */
export default function Primfaktorisierung({ number, value = '', onChange, onEnter }) {
  const handleKey = (e) => {
    if (e.key === 'Enter') {
      onEnter && onEnter()
    }
  }
  return (
    <>
      <div className="expression">Primfaktoren von {number} =</div>
      <input
        type="text"
        className="app-input"
        autoFocus
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder="z.B. 2 2 3"
      />
    </>
  )
}
