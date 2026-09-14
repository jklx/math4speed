const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAssignmentPolicy } = require('./assignmentPolicy');
const fs = require('node:fs');
const path = require('node:path');

const categories = require('../shared/categories.json');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/categories.js'), 'utf8')
  .replace(/import CATEGORIES_DATA from .*;/, `const CATEGORIES_DATA = ${JSON.stringify(categories)};`);
const helpers = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('either goal validates both conditions and preserves them', () => {
  const goal = { type: 'either', attempts: 3, rating: 4 };
  assert.deepEqual(validateAssignmentPolicy({ goal }).goal, goal);
  for (const invalid of [{ ...goal, attempts: 0 }, { ...goal, rating: 6 }, { type: 'either', value: 3 }, { ...goal, rating: '4' }]) {
    assert.throws(() => validateAssignmentPolicy({ goal: invalid }));
  }
});

test('either goal is fulfilled by either branch, including both, and recomputed after deletion', async () => {
  const { getAssignmentGoalProgress } = await helpers;
  const assignment = { category: 'einmaleins', policy: { goal: { type: 'either', attempts: 3, rating: 4 }, ratingThresholds: [5, 10, 15, 20] } };
  const low = { correctCount: 1 }, high = { correctCount: 15 };
  for (const [attempts, achieved] of [[[], false], [[low, low], false], [[low, low, low], true], [[high], true], [[low, low, high], true]]) {
    const result = getAssignmentGoalProgress(assignment, attempts);
    assert.equal(result.achieved, achieved);
    assert.equal(result.attemptCount, attempts.length);
  }
  assert.equal(getAssignmentGoalProgress(assignment, [low, high]).achieved, true);
  assert.equal(getAssignmentGoalProgress(assignment, [low]).achieved, false);
});

test('optional goals and strictly ascending rating boundaries are validated', () => {
  assert.deepEqual(validateAssignmentPolicy(), { goal: null, ratingThresholds: null });
  for (const type of ['attempts', 'rating']) assert.equal(validateAssignmentPolicy({ goal: { type, value: 3 } }).goal.value, 3);
  for (const goal of [{ type: 'rating', value: 6 }, { type: 'attempts', value: 0 }, { type: 'attempts', value: 1.5 }, { type: 'unknown', value: 3 }]) {
    assert.throws(() => validateAssignmentPolicy({ goal }));
  }
  for (const ratingThresholds of [[1, 2, 2, 4], [0, 2, 3, 4], [4, 3, 2, 1], [1, 2, 3], [1, 2, 3, '4']]) {
    assert.throws(() => validateAssignmentPolicy({ ratingThresholds }));
  }
  assert.deepEqual(validateAssignmentPolicy({ ratingThresholds: [5, 10, 15, 20] }).ratingThresholds, [5, 10, 15, 20]);
});

test('rating goal uses the best attempt, custom boundaries and no fictitious star before training', async () => {
  const { getAssignmentGoalProgress, getCategoryAttemptRating } = await helpers;
  const assignment = { category: 'einmaleins', policy: { goal: { type: 'rating', value: 4 }, ratingThresholds: [5, 10, 15, 20] } };
  assert.equal(getAssignmentGoalProgress(assignment, []).current, 0);
  assert.equal(getAssignmentGoalProgress(assignment, [{ correctCount: 14 }]).achieved, false);
  assert.equal(getAssignmentGoalProgress(assignment, [{ correctCount: 15 }, { correctCount: 1 }]).achieved, true);
  assert.equal(getCategoryAttemptRating('einmaleins', 15).stars, 1);
  assert.equal(getCategoryAttemptRating('einmaleins', 15, assignment.policy.ratingThresholds).stars, 4);
});

test('attempt goal updates after deletion; existing assignments have no goal', async () => {
  const { getAssignmentGoalProgress } = await helpers;
  const assignment = { category: 'einmaleins', policy: { goal: { type: 'attempts', value: 2 } } };
  assert.equal(getAssignmentGoalProgress(assignment, [{}, {}]).achieved, true);
  assert.equal(getAssignmentGoalProgress(assignment, [{}]).achieved, false);
  assert.equal(getAssignmentGoalProgress({ category: 'einmaleins' }, []), null);
});
