export const CATEGORIES = {
  einmaleins: {
    label: 'Einmaleins',
    grade: '5. Klasse',
    problemCount: 50,
    durationMinutes: 2,
    performanceScore: [20, 40],
    settings: [
      {
        key: 'einmaleins_base',
        label: 'Einmaleins 1-10',
        defaultValue: true,
        disabled: true
      },
      {
        key: 'includeSquares11_20',
        label: 'Quadratzahlen 11-20 (z.B. 11², 15², 20²)',
        defaultValue: false
      },
      {
        key: 'includeSquares21_25',
        label: 'Quadratzahlen 21-25 (z.B. 21², 23², 25²)',
        defaultValue: false
      }
    ],
    performance: {
      default: [2.2, 5]
    }
  },
  'schriftlich-add': {
    label: 'Schriftl. Addition',
    homepageLabel: '+',
    homepageGroup: 'schriftlich',
    homepageGroupLabel: 'Schriftlich rechnen',
    grade: '5. Klasse',
    problemCount: 3,
    durationMinutes: 5,
    settings: [],
    performanceScore: [3, 8],
    performance: {
      default: [20, 55]
    }
  },
  'schriftlich-subtract': {
    label: 'Schriftl. Subtraktion',
    homepageLabel: '−',
    homepageGroup: 'schriftlich',
    homepageGroupLabel: 'Schriftlich rechnen',
    grade: '5. Klasse',
    problemCount: 3,
    durationMinutes: 5,
    settings: [],
    performanceScore: [3, 8],
    performance: {
      default: [20, 55]
    }
  },
  'schriftlich-multiply': {
    label: 'Schriftl. Multiplikation',
    homepageLabel: '·',
    homepageGroup: 'schriftlich',
    homepageGroupLabel: 'Schriftlich rechnen',
    grade: '5. Klasse',
    problemCount: 3,
    durationMinutes: 5,
    settings: [],
    performanceScore: [3, 8],
    performance: {
      default: [60, 200]
    }
  },
  negative: {
    label: 'Rechnen mit negativen Zahlen',
    grade: '5. Klasse',
    problemCount: 20,
    durationMinutes: 3,
    settings: [
      { key: 'negativeAdd', label: 'Addition', defaultValue: true },
      { key: 'negativeSubtract', label: 'Subtraktion', defaultValue: true },
      { key: 'negativeMultiply', label: 'Multiplikation', defaultValue: false },
      { key: 'negativeDivide', label: 'Division', defaultValue: false },
      { key: 'negativeExplicitPlus', label: 'Vorzeichen bei positiven Zahlen anzeigen (z.B. (+2))', defaultValue: true }
    ],
    performanceScore: [10, 25],
    performance: {
      default: [8.0, 18.0]
    }
  },
  primfaktorisierung: {
    label: 'Primfaktorisierung',
    grade: '5. Klasse',
    problemCount: 10,
    durationMinutes: 3,
    settings: [],
    performanceScore: [10, 22],
    performance: {
      easy: [10, 30],
      hard: [20, 60],
      default: [20, 60]
    }
  },
  binomische: {
    label: 'Binomische Formeln',
    grade: '7. Klasse',
    problemCount: 10,
    durationMinutes: 5,
    settings: [
      { key: 'binomische_simple', label: 'Einfach (Ganzzahlen)', defaultValue: true },
      { key: 'binomische_hard', label: 'Schwer (Dezimalzahlen)', defaultValue: true }
    ],
    performanceScore: [3, 8],
    performance: {
      simple: [15.0, 30.0],
      hard: [20.0, 40.0],
      default: [20.0, 40.0]
    }
  }
}

export const getCategoryLabel = (category) => CATEGORIES[category]?.label || 'Einmaleins'

export const getCategoryDuration = (category) => (CATEGORIES[category]?.durationMinutes ?? 5) * 60

export const getCategoryPerformanceScore = (category) => CATEGORIES[category]?.performanceScore || [10, 30]

export const getCategoryProblemCount = (category) => CATEGORIES[category]?.problemCount || CATEGORIES.einmaleins.problemCount || 50

export const CATEGORY_GRADE_ORDER = ['5. Klasse', '7. Klasse']

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

