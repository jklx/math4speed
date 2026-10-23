import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { getDecimalDenominatorSteps } from '../src/problems/decimalFractions.js'
import { generateDezimalbruecheProblems } from '../src/problems/generators.js'

let server, renderSolution
before(async () => {
  server = await createServer({ configLoader: 'runner', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true } })
  renderSolution = (await server.ssrLoadModule('/src/Dezimalbrueche.jsx')).renderSolution
})
after(async () => { await server?.close() })

const fractions = html => [...html.matchAll(/class="fraction decimal-solution-fraction"><span>(\d+)<\/span><span>(\d+)<\/span>/g)].map(([, n, d]) => `${n}/${d}`)
const render = (numerator, denominator, decimalDisplay, extra = {}) => renderToStaticMarkup(renderSolution({ numerator, denominator, decimalDisplay, direction: 'fraction-to-decimal', ...extra }))

test('Zehnerbrüche werden direkt abgelesen, ohne Kürzen und Wiedererweitern', () => {
  for (const [n, d, decimal] of [[2, 10, '0,2'], [25, 100, '0,25'], [150, 1000, '0,15']]) {
    const html = render(n, d, decimal)
    assert.ok(fractions(html).length <= 2)
    assert.doesNotMatch(html, /Erweitert/)
  }
  assert.deepEqual(fractions(render(2, 10, '0,2')), ['2/10'])
  assert.deepEqual(fractions(render(150, 1000, '0,15')), ['150/1000', '15/100'])
})

test('ein direkter Schritt erreicht den passenden Zehnernenner', () => {
  assert.deepEqual(getDecimalDenominatorSteps(6, 20), [{ numerator: 3, denominator: 10, factor: 2, operation: 'reduce' }])
  assert.deepEqual(getDecimalDenominatorSteps(3, 20), [{ numerator: 15, denominator: 100, factor: 5, operation: 'expand' }])
  assert.deepEqual(fractions(render(6, 20, '0,3')), ['6/20', '3/10'])
  assert.deepEqual(fractions(render(6, 8, '0,75')), ['6/8', '3/4', '75/100'])
})

test('Kürzen hat Vorrang und wird beim Erweitern nicht wieder rückgängig gemacht', () => {
  for (const [n, d, decimal, expected] of [
    [14, 20, '0,7', ['14/20', '7/10']],
    [35, 50, '0,7', ['35/50', '7/10']],
    [75, 250, '0,3', ['75/250', '3/10']],
    [6, 125, '0,048', ['6/125', '48/1000']],
  ]) assert.deepEqual(fractions(render(n, d, decimal)), expected)
  for (let d = 2; d <= 500; d++) {
    for (let n = 1; n <= 100; n++) {
      const steps = getDecimalDenominatorSteps(n, d)
      if (!steps) continue
      for (const step of steps) assert.equal(step.numerator * d, n * step.denominator)
      if (steps.length === 2) {
        const [reduction, expansion] = steps
        assert.equal(reduction.operation, 'reduce')
        assert.equal(expansion.operation, 'expand')
        for (let factor = 2; factor <= Math.min(reduction.factor, expansion.factor); factor++) {
          assert.ok(reduction.factor % factor !== 0 || expansion.factor % factor !== 0)
        }
      }
    }
  }
})

test('Dezimalzahl wird nach ihren Nachkommastellen als Bruch geschrieben und einmal gekürzt', () => {
  const extra = { direction: 'decimal-to-fraction' }
  assert.deepEqual(fractions(render(1, 4, '0,25', extra)), ['25/100', '1/4'])
  assert.deepEqual(fractions(render(25, 10, '2,5', extra)), ['25/10', '5/2'])
  assert.deepEqual(fractions(render(7, 100, '0,07', extra)), ['7/100'])
  assert.deepEqual(fractions(render(3, 4, '0,75', { ...extra, variant: 'common' })), ['75/100', '3/4'])
  assert.deepEqual(fractions(render(10, 5, '2')), ['10/5'])
})

test('periodische Brüche werden direkt aus bekannten Dritteln, Sechsteln und Neunteln abgelesen', () => {
  for (const [n, d, decimal] of [[1, 3, '0,(3)'], [2, 3, '0,(6)'], [1, 6, '0,1(6)'], [5, 6, '0,8(3)'], [4, 9, '0,(4)']]) {
    for (const direction of ['decimal-to-fraction', 'fraction-to-decimal']) {
      const html = render(n, d, decimal, { direction, isRecurring: true })
      assert.deepEqual(fractions(html), [`${n}/${d}`])
      assert.doesNotMatch(html, /Division|Kürz|Nachkommastelle|data-solution| = 0 \+/)
    }
  }
})

