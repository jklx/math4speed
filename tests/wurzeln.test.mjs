import assert from 'node:assert/strict'
import test from 'node:test'
import { generateProblems } from '../src/problems/generators.js'
import { validateWurzeln, getWurzelnVariantPool } from '../src/problems/wurzeln.js'
import { moveRootCursor, deleteRootAtCursor } from '../src/utils/rootInput.js'
import { normalizePowers, toSuperscript } from '../src/utils/powers.js'

const GROUPS = ['Teilweise', 'Produkte', 'Quadrate', 'Terme', 'Variablen']

// Independent numerical evaluation of the small expression tree, at several positive x.
function number(text, x) {
  const normalized = String(text).replace(/,/g, '.').replace(/−/g, '-')
  const squared = normalized.match(/^\((-?[\d.]+)\)²$/)
  if (squared) return Number(squared[1]) ** 2
  const variable = normalizePowers(normalized).match(/^(\d+)x(?:\^(\d+))?$/)
  if (variable) return Number(variable[1]) * x ** Number(variable[2] ?? 1)
  if (normalized.includes(' - ')) return normalized.split(' - ').map(Number).reduce((a, b) => a - b)
  if (normalized.includes(' + ')) return normalized.split(' + ').map(Number).reduce((a, b) => a + b)
  return Number(normalized)
}
function evaluate(node, x) {
  if (Array.isArray(node)) {
    if (node.includes(' · ')) return evaluate(node[0], x) * evaluate(node[2], x)
    if (node.length === 3) return evaluate(node[0], x) + (node[1] === ' − ' ? -1 : 1) * evaluate(node[2], x)
    return Number(node[0]) * evaluate(node[1], x) + (node[2] === ' − ' ? -1 : 1) * Number(node[3]) * evaluate(node[4], x)
  }
  if (typeof node !== 'object') return number(node, x)
  if (node.root) return Math.sqrt(number(node.root, x))
  if (node.base) return evaluate(node.base, x) ** node.exponent
  return evaluate(node.numerator, x) / evaluate(node.denominator, x)
}
function result(text, x) {
  if (text.includes('√')) {
    const [coefficient, radicand] = text.split('√')
    return (coefficient === '' ? 1 : coefficient === '-' ? -1 : Number(coefficient)) * Math.sqrt(Number(radicand))
  }
  const match = text.match(/^(\d+)x(?:\^(\d+))?$/)
  return match ? Number(match[1]) * x ** Number(match[2] ?? 1) : Number(text.replace(',', '.'))
}

test('5000 tasks have correct exact solutions and cover every selected group', () => {
  const problems = generateProblems(5000, 'wurzeln')
  assert.deepEqual(new Set(problems.map(p => p.variant)), new Set(GROUPS))
  for (const problem of problems) {
    assert.equal(validateWurzeln(problem.correct, problem).isCorrect, true)
    for (const x of [0.25, 1, 3, 7]) {
      const expected = result(problem.correct, x)
      assert.ok(Math.abs(evaluate(problem.nodes, x) - expected) < 1e-8 * Math.max(1, Math.abs(expected)), problem.expression)
    }
  }
})

test('group selection and empty-selection fallback', () => {
  const settings = Object.fromEntries(GROUPS.map(key => [`wurzeln${key}`, false]))
  for (const group of GROUPS) {
    assert.ok(generateProblems(200, 'wurzeln', { ...settings, [`wurzeln${group}`]: true }).every(p => p.variant === group))
  }
  assert.equal(generateProblems(100, 'wurzeln', settings).length, 100)
})

