import React from 'react'
import { CATEGORIES } from './utils/categories'
import FormattedFractionText from './components/FormattedFractionText'

const CATEGORY_INTROS = {
  einmaleins: ['Zahlenraum', 'Wähle, ob Quadratzahlen über das klassische Einmaleins hinaus vorkommen sollen.'],
  'schriftlich-divide': ['Divisoren', 'Bestimme den Zahlenbereich der Divisoren.'],
  negative: ['Rechenarten', 'Kombiniere die Rechenarten, die geübt oder geprüft werden sollen.'],
  'gemischte-zahlen': ['Umwandlungsrichtung', 'Lege fest, in welche Richtung die Zahlen umgewandelt werden.'],
  dezimalbrueche: ['Aufgabenarten', 'Stelle aus den verfügbaren Brucharten einen passenden Mix zusammen.'],
  'anteile-bruchteile': ['Aufgabentypen', 'Wähle aus, ob der Bruchteil, der Anteil oder das Ganze gesucht ist.'],
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
    anteileBruchteil: 'z. B. 3/5 von 10 km', anteileAnteil: 'z. B. Welcher Anteil von 15 km sind 6 km?', anteileGanzes: 'z. B. 2/7 von welcher Strecke sind 12 km?',
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
  const options = (config.settings || []).filter(option => !option.hidden)
  if (!options.some(option => !option.disabled)) return null
  const tileOptions = options.filter(option => option.control !== 'checkbox')
  const checkboxOptions = options.filter(option => option.control === 'checkbox')
  const [heading, description] = CATEGORY_INTROS[category] || ['Einstellungen', 'Diese Kategorie verwendet die Standardzusammenstellung der Aufgaben.']
  const hasExplicitConversionSelection = checkboxOptions.some(option => values[option.key] === true)
  const useLegacyConversions = values.anteileUmrechnungen === true && !hasExplicitConversionSelection
  const toggleCheckbox = (option, active) => {
    const nextValues = { ...values, anteileUmrechnungen: false }
    if (useLegacyConversions) checkboxOptions.forEach(item => { nextValues[item.key] = true })
    nextValues[option.key] = !active
    onChange(nextValues)
  }
  return <section className={`category-configurator${compact ? ' category-configurator--compact' : ''}`}><div className="category-configurator__intro"><h3>{heading}</h3><p>{description}</p></div><div className="category-option-grid">{tileOptions.map(option => {
    const active = values[option.key] ?? option.defaultValue
    return <button key={option.key} type="button" className={`category-option${active ? ' category-option--active' : ''}${option.disabled || readOnly ? ' category-option--locked' : ''}`} onClick={() => !option.disabled && !readOnly && onChange({ ...values, [option.key]: !active })} aria-pressed={active} disabled={option.disabled || readOnly}><span className="category-option__state">{active ? 'Ausgewählt' : 'Nicht ausgewählt'}</span><strong><FormattedFractionText>{option.label}</FormattedFractionText></strong><small><FormattedFractionText>{optionDescription(option.key)}</FormattedFractionText></small></button>
  })}</div>{checkboxOptions.length > 0 && <fieldset className="category-conversion-settings" disabled={readOnly}><legend>Umrechnungen von Größen</legend><p>Wähle die Größen aus, bei denen Umrechnungen vorkommen dürfen.</p><div className="category-conversion-options">{checkboxOptions.map(option => {
    const active = useLegacyConversions || (values[option.key] ?? option.defaultValue)
    return <label key={option.key}><input type="checkbox" checked={active} onChange={() => !readOnly && toggleCheckbox(option, active)} /><span>{option.label}</span></label>
  })}</div></fieldset>}</section>
}
