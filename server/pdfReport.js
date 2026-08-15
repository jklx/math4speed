const PDFDocument = require('pdfkit');
const { formatDecimal } = require('../src/utils/formatNumber');

const CATEGORIES = require('../shared/categories.json');
const COLORS = {
  navy: '#17324D',
  blue: '#247BA0',
  teal: '#2A9D8F',
  green: '#2F855A',
  yellow: '#D4A514',
  red: '#C2413B',
  ink: '#1F2937',
  muted: '#64748B',
  line: '#D9E2EC',
  panel: '#F6F9FC',
  paleGreen: '#E8F5EE',
  paleRed: '#FDEDEC'
};

const text = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value)
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/[−–—]/g, '-');
};

const formatFactorString = (value = '') => {
  const tokens = String(value || '').trim().split(/\s+/).filter(Boolean);
  return tokens.length ? tokens.join(' * ') : '-';
};

const formatNumber = (value) => (
  typeof value === 'number'
    ? formatDecimal(value, { maximumFractionDigits: 4 })
    : text(value)
);

const operationSymbol = (operation) => ({ add: '+', subtract: '-', multiply: '*', divide: ':' }[operation] || '*');

function formatProblem(problem, includeUserAnswer = true) {
  let question;
  switch (problem.type) {
    case 'primfaktorisierung':
      question = `Primfaktorzerlegung: ${text(problem.number)} = ${formatFactorString(problem.correct)}`;
      break;
    case 'schriftlich': {
      const operands = Array.isArray(problem.summandsDigits)
        ? problem.summandsDigits.map(digits => digits.join('')).join(' + ')
        : `${text(problem.a)} ${operationSymbol(problem.operation)} ${text(problem.b)}`;
      question = `Schriftlich: ${operands} = ${formatNumber(problem.correct)}`;
      break;
    }
    case 'negative':
      question = `${text(problem.expression, `${text(problem.a)} ${text(problem.operator)} ${text(problem.b)}`)} = ${formatNumber(problem.correct)}`;
      break;
    case 'binomische':
      question = `${text(problem.expression)} = ${text(problem.correct)}`;
      break;
    case 'prozent-gleichung':
      question = `${text(problem.text)}\nMusterloesung: ${text(problem.exampleEquation)}`;
      break;
    default: {
      const symbol = problem.type === 'multiplication' ? '*' : operationSymbol(problem.operation);
      question = `${text(problem.a)} ${symbol} ${text(problem.b)} = ${formatNumber(problem.correct)}`;
    }
  }

  if (!includeUserAnswer) return question;
  const userAnswer = problem.user === '(Gleichung falsch)' ? 'Gleichung falsch' : text(problem.user, '-');
  return `${question}\nAntwort: ${userAnswer}${problem.unit ? ` ${text(problem.unit)}` : ''}`;
}

function addPageHeader(doc, room, title, subtitle = '') {
  doc.addPage({ margin: 48 });
  doc.rect(0, 0, doc.page.width, 92).fill(COLORS.navy);
  doc.font('Helvetica-Bold').fontSize(19).fillColor('#FFFFFF').text(title, 48, 29, { width: doc.page.width - 96 });
  doc.font('Helvetica').fontSize(9).fillColor('#D9EAF5')
    .text(subtitle || `Raum: ${room.id}`, 48, 59, { width: doc.page.width - 96 });
  doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10).y = 116;
}

function addFooter(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.moveTo(48, doc.page.height - 52).lineTo(doc.page.width - 48, doc.page.height - 52).strokeColor(COLORS.line).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
      .text(`Math4Speed - Spielbericht - Seite ${i + 1}`, 48, doc.page.height - 68, { width: doc.page.width - 96, align: 'center' });
  }
  doc.fillColor(COLORS.ink);
}

