// Centralized difficulty multipliers used across performance and penalties
// Base multipliers per category (relative time requirement)
export const DIFFICULTY_MULTIPLIER = {
  einmaleins: 1.0,
  schriftlich: 6.0,
  primfaktorisierung: 4.0
}

// Optional operation-specific overrides for schriftlich
const OPERATION_MULTIPLIER = {
  add: 5.0,
  subtract: 6.0,
  multiply: 10.0
}

export const getMultiplier = (category = 'einmaleins', operation) => {
  if (category === 'schriftlich' && operation && OPERATION_MULTIPLIER[operation] != null) {
    return OPERATION_MULTIPLIER[operation]
  }
  return DIFFICULTY_MULTIPLIER[category] ?? 1.0
}

export const normalizeSecondsByCategory = (totalSeconds, category = 'einmaleins', operation) => {
  const mult = getMultiplier(category, operation)
  return totalSeconds / mult
}

// Performance bar ranges per problem (seconds): [left, right]
// Total range = per-problem * problemCount
export const PERFORMANCE_RANGES = {
  einmaleins: { perProblem: [1.8, 3.6] },
  // Schriftlich takes significantly longer per task
  schriftlich: { perProblem: [6.0, 12.0] },
  // Primfaktorisierung also longer
  primfaktorisierung: { perProblem: [4.0, 8.0] }
}

export const getPerformanceRange = (category = 'einmaleins', problemCount = 1) => {
  const cfg = PERFORMANCE_RANGES[category] || PERFORMANCE_RANGES.einmaleins
  const [left, right] = cfg.perProblem
  return [left * problemCount, right * problemCount]
}
