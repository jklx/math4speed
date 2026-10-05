import assert from 'node:assert/strict'
import test from 'node:test'
import { parseRootText } from '../src/utils/rootText.js'

test('inline roots keep coefficients, operations and following punctuation outside the bar', () => {
  assert.deepEqual(parseRootText('√72 = 6√2.'), [{ root: ['72'] }, ' = 6', { root: ['2'] }, '.'])
  assert.deepEqual(parseRootText('3sqrt(5) − √(20)'), ['3', { root: ['5'] }, ' − ', { root: ['20'] }])
})

test('parenthesized radicands preserve inner parentheses and higher powers', () => {
  assert.deepEqual(parseRootText('√((−7)²) = 7'), [{ root: ['(−7)²'] }, ' = 7'])
  assert.deepEqual(parseRootText('√(25x^12)'), [{ root: ['25x^12'] }])
  assert.deepEqual(parseRootText('√(2 + √3)'), [{ root: ['2 + ', { root: ['3'] }] }])
})

test('legacy answers with missing closing parentheses still render', () => {
  assert.deepEqual(parseRootText('3sqrt(5'), ['3', { root: ['5'] }])
  assert.deepEqual(parseRootText('x^10'), ['x^10'])
  assert.deepEqual(parseRootText('<img onerror=alert(1)>'), ['<img onerror=alert(1)>'])
})
