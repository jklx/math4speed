import React from 'react'

export default function ProgressBar({ progress = 0, correctCount = null, ratingThresholds = [10, 17, 24, 30] }) {
  if (correctCount != null) {
    // Give each star interval the same space and leave room beyond five stars.
    const maximum = Math.ceil(ratingThresholds[3] + (ratingThresholds[3] - ratingThresholds[2]) * 12 / 22)
    const boundaries = [0, ...ratingThresholds, maximum]
    const positions = [0, 22, 44, 66, 88, 100]
    const count = Math.min(maximum, Math.max(0, correctCount))
    const interval = boundaries.findIndex((boundary, index) => index > 0 && count <= boundary)
    const fraction = (count - boundaries[interval - 1]) / (boundaries[interval] - boundaries[interval - 1])
    const width = positions[interval - 1] + fraction * (positions[interval] - positions[interval - 1])
    return (
      <>
        <div className="performance-bar" role="progressbar" aria-label="Richtig gelöste Aufgaben"
          aria-valuenow={Math.min(maximum, Math.max(0, correctCount))} aria-valuemin={0} aria-valuemax={maximum}
          aria-valuetext={`${correctCount} richtig gelöste Aufgaben; 5 Sterne ab ${ratingThresholds[3]}`}>
          <div className="performance-fill" style={{ width: `${width}%` }} />
          {ratingThresholds.map((minimum, index) => (
            <div key={index} className="performance-threshold" style={{ left: `${positions[index + 1]}%` }}
              title={`${index + 2} Sterne ab ${minimum} richtigen Aufgaben`} aria-hidden="true" />
          ))}
        </div>
        <div className="performance-labels performance-labels--positioned">
          {ratingThresholds.map((minimum, index) => (
            <span className="performance-label" key={index}
              style={{ left: `${positions[index + 1]}%` }}>
              <span aria-label={`${index + 2} Sterne`}>{index + 2} <span aria-hidden="true">★</span></span>
              <span>ab {minimum}</span>
            </span>
          ))}
        </div>
      </>
    )
  }

  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin="0" aria-valuemax="100">
      <div className="progress" style={{ width: `${progress}%` }} />
    </div>
  )
}
