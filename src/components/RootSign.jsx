import React from 'react'

export default function RootSign({ children }) {
  return <span className="root-expression">
    <svg className="root-expression__sign" viewBox="0 0 24 40" aria-hidden="true">
      <path d="M 1 24 L 6 21 L 12 36 L 21 1 L 24 1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
    </svg>
    <span className="root-expression__radicand">{children}</span>
  </span>
}
