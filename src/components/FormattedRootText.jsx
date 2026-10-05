import React from 'react'
import RootSign from './RootSign'
import { parseRootText } from '../utils/rootText'
import { normalizePowers } from '../utils/powers'

function RootTextNodes({ nodes }) {
  return <>{nodes.map((node, index) => typeof node === 'string'
    ? <React.Fragment key={index}>{normalizePowers(node).split(/(\^\d+)/).map((part, partIndex) => /^\^\d+$/.test(part)
      ? <sup key={partIndex}>{part.slice(1)}</sup>
      : <React.Fragment key={partIndex}>{part.replace(/-/g, '−')}</React.Fragment>)}</React.Fragment>
    : <RootSign key={index}><RootTextNodes nodes={node.root} /></RootSign>)}</>
}

export default function FormattedRootText({ children }) {
  if (typeof children !== 'string' && typeof children !== 'number') return children
  return <span className="formatted-root-text" role="math" aria-label={String(children)}><RootTextNodes nodes={parseRootText(children)} /></span>
}
