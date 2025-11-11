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

export function generateSchriftlichProblems(count = 15) {
  const additionCount = Math.floor(count / 3);
  const subtractionCount = Math.floor(count / 3);
  const multiplicationCount = count - additionCount - subtractionCount;

  const addition = [];
  const subtraction = [];
  const multiplication = [];

  for (let i = 0; i < additionCount; i++) {
    const a = Math.floor(Math.random() * 9000) + 1000;
    const b = Math.floor(Math.random() * 9000) + 1000;
    const correct = a + b;
    addition.push({
      a,
      b,
      correct,
      type: 'schriftlich',
      operation: 'add',
      aDigits: String(a).split('').map(Number),
      bDigits: String(b).split('').map(Number),
      correctDigits: String(correct).padStart(5, '0').split('').map(Number)
    });
  }

  for (let i = 0; i < subtractionCount; i++) {
    const a = Math.floor(Math.random() * 9000) + 1000;
    let b = Math.floor(Math.random() * (a - 1000)) + 1000;
    if (b >= a) b = a - 1;
    const correct = a - b;
    subtraction.push({
      a,
      b,
      correct,
      type: 'schriftlich',
      operation: 'subtract',
      aDigits: String(a).split('').map(Number),
      bDigits: String(b).split('').map(Number),
      correctDigits: String(correct).padStart(4, '0').split('').map(Number)
    });
  }

  for (let i = 0; i < multiplicationCount; i++) {
    const a = Math.floor(Math.random() * 900) + 100; // 100-999
    const b = Math.floor(Math.random() * 900) + 100; // 100-999
    const correct = a * b;
    const correctDigits = String(correct).split('').map(Number);
    const bDigits = String(b).split('').map(Number);
    const cols = correctDigits.length;
    const partialProducts = bDigits.map((digit, idx) => {
      const shift = bDigits.length - idx - 1;
      const partialValueDigits = String(a * digit).split('').map(Number);
      const row = Array(cols).fill(null);
      for (let k = 0; k < partialValueDigits.length; k++) {
        const targetIndex = cols - 1 - shift - k;
        if (targetIndex >= 0) {
          row[targetIndex] = partialValueDigits[partialValueDigits.length - 1 - k];
        }
      }
      return row;
    });
    multiplication.push({
      a,
      b,
      correct,
      type: 'schriftlich',
      operation: 'multiply',
      aDigits: String(a).split('').map(Number),
      bDigits,
      correctDigits,
      partialProducts
    });
  }

  const combined = [...addition, ...subtraction, ...multiplication];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.map((problem, index) => ({ ...problem, id: index + 1 }));
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
