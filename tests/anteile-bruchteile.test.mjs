import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { generateProblems, getAnteileVariantPool } from '../src/problems/generators.js'
import { validateAnteilFraction } from '../src/problems/validate.js'
import { getAnteileBruchteileSolution } from '../src/problems/anteileSolution.js'

const NO_CONVERSIONS = {
  anteileUmrechnungZeit: false,
  anteileUmrechnungHohlmasse: false,
  anteileUmrechnungLaenge: false,
  anteileUmrechnungGeld: false,
  anteileUmrechnungGewicht: false,
  anteileUmrechnungFlaeche: false,
}

test('Anteile und Bruchteile steht als erste Kategorie der 6. Klasse bereit', () => {
  const categories = JSON.parse(readFileSync(new URL('../shared/categories.json', import.meta.url), 'utf8'))
  const firstSixthGrade = Object.entries(categories).find(([, config]) => config.grade === '6. Klasse')
  assert.equal(firstSixthGrade[0], 'anteile-bruchteile')
  assert.deepEqual(categories['anteile-bruchteile'].settings.map(setting => setting.key), [
    'anteileBruchteil', 'anteileAnteil', 'anteileGanzes',
    'anteileUmrechnungGeld', 'anteileUmrechnungLaenge', 'anteileUmrechnungGewicht',
    'anteileUmrechnungHohlmasse', 'anteileUmrechnungZeit', 'anteileUmrechnungFlaeche',
    'anteileUmrechnungen',
  ])
  const conversionSettings = categories['anteile-bruchteile'].settings.filter(setting => setting.group === 'conversions')
  assert.ok(conversionSettings.every(setting => setting.defaultValue === true))
  assert.deepEqual(conversionSettings.map(setting => setting.label), ['Geld', 'Längen', 'Gewicht', 'Hohlmaße', 'Zeit', 'Flächen'])
  assert.equal(categories['anteile-bruchteile'].settings.at(-1).defaultValue, false)
  assert.equal(categories['anteile-bruchteile'].settings.at(-1).hidden, true)
})

test('alle drei Aufgabentypen liefern ganzzahlige, mathematisch stimmige Größen', () => {
  const problems = generateProblems(500, 'anteile-bruchteile', NO_CONVERSIONS)
  for (const problem of problems) {
    assert.equal(problem.whole * problem.numerator, problem.part * problem.denominator)
    assert.ok(problem.unit)
    assert.equal(problem.correct, problem.variant === 'anteil' ? `${problem.numerator}/${problem.denominator}` : problem.variant === 'bruchteile' ? problem.part : problem.whole)
    if (problem.variant === 'ganzes') assert.equal(problem.prompt, 'Berechne das Ganze.')
  }
})

test('Anteile werden im zufälligen Mix geringer gewichtet', () => {
  assert.deepEqual(getAnteileVariantPool(), ['bruchteile', 'bruchteile', 'anteil', 'ganzes', 'ganzes'])
  const problems = generateProblems(10000, 'anteile-bruchteile', NO_CONVERSIONS)
  const plainAnteilRatio = problems.filter(problem => problem.variant === 'anteil').length / problems.length
  assert.ok(plainAnteilRatio > 0.09 && plainAnteilRatio < 0.15)
})

test('schwierigere Nenner und runde Ganze kommen im Aufgabenmix vor', () => {
  const problems = generateProblems(2000, 'anteile-bruchteile', NO_CONVERSIONS)
  assert.ok(problems.some(problem => problem.denominator >= 9 && problem.denominator <= 20))
  assert.ok(problems.some(problem => problem.whole >= 100 && problem.whole % 100 === 0))
  assert.ok(problems.every(problem => problem.whole * problem.numerator === problem.part * problem.denominator))
})

test('jeder Aufgabentyp kann einzeln ausgewählt werden', () => {
  const cases = [
    [{ anteileBruchteil: true, anteileAnteil: false, anteileGanzes: false }, 'bruchteile'],
    [{ anteileBruchteil: false, anteileAnteil: true, anteileGanzes: false }, 'anteil'],
    [{ anteileBruchteil: false, anteileAnteil: false, anteileGanzes: true }, 'ganzes'],
  ]
  for (const [settings, expected] of cases) {
    assert.ok(generateProblems(30, 'anteile-bruchteile', settings).every(problem => problem.variant === expected))
  }
})

