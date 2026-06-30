// Central number formatting utilities for German locale
// Exports named functions and also assigns module.exports for CommonJS compatibility

export function formatDecimal(value, opts = {}) {
  if (value === null || typeof value === 'undefined') return String(value)
  const n = Number(value)
  if (!isFinite(n)) return String(value)
  const { minimumFractionDigits = 0, maximumFractionDigits = 2 } = opts
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits, maximumFractionDigits }).format(n)
}

export function formatFractionPercent(p) {
  // format p/100 as German decimal with up to 4 fraction digits, trimming trailing zeros
  const v = Number(p) / 100
  if (!isFinite(v)) return String(p)
  // Use up to 4 fraction digits to preserve cases like 7.5% -> 0,075
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v)
}

export function formatPercent(p, opts = {}) {
  // Formats a percent value (e.g. 37.5 -> "37,5%"), uses formatDecimal for locale
  const n = Number(p)
  if (!isFinite(n)) return String(p)
  const { maximumFractionDigits = 2 } = opts
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits }).format(n) + '%'
}

// CommonJS compatibility for server-side require()
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatDecimal, formatFractionPercent, formatPercent }
}
