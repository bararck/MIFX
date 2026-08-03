const fs = require('node:fs');
const path = require('node:path');

require('./clean-reports.cjs');

const reportsDirectory = path.resolve(__dirname, '..', 'reports');
fs.writeFileSync(
  path.join(reportsDirectory, '.run-started'),
  JSON.stringify({ startedAt: new Date().toISOString() }, null, 2)
);