test('die Arbeitsanweisung für den Anteil wiederholt nicht die Zahlenangaben', () => {
  const plainProblems = generateProblems(100, 'anteile-bruchteile', {
    anteileBruchteil: false,
    anteileAnteil: true,
    anteileGanzes: false,
    ...NO_CONVERSIONS,
  })
  const conversionProblems = generateProblems(100, 'anteile-bruchteile', {
    anteileBruchteil: false,
    anteileAnteil: true,
    anteileGanzes: false,
    anteileUmrechnungen: true,
  }).filter(problem => problem.isConversion)

  assert.ok(plainProblems.every(problem => problem.prompt === 'Bestimme den Anteil.'))
  assert.ok(conversionProblems.length > 0)
  assert.ok(conversionProblems.every(problem => problem.prompt === 'Bestimme den Anteil.'))
})

test('alle Größenumrechnungen sind standardmäßig mit 50 Prozent beigemischt', () => {
  const problems = generateProblems(4000, 'anteile-bruchteile')
  const eligible = problems.filter(problem => problem.variant !== 'ganzes')
  const conversions = eligible.filter(problem => problem.isConversion)
  const generatedPairs = new Set(conversions.map(problem => `${problem.wholeUnit}>${problem.partUnit}`))
  assert.ok(conversions.length / eligible.length > 0.45 && conversions.length / eligible.length < 0.55)
  for (const pair of ['h>min', 'l>ml', 'm>cm', '€>ct', 'kg>g', 'm²>dm²']) assert.ok(generatedPairs.has(pair))
})

test('aktivierte Größenumrechnungen kommen nur bei Bruchteil und Anteil vor', () => {
  const problems = generateProblems(2000, 'anteile-bruchteile', { anteileUmrechnungen: true })
  const conversions = problems.filter(problem => problem.isConversion)
  assert.ok(conversions.length > 500 && conversions.length < 700)
  assert.deepEqual(new Set(conversions.map(problem => problem.variant)), new Set(['bruchteile', 'anteil']))
  assert.ok(problems.filter(problem => problem.variant === 'ganzes').every(problem => !problem.isConversion))
  assert.ok(conversions.every(problem => problem.wholeUnit !== problem.partUnit))
  assert.ok(conversions.filter(problem => problem.variant !== 'anteil').every(problem => Number.isInteger(problem.correct)))
  assert.ok(conversions.some(problem => problem.wholeUnit === 'h' && problem.partUnit === 'min'))
  assert.ok(conversions.some(problem => problem.wholeUnit === 'l' && problem.partUnit === 'ml'))
})

test('der Umrechnungspool enthält Zeit, Hohlmaße, Längen, Geld, Gewicht und Flächen', () => {
  const conversions = generateProblems(15000, 'anteile-bruchteile', { anteileUmrechnungen: true })
    .filter(problem => problem.isConversion)
  const generatedPairs = new Set(conversions.map(problem => `${problem.wholeUnit}>${problem.partUnit}`))
  const expectedPairs = [
    'min>s', 'h>min', 'd>h',
    'l>ml',
    'cm>mm', 'dm>cm', 'm>dm', 'm>cm', 'm>mm', 'km>m',
    '€>ct', 'kg>g', 't>kg',
    'cm²>mm²', 'dm²>cm²', 'm²>dm²', 'a>m²', 'ha>a', 'km²>ha',
  ]
  for (const pair of expectedPairs) assert.ok(generatedPairs.has(pair), `${pair} fehlt im Umrechnungspool`)
  assert.ok(conversions.every(problem => Number.isInteger(problem.part)))
})

