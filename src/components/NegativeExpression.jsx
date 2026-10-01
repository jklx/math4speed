import React from 'react'
import { getNegativeDisplayParts } from '../utils/negativeNotation'

export default function NegativeExpression({ a, b, operator, explicitPlus }) {
  const parts = getNegativeDisplayParts(a, b, operator, explicitPlus)
  const operand = (number, second) => {
    const text = String(number).replace('-', '−')
    const bracketed = explicitPlus || (second && number < 0)
    return bracketed ? <mrow><mo>(</mo><mn>{explicitPlus && number >= 0 ? `+${text}` : text}</mn><mo>)</mo></mrow> : <mn>{text}</mn>
  }
  return <><mrow>{operand(parts.a, false)}</mrow><mo style={{ margin: '0 0.2em' }}>{parts.operator}</mo><mrow>{operand(parts.b, true)}</mrow></>
}
