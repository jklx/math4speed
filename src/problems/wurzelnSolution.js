import { normalizePowers } from '../utils/powers.js'

const root = value => ({ root: String(value) })
const step = (text, expression) => ({ text, expression })
const monomial = text => {
  const match = normalizePowers(text).match(/^(\d+)x(?:\^(\d+))?$/)
  return match ? { coefficient: Number(match[1]), exponent: Number(match[2] ?? 1) } : null
}
const xPower = exponent => exponent === 1 ? 'x' : `x^${exponent}`
function extract(number) {
  let factor = Math.floor(Math.sqrt(number))
  while (number % (factor * factor) !== 0) factor--
  return { factor, remainder: number / (factor * factor) }
}
function extractionSteps(number) {
  const { factor, remainder } = extract(number)
  return [
    step('Zerlege die Zahl in eine Quadratzahl und den übrigen Faktor.', root(`${factor * factor} · ${remainder}`)),
    step('Ziehe die Wurzel aus der Quadratzahl. Der übrige Faktor bleibt unter der Wurzel.', [root(factor * factor), ' · ', root(remainder), ' = ', String(factor), root(remainder)]),
  ]
}

// Derive explanations from the task itself, so stored attempts need no extra fields.
export function getWurzelnSolutionSteps(problem) {
  const nodes = problem.nodes
  if (!nodes) return []
  let steps = []
  if (nodes.root) {
    const variable = monomial(nodes.root)
    const squared = nodes.root.match(/^\((-?[\d,]+)\)²$/)
    const arithmetic = nodes.root.match(/^(\d+) ([−+]) (\d+)$/)
    if (variable) {
      steps = [
        step('Zerlege die Wurzel in den Zahlenfaktor und die Potenz.', [root(variable.coefficient), ' · ', root(`x^${variable.exponent}`)]),
        step(`Ziehe die Zahlenwurzel und halbiere den Exponenten: ${variable.exponent} : 2 = ${variable.exponent / 2}. Weil x > 0 ist, brauchst du keinen Betrag.`, `${Math.sqrt(variable.coefficient)}${xPower(variable.exponent / 2)}`),
      ]
    } else if (squared) {
      steps = [step('Die Wurzel aus einem Quadrat ist der Betrag der ursprünglichen Zahl. Das Ergebnis ist also nicht negativ.', `|${squared[1]}| = ${problem.correct}`)]
    } else if (arithmetic) {
      const sum = arithmetic[2] === '+'
      const value = Number(arithmetic[1]) + (sum ? 1 : -1) * Number(arithmetic[3])
      steps = [step(`Rechne zuerst die ${sum ? 'Summe' : 'Differenz'} unter der Wurzel aus.`, root(value)), step('Bestimme die nicht negative Zahl, deren Quadrat diese Zahl ergibt.', `${problem.correct}² = ${value}`)]
    } else {
      steps = extractionSteps(Number(nodes.root))
    }
  } else if (nodes.base) {
    steps = [step('Quadrieren und Wurzelziehen heben sich auf. Übrig bleibt der gesamte Ausdruck unter der Wurzel.', nodes.base.root)]
  } else if (nodes.numerator) {
    const numerator = monomial(nodes.numerator.root)
    const denominator = monomial(nodes.denominator.root)
    if (numerator && denominator) {
      const coefficient = numerator.coefficient / denominator.coefficient
      const exponent = numerator.exponent - denominator.exponent
      steps = [
        step('Fasse die Wurzeln zu einer Wurzel über dem Quotienten zusammen.', root(`(${nodes.numerator.root}) : (${nodes.denominator.root})`)),
        step(`Teile die Zahlenfaktoren und subtrahiere die Exponenten: ${numerator.exponent} − ${denominator.exponent} = ${exponent}.`, root(`${coefficient}${xPower(exponent)}`)),
        step(`Ziehe die Zahlenwurzel und halbiere den Exponenten: ${exponent} : 2 = ${exponent / 2}. Es gilt x > 0.`, `${Math.sqrt(coefficient)}${xPower(exponent / 2)}`),
      ]
    } else {
      const value = Number(nodes.numerator.root) / Number(nodes.denominator.root)
      steps = [step('Fasse die Wurzeln zu einer Wurzel über dem Quotienten zusammen.', root(`${nodes.numerator.root} : ${nodes.denominator.root}`)), step('Teile zuerst die Zahlen unter der Wurzel.', root(value))]
    }
  } else if (Array.isArray(nodes) && nodes[1] === ' · ') {
    const variable = monomial(nodes[0].root)
    if (variable) {
      steps = [step('Zwei gleiche Quadratwurzeln ergeben beim Multiplizieren den Ausdruck unter der Wurzel.', nodes[0].root)]
    } else {
      const first = Number(nodes[0].root), second = Number(nodes[2].root)
      const square = second / first
      if (Number.isInteger(Math.sqrt(square))) {
        steps = [
          step('Zerlege die zweite Zahl in den ersten Wurzelfaktor und eine Quadratzahl.', [root(first), ' · ', root(`${first} · ${square}`)]),
          step('Teile die zweite Wurzel in zwei Wurzeln auf.', [root(first), ' · ', root(first), ' · ', root(square)]),
          step('Zwei gleiche Wurzeln ergeben die Zahl unter der Wurzel. Ziehe anschließend die Wurzel aus der Quadratzahl.', [`${first} · `, root(square), ' = ', `${first} · ${Math.sqrt(square)}`]),
        ]
      } else {
        steps = [step('Fasse die Wurzeln zu einer Wurzel über dem Produkt zusammen.', root(`${first} · ${second}`)), step('Multipliziere zuerst die Zahlen unter der Wurzel.', root(first * second))]
      }
    }
  } else if (Array.isArray(nodes)) {
    const partial = nodes.length === 3
    const a = partial ? extract(Number(nodes[0].root)) : { factor: Number(nodes[0]), remainder: Number(nodes[1].root) }
    const b = partial ? extract(Number(nodes[2].root)) : { factor: Number(nodes[3]), remainder: Number(nodes[4].root) }
    const operator = partial ? nodes[1] : nodes[2]
    if (partial) {
      steps.push(step('Zerlege beide Zahlen in eine Quadratzahl und den gleichen übrigen Faktor.', [root(`${a.factor * a.factor} · ${a.remainder}`), operator, root(`${b.factor * b.factor} · ${b.remainder}`)]))
      steps.push(step('Ziehe bei beiden Wurzeln die Quadratzahl heraus.', [String(a.factor), root(a.remainder), operator, String(b.factor), root(b.remainder)]))
    }
    steps.push(step('Die Wurzeln sind gleichartig. Verrechne nur die Faktoren vor der Wurzel.', [`(${a.factor}${operator}${b.factor}) · `, root(a.remainder)]))
  }
  return [...steps, step('Vollständig vereinfachtes Ergebnis:', problem.correct)]
}
