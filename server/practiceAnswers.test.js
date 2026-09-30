const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePracticeAnswers } = require('./practiceAnswers');

test('practice answers are split into immutable task and submitted-answer data', () => {
  const result = normalizePracticeAnswers([
    { id: 1, type: 'multiplication', a: 6, b: 7, correct: 42, user: 42, isCorrect: true },
    { id: 2, type: 'negative', a: 3, b: 8, correct: -5, user: '-4', isCorrect: false, equationSnapshot: { resultValue: '-4' } }
  ]);

  assert.equal(result.correctCount, 1);
  assert.equal(result.wrongCount, 1);
  assert.deepEqual(result.answers[0].task, { id: 1, type: 'multiplication', a: 6, b: 7, correct: 42 });
  assert.equal(result.answers[0].submittedAnswer.value, 42);
  assert.deepEqual(result.answers[1].submittedAnswer.equationSnapshot, { resultValue: '-4' });
});

test('practice answers reject malformed entries and oversized lists', () => {
  assert.throws(() => normalizePracticeAnswers([{ type: 'multiplication', user: 6 }]), /Ungültige Antwort/);
  assert.throws(() => normalizePracticeAnswers([{ isCorrect: true }]), /Ungültige Aufgabe/);
  assert.throws(() => normalizePracticeAnswers(Array.from({ length: 1001 }, () => ({ type: 'multiplication', isCorrect: true }))), /Ungültige Aufgabenliste/);
});
