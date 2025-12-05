// Centralized difficulty multipliers used across performance and penalties
// Performance bar ranges per problem (seconds): [left, right]
export const PERFORMANCE_RANGES = {
  einmaleins: { perProblem: [2.2, 6] },
  primfaktorisierung: { perProblem: [20, 60] },
  schriftlich_add: { perProblem: [20, 55] },
  schriftlich_subtract: { perProblem: [20, 55] },
  schriftlich_multiply: { perProblem: [60, 200] },
  // Fallback
  schriftlich: { perProblem: [6.0, 12.0] }
}

export const getProblemRange = (problem) => {
  let key = problem.type
  if (problem.type === 'schriftlich' && problem.operation) {
    key = `${problem.type}_${problem.operation}`
  }
  // Fallback to type if specific key not found
  if (!PERFORMANCE_RANGES[key]) {
    key = problem.type
  }
  // Fallback to einmaleins if still not found
  const cfg = PERFORMANCE_RANGES[key] || PERFORMANCE_RANGES.einmaleins
  return cfg.perProblem
}

export const getProblemMaxTime = (problem) => {
  const [, max] = getProblemRange(problem)
  return max
}

