import React, { useState, useRef, useEffect } from 'react'

export default function AlgebraicInput({ value, onChange, onEnter, autoFocus, placeholder, className, style }) {
  const inputRef = useRef(null)
  const [cursorPos, setCursorPos] = useState(value.length)
  const [isFocused, setIsFocused] = useState(false)
  const cursorPosRef = useRef(cursorPos)
  cursorPosRef.current = cursorPos
  // Stores the character for a pending dead key (e.g. '^' on German keyboard)
  const deadCharRef = useRef(null)
  // KeyboardLayoutMap for resolving dead key characters (Chrome/Edge only)
  const layoutMapRef = useRef(null)
  // Prevents keypress from double-inserting when keydown already handled a char
  const keydownInsertedRef = useRef(false)

  useEffect(() => {
    if (navigator.keyboard?.getLayoutMap) {
      navigator.keyboard.getLayoutMap().then(map => {
        layoutMapRef.current = map
      }).catch(() => {})
    }
  }, [])

  const insertChar = (char) => {
    const cp = cursorPosRef.current
    onChange(value.slice(0, cp) + char + value.slice(cp))
    setCursorPos(cp + char.length)
  }

  const handleKeyDown = (e) => {
    keydownInsertedRef.current = false

    // If the browser is doing IME composition (e.g. Firefox with dead keys on
    // contenteditable), let compositionend handle it and clear our manual tracking.
    if (e.isComposing) {
      deadCharRef.current = null
      return
    }

    // Resolve a pending dead key: the next printable keydown carries the follow-up char.
    // On plain <div> elements browsers do NOT start composition for dead keys,
    // so we must stitch the dead char + the next char together here.
    if (deadCharRef.current !== null && e.key !== 'Dead') {
      const dead = deadCharRef.current
      deadCharRef.current = null
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        insertChar(dead + e.key)
        keydownInsertedRef.current = true
        e.preventDefault()
        return
      }
      // Non-printable key after dead key (Enter, Arrow…): insert the dead char alone
      // then fall through to handle the non-printable key normally.
      insertChar(dead)
    }

    // Intercept dead keys (e.g. ^ on German keyboard fires key='Dead').
    // Use KeyboardLayoutMap if available, otherwise fall back to a code table.
    if (e.key === 'Dead') {
      const FALLBACK = { BracketLeft: '^', Backquote: '`', Equal: '´', Slash: '/' }
      const fromMap = layoutMapRef.current?.get(e.code)
      const char = (fromMap && fromMap !== 'Dead') ? fromMap : (FALLBACK[e.code] ?? null)
      deadCharRef.current = char
      e.preventDefault()
      return
    }

    if (e.key === 'Enter') { onEnter?.(); e.preventDefault(); return }
    if (e.key === 'ArrowLeft') {
      setCursorPos(p => Math.max(0, p - 1))
      e.preventDefault(); return
    }
    if (e.key === 'ArrowRight') {
      setCursorPos(p => Math.min(value.length, p + 1))
      e.preventDefault(); return
    }
    if (e.key === 'Backspace') {
      if (cursorPos > 0) {
        onChange(value.slice(0, cursorPos - 1) + value.slice(cursorPos))
        setCursorPos(cursorPos - 1)
      }
      e.preventDefault(); return
    }
    if (e.key === 'Delete') {
      if (cursorPos < value.length) {
        onChange(value.slice(0, cursorPos) + value.slice(cursorPos + 1))
      }
      e.preventDefault(); return
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      insertChar(e.key)
      e.preventDefault()
      keydownInsertedRef.current = true
    }
  }

  // Safety net for browsers where keydown's preventDefault() doesn't suppress keypress.
  const handleKeyPress = (e) => {
    if (e.isComposing) return
    if (keydownInsertedRef.current) return
    if (deadCharRef.current !== null) return
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      insertChar(e.key)
      e.preventDefault()
    }
  }

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
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
    if (node.type === 'mi') return <mtext key={node.key}>{node.val}</mtext>
    return null
  }

  const renderNodes = (nodes) => nodes.map(renderNode)

  return (
    <div 
      ref={inputRef}
      tabIndex={0}
      className={`algebraic-input-container ${className || ''}`}
      onMouseDown={e => { e.preventDefault(); inputRef.current?.focus() }}
      onKeyDown={handleKeyDown}
      onKeyPress={handleKeyPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => { setIsFocused(false); deadCharRef.current = null }}
      style={{ 
        position: 'relative', 
        display: 'inline-block',
        cursor: 'text',
        outline: isFocused ? '2px solid var(--accent)' : 'none',
        outlineOffset: '2px',
        borderRadius: '4px',
        ...style
      }}
    >
      {/* Visual MathML Rendering */}
      <div className="algebraic-display" style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', height: '100%', minHeight: '2.5rem' }}>
        <math display="inline">
          <mrow>
            {value.length === 0 && !isFocused && placeholder ? (
              <mtext style={{ color: '#ccc', fontSize: '1rem' }}>{placeholder}</mtext>
            ) : (
              renderTokens(value, cursorPos, isFocused)
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
