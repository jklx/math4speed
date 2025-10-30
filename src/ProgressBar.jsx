import React from 'react'

export default function ProgressBar({ progress = 0, finalTime = null }) {
  const getMarkerPosition = (totalSeconds) => {
    // map times between 90s and 210s to 0-100%
    const position = Math.min(100, Math.max(0, ((totalSeconds - 90) / (210 - 90)) * 100));
    return `${position}%`;
  }

  if (finalTime != null) {
    return (
      <div className="performance-bar" aria-hidden>
        {/* marker shows where the final time sits on the gradient */}
        <div className="performance-marker" style={{ left: getMarkerPosition(finalTime) }} />
      </div>
    )
  }

  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin="0" aria-valuemax="100">
      <div className="progress" style={{ width: `${progress}%` }} />
    </div>
  )
}