function drawStatCard(doc, x, y, width, label, value, color) {
  doc.roundedRect(x, y, width, 58, 7).fill(COLORS.panel);
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(label, x + 12, y + 11, { width: width - 24 });
  doc.font('Helvetica-Bold').fontSize(19).fillColor(color).text(String(value), x + 12, y + 26, { width: width - 24 });
}

function drawPlayerProgress(doc, x, y, width, solved) {
  const correct = solved.filter(problem => problem.isCorrect).length;
  const wrong = solved.filter(problem => problem.isCorrect === false).length;
  const segmentGap = 2;
  const segmentWidth = solved.length ? Math.max(3, Math.min(13, (width - segmentGap * (solved.length - 1)) / solved.length)) : 13;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.ink).text('Aufgabenfortschritt', x, y);
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(`${correct} richtig - ${wrong} falsch`, x, y, { width, align: 'right' });
  solved.forEach((problem, index) => {
    const color = problem.assisted ? COLORS.yellow : problem.isCorrect ? COLORS.green : COLORS.red;
    const segmentX = x + index * (segmentWidth + segmentGap);
    doc.roundedRect(segmentX, y + 18, segmentWidth, 14, 3).fill(color);
  });
  if (!solved.length) doc.roundedRect(x, y + 18, width, 14, 3).fill(COLORS.line);
}

function drawPerformanceScale(doc, room, player) {
  const range = CATEGORIES[room.category]?.performanceScore || [10, 30];
  const [min, max] = range;
  const score = player.score?.time || 0;
  const markerPosition = max === min ? 0 : Math.min(1, Math.max(0, (score - min) / (max - min)));
  const x = 48;
  const y = doc.y;
  const width = doc.page.width - 96;
  const barY = y + 27;
  const third = width / 3;

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink).text('Ergebnis-Skala', x, y);
  doc.roundedRect(x, barY, third, 16, 8).fill(COLORS.red);
  doc.rect(x + third, barY, third, 16).fill('#F2C94C');
  doc.roundedRect(x + third * 2, barY, third, 16, 8).fill(COLORS.green);
  const markerX = x + markerPosition * width;
  doc.moveTo(markerX, barY - 5).lineTo(markerX, barY + 21).strokeColor('#111827').lineWidth(3).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(`Ueben\n${min}`, x, barY + 22, { width: third });
  doc.text('Gut', x + third, barY + 22, { width: third, align: 'center' });
  doc.text(`Hervorragend\n${max}`, x + third * 2, barY + 22, { width: third, align: 'right' });
  doc.y = y + 66;
}

function drawResultCard(doc, player) {
  const solved = player.solved || [];
  const x = 48;
  const y = doc.y;
  const width = doc.page.width - 96;
  doc.roundedRect(x, y, width, 65, 8).fill(COLORS.panel);
  drawPlayerProgress(doc, x + 16, y + 17, width - 32, solved);
  doc.y = y + 82;
}

function addTask(doc, room, player, index, problem) {
  const isCorrect = Boolean(problem.isCorrect);
  const body = formatProblem(problem, !isCorrect);
  const requiredHeight = Math.max(52, doc.heightOfString(body, { width: doc.page.width - 142, lineGap: 2 }) + 30);
  if (doc.y + requiredHeight > doc.page.height - 66) {
    addPageHeader(doc, room, `Aufgaben - ${text(player.username)}`, 'Fortsetzung');
  }

  const x = 48;
  const y = doc.y;
  const width = doc.page.width - 96;
  const background = isCorrect ? COLORS.paleGreen : COLORS.paleRed;
  const statusColor = isCorrect ? COLORS.green : COLORS.red;
  doc.roundedRect(x, y, width, requiredHeight, 6).fill(background);
  doc.roundedRect(x, y, 5, requiredHeight, 3).fill(statusColor);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(statusColor).text(isCorrect ? 'RICHTIG' : 'FALSCH', x + 16, y + 13, { width: 62 });
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(`Aufgabe ${index + 1}`, x + 82, y + 13, { width: 80 });
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.ink).text(body, x + 16, y + 29, { width: width - 32, lineGap: 2 });
  doc.y = y + requiredHeight + 8;
}

