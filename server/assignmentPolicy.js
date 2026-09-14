function validateAssignmentPolicy(input = {}) {
  const goal = input?.goal ?? null;
  const ratingThresholds = input?.ratingThresholds ?? null;
  const validCount = (value, maximum) => Number.isInteger(value) && value >= 1 && value <= maximum;
  if (goal !== null && (goal.type === 'either'
      ? !validCount(goal.attempts, 1000) || !validCount(goal.rating, 5)
      : !['attempts', 'rating'].includes(goal.type) || !validCount(goal.value, goal.type === 'rating' ? 5 : 1000))) {
    throw new Error('Bitte ein gültiges Ziel angeben: 1–1000 Versuche oder 1–5 Sterne.');
  }
  if (ratingThresholds !== null && (!Array.isArray(ratingThresholds) || ratingThresholds.length !== 4 ||
      ratingThresholds.some((value, index) => !Number.isInteger(value) || value < 1 || value > 10000 ||
        (index > 0 && value <= ratingThresholds[index - 1])))) {
    throw new Error('Die vier Bewertungsgrenzen müssen positive, aufsteigende ganze Zahlen sein (höchstens 10000).');
  }
  return { goal: goal ? (goal.type === 'either'
    ? { type: 'either', attempts: goal.attempts, rating: goal.rating }
    : { type: goal.type, value: goal.value }) : null, ratingThresholds };
}

module.exports = { validateAssignmentPolicy };
