// Validators for different problem types

export function parseHauptnennerInput(input) {
  try {
    const value = typeof input === 'string' ? JSON.parse(input) : input;
    return Object.fromEntries(['first', 'second', 'lcm', 'result'].map(key => [key, typeof value?.[key] === 'string' ? value[key] : '']));
  } catch { return { first: '', second: '', lcm: '', result: '' }; }
}

export function validateHauptnenner(input, problem) {
  const snapshot = parseHauptnennerInput(input);
  const matches = (value, factors) => {
    const tokens = value.trim().split(/\s+/);
    if (!tokens.every(token => /^\d+$/.test(token))) return false;
    const sorted = tokens.map(Number).sort((a, b) => a - b);
    const expected = [...factors].sort((a, b) => a - b);
    return sorted.length === expected.length && sorted.every((factor, i) => factor === expected[i]);
  };
  const valid = Object.values(snapshot).every(value => value.trim().length > 0);
  const fieldCorrect = {
    first: matches(snapshot.first, problem.factorsA),
    second: matches(snapshot.second, problem.factorsB),
    lcm: matches(snapshot.lcm, problem.lcmFactors),
    result: /^\d+$/.test(snapshot.result.trim()) && Number(snapshot.result) === problem.correct,
  };
  const isCorrect = Object.values(fieldCorrect).every(Boolean);
  return { valid, isCorrect, parsed: snapshot.result, snapshot, fieldCorrect };
}

export function validateSchriftlich(answerDigits, correctDigits) {
  // Normalize user's digits: join provided digits without injecting zeros
  const userStrRaw = answerDigits.map(d => (d === '' ? '' : String(d))).join('');
  const hasAnyDigit = answerDigits.some(d => d !== '');
  const userStr = hasAnyDigit ? String(parseInt(userStrRaw || '0', 10)) : '';

  // Normalize correct to number comparison
  const correctStr = String((correctDigits ?? []).join(''));
  const correctNum = parseInt(correctStr || '0', 10);
  const userNum = hasAnyDigit ? parseInt(userStr, 10) : NaN;

  const isCorrect = hasAnyDigit && userNum === correctNum;
  // parsed is the simplified, non-padded string the UI should show
  const parsed = hasAnyDigit ? userStr : '';
  return { isCorrect, parsed, valid: hasAnyDigit };
}

export function validatePrimfaktorisierung(input, correctFactors) {
  const trimmed = (input || '').trim();
  const user = trimmed.length ? trimmed.split(/\s+/).map(x => parseInt(x, 10)).filter(x => !isNaN(x)).sort((a,b)=>a-b) : [];
  const correct = [...correctFactors].sort((a,b)=>a-b);
  const isCorrect = user.length === correct.length && user.every((v,i)=>v===correct[i]);
  return { isCorrect, parsed: trimmed, valid: true };
}

export function validatePolynomial(input, correctExpression) {
  // Simple normalization: remove spaces, replace minus with standard hyphen
  const normalize = (s) => s.replace(/\s+/g, '').replace(/−/g, '-').replace(/,/g, '.');
  
  // This is a basic string comparison after normalization. 
  // A full polynomial parser would be better but complex.
  // We assume the user writes terms in standard order (descending power).
  // We can try to be a bit smarter by splitting terms.
  
  // Helper to parse a polynomial string into a map of power -> coefficient
  // Supports only single variable polynomials for now, e.g. 4x^2 - 12x + 9
  // Also supports two variables for 3rd binomial like a^2 - b^2? 
  // Actually, 3rd binomial (a+b)(a-b) = a^2 - b^2 has two variables usually.
  // Let's stick to strict string comparison for now but allow flexible spacing.
  
  const userNorm = normalize(input);
  const correctNorm = normalize(correctExpression);
  
  return { isCorrect: userNorm === correctNorm, parsed: input, valid: input.trim().length > 0 };
}
