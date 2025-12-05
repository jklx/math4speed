// Compute per-answer penalty seconds with weighted rules
// - Default: wrong answer = 10s
// - Schriftlich multiply: per partial row wrong = 5s; final result wrong = 10s
//   Do not penalize final result if any partial row is wrong (to avoid consequential double penalty)

import { getMultiplier } from './difficulty'

function categoryOfAnswer(answer) {
  if (!answer) return 'einmaleins'
  if (answer.type === 'multiplication') return 'einmaleins'
  if (answer.type === 'primfaktorisierung') return 'primfaktorisierung'
  if (answer.type === 'schriftlich') return 'schriftlich'
  return 'einmaleins'
}

export function computePenaltySeconds(answer) {
  if (!answer || answer.isCorrect) return 0

  if (answer.type === 'schriftlich' && answer.operation === 'multiply') {
    const snapshot = answer.schriftlichSnapshot || {}
    const partialInputs = snapshot.partialInputs || []
    const partialTruth = answer.partialProducts || []

    let partialWrongRows = 0
    for (let r = 0; r < partialTruth.length; r++) {
      const truthRow = partialTruth[r] || []
      const inputRow = partialInputs[r] || []
      // Determine which positions have digits in the truth (non-null)
      const truthDigits = truthRow.filter(d => d != null)
      const cols = (answer.correctDigits || []).length
      const rightGlobal = cols + r
      const L = truthDigits.length
      const start = rightGlobal - L + 1
      let rowWrong = false
      for (let g = start; g <= rightGlobal; g++) {
        const localIndex = g - start
        const truthDigit = truthDigits[localIndex]
        const userDigit = (inputRow[g] ?? '').toString()
        const expected = truthDigit != null ? truthDigit.toString() : ''
        if (expected !== '' && userDigit !== expected) {
          rowWrong = true
          break
        }
      }
      if (rowWrong) partialWrongRows += 1
    }

    const partialPenalty = partialWrongRows * 10

    // Final result penalty only if no partial row is wrong
    let finalPenalty = 0
    if (partialWrongRows === 0) {
      const userDigits = (snapshot.digits || []).map(d => (d === '' ? 0 : Number(d)))
      const correctDigits = (answer.correctDigits || [])
      const finalCorrect = JSON.stringify(userDigits) === JSON.stringify(correctDigits)
      if (!finalCorrect) finalPenalty = 10
    }

    return partialPenalty + finalPenalty
  }

  // Default rule
  return 10
}

export function computeWeightedPenaltySeconds(answer) {
  const base = computePenaltySeconds(answer)
  const cat = categoryOfAnswer(answer)
  const mult = getMultiplier(cat, answer?.operation)
  return Math.round(base * mult)
}
