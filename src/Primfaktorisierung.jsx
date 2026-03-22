import React, { useEffect, useMemo, useRef, useState } from 'react'

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
const TickMark = ({ visible }) => (
  <svg viewBox="8 14 36 26" className="tick-svg tick-svg--small" aria-hidden style={{ visibility: visible ? 'visible' : 'hidden' }}>
    <path d="M14 27 l9 9 l16 -16" className="tick-check" />
  </svg>
)

export default function Primfaktorisierung({ number, value = '', onChange, onEnter, showTick = false }) {
  const inputRef = useRef(null)
  const [draft, setDraft] = useState('')

  useEffect(() => { inputRef.current?.focus() }, [])

  const tokens = useMemo(() => {
    const t = String(value || '').trim()
    if (!t) return []
    return t.split(/\s+/).filter(Boolean)
  }, [value])

  const commitDraft = () => {
    const d = draft.trim()
    if (!d) return null
    const next = [...tokens, d].join(' ')
    onChange && onChange(next)
    setDraft('')
    return next
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const committedValue = commitDraft()
      const finalValue = committedValue ?? tokens.join(' ')
      if (onEnter) onEnter(finalValue)
      e.preventDefault()
      return
    }
    // Commit on space, *, or ⋅
    if (e.key === ' ' || e.key === '*' || e.key === '\u22c5') {
      if (draft.trim()) commitDraft()
      e.preventDefault()
      return
    }
    // Backspace
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (draft !== '') {
        setDraft(prev => prev.slice(0, -1))
      } else if (tokens.length > 0) {
        onChange && onChange(tokens.slice(0, -1).join(' '))
      }
      return
    }
    // Digit input
    if (/^[0-9]$/.test(e.key)) {
      setDraft(prev => prev + e.key)
      e.preventDefault()
    }
  }

  const handlePaste = (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text') || ''
    const parts = text.split(/[^0-9]+/).filter(Boolean)
    if (parts.length > 0) {
      const next = [...tokens, ...parts].join(' ')
      onChange && onChange(next)
      setDraft('')
      e.preventDefault()
    }
  }

  const removeAt = (idx) => {
    const next = tokens.filter((_, i) => i !== idx).join(' ')
    onChange && onChange(next)
    // keep focus for quick editing
    inputRef.current?.focus()
  }

  return (
    <>
      <div className="instruction">Zerlege die Zahl in ihre Primfaktoren!</div>
      <div className="factor-row">
        <div className="expression">{number} =</div>
        <div
          className="factor-input"
          onClick={() => inputRef.current?.focus()}
          role="group"
          aria-label="Eingabe Primfaktoren"
        >
        {tokens.map((t, i) => (
          <React.Fragment key={i}>
            <button
              type="button"
              className="factor-token"
              title="Faktor entfernen"
              onClick={() => removeAt(i)}
            >
              {t}
            </button>
            <span className="factor-sep" aria-hidden="true">⋅</span>
          </React.Fragment>
        ))}
        <div
          ref={inputRef}
          tabIndex={0}
          className="factor-draft"
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={(e) => {
            const related = e.relatedTarget || (e.nativeEvent && e.nativeEvent.relatedTarget);
            const container = inputRef.current?.closest('.factor-input');
            if (related && container && container.contains(related)) return;
            commitDraft();
          }}
        >
          {draft}
        </div>
        <TickMark visible={showTick} />
        </div>
      </div>
    </>
  )
}
