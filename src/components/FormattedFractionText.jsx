import React from 'react'

const UNICODE_FRACTIONS = {
  '½': ['1', '2'], '⅓': ['1', '3'], '⅔': ['2', '3'], '¼': ['1', '4'], '¾': ['3', '4'],
  '⅕': ['1', '5'], '⅖': ['2', '5'], '⅗': ['3', '5'], '⅘': ['4', '5'], '⅙': ['1', '6'],
  '⅚': ['5', '6'], '⅐': ['1', '7'], '⅛': ['1', '8'], '⅜': ['3', '8'], '⅝': ['5', '8'],
  '⅞': ['7', '8'], '⅑': ['1', '9'], '⅒': ['1', '10'],
}

const FRACTION_TOKEN = /(\d+\s*\/\s*\d+|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒])/g

export default function FormattedFractionText({ children }) {
  if (typeof children !== 'string') return children

  return <>{children.split(FRACTION_TOKEN).filter(Boolean).map((part, index) => {
    const unicodeParts = UNICODE_FRACTIONS[part]
    const slashParts = part.match(/^(\d+)\s*\/\s*(\d+)$/)
    const fraction = unicodeParts || (slashParts ? [slashParts[1], slashParts[2]] : null)
    if (!fraction) return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    return <span className="fraction formatted-fraction" role="img" aria-label={`${fraction[0]} durch ${fraction[1]}`} key={`${part}-${index}`}>
      <span aria-hidden="true">{fraction[0]}</span><span aria-hidden="true">{fraction[1]}</span>
    </span>
  })}</>
}
