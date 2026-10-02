import { toSuperscript, normalizePowers } from '../utils/powers.js'

const pick = values => values[Math.floor(Math.random() * values.length)]
const integer = (min, max) => min + Math.floor(Math.random() * (max - min + 1))
const root = value => ({ root: String(value) })
const power = (base, exponent) => ({ base, exponent })
const quotient = (numerator, denominator) => ({ numerator, denominator })
const easyExtractionFactors = [2, 3, 5]
const extraExtractionFactors = [4, 6, 7]
function pickExtraction(remainder = null, excludedFactor = null) {
  const extra = (remainder === null || remainder === 2) && Math.random() < 0.2
  return {
    factor: pick((extra ? extraExtractionFactors : easyExtractionFactors).filter(factor => factor !== excludedFactor)),
    remainder: remainder ?? (extra ? 2 : pick([2, 3, 5, 6, 7, 10, 11])),
  }
}
const plain = node => {
  if (Array.isArray(node)) return node.map(plain).join('')
  if (typeof node !== 'object') return String(node)
  if (node.root) return `√(${node.root})`
  if (node.base) return `(${plain(node.base)})^${node.exponent}`
  return `(${plain(node.numerator)})/(${plain(node.denominator)})`
}

export function getWurzelnVariantPool(settings = {}) {
  const groups = ['Teilweise', 'Produkte', 'Quadrate', 'Terme', 'Variablen']
  let enabled = groups.filter(group => settings[`wurzeln${group}`] !== false)
  if (!enabled.length) enabled = groups
  return enabled
}

export function generateWurzelnProblems(count, settings = {}) {
  const pool = getWurzelnVariantPool(settings)
  return Array.from({ length: count }, (_, index) => {
    const variant = pick(pool)
    const n = integer(2, 12)
    const r = pick([2, 3, 5, 6, 7])
    let nodes, correct, variable
    if (variant === 'Teilweise') {
      // Square-free remainders make the expected term fully simplified.
      const { factor, remainder } = pickExtraction()
      nodes = root(factor * factor * remainder)
      correct = `${factor}√${remainder}`
    } else if (variant === 'Produkte') {
      if (Math.random() < 0.5) {
        nodes = [root(r), ' · ', root(r * n * n)]
        correct = String(r * n)
      } else {
        nodes = quotient(root(r * n * n), root(r))
        correct = String(n)
      }
    } else if (variant === 'Quadrate') {
      if (Math.random() < 0.5) {
        const value = -integer(1, 18) / pick([1, 2])
        nodes = { root: `(${String(value).replace('.', ',')})²` }
        correct = String(Math.abs(value)).replace('.', ',')
      } else {
        const b = integer(1, 10)
        nodes = root(`${n * n + b * b} − ${b * b}`)
        correct = String(n)
      }
    } else if (variant === 'Terme') {
      const partiallyRadicate = Math.random() < 0.5
      const subtract = Math.random() < 0.5
      const a = partiallyRadicate ? pickExtraction(r).factor : integer(1, 9)
      const b = partiallyRadicate
        ? pickExtraction(r, subtract ? a : null).factor
        : pick(Array.from({ length: 9 }, (_, i) => i + 1).filter(factor => !subtract || factor !== a))
      nodes = partiallyRadicate
        ? [root(a * a * r), subtract ? ' − ' : ' + ', root(b * b * r)]
        : [String(a), root(r), subtract ? ' − ' : ' + ', String(b), root(r)]
      const coefficient = a + (subtract ? -b : b)
      correct = coefficient === 0 ? '0' : `${coefficient === 1 ? '' : coefficient === -1 ? '-' : coefficient}√${r}`
    } else {
      variable = 'x'
      const kind = integer(0, 3)
      const exponent = integer(1, 6)
      const xPower = exponent === 1 ? 'x' : `x${toSuperscript(exponent)}`
      const answerPower = exponent === 1 ? 'x' : `x^${exponent}`
      if (kind === 0) {
        nodes = [root(`${n}${xPower}`), ' · ', root(`${n}${xPower}`)]
        correct = `${n}${answerPower}`
      } else if (kind === 1) {
        nodes = power(root(`${n}${xPower}`), 2)
        correct = `${n}${answerPower}`
      } else if (kind === 2) {
        nodes = quotient(root(`${r * n * n}x${toSuperscript(2 * exponent + 1)}`), root(`${r}x`))
        correct = `${n}${answerPower}`
      } else {
        nodes = root(`${n * n}x${toSuperscript(2 * exponent)}`)
        correct = `${n}${answerPower}`
      }
    }
    return { id: index + 1, type: 'wurzeln', variant, nodes, expression: plain(nodes), correct, variable }
  })
}

// Accept notation variants of a fully simplified single term, without evaluating code.
export function validateWurzeln(input, problem) {
  const normalize = value => normalizePowers(value ?? '').trim().replace(/\s/g, '')
    .replace(/−/g, '-').replace(/,/g, '.')
    .replace(/sqrt\((\d+)\)/gi, '√$1').replace(/√\((\d+)\)/g, '√$1')
    .replace(/(?:sqrt|√)\((\d+)$/gi, '√$1')
  const parse = value => {
    const match = normalize(value).match(/^([+-]?)(\d+(?:\.\d+)?)?(?:[·*]?(x)(?:\^([1-9]\d*))?|[·*]?√(\d+))?$/)
    if (!match || (!match[2] && !match[3] && !match[5])) return null
    return { coefficient: (match[1] === '-' ? -1 : 1) * Number(match[2] ?? 1),
      variable: match[3] || '', exponent: match[3] ? Number(match[4] ?? 1) : 0, radical: Number(match[5] ?? 1) }
  }
  const user = parse(input), expected = parse(problem.correct)
  return { valid: String(input ?? '').trim().length > 0,
    parsed: String(input ?? '').trim(), isCorrect: Boolean(user && expected &&
      Object.keys(expected).every(key => user[key] === expected[key])) }
}

