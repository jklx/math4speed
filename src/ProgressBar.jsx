import React from 'react'

export default function ProgressBar({ progress = 0, finalTime = null, scoreMode = false, range = [90, 210], getMarkerPosition: externalGetMarker }) {
  const getMarkerPosition = (value) => {
    if (typeof externalGetMarker === 'function') return externalGetMarker(value, range)
    const [min, max] = range
    const position = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    return `${position}%`;
  }

  if (finalTime != null) {
    return (
      <div className={`performance-bar${scoreMode ? ' performance-bar--score' : ''}`} aria-hidden>
        {/* marker shows where the score / time sits on the gradient */}
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
