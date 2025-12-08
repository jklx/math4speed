import React, { useState, useRef, useEffect } from 'react'

export default function AlgebraicInput({ value, onChange, onEnter, autoFocus, placeholder, className, style }) {
  const inputRef = useRef(null)
  const [cursorPos, setCursorPos] = useState(value.length)
  const [isFocused, setIsFocused] = useState(false)

  // Sync cursor position from input events
  const handleSelect = (e) => {
    setCursorPos(e.target.selectionStart)
  }

  const handleChange = (e) => {
    const val = e.target.value
    onChange(val)
    // selectionStart is updated after change event usually, but we can grab it
    setCursorPos(e.target.selectionStart)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onEnter && onEnter()
    }
  }

  // Keep input focus if we click the container
  const handleContainerClick = () => {
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  // --- Rendering Logic ---

  const CURSOR_MARKER = '│' // Thin vertical line or similar

  const renderTokens = (str, cursorIndex, showCursor) => {
    // Insert cursor marker into string
    const chars = str.split('')
    if (showCursor) {
      chars.splice(cursorIndex, 0, CURSOR_MARKER)
    }
    const textWithCursor = chars.join('')

    // Tokenize: 
    // 1. Operators: +, -, =, (, )
    // 2. Caret: ^
    // 3. Cursor: │
    // 4. Numbers: 0-9 (sequences)
    // 5. Variables: a-z (sequences? usually single chars but let's allow words)
    // We want to keep the cursor associated with its surrounding context if possible, 
    // but treating it as a standalone token is easiest for rendering.
    
    // Regex to split but keep delimiters. 
    // We match:
    // - The cursor marker
    // - Operators and special chars
    // - Single digits (for strict exponent control)
    // - Sequences of letters
    // - Superscripts ² and ³
    const regex = /(\│|\^|[+\-=()]|[0-9]|[a-zA-Z]+|[²³])/g
    const rawTokens = textWithCursor.split(regex).filter(t => t && t.trim() !== '')

    // First pass: Convert strings to MathML elements (or intermediate objects)
    const elements = rawTokens.flatMap((t, i) => {
      if (t === CURSOR_MARKER) return [{ type: 'cursor', key: `c-${i}` }]
      if (t === '^') return [{ type: 'caret', key: `op-${i}` }]
      if (t === '²') return [{ type: 'caret', key: `op-sq-${i}` }, { type: 'mn', val: '2', key: `mn-sq-${i}` }]
      if (t === '³') return [{ type: 'caret', key: `op-cb-${i}` }, { type: 'mn', val: '3', key: `mn-cb-${i}` }]
      
      if (['+', '-', '=', '(', ')'].includes(t)) {
        return [{ type: 'mo', val: t.replace('-', '−'), key: `mo-${i}` }]
      }
      if (/^[0-9]$/.test(t)) return [{ type: 'mn', val: t, key: `mn-${i}` }]
      return [{ type: 'mi', val: t, key: `mi-${i}` }]
    })

    // Second pass: Handle Superscripts (^)
    // We iterate and when we find a caret, we try to combine previous and next.
    // Right-associativity for x^y^z? usually x^(y^z). 
    // But simple iteration from left handles x^2 + y correctly.
    // We need to handle multiple tokens in exponent? 
    // "x^2" -> x, ^, 2. 
    // "x^12" -> x, ^, 12.
    // "x^2a" -> x, ^, 2, a. -> x^2 * a. (Standard math notation usually requires braces for complex exponents x^{2a})
    // We will assume ^ only grabs the *immediately following* token (atom).
    
    const processed = []
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      
      if (el.type === 'caret') {
        // We need a base (previous element)
        const base = processed.pop()
        
        // If base is already an msup, we don't want nested exponents (x^2^3)
        // We treat the caret as ignored or just skip it, effectively appending next tokens to the main level
        // But wait, if we skip caret, the next token (3) will be appended to processed.
        // So x^2^3 -> x^2 3. This seems correct per user request.
        if (base && base.type === 'msup') {
          processed.push(base)
          continue
        }
        
        // Look ahead for exponent
        // We only want to consume ONE valid atom (digit or variable)
        // AND we must NOT consume a cursor if it's before the atom.
        // If cursor is present before the atom, we abort the superscript creation to keep cursor at baseline.
        
        let nextIdx = i + 1
        let exponentAtom = null
        
        if (nextIdx < elements.length) {
          const candidate = elements[nextIdx]
          // If next is cursor, we abort superscript to keep cursor baseline
          if (candidate.type === 'cursor') {
            // Do nothing, fall through to render caret literally
          } else if (candidate.type === 'mn' || candidate.type === 'mi') {
            exponentAtom = candidate
            nextIdx++
          }
        }
        
        if (exponentAtom) {
          // We found a valid atom and no cursor blocking it.
          // Create superscript
          if (!base) {
             processed.push(
              <msup key={el.key}>
                <mrow><mo>□</mo></mrow>
                <mrow>{renderNode(exponentAtom)}</mrow>
              </msup>
            )
          } else {
            processed.push(
              <msup key={el.key}>
                <mrow>{renderNode(base)}</mrow>
                <mrow>{renderNode(exponentAtom)}</mrow>
              </msup>
            )
          }
          i = nextIdx - 1
        } else {
          // No valid exponent found, or cursor blocked it.
          // Render base (if any) then caret literally
          if (base) processed.push(base)
          // Render caret as small raised operator to look nice but not be structural
          processed.push(<mo key={el.key} style={{ fontSize: '0.8em', verticalAlign: '0.3em' }}>^</mo>)
        }
      } else {
        processed.push(el)
      }
    }

    return renderNodes(processed)
  }

  const renderNode = (node) => {
    if (React.isValidElement(node)) return node
    if (node.type === 'cursor') {
      return (
        <mpadded width="0" key={node.key}>
           <mo className="blinking-cursor">|</mo>
        </mpadded>
      )
    }
    if (node.type === 'mo') return <mo key={node.key}>{node.val}</mo>
    if (node.type === 'mn') return <mn key={node.key}>{node.val}</mn>
    if (node.type === 'mi') return <mi key={node.key}>{node.val}</mi>
    return null
  }

  const renderNodes = (nodes) => nodes.map(renderNode)

  return (
    <div 
      className={`algebraic-input-container ${className || ''}`}
      onClick={handleContainerClick}
      style={{ 
        position: 'relative', 
        display: 'inline-block',
        cursor: 'text',
        ...style
      }}
    >
      {/* Hidden input for handling typing, focus, caret movement */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          zIndex: 10,
          cursor: 'text',
          caretColor: 'transparent', // Hide native caret
          color: 'transparent'
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      {/* Visual MathML Rendering */}
      <div className="algebraic-display" style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', height: '100%', minHeight: '2.5rem' }}>
        <math display="inline">
          <mrow>
            {value.length === 0 && !isFocused && placeholder ? (
              <mtext style={{ color: '#ccc', fontSize: '1rem' }}>{placeholder}</mtext>
            ) : (
              renderTokens(value, cursorPos, isFocused || document.activeElement === inputRef.current)
            )}
          </mrow>
        </math>
      </div>
      
      <style>{`
        .blinking-cursor {
          border-left: 2px solid var(--accent);
          margin-left: -1px; /* Center the 2px border on the 0-width point */
          color: transparent; /* Hide the pipe char, use border */
          animation: blink 1s step-end infinite;
          height: 1.2em;
          display: inline-block;
          vertical-align: middle;
        }
        @keyframes blink {
          0%, 100% { border-color: var(--accent); }
          50% { border-color: transparent; }
        }
      `}</style>
    </div>
  )
}
