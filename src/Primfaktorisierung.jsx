import React, { useEffect, useMemo, useRef, useState } from 'react'
import { InlineSubmitButton, TickMark } from './components/AnswerControls'

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
export default function Primfaktorisierung({ number, value = '', onChange, onEnter, showTick = false, crossedOut = false, mistakeFeedback = null }) {
  const inputRef = useRef(null)
  const [draft, setDraft] = useState('')

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (mistakeFeedback) return
    const activeElement = document.activeElement
    if (activeElement === document.body || activeElement === null) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(frame)
    }
  }, [value, mistakeFeedback])

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
    if (mistakeFeedback) { e.preventDefault(); return }
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
    if (mistakeFeedback) { e.preventDefault(); return }
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

  const parseFactorTokens = (value) => String(value || '').split(/[\s·*]+/).filter(Boolean)
  const parseFactorNumbers = (value) => parseFactorTokens(value).map(token => Number(token)).filter(Number.isFinite)
  const isPrime = (candidate) => {
    if (!Number.isInteger(candidate) || candidate < 2) return false
    for (let divisor = 2; divisor * divisor <= candidate; divisor++) {
      if (candidate % divisor === 0) return false
    }
    return true
  }

  const factorFeedback = useMemo(() => {
    if (!mistakeFeedback) return { user: [], missing: [] }

    const user = parseFactorTokens(mistakeFeedback.userAnswerDisplay || value)
    const remainingCorrect = parseFactorTokens(mistakeFeedback.correctAnswerDisplay)
    const checkedUser = user.map(token => {
      const matchIndex = remainingCorrect.indexOf(token)
      if (matchIndex === -1) return { token, status: 'wrong' }
      remainingCorrect.splice(matchIndex, 1)
      return { token, status: 'correct' }
    })

    return { user: checkedUser, missing: remainingCorrect }
  }, [mistakeFeedback, value])

  const displayTokens = mistakeFeedback
    ? factorFeedback.user.map(item => item.token)
    : tokens

  const feedbackSentence = useMemo(() => {
    if (!mistakeFeedback) return ''

    const userNumbers = parseFactorNumbers(mistakeFeedback.userAnswerDisplay || value)
    if (userNumbers.length === 0) return 'Du hast keine Primfaktoren eingegeben.'

    const nonPrimeFactors = userNumbers.filter(factor => !isPrime(factor))
    const userProduct = userNumbers.reduce((product, factor) => product * factor, 1)
    const parts = []

    if (nonPrimeFactors.length > 0) {
      const uniqueNonPrimeFactors = [...new Set(nonPrimeFactors)]
      const predicate = uniqueNonPrimeFactors.length === 1
        ? 'ist keine Primzahl'
        : 'sind keine Primzahlen'
      parts.push(`${uniqueNonPrimeFactors.join(', ')} ${predicate}.`)
    }

    if (userProduct !== number) {
      parts.push(`Deine Faktoren ergeben ${userProduct}, gesucht war aber ${number}.`)
    }

    if (parts.length === 0 && factorFeedback.missing.length > 0) {
      parts.push('Das Produkt stimmt, aber die Zerlegung ist noch nicht vollständig.')
    }

    return parts.join(' ')
  }, [factorFeedback.missing.length, mistakeFeedback, number, value])

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
          {displayTokens.map((t, i) => (
            <React.Fragment key={i}>
              {mistakeFeedback ? (
                <span className={`factor-token factor-token--feedback factor-token--${factorFeedback.user[i]?.status || 'correct'}`}>
                  {t}
                </span>
              ) : (
                <button
                  type="button"
                  className="factor-token"
                  title="Faktor entfernen"
                  onClick={() => removeAt(i)}
                >
                  {t}
                </button>
              )}
              <span className="factor-sep" aria-hidden="true">⋅</span>
            </React.Fragment>
          ))}
          <div
            ref={inputRef}
            tabIndex={mistakeFeedback ? -1 : 0}
            className="factor-draft"
            style={{ color: crossedOut ? '#b91c1c' : undefined }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={(e) => {
              if (mistakeFeedback) return
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
        {!mistakeFeedback && <InlineSubmitButton onClick={() => onEnter?.()} />}
      </div>
      {mistakeFeedback?.correctAnswerDisplay && (
        <div className="inline-feedback">
          <div className="inline-feedback__label">Richtige Lösung</div>
          <div className="inline-feedback__value">{mistakeFeedback.correctAnswerDisplay}</div>
        </div>
      )}
      {feedbackSentence && (
        <div className="factor-feedback-sentence" role="status">
          {feedbackSentence}
        </div>
      )}
    </>
  )
}
