import React from 'react'
import RootSign from './RootSign'
import { getRootInputRanges } from '../utils/rootInput'

// Keep the original character positions for editing, including hidden sqrt(...)
// delimiters. Only the display changes; submission still uses the original input.
export default function RootInputDisplay({ value, cursorIndex, showCursor }) {
  const text = String(value)
  const cursor = Math.max(0, Math.min(cursorIndex, text.length))
  const caret = key => <span key={key} className="root-input-cursor" aria-hidden="true" />
  const anchor = index => <span key={`anchor-${index}`} data-caret-start={index} data-caret-end={index} aria-hidden="true" style={{ display: 'inline-block', width: 0, height: '1em' }} />
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
          exponent.push(<span key={digit} data-caret-start={digit} data-caret-end={digit + 1}>{text[digit]}</span>)
        }
        parts.push(<sup key={index}>{exponent}</sup>)
        index += exponentLength
      } else parts.push(<span key={index} className={text[index] === 'x' ? 'math-variable' : undefined} data-caret-start={index} data-caret-end={index + 1}>{text[index].replace('-', '−')}</span>)
    }
    return parts
  }
  const parts = []
  let position = 0
  for (const { start, end, contentStart, contentEnd } of getRootInputRanges(text)) {
    parts.push(...fragment(position, start))
    // Before the root means before its sign, not before its radicand.
    parts.push(anchor(start))
    if (showCursor && cursor === start) parts.push(caret(`cursor-${cursor}`))
    parts.push(<RootSign key={`root-${start}`}>
      {showCursor && cursor > start && cursor < contentStart && caret(`cursor-${cursor}`)}
      {contentStart === contentEnd && anchor(contentStart)}
      {fragment(contentStart, contentEnd)}
      {showCursor && cursor === contentEnd && contentEnd < end && caret(`cursor-${cursor}`)}
      {contentStart === contentEnd && <span aria-hidden="true">&#8203;</span>}
    </RootSign>)
    parts.push(anchor(end))
    position = end
  }
  parts.push(...fragment(position, text.length))
  if (showCursor && cursor === text.length) parts.push(caret(`cursor-${cursor}`))
  return <span role="math" aria-label={text}>{parts}</span>
}
