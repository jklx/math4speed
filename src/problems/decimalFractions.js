function greatestCommonDivisor(a, b) {
  while (b) [a, b] = [b, a % b]
  return a
}

export function reduceDecimalFraction(numerator, denominator) {
  const divisor = greatestCommonDivisor(numerator, denominator)
  return `${numerator / divisor}/${denominator / divisor}`
}

// Use the smallest possible decimal denominator. Only cancel factors that
// cannot remain in that denominator, so expansion never undoes a reduction.
export function getDecimalDenominatorSteps(numerator, denominator) {
  for (const target of [10, 100, 1000]) {
    const divisor = denominator / greatestCommonDivisor(denominator, target)
    if (numerator % divisor !== 0) continue
    const steps = []
    const reducedNumerator = numerator / divisor
    const reducedDenominator = denominator / divisor
    if (divisor > 1) steps.push({ numerator: reducedNumerator, denominator: reducedDenominator, factor: divisor, operation: 'reduce' })
    const factor = target / reducedDenominator
    if (factor > 1) steps.push({ numerator: reducedNumerator * factor, denominator: target, factor, operation: 'expand' })
    return steps.length ? steps : [{ numerator, denominator, factor: 1, operation: null }]
  }
}

export function validateDecimalFraction(input, problem) {
  const candidate = String(input ?? '').trim()
  const match = candidate.match(/^(\d+)\s*\/\s*(\d+)$/)
  const numerator = Number(match?.[1])
  const denominator = Number(match?.[2])
  if (!match || !Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
    return { parsed: candidate, isCorrect: false, needsReduction: false }
  }
  const parsed = `${numerator}/${denominator}`
  // Compare reduced forms to avoid rounding during cross multiplication.
  const reduced = reduceDecimalFraction(numerator, denominator)
  const equivalent = reduced === reduceDecimalFraction(problem.numerator, problem.denominator)
  const needsReduction = equivalent && parsed !== reduced
  return { parsed, isCorrect: equivalent && !needsReduction, needsReduction }
}
