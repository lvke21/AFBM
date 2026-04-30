import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const ADMIN_ACCESS_CODE = process.env.AFBM_ADMIN_ACCESS_CODE ?? "e2e-admin-code";
const ADMIN_SESSION_SECRET = process.env.AFBM_ADMIN_SESSION_SECRET ?? ADMIN_ACCESS_CODE;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "demo-afbm";
const FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ??
  process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ??
  "127.0.0.1:8080";
const FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ??
  "127.0.0.1:9099";
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
      AFBM_APP_USER_ID: process.env.AFBM_APP_USER_ID ?? process.env.E2E_USER_ID ?? "e2e-gm",
      AFBM_ADMIN_ACCESS_CODE: ADMIN_ACCESS_CODE,
      AFBM_ADMIN_SESSION_SECRET: ADMIN_SESSION_SECRET,
      FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_API_KEY:
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${FIREBASE_PROJECT_ID}.appspot.com`,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "000000000000",
      NEXT_PUBLIC_FIREBASE_APP_ID:
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:000000000000:web:e2e",
      NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: FIRESTORE_EMULATOR_HOST,
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: FIREBASE_AUTH_EMULATOR_HOST,
      NEXT_PUBLIC_AFBM_ONLINE_BACKEND:
        process.env.NEXT_PUBLIC_AFBM_ONLINE_BACKEND ?? process.env.AFBM_ONLINE_BACKEND ?? "local",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
