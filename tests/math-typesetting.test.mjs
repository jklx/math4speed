import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server, Input, FormattedRootText
before(async () => {
  server = await createServer({ configLoader: 'runner', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true } })
  Input = (await server.ssrLoadModule('/src/AlgebraicInput.jsx')).default
  FormattedRootText = (await server.ssrLoadModule('/src/components/FormattedRootText.jsx')).default
})
after(async () => { await server?.close() })

test('multi-digit exponents are entirely inside the superscript', () => {
  const html = renderToStaticMarkup(React.createElement(Input, { value: 'x^12+3x^10', readOnly: true }))
  assert.match(html, /<msup[^>]*><mrow>.*?<\/mrow><mrow><mn[^>]*>12<\/mn><\/mrow><\/msup>/)
  assert.match(html, /<msup[^>]*><mrow>.*?<\/mrow><mrow><mn[^>]*>10<\/mn><\/mrow><\/msup>/)
})

test('decimal numbers, minus and variables use their corresponding math tokens', () => {
  const html = renderToStaticMarkup(React.createElement(Input, { value: '3,5x−2,25', readOnly: true }))
  assert.match(html, /<mn[^>]*>3,5<\/mn>/)
  assert.match(html, /<mn[^>]*>2,25<\/mn>/)
  assert.match(html, /<mo[^>]*>−<\/mo>/)
  assert.match(html, /<mi[^>]*class="math-variable"[^>]*>x<\/mi>/)
})

test('root variables are marked without turning surrounding prose into math', () => {
  const html = renderToStaticMarkup(React.createElement(FormattedRootText, null, 'Text: √(25x^6) = 5|x^3|'))
  assert.ok(html.includes('Text: '))
  assert.equal((html.match(/class="math-variable"/g) ?? []).length, 2)
  assert.equal((html.match(/<sup>/g) ?? []).length, 2)
})
