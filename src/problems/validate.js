// Validators for different problem types

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
