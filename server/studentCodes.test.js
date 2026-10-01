const test = require('node:test');
const assert = require('node:assert/strict');

const { createStudentCode, formatStudentCode, normalizeStudentCode, validateStudentCodeStyle, PERSONALITIES } = require('./studentCodes');

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

test('only supported styles are accepted, with animals as the default', () => {
  assert.equal(validateStudentCodeStyle(), 'animals');
  assert.equal(validateStudentCodeStyle('personalities'), 'personalities');
  for (const value of [null, '', 'unknown', {}, ['animals']]) {
    assert.throws(() => createStudentCode(value));
  }
  assert.match(createStudentCode(), /^\p{Ll}+[-\p{L}]+\d$/u);
});

test('personality codes use the reviewed pool and four digits, including boundary suffixes', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const source = fs.readFileSync(require.resolve('./studentCodes'), 'utf8');
  for (const suffix of [0, 7, 9999]) {
    const context = { module: { exports: {} }, require: () => ({ randomInt: (...bounds) => bounds.at(-1) === 10000 ? suffix : 0 }) };
    vm.runInNewContext(source, context);
    assert.equal(context.module.exports.createStudentCode('personalities'), `MarieCurie${String(suffix).padStart(4, '0')}`);
  }
  assert.equal(new Set(PERSONALITIES.map(normalizeStudentCode)).size, PERSONALITIES.length);
  assert.ok(PERSONALITIES.length >= 100);
  for (const name of PERSONALITIES) {
    assert.match(name, /^[A-Za-zÄÖÜäöüß]+$/);
    assert.ok(name.length <= 28, `Identifier name too long: ${name}`);
  }
  assert.ok(PERSONALITIES.length * 10000 >= 128 * 128 * 10);
  // Check every name deterministically rather than relying on random coverage.
  for (let index = 0; index < PERSONALITIES.length; index += 1) {
    const context = { module: { exports: {} }, require: () => ({ randomInt: (...bounds) => bounds.length === 1 ? index : 42 }) };
    vm.runInNewContext(source, context);
    assert.equal(context.module.exports.createStudentCode('personalities'), `${PERSONALITIES[index]}0042`);
  }
  for (let i = 0; i < 3000; i += 1) {
    const code = createStudentCode('personalities');
    const name = code.slice(0, -4);
    assert.ok(PERSONALITIES.includes(name));
    assert.match(code.slice(-4), /^\d{4}$/);
    assert.equal(normalizeStudentCode(code.replace(/([a-z])([A-Z])/g, '$1-$2')), normalizeStudentCode(code));
  }
  assert.equal(normalizeStudentCode(' Marie Curie 0042 '), 'mariecurie0042');
  assert.equal(normalizeStudentCode('Erich-Kästner1234'), 'erichkästner1234');
});
