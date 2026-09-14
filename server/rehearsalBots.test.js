const test = require('node:test');
const assert = require('node:assert/strict');
const { answerFor, PROFILES } = require('./rehearsalBots');
const categories = require('../shared/categories.json');

test('automatic pupils produce readable correct and deliberately different wrong answers for every category', async () => {
  const { generateProblems } = await import('../src/problems/generators.js');
  for (const [category, config] of Object.entries(categories)) {
    const settings = Object.fromEntries((config.settings || []).map(option => [option.key, option.defaultValue]));
    const problems = generateProblems(10, category, settings);
    assert.ok(problems.length, category);
    for (const problem of problems) {
      assert.notEqual(problem.correct, undefined, category);
      for (const [profile, behaviour] of Object.entries(PROFILES)) {
        const right = answerFor(problem, 0, profile);
        const wrong = answerFor(problem, behaviour.errorEvery - 1, profile);
        assert.equal(right.user, problem.correct, category);
        assert.notEqual(wrong.user, problem.correct, category);
        assert.equal(wrong.isCorrect, false);
        assert.ok(typeof wrong.user === 'number' || typeof wrong.user === 'string');
      }
    }
  }
});