test('sums and differences include roots 11–20, and products need no square above 400', () => {
  const sample = generateProblems(20000, 'wurzeln')
  const sums = new Set(), differences = new Set()
  let products = 0
  for (const problem of sample) {
    if (problem.variant === 'Produkte' && Array.isArray(problem.nodes)) {
      products++
      const radicand = Number(problem.nodes[0].root) * Number(problem.nodes[2].root)
      assert.ok(radicand <= 400, problem.expression)
      assert.equal(Math.sqrt(radicand), Number(problem.correct))
      assert.ok(Number.isInteger(Math.sqrt(Number(problem.nodes[2].root) / Number(problem.nodes[0].root))))
    }
    if (problem.variant === 'Quadrate' && problem.nodes.root.match(/^\d+ [−+] \d+$/)) {
      const answer = Number(problem.correct)
      assert.ok(answer >= 2 && answer <= 20)
      const operation = problem.nodes.root.includes(' + ') ? sums : differences
      operation.add(answer)
    }
  }
  assert.ok(products > 1000)
  for (let answer = 11; answer <= 20; answer++) {
    assert.ok(sums.has(answer), `sum with root ${answer}`)
    assert.ok(differences.has(answer), `difference with root ${answer}`)
  }
})

test('variable tasks include higher powers and halve even root exponents', () => {
  const settings = Object.fromEntries(GROUPS.map(key => [`wurzeln${key}`, key === 'Variablen']))
  const problems = generateProblems(3000, 'wurzeln', settings)
  const evenPowers = new Set()
  for (const problem of problems) {
    if (!Array.isArray(problem.nodes) && problem.nodes.root) {
      const [, coefficient, exponent] = normalizePowers(problem.nodes.root).match(/^(\d+)x\^(\d+)$/).map(Number)
      evenPowers.add(exponent)
      assert.equal(problem.correct, `${Math.sqrt(coefficient)}x${exponent === 2 ? '' : `^${exponent / 2}`}`)
    }
    assert.ok(validateWurzeln(problem.correct.replace(/\^(\d+)/g, (_, power) => toSuperscript(power)), problem).isCorrect)
  }
  assert.deepEqual([...evenPowers].sort((a, b) => a - b), [2, 4, 6, 8, 10, 12])
  assert.ok(validateWurzeln('5x¹⁰', { correct: '5x^10' }).isCorrect)
  assert.equal(validateWurzeln('5x^1', { correct: '5x^10' }).isCorrect, false)
  assert.equal(validateWurzeln('5x^4', { correct: '5x^5' }).isCorrect, false)
  assert.equal(validateWurzeln('5x^10junk', { correct: '5x^10' }).isCorrect, false)
})

test('partial extraction has equal weight and leaves a square-free remainder', () => {
  assert.deepEqual(getWurzelnVariantPool(), GROUPS)
  const sample = generateProblems(20000, 'wurzeln')
  const partial = sample.filter(problem => problem.variant === 'Teilweise')
  assert.ok(partial.length / sample.length > 0.18 && partial.length / sample.length < 0.22)
  let extraCount = 0
  for (const problem of partial) {
    const [, factor, remainder] = problem.correct.match(/^(\d+)√(\d+)$/).map(Number)
    assert.ok([2, 3, 4, 5, 6, 7].includes(factor))
    if ([4, 6, 7].includes(factor)) {
      extraCount++
      assert.equal(remainder, 2)
    }
    assert.ok(Number(problem.nodes.root) <= 300)
    for (let divisor = 2; divisor * divisor <= remainder; divisor++) assert.notEqual(remainder % (divisor * divisor), 0)
  }
  assert.ok(extraCount / partial.length > 0.16 && extraCount / partial.length < 0.24)
  // The same difficulty limits apply when extraction precedes collecting terms.
  for (const problem of sample.filter(p => p.variant === 'Terme')) {
    assert.notEqual(problem.correct, '0', problem.expression)
    if (problem.nodes.length === 3 && problem.nodes[1] === ' − ') {
      assert.notEqual(problem.nodes[0].root, problem.nodes[2].root, problem.expression)
    }
    if (problem.nodes.length === 5 && problem.nodes[2] === ' − ') {
      assert.notEqual(problem.nodes[0], problem.nodes[3], problem.expression)
    }
  }
  for (const problem of sample.filter(p => p.variant === 'Terme' && p.nodes.length === 3)) {
    for (const node of [problem.nodes[0], problem.nodes[2]]) {
      const radicand = Number(node.root)
      let factor = 1
      for (let candidate = 2; candidate * candidate <= radicand; candidate++) {
        if (radicand % (candidate * candidate) === 0) factor = candidate
      }
      const remainder = radicand / (factor * factor)
      assert.ok([2, 3, 4, 5, 6, 7].includes(factor))
      if ([4, 6, 7].includes(factor)) assert.equal(remainder, 2)
    }
  }
  assert.ok(!getWurzelnVariantPool({ wurzelnTeilweise: false }).includes('Teilweise'))
  assert.ok(validateWurzeln('6sqrt(2)', { correct: '6√2' }).isCorrect)
  assert.equal(validateWurzeln('2√18', { correct: '6√2' }).isCorrect, false)
})