test('größere periodische Zahlen nutzen nur einen kurzen Weg über den bekannten Bruchteil', () => {
  for (const [n, d, decimal, whole, fractional] of [[7, 6, '1,1(6)', 1, '1/6'], [11, 6, '1,8(3)', 1, '5/6'], [88, 3, '29,(3)', 29, '1/3']]) {
    const html = render(n, d, decimal, { direction: 'decimal-to-fraction', isRecurring: true })
    assert.deepEqual(fractions(html), [fractional, fractional, `${n}/${d}`])
    assert.ok(html.includes(` = ${whole} + 0,`))
    assert.doesNotMatch(html, /Periodenbruch|Division|Kürz|Nachkommastelle|data-solution/)
    const reverse = render(n, d, decimal, { isRecurring: true })
    assert.deepEqual(fractions(reverse), [`${n}/${d}`, fractional])
    assert.doesNotMatch(reverse, /Division|data-solution/)
  }
})

test('unechte Brüche zeigen einen direkten Weg und einen Weg über die gemischte Zahl', () => {
  for (const [n, d, decimal, remainderFraction] of [
    [7, 4, '1,75', '3/4'],
    [26, 20, '1,3', '3/10'],
    [25, 8, '3,125', '1/8'],
  ]) {
    const html = render(n, d, decimal, { isRecurring: decimal.includes('(') })
    assert.match(html, /Lösungsweg über (Erweitern|Kürzen|Division|Ablesen)/)
    assert.match(html, /Lösungsweg über gemischte Zahl/)
    const mixed = html.split('data-solution="mixed"')[1].split('data-solution="direct"')[0]
    assert.deepEqual(fractions(mixed), [`${n}/${d}`, remainderFraction])
    assert.doesNotMatch(mixed, /<small>|Ganze abspalten/)
    assert.doesNotMatch(html, /undefined|NaN/)
  }
})

test('Dezimalzahlen größer als eins werden im ersten Lösungsweg zerlegt', () => {
  for (const [n, d, decimal, decomposition, fractional, result] of [
    [13, 8, '1,625', '1 + 0,625', '5/8', '13/8'],
    [9, 4, '2,25', '2 + 0,25', '1/4', '9/4'],
  ]) {
    const html = render(n, d, decimal, { direction: 'decimal-to-fraction', isRecurring: decimal.includes('(') })
    assert.ok(html.indexOf('data-solution="mixed"') < html.indexOf('data-solution="direct"'))
    const mixed = html.split('data-solution="mixed"')[1].split('data-solution="direct"')[0]
    assert.ok(mixed.includes(decomposition))
    assert.deepEqual(fractions(mixed), [fractional, fractional, result])
    assert.doesNotMatch(mixed, /<small>|Nachkommastelle|Gekürzt/)
    assert.doesNotMatch(html, /undefined|NaN/)
  }
})

test('Zehntel und nicht kürzbare Dezimalanteile werden direkt in einen Bruch umgewandelt', () => {
  for (const [n, d, decimal, expected] of [
    [16, 10, '1,6', ['16/10', '8/5']],
    [25, 10, '2,5', ['25/10', '5/2']],
    [13, 10, '1,3', ['13/10']],
    [160, 100, '1,60', ['160/100', '8/5']],
    [201, 100, '2,01', ['201/100']],
    [203, 100, '2,03', ['203/100']],
    [1007, 1000, '1,007', ['1007/1000']],
    [2010, 1000, '2,010', ['2010/1000', '201/100']],
  ]) {
    const html = render(n, d, decimal, { direction: 'decimal-to-fraction' })
    assert.doesNotMatch(html, /data-solution="mixed"|gemischte Zahl/)
    assert.deepEqual(fractions(html), expected)
  }
})

test('echte Brüche und ganze Zahlen behalten in beiden Richtungen einen einzelnen Lösungsweg', () => {
  for (const direction of ['fraction-to-decimal', 'decimal-to-fraction']) {
    for (const html of [render(3, 4, '0,75', { direction }), render(8, 4, '2', { direction })]) {
    assert.doesNotMatch(html, /data-solution="mixed"/)
    }
  }
})

test('alle erzeugten Lösungswege enthalten wertgleiche Brüche und enden korrekt', () => {
  const problems = generateDezimalbruecheProblems(200)
  for (const problem of problems) {
    const html = renderToStaticMarkup(renderSolution(problem))
    assert.doesNotMatch(html, /undefined|NaN|Infinity/)
    const directHtml = html.includes('data-solution="direct"') ? html.split('data-solution="direct"')[1] : html
    const steps = fractions(directHtml).map(value => value.split('/').map(Number))
    if (!problem.isRecurring) {
      for (const [n, d] of steps) assert.equal(n * problem.denominator, problem.numerator * d)
      if (problem.direction === 'fraction-to-decimal' && problem.numerator % problem.denominator !== 0) {
        assert.ok(steps.length <= 3)
        assert.ok([10, 100, 1000].includes(steps.at(-1)[1]))
      }
    }
    if (problem.direction === 'decimal-to-fraction') {
      assert.equal(steps.at(-1).join('/'), problem.correct)
    }
  }
})
