import React from 'react'

// Map display labels to the key values dispatched
const KEY_VALUES = {
  '⌫': 'Backspace',
  '↵': 'Enter',
  '⋅': ' ',
  'mal': ' ',
}

// Each key is a string or { label, colSpan?, rowSpan? }
// Layouts use a flat array rendered in a CSS Grid (4 columns).
//
// Numpad layouts (multiplication, negative, schriftlich, primfaktorisierung):
//   [7]  [8]  [9]  [⌫]
//   [4]  [5]  [6]  [↵ rowSpan=2]
//   [1]  [2]  [3]  [↑ ]
//   [  0  ×3 ]  [extra key]
//
// Binomische:
//   [7]  [8]  [9]  [⌫]
//   [4]  [5]  [6]  [^]
//   [1]  [2]  [3]  [−]
//   [,]  [0]  [v]  [+]
//   [       ↵  ×4     ]

const NUMPAD_BASE = [
  '7', '8', '9', '⌫',
  '4', '5', '6', { label: '↵', rowSpan: 2 },
  '1', '2', '3',
]

const KEY_LAYOUTS = {
  multiplication: {
    cols: 4,
    keys: [
      '7', '8', '9', '⌫',
      '4', '5', '6', { label: '↵', rowSpan: 3 },
      '1', '2', '3',
      { label: '0', colSpan: 3 },
    ],
  },
  negative: {
    cols: 4,
    keys: [
      '7', '8', '9', '⌫',
      '4', '5', '6', { label: '↵', rowSpan: 3 },
      '1', '2', '3',
      '0', { label: '−', colSpan: 2 },
    ],
  },
  primfaktorisierung: {
    cols: 4,
    keys: [
      '7', '8', '9', '⌫',
      '4', '5', '6', { label: '↵', rowSpan: 3 },
      '1', '2', '3',
      '0', { label: 'mal', colSpan: 2 },
    ],
  },
}
KEY_LAYOUTS.schriftlich = KEY_LAYOUTS.multiplication

function getBinomischeLayout(variable) {
  const v = variable || 'x'
  return {
    cols: 4,
    keys: [
      '7', '8', '9', '⌫',
      '4', '5', '6', '^',
      '1', '2', '3', '−',
      '0', ',', v,   '+',
      { label: '↵', colSpan: 4 },
    ],
  }
}

export default function VirtualKeyboard({ category, variable, onKey }) {
  const layout =
    category === 'binomische'
      ? getBinomischeLayout(variable)
      : KEY_LAYOUTS[category] ?? KEY_LAYOUTS.multiplication

  const getAriaLabel = (label) => {
    if (label === '⌫') return 'Backspace'
    if (label === '↵') return 'Eingabe bestätigen'
    if (label === '⋅') return 'Mal-Punkt (Faktor trennen)'
    if (label === 'mal') return 'Mal (Faktor trennen)'
    if (label === '−') return 'Minus'
    if (label === '^') return 'Hoch'
    if (label === ',') return 'Komma'
    return label
  }

  return (
    <div
      className="virtual-keyboard"
      style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}
      role="group"
      aria-label="Virtuelle Tastatur"
    >
      {layout.keys.map((key, i) => {
        const label    = typeof key === 'string' ? key : key.label
        const colSpan  = typeof key === 'object' ? key.colSpan : undefined
        const rowSpan  = typeof key === 'object' ? key.rowSpan : undefined
        const isAction = label === '⌫'
        const isSubmit = label === '↵'
        return (
          <button
            key={i}
            className={`virtual-keyboard__key${isAction ? ' virtual-keyboard__key--action' : ''}${isSubmit ? ' virtual-keyboard__key--submit' : ''}`}
            style={{
              gridColumn: colSpan ? `span ${colSpan}` : undefined,
              gridRow:    rowSpan ? `span ${rowSpan}` : undefined,
            }}
            tabIndex={-1}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onKey(KEY_VALUES[label] ?? label)}
            aria-label={getAriaLabel(label)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
