export const CATEGORIES = {
  einmaleins: {
    label: 'Einmaleins',
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
  schriftlich: {
    label: 'Schriftlich rechnen',
    settings: [
      { key: 'schriftlichAdd', label: 'Addition', defaultValue: true },
      { key: 'schriftlichSubtract', label: 'Subtraktion', defaultValue: true },
      { key: 'schriftlichMultiply', label: 'Multiplikation', defaultValue: true }
    ],
    performance: {
      add: [20, 55],
      subtract: [20, 55],
      multiply: [60, 200],
      default: [6.0, 12.0]
    }
  },
  primfaktorisierung: {
    label: 'Primfaktorisierung',
    settings: [
      { key: 'primfaktorisierung_easy', label: 'Zahlen bis 100', defaultValue: true },
      { key: 'primfaktorisierung_hard', label: 'Zahlen über 100', defaultValue: true }
    ],
    performance: {
      easy: [10, 30],
      hard: [20, 60],
      default: [20, 60]
    }
  },
  negative: {
    label: 'Rechnen mit negativen Zahlen',
    settings: [
      { key: 'negativeAdd', label: 'Addition', defaultValue: true },
      { key: 'negativeSubtract', label: 'Subtraktion', defaultValue: true },
      { key: 'negativeMultiply', label: 'Multiplikation', defaultValue: true },
      { key: 'negativeDivide', label: 'Division', defaultValue: true },
      { key: 'negativeExplicitPlus', label: 'Vorzeichen bei positiven Zahlen anzeigen (z.B. (+2))', defaultValue: false }
    ],
    performance: {
      default: [3.0, 8.0]
    }
  },
  binomische: {
    label: 'Binomische Formeln',
    settings: [
      { key: 'binomische_simple', label: 'Einfach (Ganzzahlen)', defaultValue: true },
      { key: 'binomische_hard', label: 'Schwer (Dezimalzahlen)', defaultValue: true }
    ],
    performance: {
      default: [15.0, 40.0]
    }
  }
}

export const getCategoryLabel = (category) => CATEGORIES[category]?.label || 'Einmaleins'

export const getDefaultSettings = (category) => {
  const settings = {}
  // Initialize all possible keys across all categories to avoid undefined issues when switching
  Object.values(CATEGORIES).forEach(cat => {
    cat.settings.forEach(setting => {
      settings[setting.key] = setting.defaultValue
    })
  })
  return settings
}

export const getProblemRange = (problem) => {
  const catConfig = CATEGORIES[problem.type]
  if (!catConfig) return CATEGORIES.einmaleins.performance.default

  if (problem.type === 'schriftlich' && problem.operation) {
    if (catConfig.performance[problem.operation]) {
      return catConfig.performance[problem.operation]
    }
  }

  if (problem.type === 'primfaktorisierung') {
    if (problem.number <= 100 && catConfig.performance.easy) {
      return catConfig.performance.easy
    }
    if (problem.number > 100 && catConfig.performance.hard) {
      return catConfig.performance.hard
    }
  }

  return catConfig.performance.default || CATEGORIES.einmaleins.performance.default
}

export const getProblemMaxTime = (problem) => {
  const [, max] = getProblemRange(problem)
  return max
}

