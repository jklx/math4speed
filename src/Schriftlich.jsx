import { Fragment, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { padLeft } from './utils/padLeft'

const sanitizeDigit = (value) => value.replace(/[^0-9]/g, '').slice(0, 1)

export default function Schriftlich({ aDigits = [], bDigits = [], summandsDigits = null, correctDigits = [], partialProducts = [], operation = 'add', onChange, onEnter, initialState, review, showCorrect = false }) {
  const isMultiply = operation === 'multiply'
  const isAdd = operation === 'add'
  const isSubtract = operation === 'subtract'
  // Ensure grid columns cover all digits present (avoid overflow when correct has fewer digits)
  const maxSummandLen = Array.isArray(summandsDigits) && summandsDigits.length
    ? Math.max(...summandsDigits.map(row => (row?.length ?? 0)))
    : 0
  const cols = Math.max(correctDigits.length, aDigits.length, bDigits.length, maxSummandLen)

  const extraCols = isMultiply ? bDigits.length + 1 : 1
  const totalCols = cols + extraCols + 1

  const aCells = padLeft(aDigits, cols)
  const bCells = padLeft(bDigits, cols)
  const correctCells = padLeft(correctDigits, cols)
  const addRows = useMemo(() => {
    if (!isAdd) return []
    const rows = Array.isArray(summandsDigits) && summandsDigits.length >= 2
      ? summandsDigits.map(digs => padLeft(digs, cols))
      : [aCells, bCells]
    return rows
  }, [isAdd, summandsDigits, aCells, bCells, cols])

  const partialRows = useMemo(() => (isMultiply ? (partialProducts ?? []) : []), [isMultiply, partialProducts])

  const [answerDigits, setAnswerDigits] = useState(() => Array(cols).fill(''))
  const [carryDigits, setCarryDigits] = useState(() => Array(cols).fill(''))
  // For multiplication partial rows, inputs span the left result columns plus the right multiplier columns (excluding the dot column)
  const partialRowWidth = isMultiply ? (cols + bDigits.length) : cols
  const [partialInputs, setPartialInputs] = useState(() => partialRows.map(() => Array(partialRowWidth).fill('')))

  const navOrder = useMemo(() => {
    if (isMultiply) {
      const partialKeys = partialRows.map((_, idx) => `partial-${idx}`)
      return [...partialKeys, 'carry', 'result']
    }
    if (isAdd) return ['carry', 'result']
    return ['result']
  }, [isMultiply, isAdd, partialRows])

  const rowIndexMap = useMemo(() => Object.fromEntries(navOrder.map((key, index) => [key, index])), [navOrder])
  // Compute per-row widths for tab order and navigation
  const rowWidth = (rowKey) => {
    if (isMultiply) {
      if (rowKey.startsWith('partial-')) return cols + bDigits.length
      if (rowKey === 'carry' || rowKey === 'result') return cols + bDigits.length
    }
    return cols
  }
  // REPLACE tabIndexBaseMap and tabIndexFor with this new sequential mapping:

  const tabIndexMap = useMemo(() => {
    const map = new Map()
    let seq = 0

    // helper to register if the rendered cell actually contains an input
    const partialCellHasInput = (rowIdx, globalCol) => {
      const bIndex = rowIdx
      const templateRow = partialRows?.[rowIdx] ?? []
      const rowDigits = templateRow.filter(d => d !== null && d !== undefined)
      const L = rowDigits.length
      const rightGlobal = cols + bIndex
      return globalCol >= (rightGlobal - L + 1) && globalCol <= rightGlobal
    }

    // For multiplication: first all partial inputs (each row right-to-left)
    if (isMultiply) {
      const width = cols + bDigits.length
      for (let rowIdx = 0; rowIdx < partialInputs.length; rowIdx++) {
        for (let col = width - 1; col >= 0; col--) {
          if (partialCellHasInput(rowIdx, col)) {
            map.set(`partial-${rowIdx}-${col}`, ++seq)
          }
        }
      }
    }

    // After partials (or at top for add/sub) assign interleaved result/carry from right to left:
    // order: result(col=rightmost) -> carry(col=rightmost-1) -> result(col=next) -> ...
    for (let c = cols - 1; c >= 0; c--) {
      // result cell (for multiply this maps to result global index start = bDigits.length + c)
      // We store result keys by result-col index (0..cols-1)
      map.set(`result-${c}`, ++seq)

      // carry: place carry to the left of the current result (no carry for rightmost digit)
      if (c - 1 >= 0) {
        map.set(`carry-${c - 1}`, ++seq)
      }
    }

    // For addition/subtraction we may also have other rows (but above mapping gives final order)
    // For completeness, if you want partial rows to be after carries in some case, adjust earlier.

    return map
    // depend on structure that affects rendered inputs:
  }, [isMultiply, partialInputs, partialRows, cols, bDigits.length])

  const tabIndexFor = (rowKey, column) => {
    // lookup keys must match how we set them above
    if (rowKey.startsWith('partial-')) {
      const key = `${rowKey}-${column}`
      return tabIndexMap.get(key) ?? -1
    }
    if (rowKey === 'result') {
      return tabIndexMap.get(`result-${column}`) ?? -1
    }
    if (rowKey === 'carry') {
      return tabIndexMap.get(`carry-${column}`) ?? -1
    }
    return -1
  }

  // Component is keyed by the parent when the problem changes; initial state
  // is set from props on mount. We focus in a layout effect below.

  useEffect(() => {
    if (!onChange || review) return
    const valid = answerDigits.some(d => d !== '')
    const raw = answerDigits.map(d => (d === '' ? '' : String(d))).join('')
    const parsed = valid ? String(parseInt(raw || '0', 10)) : ''
    // Provide full local state so parent can snapshot/restore on undo without premounting
    onChange({ digits: answerDigits, parsed, valid, carryDigits, partialInputs })
  }, [answerDigits, carryDigits, partialInputs, onChange, review])

  // Focus the preferred input on mount (no setTimeout). Parent should key the component
  // so this runs only when a new problem is mounted.
  useLayoutEffect(() => {
    // Hydrate from initialState when provided (e.g., after undo)
    if (initialState) {
      if (Array.isArray(initialState.digits)) {
        const arr = Array(cols).fill('')
        for (let i = 0; i < Math.min(cols, initialState.digits.length); i++) arr[i] = initialState.digits[i] || ''
        setAnswerDigits(arr)
      }
      if (Array.isArray(initialState.carryDigits)) {
        const carr = Array(cols).fill('')
        for (let i = 0; i < Math.min(cols, initialState.carryDigits.length); i++) carr[i] = initialState.carryDigits[i] || ''
        setCarryDigits(carr)
      }
      if (Array.isArray(initialState.partialInputs)) {
        const width = cols + bDigits.length
        const parts = initialState.partialInputs.map(row => {
          const arr = Array(width).fill('')
          for (let i = 0; i < Math.min(row.length, width); i++) arr[i] = row[i] || ''
          return arr
        })
        setPartialInputs(parts)
      }
    }

    if (review) return
    if (cols <= 0) return
    // Prefer tabindex=1 for deterministic focus
    const firstTabEl = document.querySelector("input[tabindex='1']")
    if (firstTabEl) {
      firstTabEl.focus()
      return
    }
    const el = document.getElementById(`res-${cols - 1}`)
    if (el) el.focus()
  }, [])

  const focusCell = (rowKey, column) => {
    const el = document.querySelector(`[data-row-key='${rowKey}'][data-col='${column}']`)
    if (el) {
      el.focus()
      return true
    }
    return false
  }

  const focusHorizontal = (rowKey, startColumn, step) => {
    const limit = rowWidth(rowKey)
    let next = startColumn + step
    while (next >= 0 && next < limit) {
      if (focusCell(rowKey, next)) return
      next += step
    }
  }

  const focusVertical = (targetRow, column) => {
    if (focusCell(targetRow, column)) return
    const limit = rowWidth(targetRow)
    let offset = 1
    while (column - offset >= 0 || column + offset < limit) {
      if (column - offset >= 0 && focusCell(targetRow, column - offset)) return
      if (column + offset < limit && focusCell(targetRow, column + offset)) return
      offset += 1
    }
  }

  const handleKeyDown = (e, rowKey, column) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusHorizontal(rowKey, column, 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusHorizontal(rowKey, column, -1)
    } else if (e.key === 'ArrowUp') {
      const currentIndex = rowIndexMap[rowKey]
      if (currentIndex > 0) {
        e.preventDefault()
        const targetRow = navOrder[currentIndex - 1]
        focusVertical(targetRow, column)
      }
    } else if (e.key === 'ArrowDown') {
      const currentIndex = rowIndexMap[rowKey]
      if (currentIndex < navOrder.length - 1) {
        e.preventDefault()
        const targetRow = navOrder[currentIndex + 1]
        focusVertical(targetRow, column)
      }
    } else if (e.key === 'Enter') {
      if (review) return
      e.preventDefault()
      onEnter && onEnter()
    } else if (isSubtract && rowKey === 'result' && (e.key === 'i' || e.key === 'I' || e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar')) {
      e.preventDefault()
      const targetIndex = column - 1
      if (targetIndex >= 0) {
        setCarryDigits(prev => {
          const arr = [...prev]
          arr[targetIndex] = arr[targetIndex] === 'I' ? '' : 'I'
          return arr
        })
      }
    }
  }

  const handleResultChange = (index, value) => {
    if (review) return
    const v = sanitizeDigit(value)
    setAnswerDigits(prev => {
      const arr = [...prev]
      arr[index] = v
      return arr
    })
  }

  const handleCarryChange = (index, value) => {
    if (review) return
    const v = sanitizeDigit(value)
    setCarryDigits(prev => {
      const arr = [...prev]
      arr[index] = v
      return arr
    })
  }

  const handleBorrowToggle = (index) => {
    if (review) return
    setCarryDigits(prev => {
      const arr = [...prev]
      arr[index] = arr[index] === 'I' ? '' : 'I'
      return arr
    })
  }

  const handlePartialChange = (rowIndex, index, value) => {
    if (review) return
    const v = sanitizeDigit(value)
    setPartialInputs(prev => {
      const next = prev.map(inner => [...inner])
      next[rowIndex][index] = v
      return next
    })
  }

  const isResultWrong = (index) => {
    if (!review || showCorrect) return false
    const user = answerDigits[index] || ''
    const correct = (correctCells[index] ?? '').toString()
    // Allow leading zeros
    if (correct === '' && user === '0') return false
    return user !== '' && user !== correct
  }

  const isResultMissing = (index) => {
    if (!review || showCorrect) return false
    const correct = (correctCells[index] ?? '').toString()
    const user = answerDigits[index]
    return correct !== '' && user === ''
  }

  const isPartialWrong = (rowIndex, globalCol) => {
    if (!review || showCorrect) return false
    const correctRow = partialRows?.[rowIndex]
    if (!correctRow) return false
    const width = cols + bDigits.length
    const start = width - correctRow.length
    const localIndex = globalCol - start
    if (localIndex < 0 || localIndex >= correctRow.length) return false
    const correctDigit = correctRow[localIndex]
    if (correctDigit == null) return false
    const user = (partialInputs[rowIndex]?.[globalCol] || '').toString()
    const correct = correctDigit.toString()
    return user !== '' && user !== correct
  }

  const isPartialMissing = (rowIndex, globalCol) => {
    if (!review || showCorrect) return false
    const correctRow = partialRows?.[rowIndex]
    if (!correctRow) return false
    const width = cols + bDigits.length
    const start = width - correctRow.length
    const localIndex = globalCol - start
    if (localIndex < 0 || localIndex >= correctRow.length) return false
    const correctDigit = correctRow[localIndex]
    if (correctDigit == null) return false
    const user = (partialInputs[rowIndex]?.[globalCol] ?? '')
    return user === ''
  }

  const renderAddition = () => (
    <>
      {addRows.map((row, rIdx) => (
        <Fragment key={`add-row-${rIdx}`}>
          <div className="grid-cell" />
          {row.map((d, i) => (
            <div key={`add-${rIdx}-${i}`} className="grid-cell digit">{d ?? ''}</div>
          ))}
          <div className="grid-cell" />
        </Fragment>
      ))}
      <Fragment key="row-carry">
        <div className="grid-cell plus">+</div>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={`add-c-${i}`} className="grid-cell">
            {i === cols - 1 ? null : (
              <input
                id={`carry-${i}`}
                data-row-key="carry"
                data-col={i}
                className="digit-input blue small"
                type="text"
                inputMode="numeric"
                maxLength={1}
                tabIndex={tabIndexFor('carry', i)}
                value={carryDigits[i] || ''}
                onChange={e => handleCarryChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(e, 'carry', i)}
              />
            )}
          </div>
        ))}
        <div className="grid-cell" />
      </Fragment>
      <Fragment key="row-result">
        <div className="grid-cell result-sep" />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={`add-r-${i}`} className="grid-cell result-sep">
            <input
              id={`res-${i}`}
              data-row-key="result"
              data-col={i}
              className={`digit-input blue${isResultWrong(i) ? ' wrong' : ''}${isResultMissing(i) ? ' missing' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              tabIndex={tabIndexFor('result', i)}
              value={showCorrect ? (correctCells[i] ?? '').toString() : (answerDigits[i] || '')}
              onChange={e => handleResultChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(e, 'result', i)}
            />
          </div>
        ))}
        <div className="grid-cell result-sep" />
      </Fragment>
    </>
  )

  const renderSubtraction = () => (
    <>
      <Fragment key="row1">
        <div className="grid-cell" />
        {aCells.map((d, i) => (
          <div key={`sub-a-${i}`} className="grid-cell digit">{d ?? ''}</div>
        ))}
        <div className="grid-cell" />
      </Fragment>
      <Fragment key="row2">
        <div className="grid-cell" />
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={`borr-${i}`}
            className="grid-cell"
            onClick={() => handleBorrowToggle(i)}
          >
            <div className="borrow-cell">{carryDigits[i] === 'I' ? <span className="borrow-mark" /> : null}</div>
          </div>
        ))}
        <div className="grid-cell" />
      </Fragment>
      <Fragment key="row3">
        <div className="grid-cell plus">−</div>
        {bCells.map((d, i) => (
          <div key={`sub-b-${i}`} className="grid-cell digit">{d ?? ''}</div>
        ))}
        <div className="grid-cell" />
      </Fragment>
      <Fragment key="row4">
        <div className="grid-cell result-sep" />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={`sub-r-${i}`} className="grid-cell result-sep">
            <input
              id={`res-${i}`}
              data-row-key="result"
              data-col={i}
              className={`digit-input blue${isResultWrong(i) ? ' wrong' : ''}${isResultMissing(i) ? ' missing' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              tabIndex={tabIndexFor('result', i)}
              value={showCorrect ? (correctCells[i] ?? '').toString() : (answerDigits[i] || '')}
              onChange={e => handleResultChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(e, 'result', i)}
            />
          </div>
        ))}
        <div className="grid-cell result-sep" />
      </Fragment>
    </>
  )

  const renderMultiplication = () => (
    <>
      <Fragment key="row1">
        {aCells.map((d, i) => (
          <div key={`mul-a-${i}`} className="grid-cell digit">{d ?? ''}</div>
        ))}
        <div className="grid-cell plus">·</div>
        {bDigits.map((d, i) => (
          <div key={`mul-btop-${i}`} className="grid-cell digit">{d}</div>
        ))}
        {/* rightmost empty column for consistency */}
        <div className="grid-cell" />
      </Fragment>

      {partialInputs.map((row, rowIdx) => (
        <Fragment key={`partial-${rowIdx}`}>
          <div className={`grid-cell plus ${rowIdx === 0 ? 'result-sep' : ''}`}>+</div>
          {(() => {
            // Determine which columns should have digits so that the rightmost digit
            // aligns with the corresponding multiplier digit (left-to-right index)
            const bIndex = rowIdx // row order matches bDigits order (left-to-right)
            const rightGlobal = cols + bIndex // align directly under the multiplier digit after left shift
            const templateRow = partialRows?.[rowIdx] ?? []
            const rowDigits = templateRow.filter(d => d !== null && d !== undefined)
            const L = rowDigits.length
            const width = cols + bDigits.length
            return Array.from({ length: width }).map((_, globalCol) => {
              const within = globalCol >= (rightGlobal - L + 1) && globalCol <= rightGlobal
              return (
                <div key={`mul-part-${rowIdx}-${globalCol}`} className={`grid-cell ${rowIdx === 0 ? 'result-sep' : ''}`}>
                  {within ? (
                    <input
                      data-row-key={`partial-${rowIdx}`}
                      data-col={globalCol}
                      className={`digit-input${isPartialWrong(rowIdx, globalCol) ? ' wrong' : ''}${isPartialMissing(rowIdx, globalCol) ? ' missing' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      tabIndex={tabIndexFor(`partial-${rowIdx}`, globalCol)}
                      value={showCorrect ? (templateRow.filter(d => d !== null && d !== undefined)[L - 1 - (rightGlobal - globalCol)] ?? '').toString() : (row[globalCol] || '')}
                      onChange={e => handlePartialChange(rowIdx, globalCol, e.target.value)}
                      onKeyDown={e => handleKeyDown(e, `partial-${rowIdx}`, globalCol)}
                    />
                  ) : null}
                </div>
              )
            })
          })()}
          <div className={`grid-cell ${rowIdx === 0 ? 'result-sep' : ''}`} />
        </Fragment>
      ))}

      <Fragment key="carry-row">
        <div className="grid-cell" />
        {(() => {
          const width = cols + bDigits.length
          const start = bDigits.length
          return Array.from({ length: width }).map((_, globalCol) => {
            const within = globalCol >= start && globalCol < start + cols
            const idx = globalCol - start
            return (
              <div key={`mul-carry-col-${globalCol}`} className="grid-cell">
                {within && idx !== cols - 1 ? (
                  <input
                    id={`carry-${idx}`}
                    data-row-key="carry"
                    data-col={globalCol}
                    className="digit-input blue small"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    tabIndex={tabIndexFor('carry', idx)}
                    value={carryDigits[idx] || ''}
                    onChange={e => handleCarryChange(idx, e.target.value)}
                    onKeyDown={e => handleKeyDown(e, 'carry', globalCol)}
                  />
                ) : null}
              </div>
            )
          })
        })()}
        <div className="grid-cell" />
      </Fragment>

      <Fragment key="result-row">
        <div className="grid-cell result-sep" />
        {(() => {
          const width = cols + bDigits.length
          const start = bDigits.length
          return Array.from({ length: width }).map((_, globalCol) => {
            const within = globalCol >= start && globalCol < start + cols
            const idx = globalCol - start
            return (
              <div key={`mul-res-col-${globalCol}`} className="grid-cell result-sep">
                {within ? (
                  <input
                    id={`res-${idx}`}
                    data-row-key="result"
                    data-col={globalCol}
                    className={`digit-input blue${isResultWrong(idx) ? ' wrong' : ''}${isResultMissing(idx) ? ' missing' : ''}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    tabIndex={tabIndexFor('result', idx)}
                    value={showCorrect ? (correctCells[idx] ?? '').toString() : (answerDigits[idx] || '')}
                    onChange={e => handleResultChange(idx, e.target.value)}
                    onKeyDown={e => handleKeyDown(e, 'result', globalCol)}
                  />
                ) : null}
              </div>
            )
          })
        })()}
        <div className="grid-cell result-sep" />
      </Fragment>
    </>
  )

  const gridContent = isMultiply ? renderMultiplication() : (isAdd ? renderAddition() : renderSubtraction())
  // Multiply: header + partial rows + carry + result (separator is styled on first partial row)
  const rowCount = isMultiply ? partialInputs.length + 3 : (isAdd ? addRows.length + 2 : 4)

  return (
    <div className="question-centered">
      <div className="schriftlich-grid-container">
        <div
          className="schriftlich-grid"
          style={{ gridTemplateColumns: `repeat(${totalCols}, 50px)`, gridTemplateRows: `repeat(${rowCount}, 50px)` }}
        >
          {gridContent}
        </div>
      </div>
    </div>
  )
}
