import { After, AfterAll, Before, Status, setDefaultTimeout } from '@cucumber/cucumber';
import fs from 'node:fs';
import path from 'node:path';
import { createApiContext, redact } from './api-client';
import { config } from './config';
import { revertCrewReplacementIfNeeded } from '../domain/crew-replacement';
import type { RemoraWorld } from './world';

setDefaultTimeout(config.scenarioTimeoutMs);

Before(async function (this: RemoraWorld, scenario) {
  if (scenario.pickle.tags.some(tag => tag.name === '@stateful') && !config.enableStatefulPlanningTests) {
    return 'skipped';
  }
  this.request = await createApiContext();
});

After(async function (this: RemoraWorld, scenario) {
  try {
    await revertCrewReplacementIfNeeded(this);
    if (scenario.result?.status !== Status.PASSED && this.requestLog.length) {
      await this.attach(
        redact({
          scenario: scenario.pickle.name,
          environment: config.environment,
          requests: this.requestLog
        }),
        'application/json'
      );
    }
  } finally {
    await this.request?.dispose();
  }
});

AfterAll(function () {
  if (process.env.CUCUMBER_REPORTS === 'false') return;

  const reportsDirectory = path.resolve(process.cwd(), 'reports');
  const startedMarker = path.join(reportsDirectory, '.run-started');

  if (!fs.existsSync(startedMarker)) return;
  fs.writeFileSync(
    path.join(reportsDirectory, '.run-complete'),
    JSON.stringify({ completedAt: new Date().toISOString() }, null, 2)
  );
});
