const report = require('multiple-cucumber-html-reporter');
const fs = require('node:fs');
const path = require('node:path');

const reportJson = path.resolve(__dirname, '..', 'reports', 'cucumber-report.json');
const runCompleted = path.resolve(__dirname, '..', 'reports', '.run-complete');

if (!fs.existsSync(reportJson) || !fs.existsSync(runCompleted)) {
  throw new Error('No completed Cucumber JSON report exists. Run a test command before generating the rich report.');
}

report.generate({
  jsonDir: 'reports',
  reportPath: 'reports/html',
  pageTitle: 'Remora API Automation Report',
  reportName: 'Remora API BDD Report',
  displayDuration: true,
  metadata: { browser: { name: 'API / Playwright' }, device: 'local or CI', platform: { name: process.platform } }
});
