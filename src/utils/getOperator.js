export function getOperator(problem) {
  if (problem.type === 'add' || problem.operation === 'add') return '+'
  if (problem.type === 'subtract' || problem.operation === 'subtract') return '−'
  if (problem.type === 'divide') return '∶'
  if (problem.type === 'multiplication' || problem.operation === 'multiply') return '·'
  return '·'
}
