const MAX_PRACTICE_ANSWERS = 1000;
const MAX_PRACTICE_ANSWERS_BYTES = 2_000_000;

function normalizePracticeAnswers(input) {
  if (!Array.isArray(input) || input.length > MAX_PRACTICE_ANSWERS) {
    throw new Error('Ungültige Aufgabenliste.');
  }
  const serialized = JSON.stringify(input);
  if (serialized.length > MAX_PRACTICE_ANSWERS_BYTES) throw new Error('Die Aufgabenliste ist zu groß.');

  const answers = input.map((entry, position) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.isCorrect !== 'boolean') {
      throw new Error(`Ungültige Antwort an Position ${position + 1}.`);
    }
    const {
      user, isCorrect, assisted, schriftlichSnapshot, hauptnennerSnapshot,
      hauptnennerFirstAttempt, equationSnapshot, ...task
    } = entry;
    delete task.correctionPending;
    if (!task.type || typeof task.type !== 'string') throw new Error(`Ungültige Aufgabe an Position ${position + 1}.`);
    return {
      position,
      task,
      submittedAnswer: {
        value: user ?? null,
        schriftlichSnapshot: schriftlichSnapshot ?? null,
        hauptnennerSnapshot: hauptnennerSnapshot ?? null,
        hauptnennerFirstAttempt: hauptnennerFirstAttempt ?? null,
        equationSnapshot: equationSnapshot ?? null
      },
      isCorrect,
      assisted: Boolean(assisted)
    };
  });

  return {
    answers,
    correctCount: answers.filter(answer => answer.isCorrect).length,
    wrongCount: answers.filter(answer => !answer.isCorrect).length
  };
}

module.exports = { normalizePracticeAnswers };
