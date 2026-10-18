// Share delimiter boundaries between display, cursor movement and deletion.
// The radicand can contain signs, variables or inner parentheses while editing.
export function getRootInputRanges(value) {
  const text = String(value)
  const ranges = []
  const roots = /sqrt\(|√\(?/gi
  let match
  while ((match = roots.exec(text))) {
    const start = match.index
    const contentStart = start + match[0].length
    let contentEnd = contentStart, end
    if (match[0].endsWith('(')) {
      let depth = 1
      while (contentEnd < text.length) {
        if (text[contentEnd] === '(') depth++
        if (text[contentEnd] === ')' && --depth === 0) break
        contentEnd++
      }
      end = contentEnd < text.length ? contentEnd + 1 : contentEnd
    } else {
      contentEnd += text.slice(contentStart).match(/^[−-]?\d*(?:[.,]\d*)?/)[0].length
      end = contentEnd
    }
    ranges.push({ start, end, contentStart, contentEnd })
    roots.lastIndex = end
  }
  return ranges
}

export function moveRootCursor(value, position, direction) {
  const text = String(value)
  const cursor = Math.max(0, Math.min(position, text.length))
  // sqrt( is displayed as one symbol. Cross the hidden prefix in one step.
  for (const { start, contentStart } of getRootInputRanges(text)) {
    if (direction > 0 && cursor >= start && cursor < contentStart) return contentStart
    if (direction < 0 && cursor > start && cursor <= contentStart) return start
  }
  return Math.max(0, Math.min(cursor + direction, text.length))
}

export function deleteRootAtCursor(value, position, key) {
  for (const { start, end, contentStart, contentEnd } of getRootInputRanges(value)) {
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
