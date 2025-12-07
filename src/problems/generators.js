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

export function generateSchriftlichProblems(count = 15, settings = {}) {
  // Default to all true if settings are missing or properties are undefined
  const {
    schriftlichAdd = true,
    schriftlichSubtract = true,
    schriftlichMultiply = true
  } = settings;

  // Determine enabled types
  const types = [];
  if (schriftlichAdd) types.push('add');
  if (schriftlichSubtract) types.push('subtract');
  if (schriftlichMultiply) types.push('multiply');

  // Fallback: if nothing selected, enable all
  if (types.length === 0) {
    types.push('add', 'subtract', 'multiply');
  }

  // Distribute count
  const baseCount = Math.floor(count / types.length);
  const remainder = count % types.length;

  const counts = {
    add: types.includes('add') ? baseCount : 0,
    subtract: types.includes('subtract') ? baseCount : 0,
    multiply: types.includes('multiply') ? baseCount : 0
  };

  // Distribute remainder
  for (let i = 0; i < remainder; i++) {
    counts[types[i]]++;
  }

  const addition = [];
  const subtraction = [];
  const multiplication = [];

  for (let i = 0; i < counts.add; i++) {
    // Randomly choose 2, 3, or 4 summands with bias towards 2
    const choices = [2, 3, 4];
    const weights = [3, 2, 1];
    const totalW = weights.reduce((a,b)=>a+b,0);
    const r = Math.random() * totalW;
    let pick = 2;
    let acc = 0;
    for (let j = 0; j < choices.length; j++) {
      acc += weights[j];
      if (r <= acc) { pick = choices[j]; break; }
    }

    const nums = Array.from({ length: pick }).map(() => Math.floor(Math.random() * 9000) + 1000);
    const correct = nums.reduce((s,n)=>s+n,0);
    const summandsDigits = nums.map(n => String(n).split('').map(Number));

    addition.push({
      // Backward-compat fields for components already expecting a/b
      a: nums[0],
      b: nums[1] ?? 0,
      correct,
      type: 'schriftlich',
      operation: 'add',
      aDigits: String(nums[0]).split('').map(Number),
      bDigits: nums[1] != null ? String(nums[1]).split('').map(Number) : [],
      summandsDigits,
      correctDigits: String(correct).padStart(5, '0').split('').map(Number)
    });
  }

  for (let i = 0; i < counts.subtract; i++) {
    // Generate 5-digit subtraction with increased likelihood of borrows
    const genMinuend = () => Math.floor(Math.random() * 90000) + 10000; // 10000-99999
    const estimateBorrows = (aDigits, bDigits) => {
      // Approximate: count positions where a digit < b digit (right-to-left)
      let count = 0;
      for (let k = aDigits.length - 1, j = bDigits.length - 1; k >= 0; k--, j--) {
        const ad = aDigits[k] || 0;
        const bd = j >= 0 ? bDigits[j] : 0;
        if (ad < bd) count++;
      }
      return count;
    }
    let a = genMinuend();
    let b;
    let attempts = 0;
    while (attempts < 20) {
      // Prefer subtrahends closer to minuend to increase borrow chances
      // Choose b as a random value in [a-9000, a-1], clamped to >=10000
      const minB = Math.max(10000, a - 9000);
      const maxB = a - 1;
      b = Math.floor(Math.random() * (maxB - minB + 1)) + minB;
      const aDigits = String(a).split('').map(Number);
      const bDigits = String(b).split('').map(Number);
      const borrows = estimateBorrows(aDigits, bDigits);
      if (borrows >= 2) break; // good enough likelihood of borrows
      attempts++;
      if (attempts % 5 === 0) a = genMinuend(); // refresh minuend sometimes
    }
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
      // Do not pad with leading zeros; use natural digit length
      correctDigits: String(correct).split('').map(Number)
    });
  }

  for (let i = 0; i < counts.multiply; i++) {
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

export function generatePrimfaktorisierungProblems(count = 20, settings = {}) {
  const { primfaktorisierung_easy = true, primfaktorisierung_hard = true } = settings;
  
  // Fallback: if both false, enable both
  const useEasy = primfaktorisierung_easy || (!primfaktorisierung_easy && !primfaktorisierung_hard);
  const useHard = primfaktorisierung_hard || (!primfaktorisierung_easy && !primfaktorisierung_hard);

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
    let num;
    if (useEasy && useHard) {
      // 12 to 200
      num = Math.floor(Math.random() * 189) + 12;
    } else if (useEasy) {
      // 12 to 100
      num = Math.floor(Math.random() * 89) + 12;
    } else {
      // 101 to 200
      num = Math.floor(Math.random() * 100) + 101;
    }
    const factors = getPrimeFactors(num);
    problems.push({ id: i + 1, number: num, correct: factors.join(' '), factors, type: 'primfaktorisierung' });
  }
  return problems;
}

