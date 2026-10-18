// Pick the closest visible insertion point, accounting for raised exponents.
export function nearestMathCursor(points, x, y) {
  let best = null, distance = Infinity
  for (const point of points) {
    const dy = Math.max(point.top - y, 0, y - point.bottom)
    const score = (point.x - x) ** 2 + 4 * dy ** 2
    if (score < distance) {
      distance = score
      best = point.index
    }
  }
  return best ?? 0
}

export function mathCursorFromPoint(container, x, y) {
  const points = []
  for (const element of container.querySelectorAll('[data-caret-start]')) {
    const start = Number(element.dataset.caretStart)
    const end = Number(element.dataset.caretEnd)
    const bounds = element.getBoundingClientRect()
    const text = element.firstChild
    for (let offset = 0; offset <= end - start; offset++) {
      let caretX = bounds.left + bounds.width * offset / Math.max(1, end - start)
      // Measure characters individually, including variable names with uneven widths.
      if (text?.nodeType === 3 && text.length === end - start && text.length) {
        const range = element.ownerDocument.createRange()
        const character = Math.min(offset, text.length - 1)
        range.setStart(text, character)
        range.setEnd(text, character + 1)
        const rect = range.getBoundingClientRect()
        if (rect.width) caretX = offset === text.length ? rect.right : rect.left
      }
      points.push({ index: start + offset, x: caretX, top: bounds.top, bottom: bounds.bottom })
    }
  }
  return nearestMathCursor(points, x, y)
}
