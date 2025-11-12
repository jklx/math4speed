export const CATEGORY_LABELS = {
  einmaleins: 'Einmaleins',
  schriftlich: 'Schriftlich rechnen',
  primfaktorisierung: 'Primfaktorisierung'
}

export const getCategoryLabel = (category) => CATEGORY_LABELS[category] || 'Einmaleins'
