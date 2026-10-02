export function moveRootCursor(value, position, direction) {
  const text = String(value)
  const cursor = Math.max(0, Math.min(position, text.length))
  // sqrt( is displayed as one symbol. Cross the hidden prefix in one step.
  for (const match of text.matchAll(/(?:sqrt\(|√\()\d*\)?/gi)) {
    const start = match.index
    const contentStart = start + (match[0].startsWith('√') ? 2 : 5)
    if (direction > 0 && cursor >= start && cursor < contentStart) return contentStart
    if (direction < 0 && cursor > start && cursor <= contentStart) return start
  }
  return Math.max(0, Math.min(cursor + direction, text.length))
}

export function deleteRootAtCursor(value, position, key) {
  for (const match of value.matchAll(/(?:√(?:\(\d*\)?|\d*)|sqrt\(\d*\)?)/gi)) {
    const start = match.index, end = start + match[0].length
    const prefix = match[0].startsWith('√') ? (match[0][1] === '(' ? 2 : 1) : 5
    const contentStart = start + prefix
    const contentEnd = end - (match[0].endsWith(')') ? 1 : 0)
    const empty = contentStart === contentEnd
    const removesSign = key === 'Backspace'
      ? position > start && (position <= contentStart || (empty && position === end))
      : position >= start && (position < contentStart || (empty && position === contentEnd))
    if (removesSign) return {
      value: value.slice(0, start) + value.slice(contentStart, contentEnd) + value.slice(end),
      cursor: start,
    }
  }
  return null
}