/** Writes the multiplayer report into the Express response stream. */
function generateReport(res, room, finishedPlayers) {
  const doc = new PDFDocument({ autoFirstPage: false, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${room.id}.pdf"`);
  doc.pipe(res);

  const finished = finishedPlayers || [];
  const averageCorrect = finished.length ? finished.reduce((sum, player) => sum + (player.score?.time || 0), 0) / finished.length : 0;
  const averageErrors = finished.length ? finished.reduce((sum, player) => sum + (player.score?.wrongCount || 0), 0) / finished.length : 0;
  const category = CATEGORIES[room.category]?.label || 'Unbekannte Kategorie';

  addPageHeader(doc, room, 'Spielbericht', `Raum: ${room.id} - Kategorie: ${category}`);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.ink).text('Ergebnisuebersicht');
  doc.moveDown(0.6);
  const cardWidth = (doc.page.width - 96 - 24) / 3;
  const cardY = doc.y;
  drawStatCard(doc, 48, cardY, cardWidth, 'ABGESCHLOSSEN', finished.length, COLORS.blue);
  drawStatCard(doc, 48 + cardWidth + 12, cardY, cardWidth, 'DURCHSCHNITT RICHTIG', formatDecimal(averageCorrect, { maximumFractionDigits: 1, minimumFractionDigits: 1 }), COLORS.green);
  drawStatCard(doc, 48 + (cardWidth + 12) * 2, cardY, cardWidth, 'DURCHSCHNITT FEHLER', formatDecimal(averageErrors, { maximumFractionDigits: 1, minimumFractionDigits: 1 }), COLORS.red);
  doc.y = cardY + 77;

  const x = 48;
  const columns = [260, 100, 100];
  const tableY = doc.y;
  doc.roundedRect(x, tableY, doc.page.width - 96, 27, 5).fill(COLORS.navy);
  [['Name', 0, 'left'], ['Richtig', 1, 'right'], ['Fehler', 2, 'right']].forEach(([label, index, align]) => {
    const offset = columns.slice(0, index).reduce((sum, width) => sum + width, 0);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF').text(label, x + offset + 10, tableY + 9, { width: columns[index] - 20, align });
  });
  doc.y = tableY + 31;
  finished.forEach((player, index) => {
    if (doc.y > doc.page.height - 90) addPageHeader(doc, room, 'Spielbericht', 'Ergebnisuebersicht - Fortsetzung');
    const y = doc.y;
    if (index % 2 === 0) doc.rect(x, y, doc.page.width - 96, 25).fill(COLORS.panel);
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.ink).text(text(player.username), x + 10, y + 8, { width: columns[0] - 20 });
    doc.font('Helvetica-Bold').text(formatNumber(player.score?.time), x + columns[0] + 10, y + 8, { width: columns[1] - 20, align: 'right' });
    doc.font('Helvetica').text(formatNumber(player.score?.wrongCount), x + columns[0] + columns[1] + 10, y + 8, { width: columns[2] - 20, align: 'right' });
    doc.y = y + 25;
  });

  finished.forEach((player, playerIndex) => {
    addPageHeader(doc, room, `Aufgaben - ${text(player.username, `Spieler ${playerIndex + 1}`)}`, category);
    drawResultCard(doc, player);
    const solved = player.solved || [];
    if (!solved.length) {
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('Keine bearbeiteten Aufgaben vorhanden.');
      return;
    }
    solved.forEach((problem, index) => addTask(doc, room, player, index, problem));
    if (doc.y + 72 > doc.page.height - 66) {
      addPageHeader(doc, room, `Ergebnis - ${text(player.username)}`, category);
    }
    drawPerformanceScale(doc, room, player);
  });

  addFooter(doc);
  doc.end();
}

module.exports = { generateReport, formatProblem };
