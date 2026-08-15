import { Fragment, useEffect, useLayoutEffect, useState } from 'react'

const digit = value => String(value ?? '').replace(/[^0-9]/g, '').slice(0, 1)

/** Bayerische Endform im selben Kästchenraster wie die anderen Verfahren. */
export default function SchriftlicheDivision({
  dividend,
  divisor,
  correctDigits = [],
  divisionSteps = [],
  onChange,
  onEnter,
  initialState,
  review = false,
  checkMode = false,
  showCorrect = false
}) {
  const partialTruth = divisionSteps.map((step, index) => String(
    index < divisionSteps.length - 1 ? divisionSteps[index + 1].partial : step.remainder
  ).split(''))
  const [quotient, setQuotient] = useState(() => Array(correctDigits.length).fill(''))
  const [products, setProducts] = useState(() => divisionSteps.map(step => Array(String(step.product).length).fill('')))
  const [partials, setPartials] = useState(() => partialTruth.map(row => Array(row.length).fill('')))
  const tableTruth = Array.from({ length: 10 }, (_, index) => String((index + 1) * Number(divisor)).split(''))
  const hasMultiplicationTable = Number(divisor) >= 11
  const [tableProducts, setTableProducts] = useState(() => tableTruth.map(row => Array(row.length).fill('')))

  useEffect(() => {
    if (review || !onChange) return
    const valid = quotient.some(value => value !== '')
    const raw = quotient.join('')
    onChange({
      digits: quotient,
      parsed: valid ? String(parseInt(raw || '0', 10)) : '',
      valid,
      divisionProducts: products,
      divisionPartials: partials,
      divisionTableProducts: tableProducts
    })
  }, [quotient, products, partials, tableProducts, onChange, review])

  useLayoutEffect(() => {
    if (initialState) {
      if (Array.isArray(initialState.digits)) setQuotient(correctDigits.map((_, index) => initialState.digits[index] || ''))
      if (Array.isArray(initialState.divisionProducts)) {
        setProducts(divisionSteps.map((step, row) => Array.from(
          { length: String(step.product).length }, (_, col) => initialState.divisionProducts[row]?.[col] || ''
        )))
      }
      if (Array.isArray(initialState.divisionPartials)) {
        setPartials(partialTruth.map((truth, row) => Array.from(
          { length: truth.length }, (_, col) => initialState.divisionPartials[row]?.[col] || ''
        )))
      }
      if (Array.isArray(initialState.divisionTableProducts)) {
        setTableProducts(tableTruth.map((truth, row) => Array.from(
          { length: truth.length }, (_, col) => initialState.divisionTableProducts[row]?.[col] || ''
        )))
      }
    }
    if (!review) document.querySelector("[data-division-tab='1']")?.focus()
  }, [])

  const keyDown = (event, setValue) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (!review) onEnter?.()
    } else if (/^[0-9]$/.test(event.key)) {
      event.preventDefault()
      if (!review) {
        setValue(event.key)
      }
    } else if (event.key === 'Backspace') {
      event.preventDefault()
      if (!review) setValue('')
    }
  }

  const rows = divisionSteps.flatMap((step, index) => [
    {
      type: 'product',
      truth: String(step.product).split(''),
      user: products[index] || [],
      endIndex: step.endIndex ?? String(dividend).length - 1,
      minuendLength: String(step.partial).length
    },
    {
      type: 'partial',
      truth: partialTruth[index],
      user: partials[index] || [],
      // A Zwischenwert is written after the next digit has been brought down.
      endIndex: divisionSteps[index + 1]?.endIndex ?? step.endIndex ?? String(dividend).length - 1
    }
  ])
  const headerWidth = String(dividend).length + String(divisor).length + correctDigits.length + 2
  // One column at the left is reserved for the minus sign of the first step.
  const cols = Math.max(headerWidth + 1, ...rows.map(row => row.truth.length + (row.type === 'product' ? 1 : 0)))
  const dividendStart = cols - headerWidth
  let tab = 0

  const input = (truth, user, setValue, index, blue = false, optional = false) => {
    const tabIndex = ++tab
    const wrong = (review || checkMode) && !showCorrect && user !== '' && user !== String(truth)
    const missing = (review || checkMode) && !showCorrect && user === '' && !optional
    return <div
      key={index}
      className={`digit-input${blue ? ' blue' : ''}${wrong ? ' wrong' : ''}${missing ? ' missing' : ''}`}
      tabIndex={tabIndex}
      data-division-tab={tabIndex}
      onKeyDown={event => keyDown(event, value => setValue(digit(value)))}
    >{showCorrect ? truth : user}</div>
  }

  const emptyCells = (count, prefix) => Array.from(
    { length: count },
    (_, index) => <div key={`${prefix}-${index}`} className="grid-cell" />
  )
  const renderHeader = () => {
    const filled = [
      ...String(dividend).split('').map((value, index) => <div key={`a-${index}`} className="grid-cell digit">{value}</div>),
      <div key="colon" className="grid-cell plus">:</div>,
      ...String(divisor).split('').map((value, index) => <div key={`b-${index}`} className="grid-cell digit">{value}</div>),
      <div key="equals" className="grid-cell plus">=</div>,
      ...correctDigits.map((value, index) => <div key={`q-${index}`} className="grid-cell">{
        input(value, quotient[index] || '', inputValue => setQuotient(previous => previous.map((item, col) => col === index ? inputValue : item)), index, true)
      }</div>)
    ]
    return <Fragment key="header">{emptyCells(cols - filled.length, 'header-empty')}{filled}</Fragment>
  }
  const renderWorkRow = (row, rowIndex) => {
    const hasMinus = row.type === 'product'
    // Align the rightmost digit of each entry with the dividend digit currently
    // being processed. This is the key positional rule of the written method.
    const digitStart = dividendStart + row.endIndex - row.truth.length + 1
    const minusStart = hasMinus
      ? dividendStart + row.endIndex - row.minuendLength
      : digitStart
    const gapAfterMinus = hasMinus ? Math.max(0, digitStart - minusStart - 1) : 0
    const filled = [
      ...(hasMinus ? [<div key="minus" className="grid-cell plus division-subtraction">−</div>] : []),
      ...Array.from({ length: gapAfterMinus }, (_, index) => (
        <div key={`row-${rowIndex}-minus-gap-${index}`} className="grid-cell division-subtraction" />
      )),
      ...row.truth.map((value, index) => <div key={index} className={`grid-cell${hasMinus ? ' division-subtraction' : ''}`}>{
        input(value, row.user[index] || '', inputValue => {
          const setter = row.type === 'product' ? setProducts : setPartials
          setter(previous => previous.map((values, currentRow) => currentRow === Math.floor(rowIndex / 2)
            ? values.map((item, col) => col === index ? inputValue : item)
            : values
          ))
        }, index, false, row.type === 'partial' && value === '0')
      }</div>)
    ]
    const rowStart = Math.max(0, hasMinus ? minusStart : digitStart)
    return <Fragment key={`row-${rowIndex}`}>
      {emptyCells(rowStart, `row-${rowIndex}-before`)}
      {filled}
      {emptyCells(cols - rowStart - filled.length, `row-${rowIndex}-after`)}
    </Fragment>
  }
  const gridContent = [renderHeader(), ...rows.map(renderWorkRow)]
  const renderMultiplicationTable = () => !hasMultiplicationTable ? null : (
    <aside className="division-table" aria-label={`Einmaleins mit ${divisor}`}>
      {tableTruth.map((truth, row) => (
        <div key={row} className="division-table-row">
          <span>{divisor} · {row + 1} =</span>
          <span className="division-table-result">
            {truth.map((value, col) => input(value, tableProducts[row]?.[col] || '', inputValue => {
              setTableProducts(previous => previous.map((values, currentRow) => currentRow === row
                ? values.map((item, currentCol) => currentCol === col ? inputValue : item)
                : values
              ))
            }, col, true))}
          </span>
        </div>
      ))}
    </aside>
  )

  return (
    <div className="question-centered">
      <div className="schriftlich-grid-container">
        <div className="division-layout">
          <div
            className="schriftlich-grid division-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 50px)`, gridTemplateRows: `repeat(${rows.length + 1}, 50px)` }}
          >
            {gridContent}
          </div>
          {renderMultiplicationTable()}
        </div>
      </div>
    </div>
  )
}
