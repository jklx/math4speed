export function getNegativeDisplayParts(a, b, operator, explicitPlus = false) {
  if (!explicitPlus && b < 0 && (operator === '+' || operator === '−')) {
    return { a, b: -b, operator: operator === '+' ? '−' : '+' }
  }
  return { a, b, operator }
}

export function formatNegativeExpression(a, b, operator, explicitPlus = false) {
  const parts = getNegativeDisplayParts(a, b, operator, explicitPlus)
  const operand = (number, second) => {
    if (explicitPlus) return number < 0 ? `(${number})` : `(+${number})`
    return second && number < 0 ? `(${number})` : String(number)
  }
  return `${operand(parts.a, false)} ${parts.operator} ${operand(parts.b, true)}`
}
