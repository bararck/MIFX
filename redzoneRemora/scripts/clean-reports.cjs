const fs = require('node:fs');
const path = require('node:path');

const reportsDirectory = path.resolve(__dirname, '..', 'reports');
const runArtifacts = [
  'cucumber-report.json',
  'cucumber-report.html',
  'junit.xml',
  '.run-started',
  '.run-complete'
];

fs.mkdirSync(reportsDirectory, { recursive: true });

// Do not delete the entire reports directory. A local web viewer can still be
// serving the rich HTML report while a new run starts, which locks the folder
// on Windows. Only the files produced by Cucumber for this run are replaced.
for (const artifact of runArtifacts) {
  const artifactPath = path.join(reportsDirectory, artifact);
  if (fs.existsSync(artifactPath)) fs.rmSync(artifactPath, { force: true });
}
