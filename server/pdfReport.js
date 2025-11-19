const PDFDocument = require('pdfkit');

/**
 * generateReport(res, room, finishedPlayers)
 * - writes PDF into express response stream and ends response
 */
const formatFactorString = (value = '') => {
  const tokens = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return tokens.length ? tokens.join(' ⋅ ') : '—'
}

function generateReport(res, room, finishedPlayers) {
  const doc = new PDFDocument({ autoFirstPage: false });
  // pipe to response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${room.id}.pdf"`);
  doc.pipe(res);

  // first page: summary
  doc.addPage({ margin: 48 });
  doc.fontSize(18).font('Helvetica-Bold').text(`Raum: ${room.id}`, { align: 'center' });
  doc.moveDown(0.5);

  // basic stats
  const finished = finishedPlayers || [];
  const avgTime = finished.length ? (finished.reduce((s, p) => s + (p.score?.time || 0), 0) / finished.length) : 0;
  const avgErrors = finished.length ? (finished.reduce((s, p) => s + (p.score?.wrongCount || 0), 0) / finished.length) : 0;

  doc.fontSize(12).font('Helvetica').text(`Teilnehmer abgeschlossen: ${finished.length}`);
  doc.text(`Ø Lösungszeit: ${avgTime.toFixed(1)}s`);
  doc.text(`Ø Fehleranzahl: ${avgErrors.toFixed(1)}`);
  doc.moveDown(1);

  // summary table header
  const startX = doc.page.margins.left;
  const colWidths = [200, 80, 80]; // name, time, errors
  const cols = ['Name', 'Zeit (s)', 'Fehler'];
  let x = startX;
  doc.fontSize(11).font('Helvetica-Bold');
  cols.forEach((c, i) => {
    doc.text(c, x, doc.y, { width: colWidths[i], continued: false });
    x += colWidths[i];
  });
  doc.moveDown(0.3);
  doc.moveTo(startX, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.2);

  // rows
  doc.font('Helvetica').fontSize(10);
  finished.forEach((p) => {
    // check page space and add new page if needed
    if (doc.y > doc.page.height - doc.page.margins.bottom - 80) {
      doc.addPage({ margin: 48 });
    }
    x = startX;
    doc.text(String(p.username || '—'), x, doc.y, { width: colWidths[0] });
    x += colWidths[0];
    doc.text(String(p.score?.time ?? '—'), x, doc.y, { width: colWidths[1], align: 'right' });
    x += colWidths[1];
    doc.text(String(p.score?.wrongCount ?? '—'), x, doc.y, { width: colWidths[2], align: 'right' });
    doc.moveDown(0.4);
  });

  // per-player pages (one per page)
  finished.forEach((p, idx) => {
    doc.addPage({ margin: 48 });
    doc.fontSize(16).font('Helvetica-Bold').text(p.username || `Spieler ${idx + 1}`);
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Zeit: ${p.score?.time ?? '—'}s`);
    doc.text(`Fehler: ${p.score?.wrongCount ?? '—'}`);
    doc.moveDown(0.6);
    // solved problems list (paginated by doc automatic page break logic)
    doc.fontSize(10);
    if (p.solved && p.solved.length) {
      p.solved.forEach((prob) => {
  const userAnswerRaw = (prob && prob.user !== undefined && prob.user !== null && prob.user !== '') ? prob.user : '(keine Antwort)';
  const userAnswer = userAnswerRaw === '(keine Antwort)' ? '—' : formatFactorString(userAnswerRaw);
        if (prob.type === 'primfaktorisierung') {
          doc.text(`Primfaktoren von ${prob.number} = ${formatFactorString(prob.correct)}  (Deine Antwort: ${userAnswer})`);
        } else if (prob) {
          const op = (prob.operation === 'add' || prob.type === 'add') ? '+'
            : (prob.operation === 'subtract' || prob.type === 'subtract') ? '−'
            : '·';
          const left = typeof prob.a !== 'undefined' ? prob.a : '—';
          const right = typeof prob.b !== 'undefined' ? prob.b : '—';
          const correct = (prob.correct !== undefined && prob.correct !== null) ? prob.correct : '—';
          doc.text(`${left} ${op} ${right} = ${correct}  (Deine Antwort: ${userAnswer})`);
        }
      });
    } else {
      doc.text('Keine gelösten Aufgaben vorhanden.');
    }
  });

  // finalize
  doc.end();
}

module.exports = { generateReport };