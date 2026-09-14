import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import AnswerReview from './AnswerReview'

export default function AnswerDetailDialog({ answer, studentName, position, total, onPrevious, onNext, onClose }) {
  const dialogRef = useRef(null)
  const triggerRef = useRef(document.activeElement)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => { dialog.close(); requestAnimationFrame(() => { if (triggerRef.current?.isConnected) triggerRef.current.focus() }) }
  }, [])
  return createPortal(<dialog ref={dialogRef} className="answer-detail-dialog" aria-labelledby="answer-detail-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="answer-detail-content">
      <header className="answer-detail-header"><div><p>{studentName}</p><h2 id="answer-detail-title">Aufgabe {position + 1} von {total}</h2></div><button type="button" className="management-link-button" autoFocus onClick={onClose} aria-label="Detailansicht schließen">Schließen ×</button></header>
      <AnswerReview key={position} answer={answer} inputLabel="Gespeicherte Eingabe" />
      <nav className="answer-detail-navigation" aria-label="Aufgaben durchblättern"><button type="button" className="big" disabled={position === 0} onClick={onPrevious}>← Vorherige Aufgabe</button><button type="button" className="big" disabled={position >= total - 1} onClick={onNext}>Nächste Aufgabe →</button></nav>
    </div>
  </dialog>, document.body)
}
