import test from 'node:test'
import assert from 'node:assert/strict'
import { generateProblems } from '../src/problems/generators.js'
import { validateHauptnenner } from '../src/problems/validate.js'

const gcd = (a, b) => b ? gcd(b, a % b) : a
const product = factors => factors.reduce((a, b) => a * b, 1)
test('Hauptnenner: correct factorizations, bounded numbers and one coprime pair per ten tasks', () => {
  const tasks = generateProblems(1000, 'hauptnenner')
  assert.equal(tasks.length, 1000)
  for (let i = 0; i < tasks.length; i += 10) {
    assert.equal(tasks.slice(i, i + 10).filter(p => gcd(p.a, p.b) === 1).length, 1)
  }
  for (const p of tasks) {
    assert.equal(p.correct, p.a * p.b / gcd(p.a, p.b))
    assert.equal(product(p.factorsA), p.a)
    assert.equal(product(p.factorsB), p.b)
    assert.equal(product(p.lcmFactors), p.correct)
    assert.ok(p.a !== p.b && p.correct <= 180)
    for (const factor of [...p.factorsA, ...p.factorsB, ...p.lcmFactors]) {
      for (let divisor = 2; divisor * divisor <= factor; divisor++) assert.notEqual(factor % divisor, 0)
    }
  }
  assert.deepEqual(generateProblems(0, 'hauptnenner'), [])
})

test('All intermediate steps are required; order is arbitrary but multiplicities matter', () => {
  const problem = { factorsA: [2, 2, 3], factorsB: [2, 3, 3], lcmFactors: [2, 2, 3, 3], correct: 36 }
  const answer = { first: '3 2 2', second: '3 2 3', lcm: '2 3 2 3', result: '36' }
  assert.ok(validateHauptnenner(JSON.stringify(answer), problem).isCorrect)
  for (const key of Object.keys(answer)) {
    assert.ok(!validateHauptnenner({ ...answer, [key]: '1' }, problem).isCorrect)
    assert.ok(!validateHauptnenner({ ...answer, [key]: '' }, problem).valid)
  }
  for (const first of ['4 3', '2 3', '2 2 2 3', '2x 2 3']) {
    assert.ok(!validateHauptnenner({ ...answer, first }, problem).isCorrect)
  }
  assert.ok(!validateHauptnenner({ ...answer, result: '72' }, problem).isCorrect)
  assert.ok(!validateHauptnenner('invalid', problem).valid)
  assert.deepEqual(validateHauptnenner(JSON.stringify(answer), problem).snapshot, answer)
})
