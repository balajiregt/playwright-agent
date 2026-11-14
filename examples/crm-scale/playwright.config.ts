import { defineConfig, devices } from '@playwright/test';

const port = process.env.CRM_SCALE_PORT ?? '4300';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CRM_SCALE_WORKERS ? Number(process.env.CRM_SCALE_WORKERS) : 4,
  timeout: 20_000,
  expect: { timeout: 4_000 },
  reporter: [['list'], ['json', { outputFile: process.env.CRM_SCALE_REPORT ?? 'test-results/results.json' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `"${process.execPath}" app/server.mjs`,
    env: { PORT: port, ...(process.env.CRM_SCALE_FAULT ? { CRM_SCALE_FAULT: process.env.CRM_SCALE_FAULT, CRM_SCALE_BENCHMARK: '1' } : {}) },
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 20_000
  }
});
