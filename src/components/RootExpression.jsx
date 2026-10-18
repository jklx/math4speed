import React from 'react'
import RootSign from './RootSign'
import FormattedRootText from './FormattedRootText'

export default function RootExpression({ nodes }) {
  if (Array.isArray(nodes)) return <span>{nodes.map((node, index) => node === '1' && nodes[index + 1]?.root ? null : <RootExpression key={index} nodes={node} />)}</span>
  if (typeof nodes !== 'object' || nodes === null) return <FormattedRootText>{nodes}</FormattedRootText>
  if (nodes.root) return <RootSign><FormattedRootText>{nodes.root}</FormattedRootText></RootSign>
  if (nodes.base) return <span className="root-expression__power"><span className="root-expression__parenthesis">(</span><RootExpression nodes={nodes.base} /><span className="root-expression__parenthesis">)</span><sup>{nodes.exponent}</sup></span>
  return <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', textAlign: 'center', fontSize: '0.85em' }}><span style={{ borderBottom: '0.0625em solid currentColor', padding: '0 0.15em 0.08em' }}><RootExpression nodes={nodes.numerator} /></span><span style={{ padding: '0.08em 0.15em 0' }}><RootExpression nodes={nodes.denominator} /></span></span>
}
