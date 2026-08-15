const fs = require('fs');
const path = require('path');
const { generateReport } = require('./pdfReport');
const { sampleReports, createSampleResponse } = require('./pdfReportSample');

const outputDir = path.join(__dirname, '..', 'output', 'pdf');

function generateSampleReport(category, players) {
  return new Promise((resolve) => {
    const outputFile = path.join(outputDir, `muster-spielbericht-${category}.pdf`);
    generateReport(createSampleResponse((pdf) => {
      fs.writeFileSync(outputFile, pdf);
      console.log(`Musterbericht erstellt: ${outputFile}`);
      resolve();
    }), { id: `pdf-test-${category}`, category }, players);
  });
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [category, players] of Object.entries(sampleReports)) {
    await generateSampleReport(category, players);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
