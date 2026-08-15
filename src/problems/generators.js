// Problem generators extracted from Game.jsx

export function generateEinmaleinsProblems(count, settings) {
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

export function generateSchriftlichProblems(count, settings) {
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

export function generateSchriftlichDivisionProblems(count, settings = {}) {
  const {
    schriftlichDivideSingleDigit = true,
    schriftlichDivideTeens = false,
    schriftlichDivideLarge = false
  } = settings

  const divisorPool = []
  if (schriftlichDivideSingleDigit) for (let n = 2; n <= 9; n++) divisorPool.push(n)
  if (schriftlichDivideTeens) for (let n = 11; n <= 19; n++) divisorPool.push(n)
  if (schriftlichDivideLarge) for (let n = 21; n <= 99; n++) divisorPool.push(n)
  if (!divisorPool.length) for (let n = 2; n <= 9; n++) divisorPool.push(n)

  return Array.from({ length: count }, (_, index) => {
    const divisor = divisorPool[Math.floor(Math.random() * divisorPool.length)]
    // Exact quotients keep the focus on the written procedure. Results have
    // 3–4 digits so every task contains several subtraction steps.
    // Zero-free quotient digits make each quotient place visible as an
    // abziehbarer Schritt (and avoid a special-case empty subtraction row).
    const quotient = Number(Array.from(
      { length: Math.random() < 0.5 ? 3 : 4 },
      () => Math.floor(Math.random() * 9) + 1
    ).join(''))
    const dividend = divisor * quotient
    const dividendString = String(dividend)
    const quotientDigits = String(quotient).split('').map(Number)
    const steps = []
    let partial = 0
    let quotientIndex = 0

    for (let digitIndex = 0; digitIndex < dividendString.length; digitIndex++) {
      const digit = dividendString[digitIndex]
      partial = partial * 10 + Number(digit)
      if (partial < divisor) continue
      const quotientDigit = quotientDigits[quotientIndex++]
      const product = quotientDigit * divisor
      const remainder = partial - product
      steps.push({ partial, product, remainder, endIndex: digitIndex })
      partial = remainder
    }

    return {
      id: index + 1,
      a: dividend,
      b: divisor,
      correct: quotient,
      type: 'schriftlich',
      operation: 'divide',
      aDigits: dividendString.split('').map(Number),
      bDigits: String(divisor).split('').map(Number),
      correctDigits: quotientDigits,
      divisionSteps: steps
    }
  })
}

export function generatePrimfaktorisierungProblems(count) {
  const getPrimeFactors = (n) => {
    const factors = [];
    let d = 2;
    while (n > 1) {
      while (n % d === 0) { factors.push(d); n /= d; }
      d++;
      if (d * d > n && n > 1) { factors.push(n); break; }
    }
    return factors;
  };
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Tier 1: products from the 2-10 times table (all composite by construction)
  const tier1Set = new Set();
  for (let a = 2; a <= 10; a++)
    for (let b = a; b <= 10; b++)
      tier1Set.add(a * b);
  const tier1Pool = Array.from(tier1Set);

  // Tier 2: all numbers 12-100 NOT appearing in the times table (composites + primes like 13, 17, 23…)
  const tier2Pool = [];
  for (let n = 12; n <= 100; n++)
    if (!tier1Set.has(n)) tier2Pool.push(n);

  // Tier 3: all numbers 101-200 (composites + primes like 101, 103, 107…)
  const tier3Pool = [];
  for (let n = 101; n <= 200; n++) tier3Pool.push(n);

  const t1Count = Math.min(10, count);
  const t2Count = Math.min(5, Math.max(0, count - t1Count));
  const t3Count = Math.max(0, count - t1Count - t2Count);

  const t1 = shuffle(tier1Pool).slice(0, t1Count);
  const t2 = shuffle(tier2Pool).slice(0, t2Count);
  const shuffled3 = shuffle(tier3Pool);
  const t3 = Array.from({ length: t3Count }, (_, i) => shuffled3[i % shuffled3.length]);

  let id = 1;
  return [...t1, ...t2, ...t3].map(num => {
    const factors = getPrimeFactors(num);
    return { id: id++, number: num, correct: factors.join(' '), factors, type: 'primfaktorisierung' };
  });
}

export function generateNegativeProblems(count, settings) {
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
          expression = `${a < 0 ? `(${a})` : a} − ${b < 0 ? `(${b})` : b}`;
          correct = a - b;
          break;
        case 'multiply':
          a = Math.floor(Math.random() * 25) - 12; // -12 to 12
          b = Math.floor(Math.random() * 25) - 12;
          operator = '·';
          expression = `${a < 0 ? `(${a})` : a} · ${b < 0 ? `(${b})` : b}`;
          correct = a * b;
          break;
        case 'divide': {
          b = Math.floor(Math.random() * 25) - 12;
          if (b === 0) b = 1;
          const res = Math.floor(Math.random() * 25) - 12;
          a = b * res;
          operator = '∶';
          expression = `${a < 0 ? `(${a})` : a} ∶ ${b < 0 ? `(${b})` : b}`;
          correct = res;
          break;
        }
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

export function generateBinomischeProblems(count, settings) {
  const { binomische_simple = true, binomische_hard = true } = settings;
  const useSimple = binomische_simple || (!binomische_simple && !binomische_hard);
  const useHard = binomische_hard || (!binomische_simple && !binomische_hard);

  const problems = [];
  const variables = ['a', 'b', 'x', 'y', 'n'];

  for (let i = 0; i < count; i++) {
    const isHard = useHard && (!useSimple || Math.random() < 0.5);
    const variable = variables[Math.floor(Math.random() * variables.length)];
    
    // 1: (a+b)^2, 2: (a-b)^2, 3: (a+b)(a-b)
    const type = Math.floor(Math.random() * 3) + 1; 
    
    let expanded;
    
    // Generate coefficients
    // Simple: integers 1-12
    // Hard: one is a decimal 1.1 - 1.9 (requiring 11^2 - 19^2)
    
    let val1, val2;
    
    if (isHard) {
      const lowDecimal = (Math.floor(Math.random() * 9) + 1) / 10;
      const highDecimal = (Math.floor(Math.random() * 9) + 11) / 10;
      const smallInteger = Math.floor(Math.random() * 4) + 1;
      const easyPartners = [0.5, 1, 5];

      if (Math.random() < 0.5) {
        val1 = lowDecimal;
        val2 = smallInteger;
      } else {
        val1 = highDecimal;
        val2 = easyPartners[Math.floor(Math.random() * easyPartners.length)];
      }

      if (Math.random() < 0.5) {
        [val1, val2] = [val2, val1];
      }
    } else {
      val1 = Math.floor(Math.random() * 12) + 1;
      val2 = Math.floor(Math.random() * 12) + 1;
      // Avoid 1x, just x
    }

    // Construct terms
    // Usually one term has variable, one is number. Or both variables?
    // "expand sth like (x+2)^2 or (3a-7)(3a+7)"
    // So usually term1 is linear in variable, term2 is constant.
    // Or term1 is like 3a.
    
    const coeff1 = val1;
    const coeff2 = val2;
    
    // Format helper
    const fmt = (n) => {
      if (n === 1) return '';
      return String(n);
    };

    const formatDisplayNumber = (n) => formatDecimal(n, { maximumFractionDigits: 4 });

    const formatDisplayCoefficient = (n) => {
      if (n === 1) return '';
      return formatDisplayNumber(n);
    };
    
    // Term 1 has variable
    const t1Str = `${formatDisplayCoefficient(coeff1)}${variable}`;
    // Term 2 is constant number
    const t2Str = formatDisplayNumber(coeff2);

    // Calculate expanded form
    // (c1*x + c2)^2 = (c1^2)x^2 + (2*c1*c2)x + c2^2
    // (c1*x - c2)^2 = (c1^2)x^2 - (2*c1*c2)x + c2^2
    // (c1*x + c2)(c1*x - c2) = (c1^2)x^2 - c2^2
    
    // Helper to format number, handling decimals nicely
    const fmtNum = (n) => {
      return parseFloat(n.toFixed(2)); // Remove floating point artifacts
    };

    const sq1 = fmtNum(coeff1 * coeff1);
    const sq2 = fmtNum(coeff2 * coeff2);
    const prod = fmtNum(2 * coeff1 * coeff2);
    
    let expression;
    
    if (type === 1) {
      // (a+b)^2
      expression = `(${t1Str} + ${t2Str})²`;
      expanded = `${fmt(sq1)}${variable}^2 + ${prod}${variable} + ${sq2}`;
    } else if (type === 2) {
      // (a-b)^2
      expression = `(${t1Str} − ${t2Str})²`;
      expanded = `${fmt(sq1)}${variable}^2 - ${prod}${variable} + ${sq2}`;
    } else {
      // (a+b)(a-b)
      expression = `(${t1Str} + ${t2Str})(${t1Str} − ${t2Str})`;
      expanded = `${fmt(sq1)}${variable}^2 - ${sq2}`;
    }
    
    // Clean up "1x^2" to "x^2" if sq1 is 1
    if (sq1 === 1) {
      expanded = expanded.replace(/^1([a-z])/, '$1');
    }

    problems.push({ 
      id: i + 1, 
      expression, 
      correct: expanded, 
      type: 'binomische',
      variant: isHard ? 'hard' : 'simple',
      variable 
    });
  }
  return problems;
}

// ─── Prozentrechnung mit Gleichungen ────────────────────────────────────────
import { formatDecimal, formatFractionPercent } from '../utils/formatNumber'

function fmtPct(p) {
  // Format p/100 as German decimal string using central helper
  return formatFractionPercent(p)
}

function formatEmbeddedNumbersInText(text) {
  if (typeof text !== 'string') return text
  return text.replace(/(\d+\.\d+)/g, (m) => formatDecimal(Number(m), { maximumFractionDigits: 4 }))
}

const NAMES = ['Anna', 'Ben', 'Clara', 'David', 'Emma', 'Felix', 'Greta', 'Jonas', 'Karla', 'Leon', 'Mia', 'Noah', 'Olivia', 'Paul', 'Rosa', 'Tim', 'Zara']

function rndName() {
  return NAMES[Math.floor(Math.random() * NAMES.length)]
}

// Each context supports all three basic question types.
//   valid(G)                → true when G is realistic for this scenario
//   findeG({p, P, G})       → {text,unit}  ask for Grundwert    (x = G)
//   findeP({p, G, P})       → {text,unit}  ask for Prozentwert  (x = P)
//   findeProzentsatz({G, P}) → {text,unit}  ask for Prozentsatz  (x = p)
//
// ── Einfach-Kontexte (Grundtypen) ───────────────────────────────────────────
const EINFACH_CONTEXTS = [
  {
    valid: G => G >= 200 && G <= 1200,
    findeG: ({ p, P }) => ({
      text: `${P} Schülerinnen und Schüler einer Schule fahren mit dem Bus. Das sind ${p}% aller Schülerinnen und Schüler. Wie viele Schüler hat die Schule insgesamt?`,
      unit: 'Schüler'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Schule hat ${G} Schülerinnen und Schüler. ${p}% davon fahren mit dem Bus zur Schule. Wie viele Schüler fahren mit dem Bus?`,
      unit: 'Schüler'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Schule hat ${G} Schülerinnen und Schüler. ${P} davon fahren mit dem Bus. Wie viel Prozent fahren mit dem Bus?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 100 && G <= 500,
    findeG: ({ p, P }) => ({
      text: `Im Zoo leben ${P} Tiere in der Außenanlage. Das entspricht ${p}% aller Tiere. Wie viele Tiere hat der Zoo insgesamt?`,
      unit: 'Tiere'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Zoo hat ${G} Tiere. ${p}% davon leben in der Außenanlage. Wie viele Tiere leben in der Außenanlage?`,
      unit: 'Tiere'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Ein Zoo hat ${G} Tiere. ${P} davon leben in der Außenanlage. Wie viel Prozent der Tiere leben in der Außenanlage?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 20 && G <= 100,
    findeG: ({ p, P }) => {
      const name = rndName()
      return {
        text: `${name} spart ${p}% seines Taschengeldes. Diesen Monat spart ${name} ${P}€. Wie viel Taschengeld bekommt ${name} pro Monat?`,
        unit: '€'
      }
    },
    findeP: ({ p, G }) => {
      const name = rndName()
      return {
        text: `${name} bekommt ${G}€ Taschengeld im Monat und spart davon ${p}%. Wie viel Euro spart ${name} pro Monat?`,
        unit: '€'
      }
    },
    findeProzentsatz: ({ G, P }) => {
      const name = rndName()
      return {
        text: `${name} bekommt ${G}€ Taschengeld im Monat und spart davon ${P}€. Wie viel Prozent spart ${name}?`,
        unit: '%'
      }
    },
  },
  {
    valid: G => G >= 200 && G <= 600,
    findeG: ({ p, P }) => ({
      text: `Ein Käsestück enthält ${P} g Fett. Der Fettanteil beträgt ${p}% des Gesamtgewichts. Wie schwer ist das Käsestück?`,
      unit: 'g'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Käsestück wiegt ${G} g. Der Fettanteil beträgt ${p}%. Wie viel Gramm Fett enthält das Käsestück?`,
      unit: 'g'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Ein Käsestück wiegt ${G} g und enthält ${P} g Fett. Wie hoch ist der Fettanteil in Prozent?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 200 && G <= 2000,
    findeG: ({ p, P }) => ({
      text: `In einer Bücherei sind gerade ${P} Bücher ausgeliehen. Das sind ${p}% des Gesamtbestands. Wie viele Bücher hat die Bücherei insgesamt?`,
      unit: 'Bücher'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Bücherei hat ${G} Bücher. Gerade sind ${p}% ausgeliehen. Wie viele Bücher sind ausgeliehen?`,
      unit: 'Bücher'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Bücherei hat ${G} Bücher. Gerade sind ${P} davon ausgeliehen. Wie viel Prozent des Bestands sind ausgeliehen?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 100 && G <= 1000,
    findeG: ({ p, P }) => ({
      text: `Von einer Obsternte sind ${P} kg Äpfel. Äpfel machen ${p}% der Gesamternte aus. Wie schwer ist die Gesamternte?`,
      unit: 'kg'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Obsternte wiegt ${G} kg. Davon sind ${p}% Äpfel. Wie viele Kilogramm sind Äpfel?`,
      unit: 'kg'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Obsternte wiegt ${G} kg, davon sind ${P} kg Äpfel. Wie viel Prozent der Ernte sind Äpfel?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 40 && G <= 80,
    findeG: ({ p, P }) => ({
      text: `Ein Auto hat noch ${p}% Tankfüllung, das sind ${P} Liter. Wie viele Liter fasst der Tank insgesamt?`,
      unit: 'Liter'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Autotank fasst ${G} Liter. Der Tank ist zu ${p}% gefüllt. Wie viele Liter sind im Tank?`,
      unit: 'Liter'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Ein Autotank fasst ${G} Liter. Gerade sind ${P} Liter im Tank. Zu wie viel Prozent ist der Tank gefüllt?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 100 && G <= 1000,
    findeG: ({ p, P }) => ({
      text: `Bei einer Umfrage haben ${P} Personen mit „Ja" gestimmt. Das entspricht ${p}% aller Befragten. Wie viele Personen wurden insgesamt befragt?`,
      unit: 'Personen'
    }),
    findeP: ({ p, G }) => ({
      text: `An einer Umfrage nehmen ${G} Personen teil. ${p}% stimmen mit „Ja". Wie viele Personen stimmen mit „Ja"?`,
      unit: 'Personen'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `An einer Umfrage nehmen ${G} Personen teil. ${P} davon stimmen mit „Ja". Wie viel Prozent stimmen mit „Ja"?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 200 && G <= 400,
    findeG: ({ p, P }) => ({
      text: `Ein Pullover enthält ${P} g reine Wolle. Der Wollanteil beträgt ${p}% des Gesamtgewichts. Wie schwer ist der Pullover?`,
      unit: 'g'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Pullover wiegt ${G} g. Der Wollanteil beträgt ${p}%. Wie viel Gramm Wolle enthält der Pullover?`,
      unit: 'g'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Ein Pullover wiegt ${G} g und enthält ${P} g reine Wolle. Wie hoch ist der Wollanteil in Prozent?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 200 && G <= 1200,
    findeG: ({ p, P }) => ({
      text: `${P} Mädchen besuchen eine Gesamtschule. Sie machen ${p}% aller Schülerinnen und Schüler aus. Wie viele Schüler hat die Schule insgesamt?`,
      unit: 'Schüler'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Gesamtschule hat ${G} Schülerinnen und Schüler. ${p}% davon sind Mädchen. Wie viele Mädchen besuchen die Schule?`,
      unit: 'Schüler'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Gesamtschule hat ${G} Schülerinnen und Schüler, davon sind ${P} Mädchen. Wie hoch ist der Anteil der Mädchen in Prozent?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 60 && G <= 600,
    findeG: ({ p, P }) => ({
      text: `Die Kopfhörer zeigen noch ${p}% Akku, das entspricht ${P} Minuten Restlaufzeit. Wie viele Minuten hält der Akku voll geladen?`,
      unit: 'Minuten'
    }),
    findeP: ({ p, G }) => ({
      text: `Kopfhörer halten voll geladen ${G} Minuten. Aktuell sind noch ${p}% Akku vorhanden. Wie viele Minuten Restlaufzeit sind das?`,
      unit: 'Minuten'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Kopfhörer halten voll geladen ${G} Minuten. Noch ${P} Minuten sind übrig. Wie viel Prozent Akku ist noch vorhanden?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 500 && G <= 2000,
    findeG: ({ p, P }) => ({
      text: `${P} Einwohner eines Dorfes sind unter 18 Jahre alt. Das entspricht ${p}% der Gesamtbevölkerung. Wie viele Einwohner hat das Dorf?`,
      unit: 'Einwohner'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Dorf hat ${G} Einwohner. ${p}% davon sind unter 18 Jahre alt. Wie viele Einwohner sind unter 18?`,
      unit: 'Einwohner'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Ein Dorf hat ${G} Einwohner. ${P} davon sind unter 18 Jahre alt. Wie viel Prozent der Einwohner sind unter 18?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 500 && G <= 2000,
    findeG: ({ p, P }) => ({
      text: `Eine Bäckerei spendet jeden Monat ${p}% ihres Umsatzes an eine Tafel. Das sind ${P}€. Wie hoch ist der monatliche Umsatz?`,
      unit: '€'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Bäckerei hat einen monatlichen Umsatz von ${G}€. Sie spendet ${p}% davon an die Tafel. Wie viel Euro spendet sie pro Monat?`,
      unit: '€'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Bäckerei hat einen monatlichen Umsatz von ${G}€ und spendet ${P}€ davon. Wie viel Prozent des Umsatzes werden gespendet?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 500 && G <= 2000,
    findeG: ({ p, P }) => ({
      text: `In einem Stadtwald gibt es ${P} Eichen. Eichen machen ${p}% aller Bäume aus. Wie viele Bäume hat der Wald insgesamt?`,
      unit: 'Bäume'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Stadtwald hat ${G} Bäume. ${p}% davon sind Eichen. Wie viele Eichen gibt es im Wald?`,
      unit: 'Bäume'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Ein Stadtwald hat ${G} Bäume, davon sind ${P} Eichen. Wie hoch ist der Anteil der Eichen in Prozent?`,
      unit: '%'
    }),
  },
  {
    valid: G => G >= 40 && G <= 100,
    findeG: ({ p, P }) => ({
      text: `Bei einer Klassenarbeit hat eine Schülerin ${P} Punkte erreicht. Das entspricht ${p}% der möglichen Gesamtpunktzahl. Wie viele Punkte können insgesamt erreicht werden?`,
      unit: 'Punkte'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Klassenarbeit hat insgesamt ${G} Punkte. Eine Schülerin erreicht ${p}% der Punkte. Wie viele Punkte hat sie?`,
      unit: 'Punkte'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Klassenarbeit hat ${G} Punkte. Eine Schülerin erreicht ${P} Punkte. Wie viel Prozent der möglichen Punkte hat sie erreicht?`,
      unit: '%'
    }),
  },
  // 16: Turm / Gebäudehöhe
  {
    valid: G => G >= 20 && G <= 500,
    findeG: ({ p, P }) => ({
      text: `Ein Aussichtsturm ist ${P} m hoch. Das entspricht ${p}% der Höhe des benachbarten Kirchturms. Wie hoch ist der Kirchturm?`,
      unit: 'm'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Kirchturm ist ${G} m hoch. Ein Aussichtsturm daneben erreicht ${p}% dieser Höhe. Wie hoch ist der Aussichtsturm?`,
      unit: 'm'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Ein Kirchturm ist ${G} m hoch. Ein Wasserturm in der Nähe ist ${P} m hoch. Wie viel Prozent der Kirchturmhöhe beträgt der Wasserturm?`,
      unit: '%'
    }),
  },
  // 17: Pflanzenhöhe
  {
    valid: G => G >= 20 && G <= 200,
    findeG: ({ p, P }) => ({
      text: `Eine Sonnenblume ist bereits ${P} cm gewachsen. Das sind ${p}% ihrer späteren Endgröße. Wie groß wird die Sonnenblume?`,
      unit: 'cm'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Tomatenpflanze erreicht eine Höhe von ${G} cm. Nach drei Wochen hat sie ${p}% dieser Höhe erreicht. Wie groß ist sie jetzt?`,
      unit: 'cm'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Bohnenpflanze wird ${G} cm hoch. Momentan misst sie ${P} cm. Wie viel Prozent ihrer Endgröße hat die Pflanze bereits erreicht?`,
      unit: '%'
    }),
  },
  // 18: Backrezept
  {
    valid: G => G >= 200 && G <= 1000,
    findeG: ({ p, P }) => ({
      text: `Für einen Kuchen werden ${P} g Mehl benötigt. Mehl macht ${p}% des gesamten Teiggewichts aus. Wie schwer ist der Teig insgesamt?`,
      unit: 'g'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Kuchenteig wiegt ${G} g. ${p}% davon ist Mehl. Wie viel Gramm Mehl wurden verwendet?`,
      unit: 'g'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Ein Kuchenteig wiegt ${G} g und enthält ${P} g Zucker. Wie hoch ist der Zuckeranteil in Prozent?`,
      unit: '%'
    }),
  },
  // 19: Radtour
  {
    valid: G => G >= 20 && G <= 200,
    findeG: ({ p, P }) => {
      const name = rndName()
      return {
        text: `${name} hat auf einer Radtour bereits ${P} km zurückgelegt. Das sind ${p}% der Gesamtstrecke. Wie lang ist die Tour insgesamt?`,
        unit: 'km'
      }
    },
    findeP: ({ p, G }) => {
      const name = rndName()
      return {
        text: `Eine Radtour ist ${G} km lang. ${name} hat ${p}% der Strecke bereits gefahren. Wie viele Kilometer sind das?`,
        unit: 'km'
      }
    },
    findeProzentsatz: ({ G, P }) => {
      const name = rndName()
      return {
        text: `Eine Radtour ist ${G} km lang. ${name} hat bereits ${P} km zurückgelegt. Wie viel Prozent der Strecke ist das?`,
        unit: '%'
      }
    },
  },
  // 20: Berghöhe
  {
    valid: G => G >= 100 && G <= 2000,
    findeG: ({ p, P }) => ({
      text: `Eine Berghütte liegt auf ${P} m Höhe. Das entspricht ${p}% der Gipfelhöhe. Wie hoch ist der Gipfel?`,
      unit: 'm'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Berg ist ${G} m hoch. Eine Schutzhütte liegt auf ${p}% dieser Höhe. Auf wie vielen Metern liegt die Hütte?`,
      unit: 'm'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Ein Berg ist ${G} m hoch. Der erste Wegpunkt liegt auf ${P} m. Wie viel Prozent der Gipfelhöhe entspricht das?`,
      unit: '%'
    }),
  },
  // 21: Sparziel
  {
    valid: G => G >= 100 && G <= 2000,
    findeG: ({ p, P }) => {
      const name = rndName()
      return {
        text: `${name} hat bereits ${P}€ gespart. Das sind ${p}% ihres Sparziels. Wie hoch ist das Sparziel?`,
        unit: '€'
      }
    },
    findeP: ({ p, G }) => {
      const name = rndName()
      return {
        text: `${name} möchte ${G}€ sparen und hat bereits ${p}% davon angespart. Wie viel Euro hat ${name} schon?`,
        unit: '€'
      }
    },
    findeProzentsatz: ({ G, P }) => {
      const name = rndName()
      return {
        text: `${name} hat ein Sparziel von ${G}€ und bereits ${P}€ zurückgelegt. Wie viel Prozent des Ziels hat ${name} erreicht?`,
        unit: '%'
      }
    },
  },
  // 22: Fußball
  {
    valid: G => G >= 20 && G <= 500,
    findeG: ({ p, P }) => ({
      text: `Ein Torwart hat ${P} Schüsse abgewehrt. Das sind ${p}% aller Schüsse auf sein Tor. Wie viele Schüsse gab es insgesamt?`,
      unit: 'Schüsse'
    }),
    findeP: ({ p, G }) => ({
      text: `Auf ein Tor wurden ${G} Schüsse abgegeben. Der Torwart hielt ${p}% davon. Wie viele Schüsse hat er gehalten?`,
      unit: 'Schüsse'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Auf ein Tor wurden ${G} Schüsse abgegeben. ${P} davon waren Treffer. Wie hoch ist die Trefferquote in Prozent?`,
      unit: '%'
    }),
  },
  // 23: Theater / Kino
  {
    valid: G => G >= 100 && G <= 2000,
    findeG: ({ p, P }) => ({
      text: `Für eine Theatervorstellung wurden ${P} Karten verkauft. Das sind ${p}% aller verfügbaren Plätze. Wie viele Plätze hat das Theater?`,
      unit: 'Plätze'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Theater hat ${G} Sitzplätze. Für die Vorstellung wurden ${p}% aller Plätze gebucht. Wie viele Karten wurden verkauft?`,
      unit: 'Karten'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Ein Kino hat ${G} Sitzplätze. Bei einer Vorstellung sind ${P} Plätze besetzt. Wie hoch ist die Auslastung in Prozent?`,
      unit: '%'
    }),
  },
  // 24: Buch lesen
  {
    valid: G => G >= 100 && G <= 1000,
    findeG: ({ p, P }) => {
      const name = rndName()
      return {
        text: `${name} hat bereits ${P} Seiten eines Romans gelesen. Das sind ${p}% des Buches. Wie viele Seiten hat der Roman?`,
        unit: 'Seiten'
      }
    },
    findeP: ({ p, G }) => {
      const name = rndName()
      return {
        text: `${name} liest einen Roman mit ${G} Seiten und hat ${p}% davon gelesen. Wie viele Seiten sind das?`,
        unit: 'Seiten'
      }
    },
    findeProzentsatz: ({ G, P }) => {
      const name = rndName()
      return {
        text: `${name} liest ein Buch mit ${G} Seiten und ist auf Seite ${P}. Wie viel Prozent hat ${name} bereits gelesen?`,
        unit: '%'
      }
    },
  },
  // 25: Regentonne / Gartenteich
  {
    valid: G => G >= 200 && G <= 2000,
    findeG: ({ p, P }) => ({
      text: `Eine Regentonne enthält nach einem Schauer ${P} Liter Wasser. Das entspricht ${p}% ihrer Fassungskapazität. Wie viele Liter fasst die Tonne?`,
      unit: 'Liter'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Regentonne fasst ${G} Liter. Nach einem Schauer sind ${p}% davon befüllt. Wie viele Liter sind drin?`,
      unit: 'Liter'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Regentonne fasst ${G} Liter. Momentan sind ${P} Liter drin. Zu wie viel Prozent ist sie gefüllt?`,
      unit: '%'
    }),
  },
  // 26: Tagesschritte
  {
    valid: G => G >= 500 && G <= 2000,
    findeG: ({ p, P }) => {
      const name = rndName()
      return {
        text: `${name} hat heute ${P} Schritte gemacht. Das sind ${p}% seines täglichen Ziels. Wie hoch ist das Tagesziel?`,
        unit: 'Schritte'
      }
    },
    findeP: ({ p, G }) => {
      const name = rndName()
      return {
        text: `${name} hat ein Tagesziel von ${G} Schritten und hat bis zur Mittagspause ${p}% davon zurückgelegt. Wie viele Schritte sind das?`,
        unit: 'Schritte'
      }
    },
    findeProzentsatz: ({ G, P }) => {
      const name = rndName()
      return {
        text: `${name} möchte täglich ${G} Schritte gehen und hat heute ${P} Schritte gemacht. Wie viel Prozent des Ziels wurden erreicht?`,
        unit: '%'
      }
    },
  },
  // 27: Solaranlage
  {
    valid: G => G >= 100 && G <= 2000,
    findeG: ({ p, P }) => ({
      text: `Eine Solaranlage hat im Sommer ${P} kWh Strom erzeugt. Das entspricht ${p}% ihrer Jahresproduktion. Wie viel kWh erzeugt sie im ganzen Jahr?`,
      unit: 'kWh'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Solaranlage produziert im Jahr ${G} kWh. Im Sommer erzeugt sie ${p}% der Jahresleistung. Wie viele kWh sind das?`,
      unit: 'kWh'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Solaranlage hat eine Jahreskapazität von ${G} kWh und produziert dieses Jahr ${P} kWh. Wie viel Prozent der Kapazität werden genutzt?`,
      unit: '%'
    }),
  },
  // 28: Recycling / Abfall
  {
    valid: G => G >= 100 && G <= 1000,
    findeG: ({ p, P }) => ({
      text: `In einer Gemeinde werden ${P} kg Altpapier recycelt. Das entspricht ${p}% des gesamten Altpapieraufkommens. Wie viel Altpapier fällt insgesamt an?`,
      unit: 'kg'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Gemeinde sammelt ${G} kg Altpapier im Monat. Davon werden ${p}% recycelt. Wie viele Kilogramm sind das?`,
      unit: 'kg'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Gemeinde sammelt ${G} kg Abfall und davon sind ${P} kg Biomüll. Wie hoch ist der Biomüllanteil in Prozent?`,
      unit: '%'
    }),
  },
  // 29: Feldernte
  {
    valid: G => G >= 100 && G <= 1000,
    findeG: ({ p, P }) => ({
      text: `Ein Bauer hat ${P} kg Kartoffeln geerntet. Das sind ${p}% seiner gesamten Ernte. Wie viel Kilogramm hat er insgesamt geerntet?`,
      unit: 'kg'
    }),
    findeP: ({ p, G }) => ({
      text: `Ein Bauer erntet ${G} kg Gemüse. ${p}% davon sind Karotten. Wie viele Kilogramm Karotten hat er geerntet?`,
      unit: 'kg'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Ernte bringt ${G} kg Gemüse. Davon sind ${P} kg Tomaten. Wie hoch ist der Tomatenanteil in Prozent?`,
      unit: '%'
    }),
  },
  // 30: Zeitung / Abonnenten
  {
    valid: G => G >= 200 && G <= 2000,
    findeG: ({ p, P }) => ({
      text: `${P} Abonnenten einer Lokalzeitung lesen die digitale Ausgabe. Das sind ${p}% aller Abonnenten. Wie viele Abonnenten hat die Zeitung insgesamt?`,
      unit: 'Abonnenten'
    }),
    findeP: ({ p, G }) => ({
      text: `Eine Zeitung hat ${G} Abonnenten. ${p}% davon lesen die digitale Ausgabe. Wie viele lesen sie?`,
      unit: 'Abonnenten'
    }),
    findeProzentsatz: ({ G, P }) => ({
      text: `Eine Zeitung hat ${G} Abonnenten, davon lesen ${P} die Printausgabe. Wie hoch ist der Anteil der Printleser in Prozent?`,
      unit: '%'
    }),
  },
]

// Each context supports three question variants for proportional change.
//   validOriginal(o)            → true when o is realistic for this scenario
//   findeOriginal({p, newVal})  → {text,unit}  ask for original value   (x + p%·x = newVal)
//   findeNeu({p, original})     → {text,unit}  ask for resulting value   (original + p%·original = x)
//   findeFaktor({original, newVal}) → {text,unit}  ask for factor as decimal (original + x·original = newVal)
//
// ── Erhöhungs-Kontexte ──────────────────────────────────────────────────────
const ERHOEHUNG_CONTEXTS = [
  {
    validOriginal: o => o >= 20 && o <= 300,
    findeOriginal: ({ p, newVal }) => ({
      text: `Der Preis eines Artikels ist um ${p}% gestiegen. Er kostet jetzt ${newVal}€. Was hat er vorher gekostet?`,
      unit: '€'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Artikel kostet ${original}€ und wird um ${p}% teurer. Was kostet er danach?`,
      unit: '€'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Artikel stieg im Preis von ${original}€ auf ${newVal}€. Um welchen Anteil wurde er teurer?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 600 && o <= 1500,
    findeOriginal: ({ p, newVal }) => {
      const name = rndName()
      return {
        text: `${name} bekommt eine Lohnerhöhung von ${p}%. Das neue monatliche Nettogehalt beträgt ${newVal}€. Was hat ${name} vorher verdient?`,
        unit: '€'
      }
    },
    findeNeu: ({ p, original }) => {
      const name = rndName()
      return {
        text: `${name} verdient ${original}€ netto im Monat und bekommt eine Lohnerhöhung von ${p}%. Wie viel verdient ${name} danach?`,
        unit: '€'
      }
    },
    findeFaktor: ({ original, newVal }) => {
      const name = rndName()
      return {
        text: `${name} verdiente ${original}€ und verdient jetzt ${newVal}€. Um welchen Anteil wurde das Gehalt erhöht?`,
        unit: ''
      }
    },
  },
  {
    validOriginal: o => o >= 500 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Die Einwohnerzahl eines Dorfes ist um ${p}% gewachsen. Jetzt hat es ${newVal} Einwohner. Wie viele Einwohner hatte es vorher?`,
      unit: 'Einwohner'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Dorf hat ${original} Einwohner und wächst um ${p}%. Wie viele Einwohner hat es danach?`,
      unit: 'Einwohner'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Dorf wuchs von ${original} auf ${newVal} Einwohner. Um welchen Anteil ist die Bevölkerung gewachsen?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 500 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Der Wochenumsatz einer Bäckerei ist um ${p}% gestiegen. Er beträgt jetzt ${newVal}€. Wie hoch war er in der Vorwoche?`,
      unit: '€'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Eine Bäckerei hatte letzte Woche einen Umsatz von ${original}€. Dieser Woche stieg er um ${p}%. Wie hoch ist er diese Woche?`,
      unit: '€'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Bäckerei steigerte ihren Wochenumsatz von ${original}€ auf ${newVal}€. Um welchen Anteil ist er gestiegen?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 200 && o <= 1000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Die Schülerzahl einer Schule hat sich um ${p}% erhöht. Jetzt besuchen ${newVal} Schüler die Schule. Wie viele waren es vorher?`,
      unit: 'Schüler'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Eine Schule hat ${original} Schülerinnen und Schüler. Nach den Ferien steigt die Zahl um ${p}%. Wie viele Schüler sind es danach?`,
      unit: 'Schüler'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Schule wuchs von ${original} auf ${newVal} Schülerinnen und Schüler. Um welchen Anteil stieg die Zahl?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 60 && o <= 200,
    findeOriginal: ({ p, newVal }) => ({
      text: `Die Stromrechnung eines Haushalts ist um ${p}% gestiegen. Jetzt zahlt er monatlich ${newVal}€. Was hat er vorher gezahlt?`,
      unit: '€'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Haushalt zahlt ${original}€ monatlich für Strom. Im nächsten Monat steigt die Rechnung um ${p}%. Wie viel zahlt er dann?`,
      unit: '€'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Stromrechnung stieg von ${original}€ auf ${newVal}€. Um welchen Anteil ist sie gestiegen?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 100 && o <= 500,
    findeOriginal: ({ p, newVal }) => ({
      text: `Der tägliche Wasserverbrauch eines Haushalts ist um ${p}% gestiegen. Er beträgt jetzt ${newVal} Liter. Wie viel hat er vorher verbraucht?`,
      unit: 'Liter'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Haushalt verbraucht täglich ${original} Liter Wasser. Der Verbrauch steigt um ${p}%. Wie viele Liter sind es danach?`,
      unit: 'Liter'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Der Wasserverbrauch stieg von ${original} auf ${newVal} Liter täglich. Um welchen Anteil stieg er?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 100 && o <= 1000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Ein Sportverein hat ${p}% mehr Mitglieder als im Vorjahr. Jetzt sind es ${newVal} Mitglieder. Wie viele waren es im Vorjahr?`,
      unit: 'Mitglieder'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Sportverein hatte ${original} Mitglieder. Im nächsten Jahr wächst er um ${p}%. Wie viele Mitglieder hat er dann?`,
      unit: 'Mitglieder'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Verein wuchs von ${original} auf ${newVal} Mitglieder. Um welchen Anteil ist er gewachsen?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 20 && o <= 120,
    findeOriginal: ({ p, newVal }) => ({
      text: `Der Eintrittspreis für ein Konzert wurde um ${p}% angehoben. Ein Ticket kostet jetzt ${newVal}€. Was hat es vorher gekostet?`,
      unit: '€'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Konzertticket kostet ${original}€. Der Preis wird um ${p}% erhöht. Was kostet das Ticket danach?`,
      unit: '€'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Konzertticket wurde von ${original}€ auf ${newVal}€ teurer. Um welchen Anteil wurde es teurer?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 120 && o <= 180,
    findeOriginal: ({ p, newVal }) => {
      const pairs = [['Paul', 'Ben'], ['Anna', 'Clara'], ['Jonas', 'Leon'], ['Emma', 'Mia'], ['Felix', 'Noah'], ['Greta', 'Rosa']]
      const [n1, n2] = pairs[Math.floor(Math.random() * pairs.length)]
      return {
        text: `${n1} ist ${p}% größer als ${n2}. ${n1} ist ${newVal} cm groß. Wie groß ist ${n2}?`,
        unit: 'cm'
      }
    },
    findeNeu: ({ p, original }) => {
      const pairs = [['Paul', 'Ben'], ['Anna', 'Clara'], ['Jonas', 'Leon'], ['Emma', 'Mia'], ['Felix', 'Noah'], ['Greta', 'Rosa']]
      const [n1, n2] = pairs[Math.floor(Math.random() * pairs.length)]
      return {
        text: `${n2} ist ${original} cm groß. ${n1} ist ${p}% größer als ${n2}. Wie groß ist ${n1}?`,
        unit: 'cm'
      }
    },
    findeFaktor: ({ original, newVal }) => {
      const pairs = [['Paul', 'Ben'], ['Anna', 'Clara'], ['Jonas', 'Leon'], ['Emma', 'Mia'], ['Felix', 'Noah'], ['Greta', 'Rosa']]
      const [n1, n2] = pairs[Math.floor(Math.random() * pairs.length)]
      return {
        text: `${n2} ist ${original} cm groß und ${n1} ist ${newVal} cm groß. Um welchen Anteil ist ${n1} größer als ${n2}?`,
        unit: ''
      }
    },
  },
  {
    validOriginal: o => o >= 20 && o <= 200,
    findeOriginal: ({ p, newVal }) => ({
      text: `Eine Topfpflanze ist innerhalb einer Woche um ${p}% gewachsen. Jetzt ist sie ${newVal} cm groß. Wie groß war sie vorher?`,
      unit: 'cm'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Eine Topfpflanze ist ${original} cm groß und wächst in einer Woche um ${p}%. Wie groß ist sie danach?`,
      unit: 'cm'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Pflanze wuchs von ${original} cm auf ${newVal} cm. Um welchen Anteil ist sie gewachsen?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 20 && o <= 500,
    findeOriginal: ({ p, newVal }) => ({
      text: `Durch einen Anbau wurde ein Gebäude um ${p}% höher. Es ist jetzt ${newVal} m hoch. Wie hoch war es vorher?`,
      unit: 'm'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Gebäude ist ${original} m hoch und wird durch einen Anbau um ${p}% erhöht. Wie hoch ist es danach?`,
      unit: 'm'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Gebäude wurde von ${original} m auf ${newVal} m erhöht. Um welchen Anteil wurde es höher?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 400 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Die Miete einer Wohnung wurde um ${p}% erhöht. Sie beträgt jetzt ${newVal}€ im Monat. Wie hoch war die Miete davor?`,
      unit: '€'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Eine Wohnung kostet ${original}€ Miete im Monat. Die Miete wird um ${p}% erhöht. Wie hoch ist die neue Miete?`,
      unit: '€'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Miete stieg von ${original}€ auf ${newVal}€. Um welchen Anteil ist sie gestiegen?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 100 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Eine Vogelpopulation in einem Naturschutzgebiet hat sich um ${p}% vergrößert. Jetzt gibt es ${newVal} Vögel. Wie viele gab es vorher?`,
      unit: 'Vögel'
    }),
    findeNeu: ({ p, original }) => ({
      text: `In einem Naturschutzgebiet leben ${original} Vögel. Die Population wächst um ${p}%. Wie viele Vögel gibt es danach?`,
      unit: 'Vögel'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Vogelpopulation wuchs von ${original} auf ${newVal}. Um welchen Anteil ist sie gewachsen?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 100 && o <= 1000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Ein Fahrradverleih hatte im Juli ${p}% mehr Ausleihungen als im Vormonat. Im Juli wurden ${newVal} Fahrräder ausgeliehen. Wie viele waren es im Vormonat?`,
      unit: 'Ausleihen'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Fahrradverleih hatte im Juni ${original} Ausleihungen. Im Juli stieg die Zahl um ${p}%. Wie viele Fahrräder wurden im Juli ausgeliehen?`,
      unit: 'Ausleihen'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Fahrradverleih stieg von ${original} auf ${newVal} Ausleihungen. Um welchen Anteil ist die Zahl gestiegen?`,
      unit: ''
    }),
  },
]

// ── Senkungs-Kontexte ────────────────────────────────────────────────────────
const SENKUNG_CONTEXTS = [
  {
    validOriginal: o => o >= 40 && o <= 500,
    findeOriginal: ({ p, newVal }) => ({
      text: `Ein Artikel wird im Sale um ${p}% reduziert. Er kostet jetzt noch ${newVal}€. Was hat er vor dem Sale gekostet?`,
      unit: '€'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Artikel kostet ${original}€ und wird im Sale um ${p}% reduziert. Was kostet er im Sale?`,
      unit: '€'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Artikel wurde von ${original}€ auf ${newVal}€ reduziert. Um welchen Anteil wurde er günstiger?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 50 && o <= 120,
    findeOriginal: ({ p, newVal }) => {
      const name = rndName()
      return {
        text: `${name} hat ${p}% seines Körpergewichts abgenommen. ${name} wiegt jetzt ${newVal} kg. Wie viel hat ${name} vorher gewogen?`,
        unit: 'kg'
      }
    },
    findeNeu: ({ p, original }) => {
      const name = rndName()
      return {
        text: `${name} wiegt ${original} kg und nimmt ${p}% seines Körpergewichts ab. Wie viel wiegt ${name} danach?`,
        unit: 'kg'
      }
    },
    findeFaktor: ({ original, newVal }) => {
      const name = rndName()
      return {
        text: `${name} wog ${original} kg und wiegt jetzt ${newVal} kg. Um welchen Anteil hat ${name} abgenommen?`,
        unit: ''
      }
    },
  },
  {
    validOriginal: o => o >= 20 && o <= 200,
    findeOriginal: ({ p, newVal }) => ({
      text: `Beim Schlussverkauf wurde ein Kleid um ${p}% günstiger. Es kostet jetzt noch ${newVal}€. Wie hoch war der ursprüngliche Preis?`,
      unit: '€'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Kleid kostet ${original}€. Beim Schlussverkauf wird es um ${p}% reduziert. Was kostet es im Schlussverkauf?`,
      unit: '€'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Kleid sank von ${original}€ auf ${newVal}€. Um welchen Anteil wurde es günstiger?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 100 && o <= 400,
    findeOriginal: ({ p, newVal }) => ({
      text: `Ein Haushalt hat seinen monatlichen Stromverbrauch um ${p}% reduziert. Er verbraucht jetzt noch ${newVal} kWh. Wie viel hat er vorher verbraucht?`,
      unit: 'kWh'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Haushalt verbraucht ${original} kWh Strom im Monat und reduziert den Verbrauch um ${p}%. Wie viel kWh sind es danach?`,
      unit: 'kWh'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Haushalt senkte seinen Stromverbrauch von ${original} auf ${newVal} kWh. Um welchen Anteil sank er?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 200 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Die Besucherzahl eines Museums ist um ${p}% gesunken. Jetzt kommen monatlich noch ${newVal} Besucher. Wie viele kamen vorher?`,
      unit: 'Besucher'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Museum hatte ${original} Besucher im Monat. Die Besucherzahl sinkt um ${p}%. Wie viele Besucher kommen danach?`,
      unit: 'Besucher'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Die Besucherzahl eines Museums sank von ${original} auf ${newVal}. Um welchen Anteil sank sie?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 200 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Eine Fabrik hat ihre Tagesproduktion um ${p}% gedrosselt. Sie stellt jetzt noch ${newVal} Einheiten pro Tag her. Wie viele waren es vorher?`,
      unit: 'Einheiten'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Eine Fabrik produziert täglich ${original} Einheiten und drosselt die Produktion um ${p}%. Wie viele Einheiten werden danach produziert?`,
      unit: 'Einheiten'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Fabrik drosselte die Produktion von ${original} auf ${newVal} Einheiten täglich. Um welchen Anteil sank sie?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 200 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Dank moderner Bewässerung wurde der Wasserverbrauch eines Bauernhofs um ${p}% gesenkt. Es werden jetzt noch ${newVal} Liter pro Tag verbraucht. Wie viel war es vorher?`,
      unit: 'Liter'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Bauernhof verbraucht täglich ${original} Liter Wasser. Durch moderne Bewässerung sinkt der Verbrauch um ${p}%. Wie viele Liter sind es danach?`,
      unit: 'Liter'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Bauernhof senkte den Wasserverbrauch von ${original} auf ${newVal} Liter täglich. Um welchen Anteil sank er?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 100 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Eine Tierpopulation ist innerhalb eines Jahres um ${p}% zurückgegangen. Jetzt gibt es noch ${newVal} Tiere. Wie viele gab es vorher?`,
      unit: 'Tiere'
    }),
    findeNeu: ({ p, original }) => ({
      text: `In einem Gebiet leben ${original} Tiere. Die Population geht um ${p}% zurück. Wie viele Tiere gibt es danach?`,
      unit: 'Tiere'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Tierpopulation sank von ${original} auf ${newVal} Tiere. Um welchen Anteil ist sie zurückgegangen?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 500 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Eine Gemeinde hat ihre Schulden um ${p}% abgebaut. Die verbleibenden Schulden betragen ${newVal}€. Wie hoch waren die Schulden vorher?`,
      unit: '€'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Eine Gemeinde hat ${original}€ Schulden und baut ${p}% davon ab. Wie viele Schulden bleiben übrig?`,
      unit: '€'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Die Schulden einer Gemeinde sanken von ${original}€ auf ${newVal}€. Um welchen Anteil wurden sie abgebaut?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 20 && o <= 200,
    findeOriginal: ({ p, newVal }) => ({
      text: `Eine Schneedecke ist um ${p}% geschmolzen. Sie ist jetzt noch ${newVal} cm hoch. Wie hoch war sie vorher?`,
      unit: 'cm'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Eine Schneedecke ist ${original} cm hoch und schmilzt um ${p}%. Wie hoch ist sie danach?`,
      unit: 'cm'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Schneedecke schmolz von ${original} cm auf ${newVal} cm. Um welchen Anteil ist sie geschmolzen?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 100 && o <= 1000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Der Wasserstand eines Flusses ist um ${p}% gefallen. Er liegt jetzt bei ${newVal} cm. Wie hoch war er vorher?`,
      unit: 'cm'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Fluss hat einen Wasserstand von ${original} cm. Nach einer Dürre sinkt er um ${p}%. Wie hoch ist der Wasserstand danach?`,
      unit: 'cm'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Der Wasserstand eines Flusses sank von ${original} cm auf ${newVal} cm. Um welchen Anteil sank er?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 20 && o <= 500,
    findeOriginal: ({ p, newVal }) => ({
      text: `Der Kurs einer Aktie ist um ${p}% gefallen. Sie kostet jetzt noch ${newVal}€. Wie viel hat sie vorher gekostet?`,
      unit: '€'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Eine Aktie kostet ${original}€. Ihr Kurs fällt um ${p}%. Was kostet die Aktie danach?`,
      unit: '€'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Aktie fiel von ${original}€ auf ${newVal}€. Um welchen Anteil ist sie gefallen?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 500 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Die Bevölkerung einer Kleinstadt ist um ${p}% zurückgegangen. Jetzt hat sie ${newVal} Einwohner. Wie viele waren es zuvor?`,
      unit: 'Einwohner'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Eine Stadt hat ${original} Einwohner. Die Bevölkerung geht um ${p}% zurück. Wie viele Einwohner hat die Stadt danach?`,
      unit: 'Einwohner'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Eine Stadt schrumpfte von ${original} auf ${newVal} Einwohner. Um welchen Anteil sank die Bevölkerung?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 200 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `In einem Waldgebiet wurden ${p}% der Bäume gefällt. Jetzt stehen noch ${newVal} Bäume. Wie viele standen dort vorher?`,
      unit: 'Bäume'
    }),
    findeNeu: ({ p, original }) => ({
      text: `In einem Wald stehen ${original} Bäume. ${p}% davon werden gefällt. Wie viele Bäume stehen danach noch?`,
      unit: 'Bäume'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `In einem Wald standen ${original} Bäume, danach noch ${newVal}. Welchen Anteil wurden gefällt?`,
      unit: ''
    }),
  },
  {
    validOriginal: o => o >= 200 && o <= 2000,
    findeOriginal: ({ p, newVal }) => ({
      text: `Durch Verdunstung hat ein Gartenteich ${p}% seines Wassers verloren. Er enthält jetzt noch ${newVal} Liter. Wie viel Wasser hatte er vorher?`,
      unit: 'Liter'
    }),
    findeNeu: ({ p, original }) => ({
      text: `Ein Gartenteich enthält ${original} Liter. Durch Verdunstung verliert er ${p}% des Wassers. Wie viel Wasser bleibt übrig?`,
      unit: 'Liter'
    }),
    findeFaktor: ({ original, newVal }) => ({
      text: `Ein Gartenteich verlor Wasser von ${original} auf ${newVal} Liter. Welchen Anteil hat er verloren?`,
      unit: ''
    }),
  },
]

export function generateProzentGleichungProblems(count, settings) {
  const {
    prozentEinfach = true,
    prozentVeraenderung = false,
  } = settings

  const QUESTION_TYPES = ['findeG', 'findeP', 'findeProzentsatz']

  const types = []
  if (prozentEinfach) types.push('einfach')
  if (prozentVeraenderung) { types.push('erhoehung'); types.push('senkung') }
  if (types.length === 0) types.push('einfach')

  // Pool of "nice" values where p%·G is guaranteed to be an integer for many p values
  const NICE_G = [20, 40, 60, 80, 100, 120, 140, 150, 160, 180, 200, 220, 240, 250, 260, 280, 300, 320, 340, 360, 380, 400, 440, 450, 460, 480, 500, 540, 550, 560, 580, 600, 640, 660, 680, 700, 720, 750, 760, 780, 800, 850, 900, 1000, 1200, 1500, 2000]
  const PERCENTS_BASIC = [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 37.5, 40, 50]
  const PERCENTS_CHANGE = [2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30]

  const problems = []
  let id = 1
  const seen = new Set()

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    let problem = null
    let attempts = 0

    while (!problem && attempts < 300) {
      attempts++

      if (type === 'einfach') {
        const p = PERCENTS_BASIC[Math.floor(Math.random() * PERCENTS_BASIC.length)]
        const G = NICE_G[Math.floor(Math.random() * NICE_G.length)]
        const P = Math.round((p / 100) * G * 1e6) / 1e6
        if (!Number.isInteger(P) || P < 5 || P >= G) continue

        const questionType = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)]
        const key = `ei_${questionType}_${p}_${G}`
        if (seen.has(key)) continue

        const validCtxs = EINFACH_CONTEXTS.filter(c => c.valid(G))
        if (!validCtxs.length) continue

        seen.add(key)
        const ctx = validCtxs[Math.floor(Math.random() * validCtxs.length)]
        let { text, unit } = ctx[questionType]({ p, G, P })
        // Ensure displayed decimal separator is German-style comma for embedded numeric literals
        if (typeof text === 'string') text = formatEmbeddedNumbersInText(text)
        const pStr = fmtPct(p)

        let correct, exampleEquation, problemUnit
        if (questionType === 'findeG') {
          correct = G
          exampleEquation = `${pStr}·x = ${P}`
          problemUnit = unit
        } else if (questionType === 'findeP') {
          correct = P
          exampleEquation = `x = ${pStr}·${G}`
          problemUnit = unit
        } else {
          correct = p / 100
          exampleEquation = `x·${G} = ${P}`
          problemUnit = ''
        }

        problem = {
          id: id++, type: 'prozent-gleichung', variant: questionType,
          text, unit: problemUnit, correct, exampleEquation,
          p, G, P
        }

      } else if (type === 'erhoehung') {
        const p = PERCENTS_CHANGE[Math.floor(Math.random() * PERCENTS_CHANGE.length)]
        const original = NICE_G[Math.floor(Math.random() * NICE_G.length)]
        const newVal = Math.round(original * (1 + p / 100) * 1e6) / 1e6
        if (!Number.isInteger(newVal) || newVal < 20) continue
        const VARIATION_TYPES = ['findeOriginal', 'findeNeu', 'findeFaktor']
        const questionType = VARIATION_TYPES[Math.floor(Math.random() * VARIATION_TYPES.length)]
        const key = `e_${questionType}_${p}_${original}`
        if (seen.has(key)) continue

        const validCtxs = ERHOEHUNG_CONTEXTS.filter(c => c.validOriginal(original))
        if (!validCtxs.length) continue

        seen.add(key)
        const ctx = validCtxs[Math.floor(Math.random() * validCtxs.length)]
        const pStr = fmtPct(p)
        let { text, unit } = ctx[questionType]({ p, original, newVal })
        if (typeof text === 'string') text = formatEmbeddedNumbersInText(text)
        let correct, exampleEquation
        if (questionType === 'findeOriginal') {
          correct = original
          exampleEquation = `x + ${pStr}·x = ${newVal}`
        } else if (questionType === 'findeNeu') {
          correct = newVal
          exampleEquation = `${original} + ${pStr}·${original} = x`
        } else {
          correct = p / 100
          exampleEquation = `${original} + x·${original} = ${newVal}`
        }
        problem = {
          id: id++, type: 'prozent-gleichung', variant: questionType,
          text, unit, correct, exampleEquation,
          p, original, newVal
        }

      } else if (type === 'senkung') {
        const p = PERCENTS_CHANGE[Math.floor(Math.random() * PERCENTS_CHANGE.length)]
        const original = NICE_G[Math.floor(Math.random() * NICE_G.length)]
        const newVal = Math.round(original * (1 - p / 100) * 1e6) / 1e6
        if (!Number.isInteger(newVal) || newVal < 10) continue
        const VARIATION_TYPES_S = ['findeOriginal', 'findeNeu', 'findeFaktor']
        const questionType = VARIATION_TYPES_S[Math.floor(Math.random() * VARIATION_TYPES_S.length)]
        const key = `s_${questionType}_${p}_${original}`
        if (seen.has(key)) continue

        const validCtxs = SENKUNG_CONTEXTS.filter(c => c.validOriginal(original))
        if (!validCtxs.length) continue

        seen.add(key)
        const ctx = validCtxs[Math.floor(Math.random() * validCtxs.length)]
        const pStr = fmtPct(p)
        let { text, unit } = ctx[questionType]({ p, original, newVal })
        if (typeof text === 'string') text = formatEmbeddedNumbersInText(text)
        let correct, exampleEquation
        if (questionType === 'findeOriginal') {
          correct = original
          exampleEquation = `x − ${pStr}·x = ${newVal}`
        } else if (questionType === 'findeNeu') {
          correct = newVal
          exampleEquation = `${original} − ${pStr}·${original} = x`
        } else {
          correct = p / 100
          exampleEquation = `${original} − x·${original} = ${newVal}`
        }
        problem = {
          id: id++, type: 'prozent-gleichung', variant: questionType,
          text, unit, correct, exampleEquation,
          p, original, newVal
        }
      }
    }

    if (problem) problems.push(problem)
  }

  return problems
}

export function generateGemischteZahlenProblems(count, settings = {}) {
  const {
    mixedToImproper = true,
    improperToMixed = true
  } = settings
  const directions = []
  if (mixedToImproper) directions.push('mixed-to-improper')
  if (improperToMixed) directions.push('improper-to-mixed')
  if (directions.length === 0) directions.push('mixed-to-improper', 'improper-to-mixed')

  return Array.from({ length: count }, (_, index) => {
    const denominator = Math.floor(Math.random() * 10) + 2
    const numerator = Math.floor(Math.random() * (denominator - 1)) + 1
    const whole = Math.floor(Math.random() * 9) + 1
    const direction = directions[index % directions.length]
    const improperNumerator = whole * denominator + numerator

    return {
      id: index + 1,
      type: 'gemischte-zahlen',
      direction,
      whole,
      numerator,
      denominator,
      improperNumerator,
      correct: direction === 'mixed-to-improper'
        ? `${improperNumerator}/${denominator}`
        : `${whole} ${numerator}/${denominator}`
    }
  })
}

function decimalText(numerator, denominator) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 6 }).format(numerator / denominator)
}

function periodicDecimalText(numerator, denominator) {
  const whole = Math.floor(numerator / denominator)
  const remainder = numerator % denominator
  if (denominator === 3) return `${whole},(${remainder * 3})`
  if (denominator === 9) return `${whole},(${remainder})`

  const patterns = {
    1: ['1', '6'],
    2: ['', '3'],
    4: ['', '6'],
    5: ['8', '3']
  }
  const [prefix, period] = patterns[remainder]
  return `${whole},${prefix}(${period})`
}

export function generateDezimalbruecheProblems(count, settings = {}) {
  const {
    decimalPowerOfTen = true,
    decimalCommonFractions = true,
    decimalPeriodic = true,
    decimalExpandableFractions = true
  } = settings
  const types = []
  if (decimalPowerOfTen) types.push('power-of-ten')
  if (decimalCommonFractions) types.push('common')
  if (decimalPeriodic) types.push('periodic')
  if (decimalExpandableFractions) types.push('expandable')
  if (!types.length) types.push('power-of-ten', 'common', 'periodic', 'expandable')
  let periodicTaskIndex = 0
  const usedProblems = new Set()
  const problems = []
  let attempts = 0
  const easySamples = {
    'power-of-ten': [[1, 10], [5, 10], [25, 100], [1, 100]],
    common: [[1, 2], [1, 4], [3, 4], [2, 5], [3, 8]],
    periodic: [[1, 3], [2, 3], [4, 9], [1, 6], [1, 9]],
    expandable: [[3, 25], [3, 4], [2, 5], [7, 125], [9, 250]]
  }

  while (problems.length < count && attempts < count * 100) {
    const index = problems.length
    const variant = types[index % types.length]
    let denominator
    let numerator
    const easySample = index < 5
      ? easySamples[variant][Math.floor(index / types.length) % easySamples[variant].length]
      : null

    if (easySample) {
      [numerator, denominator] = easySample
    } else if (variant === 'power-of-ten') {
      denominator = [10, 100, 1000][Math.floor(Math.random() * 3)]
      numerator = Math.floor(Math.random() * (denominator * 2 + 1))
      if (numerator === 0) numerator = 1
    } else if (variant === 'common') {
      denominator = [2, 4, 5, 8][Math.floor(Math.random() * 4)]
      numerator = Math.floor(Math.random() * (denominator * 3)) + 1
    } else if (variant === 'periodic') {
      denominator = [3, 6, 9][periodicTaskIndex++ % 3]
      do {
        numerator = Math.floor(Math.random() * 100) + 1
      } while (
        numerator % denominator === 0 ||
        (denominator === 6 && numerator % denominator === 3)
      )
    } else {
      denominator = [2, 4, 5, 20, 25, 50, 125, 250, 500][Math.floor(Math.random() * 9)]
      // The point of these tasks is recognizing the expansion factor (e.g.
      // ×4 or ×8), not multiplying large numerators in the head.
      numerator = Math.floor(Math.random() * 100) + 1
    }

    const isRecurring = variant === 'periodic'
    const decimalDisplay = isRecurring
      ? periodicDecimalText(numerator, denominator)
      : decimalText(numerator, denominator)
    const direction = Math.floor(index / types.length) % 2 === 0
      ? 'fraction-to-decimal'
      : 'decimal-to-fraction'
    const key = `${direction}:${numerator}/${denominator}`

    if (usedProblems.has(key)) {
      attempts++
      continue
    }
    usedProblems.add(key)

    problems.push({
      id: index + 1,
      type: 'dezimalbrueche',
      variant,
      direction,
      numerator,
      denominator,
      decimalDisplay,
      isRecurring,
      correct: direction === 'fraction-to-decimal' ? decimalDisplay : `${numerator}/${denominator}`
    })
  }

  return problems
}

export function generateProblems(count, category, settings = {}) {
  if (category === 'einmaleins') return generateEinmaleinsProblems(count, settings);
  if (category === 'schriftlich') return generateSchriftlichProblems(count, settings);
  if (category === 'schriftlich-add') return generateSchriftlichProblems(count, { schriftlichAdd: true, schriftlichSubtract: false, schriftlichMultiply: false });
  if (category === 'schriftlich-subtract') return generateSchriftlichProblems(count, { schriftlichAdd: false, schriftlichSubtract: true, schriftlichMultiply: false });
  if (category === 'schriftlich-multiply') return generateSchriftlichProblems(count, { schriftlichAdd: false, schriftlichSubtract: false, schriftlichMultiply: true });
  if (category === 'schriftlich-divide') return generateSchriftlichDivisionProblems(count, settings);
  if (category === 'primfaktorisierung') return generatePrimfaktorisierungProblems(count, settings);
  if (category === 'negative') return generateNegativeProblems(count, settings);
  if (category === 'gemischte-zahlen') return generateGemischteZahlenProblems(count, settings);
  if (category === 'dezimalbrueche') return generateDezimalbruecheProblems(count, settings);
  if (category === 'binomische') return generateBinomischeProblems(count, settings);
  if (category === 'prozent-gleichung') return generateProzentGleichungProblems(count, settings);
  return [];
}
