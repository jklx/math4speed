// Intervals only refresh the display. Elapsed wall time remains authoritative
// even when browser dialogs, background tabs, or sleep delay their callbacks.
export function createCountdown(seconds, now = Date.now, startedAt = now()) {
  let deadline = startedAt + seconds * 1000
  let pausedAt = null

  return {
    remainingSeconds() {
      return Math.max(0, Math.ceil((deadline - (pausedAt ?? now())) / 1000))
    },
    pause() {
      if (pausedAt === null) pausedAt = now()
    },
    resume() {
      if (pausedAt === null) return
      deadline += now() - pausedAt
      pausedAt = null
    }
  }
}
