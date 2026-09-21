export const getTrainingErrorWeight = problem => problem?.type === 'schriftlich' ? 0.5 : 1

export const isSchriftlichCorrectionAttempt = (problem, previousAnswer) => Boolean(
  problem?.type === 'schriftlich' &&
  previousAnswer?.id === problem.id &&
  previousAnswer.isCorrect === false
)

export const formatTrainingErrorPoints = value => Number(value).toLocaleString('de-DE', {
  minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 1,
  maximumFractionDigits: 1
})
