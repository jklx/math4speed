export function getPerformanceComment(totalSeconds) {
  if (totalSeconds <= 90) return "Hervorragend! Du bist ein Einmaleins-Profi! 🏆"
  if (totalSeconds <= 120) return "Sehr gut! Fast perfekte Zeit! 🌟"
  if (totalSeconds <= 150) return "Gut gemacht! Du bist auf dem richtigen Weg! 👍"
  if (totalSeconds <= 180) return "Nicht schlecht! Mit etwas Übung wird es noch besser! 💪"
  return "Weiter üben! Du schaffst das! 🎯"
}

export function getPerformanceMarkerPosition(totalSeconds) {
  const position = Math.min(100, Math.max(0, 
    ((totalSeconds - 90) / (210 - 90)) * 100
  ))
  return `${position}%`
}
