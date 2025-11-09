// Problem generators extracted from Game.jsx

export function generateEinmaleinsProblems(count = 100, settings = {}) {
  const { includeSquares11_20 = false, includeSquares21_25 = false } = settings;
  const pool = [];
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      const isRare = a === 1 || b === 1 || a === 10 || b === 10;
      const weight = isRare ? 1 : 4;
      for (let i = 0; i < weight; i++) pool.push({ a, b });
    }
  }
  if (includeSquares11_20) {
    for (let n = 11; n <= 20; n++) {
      for (let i = 0; i < 3; i++) pool.push({ a: n, b: n });
    }
  }
  if (includeSquares21_25) {
    for (let n = 21; n <= 25; n++) {
      for (let i = 0; i < 3; i++) pool.push({ a: n, b: n });
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const seen = new Set();
  const problems = [];
  let id = 1;
  for (const p of pool) {
    const key = `${p.a}x${p.b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    problems.push({ id: id++, a: p.a, b: p.b, correct: p.a * p.b, type: 'multiplication' });
    if (problems.length >= count) break;
  }
  if (problems.length < count) {
    for (let a = 1; a <= 10 && problems.length < count; a++) {
      for (let b = 1; b <= 10 && problems.length < count; b++) {
        const key = `${a}x${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        problems.push({ id: id++, a, b, correct: a * b, type: 'multiplication' });
      }
    }
  }
  return problems;
}

export function generateSchriftlichProblems(count = 10) {
  const problems = [];
  const halfCount = Math.floor(count / 2);
  for (let i = 0; i < count; i++) {
    const operation = i < halfCount ? 'add' : 'subtract';
    let a, b, correct;
    if (operation === 'add') {
      a = Math.floor(Math.random() * 9000) + 1000;
      b = Math.floor(Math.random() * 9000) + 1000;
      correct = a + b;
    } else {
      a = Math.floor(Math.random() * 9000) + 1000;
      b = Math.floor(Math.random() * (a - 1000)) + 1000;
      if (b >= a) b = a - 1;
      correct = a - b;
    }
    problems.push({
      id: i + 1,
      a,
      b,
      correct,
      type: 'schriftlich',
      operation,
      aDigits: String(a).padStart(4, '0').split('').map(Number),
      bDigits: String(b).padStart(4, '0').split('').map(Number),
      correctDigits: String(correct).padStart(operation === 'add' ? 5 : 4, '0').split('').map(Number)
    });
  }
  return problems;
}

export function generatePrimfaktorisierungProblems(count = 20) {
  const problems = [];
  const getPrimeFactors = (n) => {
    const factors = [];
    let d = 2;
    while (n > 1) {
      while (n % d === 0) {
        factors.push(d);
        n /= d;
      }
      d++;
      if (d * d > n && n > 1) {
        factors.push(n);
        break;
      }
    }
    return factors;
  };
  for (let i = 0; i < count; i++) {
    const num = Math.floor(Math.random() * 189) + 12;
    const factors = getPrimeFactors(num);
    problems.push({ id: i + 1, number: num, correct: factors.join(' '), factors, type: 'primfaktorisierung' });
  }
  return problems;
}

export function generateProblems(count, category, settings = {}) {
  if (category === 'einmaleins') return generateEinmaleinsProblems(count, settings);
  if (category === 'schriftlich') return generateSchriftlichProblems(count);
  if (category === 'primfaktorisierung') return generatePrimfaktorisierungProblems(count);
  return [];
}
