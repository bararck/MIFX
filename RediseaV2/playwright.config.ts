import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://stg-remora.redikru.com',
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'api-tests',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  outputDir: 'test-results/'
});