// Compute per-answer penalty seconds with weighted rules
// - Default: wrong answer = 10s
// - Schriftlich multiply: per partial row wrong = 5s; final result wrong = 10s
//   Do not penalize final result if any partial row is wrong (to avoid consequential double penalty)

import { getProblemMaxTime } from './difficulty'

export function computePenaltySeconds(answer) {
  if (!answer || answer.isCorrect) return 0

  const maxTime = getProblemMaxTime(answer)

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

    // Penalty per wrong row is 1/4 of maxTime
    const rowPenalty = Math.round(maxTime / 4)
    const partialPenalty = partialWrongRows * rowPenalty

    // Final result penalty only if no partial row is wrong
    let finalPenalty = 0
    if (partialWrongRows === 0) {
      const userDigits = (snapshot.digits || []).map(d => (d === '' ? 0 : Number(d)))
      const correctDigits = (answer.correctDigits || [])
      const finalCorrect = JSON.stringify(userDigits) === JSON.stringify(correctDigits)
      if (!finalCorrect) finalPenalty = maxTime
    }

    return partialPenalty + finalPenalty
  }

  // Default rule: penalty is the max time of the problem
  return maxTime
}

