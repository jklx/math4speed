import { getPerformanceRange } from './difficulty'

export function getPerformanceComment(totalSeconds, category = 'einmaleins', problemCount = 1) {
  const [minS, maxS] = getPerformanceRange(category, problemCount)
  // Map into quartiles of the range
  const q1 = minS + (maxS - minS) * 0.25
  const q2 = minS + (maxS - minS) * 0.5
  const q3 = minS + (maxS - minS) * 0.75
  if (totalSeconds <= q1) return "Hervorragend! Du bist ein Profi! 🏆"
  if (totalSeconds <= q2) return "Sehr gut! Starke Leistung! 🌟"
  if (totalSeconds <= q3) return "Gut gemacht! Weiter so! 👍"
  return "Nicht schlecht! Mit Übung wird es besser! 💪"
}

export function getPerformanceMarkerPosition(totalSeconds, category = 'einmaleins', problemCount = 1) {
  const [minS, maxS] = getPerformanceRange(category, problemCount)
  const clamped = Math.min(maxS, Math.max(minS, totalSeconds))
  const position = ((clamped - minS) / (maxS - minS)) * 100
  return `${position}%`
}
