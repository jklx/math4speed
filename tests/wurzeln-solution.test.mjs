import assert from 'node:assert/strict'
import test from 'node:test'
import { generateWurzelnProblems } from '../src/problems/wurzeln.js'
import { getWurzelnSolutionSteps } from '../src/problems/wurzelnSolution.js'

const root = value => ({ root: String(value) })
const steps = (nodes, correct) => getWurzelnSolutionSteps({ nodes, correct })

test('partial extraction shows the square factor and the remaining root', () => {
  const solution = steps(root(45), '3√5')
  assert.deepEqual(solution[0].expression, root('9 · 5'))
  assert.deepEqual(solution[1].expression, [root(9), ' · ', root(5), ' = ', '3', root(5)])
})

test('products, quotients and squares show their relevant intermediate calculation', () => {
  assert.deepEqual(steps([root(3), ' · ', root(48)], '12')[1].expression, [root(3), ' · ', root(3), ' · ', root(16)])
  assert.deepEqual(steps({ numerator: root(45), denominator: root(5) }, '3')[1].expression, root(9))
  assert.equal(steps(root('(-3,5)²'), '3,5')[0].expression, '|-3,5| = 3,5')
  assert.deepEqual(steps(root('169 − 25'), '12')[0].expression, root(144))
  assert.deepEqual(steps(root('375 + 25'), '20')[0].expression, root(400))
  assert.match(steps(root('375 + 25'), '20')[0].text, /Summe/)
})

test('older products can be solved without recognizing a large square', () => {
  const solution = steps([root(6), ' · ', root(216)], '36')
  assert.deepEqual(solution[0].expression, [root(6), ' · ', root('6 · 36')])
  assert.deepEqual(solution[2].expression, ['6 · ', root(36), ' = ', '6 · 6'])
})

test('collecting roots extracts both square factors and keeps subtraction order', () => {
  const partial = steps([root(45), ' − ', root(20)], '√5')
  assert.deepEqual(partial[0].expression, [root('9 · 5'), ' − ', root('4 · 5')])
  assert.deepEqual(partial[2].expression, ['(3 − 2) · ', root(5)])
  const direct = steps(['2', root(3), ' − ', '5', root(3)], '-3√3')
  assert.deepEqual(direct[0].expression, ['(2 − 5) · ', root(3)])
})

test('variable explanations preserve and halve higher powers correctly', () => {
  assert.equal(steps([root('3x⁶'), ' · ', root('3x⁶')], '3x^6')[0].expression, '3x⁶')
  assert.equal(steps({ base: root('7x⁵'), exponent: 2 }, '7x^5')[0].expression, '7x⁵')
  const quotient = steps({ numerator: root('75x¹³'), denominator: root('3x') }, '5x^6')
  assert.deepEqual(quotient[1].expression, root('25x^12'))
  assert.match(quotient[2].text, /12 : 2 = 6/)
  const direct = steps(root('49x¹⁰'), '7x^5')
  assert.deepEqual(direct[0].expression, [root(49), ' · ', root('x^10')])
  assert.equal(direct[1].expression, '7x^5')
})

test('every generated task has specific steps ending in its expected answer', () => {
  for (const problem of generateWurzelnProblems(5000)) {
    const solution = getWurzelnSolutionSteps(problem)
    assert.ok(solution.length >= 2, problem.expression)
    assert.equal(solution.at(-1).expression, problem.correct)
    assert.ok(!JSON.stringify(solution).match(/NaN|undefined/), problem.expression)
  }
})
