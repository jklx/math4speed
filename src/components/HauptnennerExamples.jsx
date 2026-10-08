import React from 'react'

const PAIR_EXAMPLE = {
    a: 12, b: 18, first: '2 · 2 · 3', second: '2 · 3 · 3',
    counts: [[2, 2, 1], [3, 1, 2]], factors: '2 · 2 · 3 · 3', result: 36,
    explanation: 'Die 2 kommt bei 12 zweimal vor, bei 18 nur einmal. Wir brauchen sie deshalb zweimal. Die 3 kommt bei 18 zweimal vor, bei 12 nur einmal. Auch sie brauchen wir zweimal.',
    check: '36 : 12 = 3 und 36 : 18 = 2',
  }

const TRIPLE_EXAMPLE = {
    a: 4, b: 6, c: 10, first: '2 · 2', second: '2 · 3', third: '2 · 5',
    counts: [[2, 2, 1, 1], [3, 0, 1, 0], [5, 0, 0, 1]], factors: '2 · 2 · 3 · 5', result: 60,
    explanation: 'Vergleiche die Anzahl jedes Primfaktors in allen drei Zerlegungen. Die 2 brauchen wir zweimal (aus 4), die 3 einmal (aus 6) und die 5 einmal (aus 10).',
    check: '60 : 4 = 15, 60 : 6 = 10 und 60 : 10 = 6',
  }

export default function HauptnennerExamples({ mental = false }) {
  if (mental) return <div className="hauptnenner-examples">
    <p>Der Hauptnenner ist das kleinste gemeinsame Vielfache (kgV) der beiden Nenner. Suche im Kopf die kleinste positive Zahl, die durch beide Nenner ohne Rest teilbar ist. Du gibst nur das Ergebnis ein.</p>
    <section className="hauptnenner-example"><h3>Beispiel 1: Nenner 4 und 6</h3>
      <p>Vielfache von 4: 4, 8, <strong>12</strong>, 16, …<br />Vielfache von 6: 6, <strong>12</strong>, 18, …</p>
      <p>12 ist die erste Zahl, die in beiden Reihen vorkommt. Daher ist der Hauptnenner kgV(4, 6) = <strong>12</strong>.</p>
      <p>Kontrolle: 12 : 4 = 3 und 12 : 6 = 2.</p>
    </section>
    <section className="hauptnenner-example"><h3>Beispiel 2: Nenner 5 und 10</h3>
      <p>10 ist schon ein Vielfaches von 5: 10 : 5 = 2. Außerdem ist 10 durch sich selbst teilbar.</p>
      <p>Eine kleinere positive Zahl kann kein Vielfaches von 10 sein. Daher ist der Hauptnenner kgV(5, 10) = <strong>10</strong>.</p>
    </section>
    <p><strong>Tipp:</strong> Gehe die Vielfachen des größeren Nenners durch, bis du eine Zahl findest, die auch durch den kleineren Nenner teilbar ist.</p>
  </div>
  const examples = [PAIR_EXAMPLE, TRIPLE_EXAMPLE]
  return <div className="hauptnenner-examples">
    <p>Der Hauptnenner ist das kleinste gemeinsame Vielfache (kgV) aller Nenner: die kleinste positive Zahl, die durch jeden Nenner ohne Rest teilbar ist.</p>
    {examples.map((example, index) => {
      const three = Boolean(example.c)
      return <section className="hauptnenner-example" key={`${example.a}-${example.b}`} aria-labelledby={`hauptnenner-example-${index}`}>
      <h3 id={`hauptnenner-example-${index}`}>Beispiel {index + 1}: Nenner {[example.a, example.b, ...(three ? [example.c] : [])].join(' und ')}</h3>
      <ol>
        <li><strong>{three ? 'Alle drei' : 'Beide'} Nenner in Primfaktoren zerlegen</strong>
          <p>{example.a} = {example.first}<br />{example.b} = {example.second}{three && <><br />{example.c} = {example.third}</>}</p>
        </li>
        <li><strong>Für jeden Primfaktor die {three ? 'größte' : 'größere'} Anzahl übernehmen</strong>
          <p>{example.explanation}</p>
          <div className="hauptnenner-example__table-scroll">
            <table>
              <caption>So oft brauchen wir die Primfaktoren im Hauptnenner:</caption>
              <thead><tr><th scope="col">Primfaktor</th><th scope="col">In {example.a}</th><th scope="col">In {example.b}</th>{three && <th scope="col">In {example.c}</th>}<th scope="col">Übernehmen</th></tr></thead>
              <tbody>{example.counts.map(([prime, ...counts]) => <tr key={prime}>
                <th scope="row">{prime}</th>{counts.map((count, i) => <td key={i}>{count}-mal</td>)}<td><strong>{Math.max(...counts)}-mal</strong></td>
              </tr>)}</tbody>
            </table>
          </div>
        </li>
        <li><strong>Die übernommenen Faktoren multiplizieren</strong>
          <p className="hauptnenner-example__result">Hauptnenner = kgV({[example.a, example.b, ...(three ? [example.c] : [])].join(', ')})<br />= {example.factors} = {example.result}</p>
          <p>Kontrolle: {example.check}. Der Hauptnenner ist durch {three ? 'alle drei' : 'beide'} Nenner ohne Rest teilbar.</p>
        </li>
      </ol>
    </section>})}
    <p><strong>Merke:</strong> Addiere die Anzahlen eines Primfaktors nicht. Übernimm jeweils nur die größte Anzahl. So enthält der Hauptnenner alle benötigten Faktoren und bleibt möglichst klein.</p>
  </div>
}
