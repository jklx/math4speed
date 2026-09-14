const test = require('node:test');
const assert = require('node:assert/strict');

const { formatStudentCode, normalizeStudentCode } = require('./studentCodes');

test('forms identifiers with masculine animal names', () => {
  assert.equal(formatStudentCode('kühner', 'Adler', '4'), 'kühnerAdler4');
});

test('forms identifiers with feminine animal names', () => {
  assert.equal(formatStudentCode('kühner', 'Giraffe', '4'), 'kühneGiraffe4');
  assert.equal(formatStudentCode('schneller', 'Wachtel', '2'), 'schnelleWachtel2');
});

test('forms identifiers with neuter animal names', () => {
  assert.equal(formatStudentCode('kühner', 'Wildschwein', '4'), 'kühnesWildschwein4');
  assert.equal(formatStudentCode('dunkler', 'Krokodil', '2'), 'dunklesKrokodil2');
});

test('normalizes newly inflected identifiers as before', () => {
  assert.equal(normalizeStudentCode(' Kühnes-Wildschwein4 '), 'kühneswildschwein4');
});
