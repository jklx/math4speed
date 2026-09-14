import CATEGORIES_DATA from '../../shared/categories.json';

export const CATEGORIES = CATEGORIES_DATA;

export const getCategoryLabel = (category) => CATEGORIES[category]?.label || 'Einmaleins'

export const getCategoryDuration = (category) => (CATEGORIES[category]?.durationMinutes ?? 5) * 60

export const getCategoryPerformanceScore = (category) => CATEGORIES[category]?.performanceScore || [10, 30]

// Minimum correct answers for 2, 3, 4 and 5 stars respectively.
export const getCategoryRatingThresholds = category => CATEGORIES[category]?.attemptRatingThresholds || [10, 17, 24, 30]

export const getCategoryAttemptRating = (category, correctCount, overrides = null) => {
  const thresholds = overrides || getCategoryRatingThresholds(category)
  const labels = ['Weiterüben', 'OK', 'Gut', 'Super', 'Hervorragend']
  const stars = 1 + thresholds.filter(minimum => correctCount >= minimum).length
  return { stars, label: labels[stars - 1] }
}

export const getAssignmentGoalProgress = (assignment, attempts) => {
  const goal = assignment.policy?.goal
  if (!goal) return null
  if (goal.type === 'either') {
    const bestRating = Math.max(0, ...attempts.map(attempt => getCategoryAttemptRating(assignment.category, attempt.correctCount, assignment.policy?.ratingThresholds).stars))
    return { type: 'either', attemptCount: attempts.length, bestRating,
      attemptsTarget: goal.attempts, ratingTarget: goal.rating,
      achieved: attempts.length >= goal.attempts || bestRating >= goal.rating }
  }
  const current = goal.type === 'attempts' ? attempts.length : Math.max(0,
    ...attempts.map(attempt => getCategoryAttemptRating(assignment.category, attempt.correctCount, assignment.policy?.ratingThresholds).stars))
  return { current, target: goal.value, achieved: current >= goal.value, type: goal.type }
}

export const getCategoryProblemCount = (category) => CATEGORIES[category]?.problemCount || CATEGORIES.einmaleins.problemCount || 50

export const CATEGORY_GRADE_ORDER = ['5. Klasse', '6. Klasse', '7. Klasse']

export const getDefaultSettings = () => {
  const settings = {}
  Object.values(CATEGORIES).forEach(cat => {
    (cat.settings || []).forEach(setting => {
      settings[setting.key] = setting.defaultValue
    })
  })
  return settings
}

export const getProblemRange = (problem) => {
  const catConfig = problem.type === 'schriftlich' && problem.operation === 'divide'
    ? CATEGORIES['schriftlich-divide']
    : CATEGORIES[problem.type]
  if (!catConfig) return CATEGORIES.einmaleins.performance.default
  if (problem.type === 'primfaktorisierung') {
    if (problem.number <= 100 && catConfig.performance.easy) {
      return catConfig.performance.easy
    }
    if (problem.number > 100 && catConfig.performance.hard) {
      return catConfig.performance.hard
    }
  }

  if (problem.type === 'binomische') {
    if (problem.variant === 'simple' && catConfig.performance.simple) {
      return catConfig.performance.simple
    }
    if (problem.variant === 'hard' && catConfig.performance.hard) {
      return catConfig.performance.hard
    }
  }

  return catConfig.performance.default || CATEGORIES.einmaleins.performance.default
}

export const getProblemMaxTime = (problem) => {
  const [, max] = getProblemRange(problem)
  return max
}

