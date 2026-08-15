const { Writable } = require('stream');

const result = (username, solved) => ({
  username,
  score: {
    time: solved.filter(problem => problem.isCorrect).length,
    wrongCount: solved.filter(problem => problem.isCorrect === false).length
  },
  solved
});

const multiplication = (a, b, user) => ({ type: 'multiplication', a, b, correct: a * b, user, isCorrect: user === a * b });
const schriftlich = (operation, a, b, user) => {
  const correct = operation === 'add' ? a + b : operation === 'subtract' ? a - b : a * b;
  return { type: 'schriftlich', operation, a, b, correct, user, isCorrect: user === correct };
};
const negative = (expression, correct, user) => ({ type: 'negative', expression, correct, user, isCorrect: user === correct });
const factors = (number, correct, user) => ({ type: 'primfaktorisierung', number, correct, user, isCorrect: correct === user });
const binomial = (expression, correct, user) => ({ type: 'binomische', expression, correct, user, isCorrect: correct === user });
const percent = (text, exampleEquation, unit, correct, user) => ({ type: 'prozent-gleichung', text, exampleEquation, unit, correct, user, isCorrect: correct === user });

const baseSampleReports = {
  einmaleins: [
    result('Mila Muster', [multiplication(7, 8, 56), multiplication(9, 6, 54), multiplication(12, 12, 144), multiplication(8, 7, 54), multiplication(11, 11, 121)]),
    result('Noah Beispiel', [multiplication(6, 7, 42), multiplication(9, 9, 81), multiplication(12, 12, 142), multiplication(8, 8, 64), multiplication(7, 6, 40)])
  ],
  'schriftlich-add': [
    result('Mila Muster', [schriftlich('add', 1250, 842, 2092), schriftlich('add', 4689, 5321, 10010), schriftlich('add', 8765, 1234, 9999)]),
    result('Noah Beispiel', [schriftlich('add', 3758, 6241, 9999), schriftlich('add', 4820, 1911, 6731), schriftlich('add', 6745, 2555, 9200)])
  ],
  'schriftlich-subtract': [
    result('Mila Muster', [schriftlich('subtract', 54102, 46897, 7205), schriftlich('subtract', 80000, 34765, 45235), schriftlich('subtract', 93210, 18765, 74445)]),
    result('Noah Beispiel', [schriftlich('subtract', 67234, 29876, 37358), schriftlich('subtract', 45000, 17892, 27108), schriftlich('subtract', 82340, 45678, 36652)])
  ],
  'schriftlich-multiply': [
    result('Mila Muster', [schriftlich('multiply', 124, 36, 4464), schriftlich('multiply', 208, 45, 9360), schriftlich('multiply', 315, 24, 7560)]),
    result('Noah Beispiel', [schriftlich('multiply', 127, 32, 4064), schriftlich('multiply', 240, 18, 4320), schriftlich('multiply', 156, 27, 4210)])
  ],
  negative: [
    result('Mila Muster', [negative('(-8) + (+5)', -3, -3), negative('(+7) - (-9)', 16, 16), negative('(-6) * (+4)', -24, -24), negative('(-36) : (+6)', -6, -6), negative('(-5) - (-3)', -2, -1)]),
    result('Noah Beispiel', [negative('(+9) + (-12)', -3, -3), negative('(-7) - (+8)', -15, -15), negative('(-4) * (-5)', 20, 20), negative('(+24) : (-6)', -4, 4), negative('(-10) + (+2)', -8, -8)])
  ],
  primfaktorisierung: [
    result('Mila Muster', [factors(84, '2 2 3 7', '2 2 3 7'), factors(90, '2 3 3 5', '2 3 3 5'), factors(72, '2 2 2 3 3', '2 2 2 3 3'), factors(105, '3 5 7', '3 5 7'), factors(64, '2 2 2 2 2 2', '2 2 2 2 2')]),
    result('Noah Beispiel', [factors(96, '2 2 2 2 2 3', '2 2 2 2 2 3'), factors(75, '3 5 5', '3 5 5'), factors(98, '2 7 7', '2 7 7'), factors(121, '11 11', '11'), factors(144, '2 2 2 2 3 3', '2 2 2 2 3 3')])
  ],
  binomische: [
    result('Mila Muster', [binomial('(x + 3)^2', 'x^2 + 6x + 9', 'x^2 + 6x + 9'), binomial('(2a - 5)^2', '4a^2 - 20a + 25', '4a^2 - 20a + 25'), binomial('(y + 4)(y - 4)', 'y^2 - 16', 'y^2 - 16'), binomial('(3n + 2)^2', '9n^2 + 12n + 4', '9n^2 + 12n + 4')]),
    result('Noah Beispiel', [binomial('(x - 6)^2', 'x^2 - 12x + 36', 'x^2 - 12x + 36'), binomial('(2y + 3)(2y - 3)', '4y^2 - 9', '4y^2 - 9'), binomial('(a + 5)^2', 'a^2 + 10a + 25', 'a^2 + 5a + 25'), binomial('(4n - 1)^2', '16n^2 - 8n + 1', '16n^2 - 8n + 1')])
  ],
  'prozent-gleichung': [
    result('Mila Muster', [percent('Ein Fahrrad kostet 240 Euro. 25 % davon sind reduziert. Wie hoch ist der Preisnachlass?', 'x = 0,25 * 240', 'Euro', 60, 60), percent('Ein T-Shirt kostet 80 Euro. Der Preis steigt um 10 %. Wie viel kostet es danach?', '80 + 0,1 * 80 = x', 'Euro', 88, 88), percent('30 % eines Betrags sind 45 Euro. Wie hoch ist der Grundwert?', '0,3 * x = 45', 'Euro', 150, 150), percent('Ein Verbrauch sinkt von 400 auf 340 kWh. Um welchen Anteil ist er gesunken?', '400 - x * 400 = 340', '', 0.15, 0.15), percent('Ein Buch kostet nach 20 % Rabatt noch 24 Euro. Wie viel kostete es vorher?', 'x - 0,2 * x = 24', 'Euro', 30, 32)]),
    result('Noah Beispiel', [percent('15 % eines Betrags sind 30 Euro. Wie hoch ist der Grundwert?', '0,15 * x = 30', 'Euro', 200, 200), percent('Ein Kleid kostet 120 Euro und wird um 25 % reduziert. Was kostet es danach?', '120 - 0,25 * 120 = x', 'Euro', 90, 90), percent('Eine Klasse hat 28 Kinder. 75 % nehmen am Ausflug teil. Wie viele Kinder sind das?', 'x = 0,75 * 28', 'Kinder', 21, 20), percent('Ein Preis steigt von 50 auf 60 Euro. Um welchen Anteil ist er gestiegen?', '50 + x * 50 = 60', '', 0.2, 0.2), percent('40 % eines Betrags sind 72 Euro. Wie hoch ist der Grundwert?', '0,4 * x = 72', 'Euro', 180, 160)])
  ]
};

const sampleTaskCounts = {
  einmaleins: 28,
  'schriftlich-add': 3,
  'schriftlich-subtract': 3,
  'schriftlich-multiply': 3,
  negative: 15,
  primfaktorisierung: 10,
  binomische: 10,
  'prozent-gleichung': 12
};

function repeatTasks(tasks, count) {
  return Array.from({ length: count }, (_, index) => ({ ...tasks[index % tasks.length], id: index + 1 }));
}

const sampleReports = Object.fromEntries(
  Object.entries(baseSampleReports).map(([category, players]) => [
    category,
    players.map(player => result(player.username, repeatTasks(player.solved, sampleTaskCounts[category])))
  ])
);

function createSampleResponse(onComplete) {
  const chunks = [];
  const response = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    }
  });
  response.setHeader = () => {};
  response.on('finish', () => onComplete(Buffer.concat(chunks)));
  return response;
}

module.exports = { sampleReports, createSampleResponse };
