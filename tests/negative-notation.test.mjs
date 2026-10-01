import assert from 'node:assert/strict'
import test from 'node:test'
import { formatNegativeExpression, getNegativeDisplayParts } from '../src/utils/negativeNotation.js'
import { generateNegativeProblems } from '../src/problems/generators.js'

test('Kurzschreibweise fasst Rechenzeichen und Vorzeichen korrekt zusammen', () => {
  assert.equal(formatNegativeExpression(-5, 12, '−'), '-5 − 12')
  assert.equal(formatNegativeExpression(-8, 3, '+'), '-8 + 3')
  assert.equal(formatNegativeExpression(-5, -12, '+'), '-5 − 12')
  assert.equal(formatNegativeExpression(-8, -3, '−'), '-8 + 3')
  assert.equal(formatNegativeExpression(-8, -3, '·'), '-8 · (-3)')
  assert.equal(formatNegativeExpression(-8, 3, '+', true), '(-8) + (+3)')
  for (let a = -20; a <= 20; a++) for (let b = -20; b <= 20; b++) {
    for (const operator of ['+', '−']) {
      const parts = getNegativeDisplayParts(a, b, operator)
      const expected = operator === '+' ? a + b : a - b
      assert.equal(parts.operator === '+' ? parts.a + parts.b : parts.a - parts.b, expected)
      assert.ok(!/[()]/.test(formatNegativeExpression(a, b, operator)))
    }
  }
})

test('Generierte Aufgaben verwenden die gewählte Schreibweise und behalten ihr Ergebnis', () => {
  for (const explicitPlus of [false, true]) {
    const problems = generateNegativeProblems(1000, { negativeMultiply: false, negativeDivide: false, negativeExplicitPlus: explicitPlus })
    for (const problem of problems) {
      assert.equal(problem.expression, formatNegativeExpression(problem.a, problem.b, problem.operator, explicitPlus))
      assert.equal(problem.correct, problem.operator === '+' ? problem.a + problem.b : problem.a - problem.b)
      assert.equal(/[()]/.test(problem.expression), explicitPlus)
    }
    assert.ok(problems.some(problem => problem.a < 0 && problem.b > 0 && problem.operator === '−'))
    assert.ok(problems.some(problem => problem.a < 0 && problem.b > 0 && problem.operator === '+'))
  }
})
