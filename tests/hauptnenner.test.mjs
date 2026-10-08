import test from 'node:test'
import assert from 'node:assert/strict'
import { generateProblems } from '../src/problems/generators.js'
import { validateHauptnenner } from '../src/problems/validate.js'
import { createRequire } from 'node:module'

const { normalizePracticeAnswers } = createRequire(import.meta.url)('../server/practiceAnswers.js')
const { sanitizeActivitySettings } = createRequire(import.meta.url)('../server/activitySettings.js')

const gcd = (a, b) => b ? gcd(b, a % b) : a
const product = factors => factors.reduce((a, b) => a * b, 1)
test('Hauptnenner: correct factorizations, bounded numbers and one coprime pair per ten tasks', () => {
  const tasks = generateProblems(1000, 'hauptnenner')
  assert.equal(tasks.length, 1000)
  const pairs = tasks.filter(p => !p.c)
  assert.equal(pairs.length, 500)
  for (let i = 0; i < pairs.length; i += 10) {
    assert.equal(pairs.slice(i, i + 10).filter(p => gcd(p.a, p.b) === 1).length, 1)
  }
  for (const p of pairs) {
    assert.equal(p.correct, p.a * p.b / gcd(p.a, p.b))
    assert.equal(product(p.factorsA), p.a)
    assert.equal(product(p.factorsB), p.b)
    assert.equal(product(p.lcmFactors), p.correct)
    assert.ok(p.a !== p.b && p.correct <= 180)
    assert.ok(p.b >= 12 && p.b <= 36 && p.correct > p.b)
    assert.ok(p.factorsA.length <= 4 && p.factorsB.length <= 4 && p.lcmFactors.length <= 5)
    for (const factor of [...p.factorsA, ...p.factorsB, ...p.lcmFactors]) {
      for (let divisor = 2; divisor * divisor <= factor; divisor++) assert.notEqual(factor % divisor, 0)
    }
  }
  assert.deepEqual(generateProblems(0, 'hauptnenner'), [])
})

test('Easy tasks stay manageable mentally and require only the result', () => {
  for (const p of generateProblems(1000, 'hauptnenner', { hauptnennerDifficulty: 'easy' })) {
    assert.equal(p.mental, true)
    assert.equal(p.c, undefined)
    assert.ok(p.b <= 20 && p.correct <= 60)
    assert.ok(p.b <= 12 || p.b % p.a === 0)
    assert.equal(p.correct, p.a * p.b / gcd(p.a, p.b))
    assert.ok(validateHauptnenner({ result: String(p.correct) }, p).isCorrect)
    assert.ok(!validateHauptnenner({ result: String(p.correct * 2) }, p).isCorrect)
    assert.ok(!validateHauptnenner({ result: '' }, p).valid)
  }
})

test('Easy tasks contain three divisible pairs and one coprime pair per ten tasks', () => {
  const tasks = generateProblems(20000, 'hauptnenner', { hauptnennerDifficulty: 'easy' })
  for (let i = 0; i < tasks.length; i += 10) {
    const block = tasks.slice(i, i + 10)
    assert.equal(block.filter(p => p.b % p.a === 0).length, 3)
    assert.equal(block.filter(p => gcd(p.a, p.b) === 1).length, 1)
    assert.ok(block.every(p => p.correct === p.a * p.b / gcd(p.a, p.b) && p.correct <= 60))
  }
  assert.equal(tasks.filter(p => p.b % p.a === 0).length / tasks.length, 0.3)
})

test('Prime factorization alternates two and three denominators and validates every factorization', () => {
  const lcm = (a, b) => a * b / gcd(a, b)
  const mixed = generateProblems(1000, 'hauptnenner', { hauptnennerDifficulty: 'medium' })
  mixed.forEach((p, index) => assert.equal(Boolean(p.c), index % 2 === 1))
  const tasks = mixed.filter(p => p.c)
  assert.equal(tasks.length, 500)
  assert.ok(new Set(tasks.map(p => `${p.a},${p.b},${p.c}`)).size > 20)
  for (const p of tasks) {
    assert.ok(p.a < p.b && p.b < p.c && p.c <= 36)
    assert.equal(p.correct, lcm(lcm(p.a, p.b), p.c))
    assert.ok(p.correct <= 360 && p.lcmFactors.length <= 6)
    assert.ok([p.factorsA, p.factorsB, p.factorsC].every(factors => factors.length <= 4))
    for (const pair of [lcm(p.a, p.b), lcm(p.a, p.c), lcm(p.b, p.c)]) assert.ok(pair < p.correct)
    assert.equal(product(p.factorsA), p.a)
    assert.equal(product(p.factorsB), p.b)
    assert.equal(product(p.factorsC), p.c)
    assert.equal(product(p.lcmFactors), p.correct)
    const input = { first: p.factorsA.join(' '), second: p.factorsB.join(' '), third: p.factorsC.toReversed().join(' '), lcm: p.lcmFactors.join(' '), result: String(p.correct) }
    assert.ok(validateHauptnenner(JSON.stringify(input), p).isCorrect)
    assert.equal(validateHauptnenner(input, p).snapshot.third, input.third)
    assert.ok(!validateHauptnenner({ ...input, third: '' }, p).valid)
    assert.equal(validateHauptnenner({ ...input, third: '1' }, p).fieldCorrect.third, false)
    assert.equal(validateHauptnenner({ ...input, third: input.third + ' 2' }, p).fieldCorrect.third, false)
  }
  assert.deepEqual(generateProblems(0, 'hauptnenner', { hauptnennerDifficulty: 'hard' }), [])
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

test('Practice persistence keeps the third denominator and both submitted factorizations', () => {
  const problem = generateProblems(2, 'hauptnenner', { hauptnennerDifficulty: 'medium' })[1]
  const snapshot = { first: problem.factorsA.join(' '), second: problem.factorsB.join(' '), third: problem.factorsC.join(' '), lcm: problem.lcmFactors.join(' '), result: String(problem.correct) }
  const firstAttempt = { ...snapshot, third: '2' }
  const saved = normalizePracticeAnswers([{ ...problem, user: String(problem.correct), hauptnennerSnapshot: snapshot, hauptnennerFirstAttempt: firstAttempt, isCorrect: true, assisted: true }]).answers[0]
  assert.equal(saved.task.c, problem.c)
  assert.deepEqual(saved.task.factorsC, problem.factorsC)
  assert.deepEqual(saved.submittedAnswer.hauptnennerSnapshot, snapshot)
  assert.deepEqual(saved.submittedAnswer.hauptnennerFirstAttempt, firstAttempt)
  assert.equal(saved.assisted, true)
})

test('Method settings survive server validation and migrate the previous third-denominator setting', () => {
  for (const difficulty of ['easy', 'medium']) {
    assert.deepEqual(sanitizeActivitySettings('hauptnenner', { hauptnennerDifficulty: difficulty }), { hauptnennerDifficulty: difficulty })
  }
  for (const invalid of [undefined, true, false, 3, 'unknown', 'hard']) {
    const settings = sanitizeActivitySettings('hauptnenner', { hauptnennerDifficulty: invalid })
    assert.deepEqual(settings, { hauptnennerDifficulty: 'medium' })
    const tasks = generateProblems(10, 'hauptnenner', settings)
    assert.ok(tasks.every(p => !p.mental))
    tasks.forEach((p, index) => assert.equal(Boolean(p.c), index % 2 === 1))
  }
  assert.equal(sanitizeActivitySettings('einmaleins', { includeSquares11_20: true }).includeSquares11_20, true)
})
