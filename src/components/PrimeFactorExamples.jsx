import React from 'react'

const EXAMPLES = [
  {
    number: 12, label: 'Leicht: 12', result: '12 = 2 · 2 · 3', height: 190,
    nodes: [[12, 150, 25], [3, 80, 90], [4, 220, 90], [2, 180, 155], [2, 260, 155]],
    branches: [[0, 1], [0, 2], [2, 3], [2, 4]], primes: [1, 3, 4],
    description: '12 wird in 3 und 4 zerlegt. 4 wird weiter in 2 und 2 zerlegt. Die Primfaktoren sind 2, 2 und 3.',
  },
  {
    number: 180, label: 'Schwerer: 180', result: '180 = 2 · 2 · 3 · 3 · 5', height: 250,
    nodes: [[180, 150, 25], [18, 80, 90], [10, 220, 90], [2, 35, 155], [9, 115, 155], [2, 195, 155], [5, 270, 155], [3, 80, 220], [3, 150, 220]],
    branches: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7], [4, 8]], primes: [3, 5, 6, 7, 8],
    description: '180 wird in 18 und 10 zerlegt. 18 wird in 2 und 9, 10 in 2 und 5 zerlegt. 9 wird weiter in 3 und 3 zerlegt. Die Primfaktoren sind 2, 2, 3, 3 und 5.',
  },
]

export default function PrimeFactorExamples() {
  return <div className="prime-factor-examples">
    <p>Zerlege jede Zahl in zwei Faktoren. Zerlege weiter, bis an allen Astenden nur noch Primzahlen stehen. Ihr Produkt ergibt die ursprüngliche Zahl.</p>
    <div className="prime-factor-examples__grid">{EXAMPLES.map(example => <figure key={example.number} className="prime-factor-example">
      <figcaption>{example.label}</figcaption>
      <svg viewBox={`0 0 310 ${example.height}`} role="img" aria-label={`Zerlegungsbaum für ${example.number}: ${example.description}`}>
        {example.branches.map(([parent, child]) => <line key={`${parent}-${child}`} x1={example.nodes[parent][1]} y1={example.nodes[parent][2] + 17} x2={example.nodes[child][1]} y2={example.nodes[child][2] - 17} className="prime-factor-example__branch" />)}
        {example.nodes.map(([number, x, y], index) => <g key={index}>
          {example.primes.includes(index) && <circle cx={x} cy={y} r="19" className="prime-factor-example__prime" />}
          <text x={x} y={y} textAnchor="middle" dominantBaseline="central">{number}</text>
        </g>)}
      </svg>
      <p className="prime-factor-example__result">{example.result}</p>
    </figure>)}</div>
    <p className="prime-factor-examples__hint">Die eingekreisten Zahlen sind Primzahlen. Schreibe jeden Primfaktor auf – auch wenn er mehrfach vorkommt.</p>
  </div>
}
