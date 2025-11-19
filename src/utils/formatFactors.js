export function formatFactors(value = '') {
  const tokens = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!tokens.length) return '—'
  return tokens.join(' ⋅ ')
}
