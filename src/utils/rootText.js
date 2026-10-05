// Parse only visual root notation. Never evaluate expressions or interpret HTML.
export function parseRootText(value, depth = 0) {
  const text = String(value ?? '')
  if (depth >= 16) return [text]
  const result = []
  const pattern = /sqrt\(|√\(?/gi
  let position = 0
  let match
  while ((match = pattern.exec(text))) {
    const start = match.index
    const contentStart = start + match[0].length
    let contentEnd = contentStart, end = contentStart
    if (match[0].endsWith('(')) {
      let balance = 1
      while (contentEnd < text.length && balance > 0) {
        if (text[contentEnd] === '(') balance++
        if (text[contentEnd] === ')') balance--
        if (balance > 0) contentEnd++
      }
      end = balance === 0 ? contentEnd + 1 : contentEnd
    } else {
      const digits = text.slice(contentStart).match(/^\d+(?:[.,]\d+)?/)
      if (!digits) continue
      contentEnd += digits[0].length
      end = contentEnd
    }
    if (start > position) result.push(text.slice(position, start))
    result.push({ root: parseRootText(text.slice(contentStart, contentEnd), depth + 1) })
    position = end
    pattern.lastIndex = end
  }
  if (position < text.length) result.push(text.slice(position))
  return result
}
