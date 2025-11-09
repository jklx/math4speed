import React, { useEffect, useState } from 'react'
import { padLeft } from './utils/padLeft'

/**
 * Schriftlich component renders the grid for column-wise addition/subtraction.
 * Manages its own digit and carry/borrow state and emits result changes.
 *
 * Props:
 * - aDigits: number[]
 * - bDigits: number[]
 * - correctDigits: number[] (used for column count and alignment)
 * - operation: 'add' | 'subtract'
 * - onChange?: ({ digits, parsed, valid }) => void
 * - onEnter?: () => void
 */
export default function Schriftlich({ aDigits = [], bDigits = [], correctDigits = [], operation = 'add', onChange, onEnter }) {
  const cols = correctDigits.length
  const totalCols = cols + 2 // padding columns
  const aCells = padLeft(aDigits, cols)
  const bCells = padLeft(bDigits, cols)
  const isAdd = operation === 'add'

  const [answerDigits, setAnswerDigits] = useState(() => Array(cols).fill(''))
  const [carryDigits, setCarryDigits] = useState(() => Array(cols).fill(''))

  // Reset state on problem change
  useEffect(() => {
    setAnswerDigits(Array(cols).fill(''))
    setCarryDigits(Array(cols).fill(''))
    // Focus rightmost result input
    setTimeout(() => {
      const el = document.getElementById(`res-${cols - 1}`)
      if (el) el.focus()
    }, 0)
  }, [cols])

  // Emit changes to parent whenever answerDigits changes (carries don't affect result)
  useEffect(() => {
    if (!onChange) return
    const parsed = answerDigits.map(d => d === '' ? '0' : d).join('')
    const valid = answerDigits.some(d => d !== '')
    onChange({ digits: answerDigits, parsed, valid })
  }, [answerDigits, onChange])

  const handleKeyDown = (e, isCarry, i) => {
    const currentTab = parseInt(e.target.tabIndex)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = document.querySelector(`[tabindex='${currentTab - 2}']`)
      if (next) next.focus()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = document.querySelector(`[tabindex='${currentTab + 2}']`)
      if (next) next.focus()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const targetId = isCarry ? `res-${i}` : `carry-${i}`
      const el = document.getElementById(targetId)
      if (el) el.focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onEnter && onEnter()
    } else if (!isAdd && !isCarry && (e.key === 'i' || e.key === 'I' || e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar')) {
      // Toggle borrow mark left of current result input
      e.preventDefault()
      const targetIndex = i - 1
      if (targetIndex >= 0) {
        setCarryDigits(prev => {
          const arr = [...prev]
          arr[targetIndex] = arr[targetIndex] === 'I' ? '' : 'I'
          return arr
        })
      }
    }
  }

  return (
    <div className="schriftlich-grid-container">
      <div className="schriftlich-grid" style={{gridTemplateColumns: `repeat(${totalCols}, 50px)`, gridTemplateRows: `repeat(4, 50px)`}}>
        {/* Row 1: first number (minuend or first addend) */}
        <div className="grid-cell" />
        {aCells.map((d,i)=>(<div key={`a-${i}`} className="grid-cell digit">{d ?? ''}</div>))}
        <div className="grid-cell" />

        {isAdd ? (
          <>
            {/* Row 2: second addend */}
            <div className="grid-cell" />
            {bCells.map((d,i)=>(<div key={`b-${i}`} className="grid-cell digit">{d ?? ''}</div>))}
            <div className="grid-cell" />

            {/* Row 3: plus sign and carries */}
            <div className="grid-cell plus">+</div>
            {Array.from({length: cols}).map((_, i)=>(
              <div key={`c-${i}`} className="grid-cell">
                <input
                  id={`carry-${i}`}
                  className="digit-input red small"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  tabIndex={2*(cols-1-i)+1}
                  value={carryDigits[i] || ''}
                  onChange={e=>{
                    const v=e.target.value.replace(/[^0-9]/g,'').slice(0,1)
                    setCarryDigits(prev=>{const arr=[...prev];arr[i]=v;return arr})
                    // Auto-advance disabled intentionally
                  }}
                  onKeyDown={e => handleKeyDown(e, true, i)}
                />
              </div>
            ))}
            <div className="grid-cell" />
          </>
        ) : (
          <>
            {/* Row 2: borrow row between minuend and subtrahend */}
            <div className="grid-cell" />
            {Array.from({length: cols}).map((_, i)=>(
              <div key={`borr-${i}`} className="grid-cell" onClick={()=>{
                setCarryDigits(prev=>{
                  const arr=[...prev]
                  arr[i] = arr[i] === 'I' ? '' : 'I'
                  return arr
                })
              }}>
                <div className="borrow-cell">
                  {carryDigits[i] === 'I' ? <span className="borrow-mark" /> : null}
                </div>
              </div>
            ))}
            <div className="grid-cell" />

            {/* Row 3: minus sign and second number (subtrahend) */}
            <div className="grid-cell plus">−</div>
            {bCells.map((d,i)=>(<div key={`b-${i}`} className="grid-cell digit">{d ?? ''}</div>))}
            <div className="grid-cell" />
          </>
        )}

        {/* Row 4: result row with thick top border */}
        <div className="grid-cell result-sep" />
        {Array.from({length: cols}).map((_, i)=>(
          <div key={`r-${i}`} className="grid-cell result-sep">
            <input
              id={`res-${i}`}
              className="digit-input blue"
              type="text"
              inputMode="numeric"
              maxLength={1}
              tabIndex={2*(cols-1-i)+2}
              value={answerDigits[i] || ''}
              onChange={e=>{
                const v=e.target.value.replace(/[^0-9]/g,'').slice(0,1)
                setAnswerDigits(prev=>{const arr=[...prev];arr[i]=v;return arr})
                // Auto-advance disabled intentionally
              }}
              onKeyDown={e => handleKeyDown(e, false, i)}
            />
          </div>
        ))}
        <div className="grid-cell result-sep" />
      </div>
    </div>
  )
}
