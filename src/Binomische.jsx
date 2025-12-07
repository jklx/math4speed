import React from 'react'

export default function Binomische({ expression, value = '', onChange, onEnter }) {
  const handleKey = (e) => {
    if (e.key === 'Enter') {
      onEnter && onEnter()
    }
  }

  const renderTerm = (str) => {
    // Split into numbers and non-numbers (variables)
    // e.g. "12x" -> ["12", "x"], "a" -> ["a"]
    const tokens = str.split(/([0-9]+)/).filter(s => s);
    return tokens.map((t, j) => {
      if (/^[0-9]+$/.test(t)) return <mn key={j}>{t}</mn>
      // Map standard hyphen to minus sign if it appears in a term (unlikely due to split above, but safe)
      if (t === '-') return <mo key={j}>−</mo>
      return <mi key={j}>{t}</mi>
    })
  }

  const renderPreview = (text) => {
    if (!text) return <span style={{ color: '#ccc' }}>Vorschau...</span>;
    
    // Split by operators +, -, = but keep them in the array
    // We use a capture group in split to keep the separators
    const parts = text.split(/([+\-=])/);
    
    return (
      <math display="inline">
        <mrow>
          {parts.map((part, i) => {
            if (['+', '-', '='].includes(part)) {
              return <mo key={i} style={{ margin: '0 0.2em' }}>{part.replace('-', '−')}</mo>;
            }
            
            // Handle powers like x^2
            if (part.includes('^')) {
              const subParts = part.split('^');
              // We only handle simple base^exp for now. 
              // If there are multiple ^, this simple split might be weird, but sufficient for x^2
              const base = subParts[0];
              const exp = subParts.slice(1).join('^'); // Rejoin rest if multiple ^ (unlikely valid)
              
              return (
                <msup key={i}>
                  <mrow>{renderTerm(base)}</mrow>
                  <mrow>{renderTerm(exp)}</mrow>
                </msup>
              )
            }
            
            return <mrow key={i}>{renderTerm(part)}</mrow>
          })}
        </mrow>
      </math>
    )
  }
  
  return (
    <div className="question-centered einmaleins-row" style={{ alignItems: 'flex-start' }}>
      <div className="expression" style={{ marginTop: '0.3rem' }}>
        <math display="inline" style={{ fontSize: '2rem' }}>
          <mrow>
            <mtext>{expression}</mtext>
            <mo style={{ margin: '0 0.2em' }}>=</mo>
          </mrow>
        </math>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input
          type="text"
          className="app-input math-input"
          style={{ width: '300px' }}
          autoFocus
          value={value}
          onChange={e => onChange && onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ergebnis..."
        />
        <div className="math-preview" style={{ minHeight: '1.5rem', fontSize: '1.5rem', color: 'var(--accent)' }}>
          {renderPreview(value)}
        </div>
      </div>
    </div>
  )
}
