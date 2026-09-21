import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { formatTrainingErrorPoints, getTrainingErrorWeight, isSchriftlichCorrectionAttempt } from '../src/utils/trainingErrors.js'

const categories = JSON.parse(readFileSync(new URL('../shared/categories.json', import.meta.url), 'utf8'))

test('die vereinbarten Fehlergrenzen sind je Kategorie hinterlegt', () => {
  assert.equal(categories.einmaleins.maxTrainingErrors, 3)
  assert.equal(categories.negative.maxTrainingErrors, 3)
  assert.equal(categories['anteile-bruchteile'].maxTrainingErrors, 4)

  for (const key of ['schriftlich-add', 'schriftlich-subtract', 'schriftlich-multiply', 'schriftlich-divide']) {
    assert.equal(categories[key].maxTrainingErrors, 3)
  }

  assert.ok(Object.values(categories).every(category => Number.isFinite(category.maxTrainingErrors)))
})

test('schriftliche Fehlversuche zählen als halber Fehler', () => {
  assert.equal(getTrainingErrorWeight({ type: 'schriftlich' }), 0.5)
  assert.equal(getTrainingErrorWeight({ type: 'multiplication' }), 1)
  assert.equal(getTrainingErrorWeight({ type: 'negative' }), 1)
  assert.equal(getTrainingErrorWeight({ type: 'anteile-bruchteile' }), 1)
})

test('nur der zweite Versuch derselben schriftlichen Aufgabe ist eine Verbesserung', () => {
  const problem = { id: 7, type: 'schriftlich' }
  assert.equal(isSchriftlichCorrectionAttempt(problem, null), false)
  assert.equal(isSchriftlichCorrectionAttempt(problem, { id: 7, isCorrect: false }), true)
  assert.equal(isSchriftlichCorrectionAttempt(problem, { id: 7, isCorrect: true }), false)
  assert.equal(isSchriftlichCorrectionAttempt(problem, { id: 8, isCorrect: false }), false)
  assert.equal(isSchriftlichCorrectionAttempt({ id: 7, type: 'negative' }, { id: 7, isCorrect: false }), false)
})

test('halbe Fehler werden mit deutschem Dezimalkomma angezeigt', () => {
  assert.equal(formatTrainingErrorPoints(0), '0')
  assert.equal(formatTrainingErrorPoints(0.5), '0,5')
  assert.equal(formatTrainingErrorPoints(3), '3')
})
