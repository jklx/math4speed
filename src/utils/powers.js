const superscriptDigits = '⁰¹²³⁴⁵⁶⁷⁸⁹'

export const toSuperscript = exponent => String(exponent).replace(/\d/g, digit => superscriptDigits[Number(digit)])
export const normalizePowers = text => String(text).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,
  exponent => `^${[...exponent].map(digit => superscriptDigits.indexOf(digit)).join('')}`)
export const displayPowers = text => String(text).replace(/\^(\d+)/g, (_, exponent) => toSuperscript(exponent))
