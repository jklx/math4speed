export function getAnteileBruchteileSolution(problem) {
  const wholeUnit = problem.wholeUnit || problem.unit
  const partUnit = problem.partUnit || problem.unit
  const answerUnit = problem.answerUnit || problem.unit

  if (problem.variant === 'bruchteile') {
    return {
      kind: 'bruchteile',
      total: problem.isConversion
        ? problem.part * problem.denominator / problem.numerator
        : problem.whole,
      totalUnit: problem.isConversion ? partUnit : wholeUnit,
      numerator: problem.numerator,
      denominator: problem.denominator,
      result: problem.part,
      resultUnit: answerUnit,
    }
  }

  if (problem.variant === 'ganzes') {
    return {
      kind: 'ganzes',
      denominator: problem.denominator,
      onePart: problem.part / problem.numerator,
      whole: problem.whole,
      unit: answerUnit,
    }
  }

  return {
    kind: 'anteil',
    part: problem.part,
    partUnit,
    whole: problem.whole,
    wholeUnit,
    wholeInPartUnit: problem.isConversion
      ? problem.part * problem.denominator / problem.numerator
      : problem.whole,
    numerator: problem.numerator,
    denominator: problem.denominator,
    isConversion: Boolean(problem.isConversion),
  }
}
