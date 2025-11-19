import React, { useMemo, useRef, useState } from 'react'

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
  const inputRef = useRef(null)
  const [draft, setDraft] = useState('')

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
    // Commit on space or *
    if (e.key === ' ' || e.key === '*') {
      if (draft.trim()) {
        commitDraft()
        e.preventDefault()
      }
      return
    }
    // Backspace removes last token when draft is empty
    if (e.key === 'Backspace' && draft === '' && tokens.length > 0) {
      const next = tokens.slice(0, -1).join(' ')
      onChange && onChange(next)
      e.preventDefault()
      return
    }
  }

  const handleChange = (e) => {
    // allow only digits in draft
    const digits = e.target.value.replace(/\D+/g, '')
    setDraft(digits)
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
        <input
          ref={inputRef}
          className="factor-draft"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={(e) => {
            // If focus moved to an element inside the factor-input (e.g. a token button),
            // don't commit — the user is interacting within the control. Otherwise commit
            // the current draft so external submissions (buttons) include it.
            const related = e.relatedTarget || (e.nativeEvent && e.nativeEvent.relatedTarget);
            const container = inputRef.current?.closest('.factor-input');
            if (related && container && container.contains(related)) return;
            commitDraft();
          }}
          autoFocus
        />
        </div>
      </div>
    </>
  )
}
