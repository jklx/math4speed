import assert from 'node:assert/strict'
import test from 'node:test'
import { nearestMathCursor, mathCursorFromPoint } from '../src/utils/mathInputCursor.js'

test('mouse position chooses character boundaries and handles empty inputs', () => {
  const points = [0, 1, 2, 3].map(index => ({ index, x: 10 + index * 12, top: 20, bottom: 40 }))
  assert.equal(nearestMathCursor(points, 0, 30), 0)
  assert.equal(nearestMathCursor(points, 23, 30), 1)
  assert.equal(nearestMathCursor(points, 34, 30), 2)
  assert.equal(nearestMathCursor(points, 100, 30), 3)
  assert.equal(nearestMathCursor([], 100, 30), 0)
})

test('raised exponents and root insertion points retain their actual source positions', () => {
  const points = [
    { index: 1, x: 20, top: 30, bottom: 50 },
    { index: 2, x: 20, top: 10, bottom: 26 },
    { index: 3, x: 30, top: 10, bottom: 26 },
  ]
  assert.equal(nearestMathCursor(points, 20, 40), 1)
  assert.equal(nearestMathCursor(points, 20, 15), 2)
  assert.equal(nearestMathCursor(points, 31, 15), 3)
  assert.equal(nearestMathCursor([
    { index: 0, x: 10, top: 20, bottom: 40 },
    { index: 2, x: 25, top: 20, bottom: 40 },
    { index: 3, x: 40, top: 20, bottom: 40 },
    { index: 4, x: 43, top: 20, bottom: 40 },
  ], 25, 30), 2) // inside √(2), not on its hidden opening parenthesis
})

test('DOM positions map to source indexes even when displayed symbols hide delimiters', () => {
  const element = (start, end, left, width) => ({
    dataset: { caretStart: String(start), caretEnd: String(end) },
    getBoundingClientRect: () => ({ left, width, top: 20, bottom: 40 }),
  })
  const container = { querySelectorAll: () => [element(0, 0, 10, 0), element(2, 3, 25, 10), element(4, 4, 38, 0)] }
  assert.equal(mathCursorFromPoint(container, 10, 30), 0)
  assert.equal(mathCursorFromPoint(container, 26, 30), 2)
  assert.equal(mathCursorFromPoint(container, 35, 30), 3)
  assert.equal(mathCursorFromPoint(container, 50, 30), 4)
})
