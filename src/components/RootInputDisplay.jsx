import React from 'react'
import RootSign from './RootSign'

// Keep the original character positions for editing, including hidden sqrt(...)
// delimiters. Only the display changes; submission still uses the original input.
export default function RootInputDisplay({ value, cursorIndex, showCursor }) {
  const text = String(value)
  const cursor = Math.max(0, Math.min(cursorIndex, text.length))
  const caret = key => <span key={key} className="root-input-cursor" aria-hidden="true" />
  const fragment = (start, end) => {
    const parts = []
    for (let index = start; index < end; index++) {
      if (showCursor && index === cursor) parts.push(caret(`cursor-${index}`))
      if (text[index] === '^' && /\d/.test(text[index + 1] ?? '') && index + 1 < end) {
        const exponentStart = index + 1
        const exponentLength = text.slice(exponentStart, end).match(/^\d+/)[0].length
        const exponent = []
        for (let digit = exponentStart; digit < exponentStart + exponentLength; digit++) {
          if (showCursor && cursor === digit) exponent.push(caret(`cursor-${cursor}`))
          exponent.push(<span key={digit}>{text[digit]}</span>)
        }
        parts.push(<sup key={index}>{exponent}</sup>)
        index += exponentLength
      } else parts.push(<span key={index}>{text[index].replace('-', '−')}</span>)
    }
    return parts
  }
  const parts = []
  const roots = /(?:√(?:\(\d*\)?|\d*)|sqrt\(\d*\)?)/gi
  let position = 0
  for (const match of text.matchAll(roots)) {
    const start = match.index, end = start + match[0].length
    parts.push(...fragment(position, start))
    const prefixLength = match[0].startsWith('√') ? (match[0][1] === '(' ? 2 : 1) : 5
    const contentStart = start + prefixLength
    const contentEnd = end - (match[0].endsWith(')') ? 1 : 0)
    // Before the root means before its sign, not before its radicand.
    if (showCursor && cursor === start) parts.push(caret(`cursor-${cursor}`))
    parts.push(<RootSign key={`root-${start}`}>
      {showCursor && cursor > start && cursor < contentStart && caret(`cursor-${cursor}`)}
      {fragment(contentStart, contentEnd)}
      {showCursor && cursor === contentEnd && contentEnd < end && caret(`cursor-${cursor}`)}
      {contentStart === contentEnd && <span aria-hidden="true">&#8203;</span>}
    </RootSign>)
    position = end
  }
  parts.push(...fragment(position, text.length))
  if (showCursor && cursor === text.length) parts.push(caret(`cursor-${cursor}`))
  return <span role="math" aria-label={text}>{parts}</span>
}
