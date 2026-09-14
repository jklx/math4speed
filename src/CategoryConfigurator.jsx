import React from 'react'
import { CATEGORIES, getCategoryLabel } from './utils/categories'

const CATEGORY_INTROS = {
  einmaleins: ['Zahlenraum', 'Wähle, ob Quadratzahlen über das klassische Einmaleins hinaus vorkommen sollen.'],
  'schriftlich-divide': ['Divisoren', 'Bestimme den Zahlenbereich der Divisoren.'],
  negative: ['Rechenarten', 'Kombiniere die Rechenarten, die geübt oder geprüft werden sollen.'],
  'gemischte-zahlen': ['Umwandlungsrichtung', 'Lege fest, in welche Richtung die Zahlen umgewandelt werden.'],
  dezimalbrueche: ['Aufgabenarten', 'Stelle aus den verfügbaren Brucharten einen passenden Mix zusammen.'],
  binomische: ['Schwierigkeitsstufe', 'Wähle Ganzzahlen, Dezimalzahlen oder beides.'],
  'prozent-gleichung': ['Aufgabentypen', 'Lege fest, welche Prozentgleichungen vorkommen.'],
}

function optionDescription(key) {
  const descriptions = {
    includeSquares11_20: 'Quadrate von 11 bis 20', includeSquares21_25: 'Quadrate von 21 bis 25',
    schriftlichDivideSingleDigit: 'Zahlen von 2 bis 9', schriftlichDivideTeens: 'Zahlen von 11 bis 19', schriftlichDivideLarge: 'Zahlen von 21 bis 99',
    negativeAdd: 'Plus und Minus mit negativen Zahlen', negativeSubtract: 'Differenzen mit negativen Zahlen', negativeMultiply: 'Produkte mit Vorzeichen', negativeDivide: 'Divisionen mit Vorzeichen', negativeExplicitPlus: 'Positive Zahlen mit + kennzeichnen',
    mixedToImproper: 'z. B. 2 ⅓ → 7/3', improperToMixed: 'z. B. 7/3 → 2 ⅓',
    decimalPowerOfTen: '10, 100 und 1 000', decimalCommonFractions: '½, ¼, ⅕ und ⅛', decimalPeriodic: '⅓, ⅙ und ⅑', decimalExpandableFractions: 'Im Kopf erweitern',
    binomische_simple: 'Ganzzahlen', binomische_hard: 'Dezimalzahlen', prozentEinfach: 'Grundwert, Prozentwert, Prozentsatz', prozentVeraenderung: 'Zu- und Abnahmen'
  }
  return descriptions[key] || ''
}

export function defaultCategorySettings(category) {
  return Object.fromEntries((CATEGORIES[category]?.settings || []).map(setting => [setting.key, setting.defaultValue]))
}

export function CategoryConfigurator({ category, values = {}, onChange, compact = false, readOnly = false }) {
  const config = CATEGORIES[category]
  if (!config) return null
  const options = config.settings || []
  const [heading, description] = CATEGORY_INTROS[category] || ['Einstellungen', 'Diese Kategorie verwendet die Standardzusammenstellung der Aufgaben.']
  if (!options.length) return <section className={`category-configurator${compact ? ' category-configurator--compact' : ''}`}><div className="category-configurator__intro"><span>{getCategoryLabel(category)}</span><h3>{heading}</h3><p>{description}</p></div><div className="category-configurator__empty">Für diese Kategorie sind keine zusätzlichen Einstellungen nötig.</div></section>
  return <section className={`category-configurator${compact ? ' category-configurator--compact' : ''}`}><div className="category-configurator__intro"><span>{getCategoryLabel(category)}</span><h3>{heading}</h3><p>{description}</p></div><div className="category-option-grid">{options.map(option => {
    const active = values[option.key] ?? option.defaultValue
    return <button key={option.key} type="button" className={`category-option${active ? ' category-option--active' : ''}${option.disabled || readOnly ? ' category-option--locked' : ''}`} onClick={() => !option.disabled && !readOnly && onChange({ ...values, [option.key]: !active })} aria-pressed={active} disabled={option.disabled || readOnly}><span className="category-option__state">{active ? 'Ausgewählt' : 'Nicht ausgewählt'}</span><strong>{option.label}</strong><small>{optionDescription(option.key)}</small></button>
  })}</div></section>
}
