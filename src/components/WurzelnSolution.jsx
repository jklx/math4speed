import React from 'react'
import RootExpression from './RootExpression'
import { getWurzelnSolutionSteps } from '../problems/wurzelnSolution'

export default function WurzelnSolution({ problem }) {
  const steps = getWurzelnSolutionSteps(problem)
  if (!steps.length) return null
  return <section className="wurzeln-solution" aria-label="Lösungsweg">
    <h4>Lösungsweg</h4>
    <ol>{steps.map((step, index) => <li key={index}>
      <p>{step.text}</p>
      <div className="wurzeln-solution__expression" role="math"><RootExpression nodes={step.expression} /></div>
    </li>)}</ol>
  </section>
}