test('einzeln aktivierte Größen beschränken den Umrechnungspool', () => {
  const cases = {
    anteileUmrechnungZeit: ['min>s', 'h>min', 'd>h'],
    anteileUmrechnungHohlmasse: ['l>ml'],
    anteileUmrechnungLaenge: ['cm>mm', 'dm>cm', 'm>dm', 'm>cm', 'm>mm', 'km>m'],
    anteileUmrechnungGeld: ['€>ct'],
    anteileUmrechnungGewicht: ['kg>g', 't>kg'],
    anteileUmrechnungFlaeche: ['cm²>mm²', 'dm²>cm²', 'm²>dm²', 'a>m²', 'ha>a', 'km²>ha'],
  }

  for (const [setting, expectedPairs] of Object.entries(cases)) {
    const problems = generateProblems(3000, 'anteile-bruchteile', {
      anteileBruchteil: true,
      anteileAnteil: false,
      anteileGanzes: false,
      ...NO_CONVERSIONS,
      [setting]: true,
    })
    const conversions = problems.filter(problem => problem.isConversion)
    const generatedPairs = new Set(conversions.map(problem => `${problem.wholeUnit}>${problem.partUnit}`))
    assert.ok(conversions.length > 1200 && conversions.length < 1800, `${setting} hat keine 50-%-Mischung`)
    assert.deepEqual([...generatedPairs].sort(), [...expectedPairs].sort())
  }
})

test('alle Umrechnungsbeispiele aus der Vorlage können erzeugt werden', () => {
  const conversions = generateProblems(40000, 'anteile-bruchteile', {
    anteileBruchteil: true,
    anteileAnteil: false,
    anteileGanzes: false,
    anteileUmrechnungen: true,
  }).filter(problem => problem.isConversion)
  const generatedTasks = new Set(conversions.map(problem => `${problem.numerator}/${problem.denominator} ${problem.wholeUnit}>${problem.partUnit}`))
  const expectedTasks = [
    '3/8 kg>g', '3/4 kg>g', '7/25 kg>g',
    '1/4 m>cm', '13/100 m>cm', '3/10 m>cm',
    '5/6 d>h', '3/4 d>h', '17/24 d>h',
    '11/20 €>ct', '7/50 €>ct', '1/2 €>ct',
  ]
  for (const task of expectedTasks) assert.ok(generatedTasks.has(task), `${task} wurde nicht erzeugt`)
})

test('Ganzes-Aufgaben bleiben auch bei aktivierten Umrechnungen in derselben Einheit', () => {
  const problems = generateProblems(500, 'anteile-bruchteile', {
    anteileBruchteil: false,
    anteileAnteil: false,
    anteileGanzes: true,
    anteileUmrechnungen: true,
  })
  assert.ok(problems.every(problem => problem.variant === 'ganzes' && !problem.isConversion))
})

test('gleichwertige Anteile werden auch ungekürzt akzeptiert', () => {
  const problem = { numerator: 3, denominator: 5 }
  assert.equal(validateAnteilFraction('3/5', problem).isCorrect, true)
  assert.equal(validateAnteilFraction('6/10', problem).isCorrect, true)
  assert.equal(validateAnteilFraction('12/20', problem).isCorrect, true)
  assert.equal(validateAnteilFraction('4/5', problem).isCorrect, false)
  assert.equal(validateAnteilFraction('3/0', problem).valid, false)
})

test('Lösungswege erklären Bruchteil, Ganzes und die Umrechnung beim Anteil', () => {
  assert.deepEqual(getAnteileBruchteileSolution({
    variant: 'bruchteile', isConversion: true, numerator: 3, denominator: 5,
    whole: 1, part: 600, wholeUnit: 'km', partUnit: 'm', answerUnit: 'm',
  }), {
    kind: 'bruchteile', total: 1000, totalUnit: 'm', numerator: 3,
    denominator: 5, result: 600, resultUnit: 'm',
  })

  assert.deepEqual(getAnteileBruchteileSolution({
    variant: 'ganzes', numerator: 2, denominator: 7, whole: 49, part: 14, unit: '€',
  }), {
    kind: 'ganzes', denominator: 7, onePart: 7, whole: 49, unit: '€',
  })

  assert.deepEqual(getAnteileBruchteileSolution({
    variant: 'anteil', isConversion: true, numerator: 1, denominator: 16,
    whole: 4, part: 25, wholeUnit: 'km²', partUnit: 'ha', answerUnit: '',
  }), {
    kind: 'anteil', part: 25, partUnit: 'ha', whole: 4, wholeUnit: 'km²',
    wholeInPartUnit: 400, numerator: 1, denominator: 16, isConversion: true,
  })
})
