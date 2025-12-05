// Difficulty multipliers reflect relative time needed per problem type
// Lower multiplier = faster problems; higher = more time per problem
const DIFFICULTY_MULTIPLIER = {
  einmaleins: 1.0,
  schriftlich: 4.0,
  primfaktorisierung: 3.0
}

function normalizeSeconds(totalSeconds, category) {
  const mult = DIFFICULTY_MULTIPLIER[category] ?? 1.0
  return totalSeconds / mult
}

export function getPerformanceComment(totalSeconds, category = 'einmaleins') {
  const s = normalizeSeconds(totalSeconds, category)
  if (s <= 90) return "Hervorragend! Du bist ein Einmaleins-Profi! 🏆"
  if (s <= 120) return "Sehr gut! Fast perfekte Zeit! 🌟"
  if (s <= 150) return "Gut gemacht! Du bist auf dem richtigen Weg! 👍"
  if (s <= 180) return "Nicht schlecht! Mit etwas Übung wird es noch besser! 💪"
  return "Weiter üben! Du schaffst das! 🎯"
}

export function getPerformanceMarkerPosition(totalSeconds, category = 'einmaleins') {
  const s = normalizeSeconds(totalSeconds, category)
  const position = Math.min(100, Math.max(0, 
    ((s - 90) / (210 - 90)) * 100
  ))
  return `${position}%`
}
