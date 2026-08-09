import CATEGORIES_DATA from '../../shared/categories.json';

export const CATEGORIES = CATEGORIES_DATA;

export const getCategoryLabel = (category) => CATEGORIES[category]?.label || 'Einmaleins'

export const getCategoryDuration = (category) => (CATEGORIES[category]?.durationMinutes ?? 5) * 60

export const getCategoryPerformanceScore = (category) => CATEGORIES[category]?.performanceScore || [10, 30]

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
  const catConfig = CATEGORIES[problem.type]
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

