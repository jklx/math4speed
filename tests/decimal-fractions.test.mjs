import assert from 'node:assert/strict'
import test from 'node:test'
import { generateDezimalbruecheProblems } from '../src/problems/generators.js'
import { reduceDecimalFraction, validateDecimalFraction } from '../src/problems/decimalFractions.js'

function seedRandom(t) {
  let seed = 123456
  t.mock.method(Math, 'random', () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 2 ** 32
  })
}

test('bereits die erste Aufgabe nutzt die normale Zufallsgenerierung', t => {
  t.mock.method(Math, 'random', () => 0.9)
  const [problem] = generateDezimalbruecheProblems(1, {
    decimalPowerOfTen: false, decimalCommonFractions: true,
    decimalPeriodic: false, decimalExpandableFractions: false,
  })
  assert.equal(problem.numerator, 22)
  assert.equal(problem.denominator, 8)
  assert.equal(problem.direction, 'fraction-to-decimal')
})

test('abgewählte periodische Aufgaben erscheinen auch am Anfang nicht', t => {
  seedRandom(t)
  for (let attempt = 0; attempt < 100; attempt++) {
    const problems = generateDezimalbruecheProblems(5, { decimalPeriodic: false })
    assert.ok(problems.every(problem => !problem.isRecurring && problem.variant !== 'periodic'))
    assert.deepEqual(problems.map(p => p.variant), ['power-of-ten', 'common', 'expandable', 'power-of-ten', 'common'])
  }
})

test('richtige Zwischenschritte verlangen weiteres Kürzen, erst der gekürzte Bruch ist fertig', () => {
  const problem = { numerator: 75, denominator: 100 }
  for (const input of ['75/100', '15/20', '6/8']) {
    assert.deepEqual(validateDecimalFraction(input, problem), {
      parsed: input, isCorrect: false, needsReduction: true,
    })
  }
  assert.deepEqual(validateDecimalFraction(' 3 / 4 ', problem), {
    parsed: '3/4', isCorrect: true, needsReduction: false,
  })
})

test('falsche und ungültige Brüche sind keine Kürzungsschritte', () => {
  const problem = { numerator: 1, denominator: 2 }
  for (const input of ['3/4', '2/3', '2/0', '1/', '/2', '', '0/2', '1.5/3', '-1/2', '9007199254740992/18014398509481984']) {
    const result = validateDecimalFraction(input, problem)
    assert.equal(result.isCorrect, false, input)
    assert.equal(result.needsReduction, false, input)
  }
})

test('periodische und unechte Brüche lassen sich schrittweise oder direkt lösen', () => {
  for (const [problem, intermediate, final] of [
    [{ numerator: 1, denominator: 3 }, '3/9', '1/3'],
    [{ numerator: 7, denominator: 6 }, '105/90', '7/6'],
    [{ numerator: 25, denominator: 10 }, '250/100', '5/2'],
  ]) {
    assert.equal(validateDecimalFraction(intermediate, problem).needsReduction, true)
    assert.equal(validateDecimalFraction(final, problem).isCorrect, true)
  }
})

test('alle erzeugten Bruchlösungen sind vollständig gekürzt und wertgleich', () => {
  const problems = generateDezimalbruecheProblems(200)
  assert.equal(problems.length, 200)
  for (const problem of problems) {
    if (problem.direction === 'decimal-to-fraction') {
      assert.equal(problem.correct, reduceDecimalFraction(problem.numerator, problem.denominator))
      assert.equal(validateDecimalFraction(problem.correct, problem).isCorrect, true)
      assert.equal(validateDecimalFraction(`${problem.numerator * 10}/${problem.denominator * 10}`, problem).needsReduction, true)
    } else {
      assert.equal(problem.correct, problem.decimalDisplay)
    }
  }
})
