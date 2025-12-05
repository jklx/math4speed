import React from 'react'

export default function ProgressBar({ progress = 0, finalTime = null, range = [90, 210], getMarkerPosition: externalGetMarker }) {
  const getMarkerPosition = (totalSeconds) => {
    // If parent provides a range-aware function, use it
    if (typeof externalGetMarker === 'function') return externalGetMarker(totalSeconds, range)
    // Fallback: simple mapping if utils not provided
    const [minS, maxS] = range
    const position = Math.min(100, Math.max(0, ((totalSeconds - minS) / (maxS - minS)) * 100));
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