test('exact input accepts standard notation, but rejects unsimplified and approximate answers', () => {
  for (const input of ['3√5', '3 * sqrt(5)', '3·√(5)', '+3 √5', '3sqrt(5', '3√(5', '3 SQRT(5 ']) assert.ok(validateWurzeln(input, { correct: '3√5' }).isCorrect)
  for (const input of ['6,7082', '√45', '3√5junk', '3**√5', '3x', '3√25', 'NaN', 'Infinity']) assert.equal(validateWurzeln(input, { correct: '3√5' }).isCorrect, false)
  assert.ok(validateWurzeln('−√5', { correct: '-1√5' }).isCorrect)
  assert.ok(validateWurzeln('x²', { correct: '1x^2' }).isCorrect)
  assert.ok(validateWurzeln('3,5', { correct: '3,5' }).isCorrect)
  assert.equal(validateWurzeln('-7', { correct: '7' }).isCorrect, false)
  assert.equal(validateWurzeln('', { correct: '0' }).valid, false)
  for (const input of ['3sqrt(', '3sqrt()', '3sqrt(5))', '3sqrt(5junk', '3sqrt((5', '3sqrt(5+2']) assert.equal(validateWurzeln(input, { correct: '3√5' }).isCorrect, false)
})

test('arrow keys cross the root prefix and distinguish inside from after the root', () => {
  const text = '3sqrt(25)+1'
  assert.equal(moveRootCursor(text, 1, 1), 6)
  assert.equal(moveRootCursor(text, 6, -1), 1)
  assert.equal(moveRootCursor(text, 7, 1), 8)
  assert.equal(moveRootCursor(text, 8, 1), 9) // cross the closing parenthesis
  assert.equal(moveRootCursor(text, 9, -1), 8)
  assert.equal(moveRootCursor('sqrt()', 5, 1), 6)
  assert.equal(moveRootCursor('sqrt()', 6, -1), 5)
  assert.equal(moveRootCursor(text, 0, -1), 0)
  assert.equal(moveRootCursor(text, text.length, 1), text.length)
  assert.equal(moveRootCursor('3√(25)+1', 1, 1), 3)
  assert.equal(moveRootCursor('3√(25)+1', 3, -1), 1)
  assert.equal(moveRootCursor('3√(25)+1', 5, 1), 6)
})

test('deleting the root sign removes its delimiters and preserves the radicand', () => {
  for (const [value, cursor, key, expected] of [
    ['3√(25)+1', 3, 'Backspace', '325+1'],
    ['3√(25)+1', 1, 'Delete', '325+1'],
    ['3sqrt(25)+1', 6, 'Backspace', '325+1'],
    ['3sqrt(25)+1', 1, 'Delete', '325+1'],
    ['3√()', 3, 'Backspace', '3'],
    ['3√()', 4, 'Backspace', '3'],
    ['3√()', 3, 'Delete', '3'],
    ['3√25', 2, 'Backspace', '325'],
  ]) assert.deepEqual(deleteRootAtCursor(value, cursor, key), { value: expected, cursor: 1 })
  assert.equal(deleteRootAtCursor('3√(25)', 5, 'Backspace'), null) // digits stay editable
})
