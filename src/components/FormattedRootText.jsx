import React from 'react'
import RootSign from './RootSign'
import { parseRootText } from '../utils/rootText'
import { normalizePowers } from '../utils/powers'

function MathText({ text }) {
  // Only style mathematical fragments; descriptions and input hints stay text.
  if (!/^[\dx\s()[\]{}|.,+−\-·*:÷=]*$/.test(text)) return text.replace(/-/g, '−')
  return text.split(/(x)/).map((part, index) => part === 'x'
    ? <span className="math-variable" key={index}>x</span>
    : <React.Fragment key={index}>{part.replace(/-/g, '−')}</React.Fragment>)
}

function RootTextNodes({ nodes }) {
  return <>{nodes.map((node, index) => typeof node === 'string'
    ? <React.Fragment key={index}>{normalizePowers(node).split(/(\^\d+)/).map((part, partIndex) => /^\^\d+$/.test(part)
      ? <sup key={partIndex}>{part.slice(1)}</sup>
      : <MathText key={partIndex} text={part} />)}</React.Fragment>
    : <RootSign key={index}><RootTextNodes nodes={node.root} /></RootSign>)}</>
}

export default function FormattedRootText({ children }) {
  if (typeof children !== 'string' && typeof children !== 'number') return children
  return <span className="formatted-root-text" role="math" aria-label={String(children)}><RootTextNodes nodes={parseRootText(children)} /></span>
}
