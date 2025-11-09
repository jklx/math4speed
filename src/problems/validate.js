// Validators for different problem types

export function validateSchriftlich(answerDigits, correctDigits) {
  // Treat empty as 0 to allow omitting leading zeros
  const userDigits = answerDigits.map(d => d === '' ? 0 : Number(d));
  const isCorrect = JSON.stringify(userDigits) === JSON.stringify(correctDigits);
  const parsed = answerDigits.map(d => d === '' ? '0' : d).join('');
  // Require at least one digit to avoid submitting completely empty
  const hasAnyDigit = answerDigits.some(d => d !== '');
  return { isCorrect, parsed, valid: hasAnyDigit };
}

export function validatePrimfaktorisierung(input, correctFactors) {
  const trimmed = (input || '').trim();
  const user = trimmed.length ? trimmed.split(/\s+/).map(x => parseInt(x, 10)).filter(x => !isNaN(x)).sort((a,b)=>a-b) : [];
  const correct = [...correctFactors].sort((a,b)=>a-b);
  const isCorrect = user.length === correct.length && user.every((v,i)=>v===correct[i]);
  return { isCorrect, parsed: trimmed, valid: true };
}
