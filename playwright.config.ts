import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const DEV_EMAIL = process.env.AUTH_DEV_EMAIL ?? "e2e-gm@example.test";
const DEV_PASSWORD = process.env.AUTH_DEV_PASSWORD ?? "e2e-password";
const GLOBAL_TIMEOUT_MS = Number(process.env.E2E_GLOBAL_TIMEOUT_MS ?? 180_000);
const TEST_TIMEOUT_MS = Number(process.env.E2E_TEST_TIMEOUT_MS ?? 30_000);
const EXPECT_TIMEOUT_MS = Number(process.env.E2E_EXPECT_TIMEOUT_MS ?? 5_000);
const NAVIGATION_TIMEOUT_MS = Number(process.env.E2E_NAVIGATION_TIMEOUT_MS ?? 45_000);
const WEB_SERVER_TIMEOUT_MS = Number(process.env.E2E_WEB_SERVER_TIMEOUT_MS ?? 45_000);
const OUTPUT_DIR = process.env.E2E_OUTPUT_DIR ?? "/tmp/afbm-playwright-test-results";
const HTML_REPORT_DIR = process.env.E2E_HTML_REPORT_DIR ?? "/tmp/afbm-playwright-report";
const JSON_REPORT_FILE = process.env.E2E_JSON_REPORT_FILE ?? "/tmp/afbm-playwright-results.json";

export default defineConfig({
  testDir: "./e2e",
  outputDir: OUTPUT_DIR,
  globalTimeout: GLOBAL_TIMEOUT_MS,
  timeout: TEST_TIMEOUT_MS,
  expect: {
    timeout: EXPECT_TIMEOUT_MS,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  maxFailures: 1,
  retries: process.env.CI ? 1 : 0,
  reportSlowTests: {
    max: 5,
    threshold: 10_000,
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: HTML_REPORT_DIR }],
    ["json", { outputFile: JSON_REPORT_FILE }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 8_000,
    navigationTimeout: NAVIGATION_TIMEOUT_MS,
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "true",
    timeout: WEB_SERVER_TIMEOUT_MS,
    gracefulShutdown: {
      signal: "SIGTERM",
      timeout: 5_000,
    },
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      AUTH_DEV_ENABLED: "true",
      AUTH_DEV_EMAIL: DEV_EMAIL,
      AUTH_DEV_PASSWORD: DEV_PASSWORD,
      E2E_AUTH_BYPASS: "true",
      AUTH_SECRET:
        process.env.AUTH_SECRET ??
        "e2e-local-secret-only-for-playwright-tests-change-in-real-env",
      AUTH_URL: BASE_URL,
      NEXTAUTH_URL: BASE_URL,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