export function generateNegativeProblems(count = 20, settings = {}) {
  const {
    negativeAdd = true,
    negativeSubtract = true,
    negativeMultiply = true,
    negativeDivide = true,
    negativeExplicitPlus = false
  } = settings;

  const types = [];
  if (negativeAdd) types.push('add');
  if (negativeSubtract) types.push('subtract');
  if (negativeMultiply) types.push('multiply');
  if (negativeDivide) types.push('divide');

  if (types.length === 0) types.push('add', 'subtract', 'multiply', 'divide');

  const problems = [];
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    let a, b, expression, correct, operator;
    let attempts = 0;

    do {
      attempts++;
      switch (type) {
        case 'add':
          a = Math.floor(Math.random() * 41) - 20; // -20 to 20
          b = Math.floor(Math.random() * 41) - 20;
          operator = '+';
          expression = `${a < 0 ? `(${a})` : a} + ${b < 0 ? `(${b})` : b}`;
          correct = a + b;
          break;
        case 'subtract':
          a = Math.floor(Math.random() * 41) - 20; // -20 to 20
          b = Math.floor(Math.random() * 41) - 20;
          operator = '−';
          expression = `${a < 0 ? `(${a})` : a} - ${b < 0 ? `(${b})` : b}`;
          correct = a - b;
          break;
        case 'multiply':
          a = Math.floor(Math.random() * 25) - 12; // -12 to 12
          b = Math.floor(Math.random() * 25) - 12;
          operator = '·';
          expression = `${a < 0 ? `(${a})` : a} · ${b < 0 ? `(${b})` : b}`;
          correct = a * b;
          break;
        case 'divide':
          b = Math.floor(Math.random() * 25) - 12;
          if (b === 0) b = 1;
          const res = Math.floor(Math.random() * 25) - 12;
          a = b * res;
          operator = '∶';
          expression = `${a < 0 ? `(${a})` : a} ∶ ${b < 0 ? `(${b})` : b}`;
          correct = res;
          break;
      }
      // Retry if no negative numbers are involved (operands positive and result positive)
      // We allow it occasionally (15% chance) to keep some variety
    } while (a >= 0 && b >= 0 && correct >= 0 && Math.random() > 0.15 && attempts < 10);

    // Update expression if explicit plus is requested
    if (negativeExplicitPlus) {
      const formatOperand = (val) => val < 0 ? `(${val})` : `(+${val})`;
      expression = `${formatOperand(a)} ${operator} ${formatOperand(b)}`;
    }

    problems.push({ id: i + 1, expression, a, b, operator, correct, type: 'negative', explicitPlus: negativeExplicitPlus });
  }
  return problems;
}

export function generateProblems(count, category, settings = {}) {
  if (category === 'einmaleins') return generateEinmaleinsProblems(count, settings);
  if (category === 'schriftlich') return generateSchriftlichProblems(count, settings);
  if (category === 'primfaktorisierung') return generatePrimfaktorisierungProblems(count, settings);
  if (category === 'negative') return generateNegativeProblems(count, settings);
  return [];
}
