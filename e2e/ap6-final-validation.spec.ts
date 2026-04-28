import { test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { E2E_TEST_ROUTES } from "./fixtures/minimal-e2e-context";
import { signInViaDevLogin } from "./helpers/e2e-harness";

const OUT_DIR = resolve(process.cwd(), "reports-output", "playtests", "ap6-final-validation");
const DASHBOARD_ROUTE = E2E_TEST_ROUTES.dashboard;

type Observation = {
  week: number;
  blockedAt: string | null;
  error: string | null;
  dashboardBefore: string;
  depthChart: string;
  setup: string;
  live: string;
  report: string;
  dashboardAfter: string;
  setupHref: string | null;
  score: string | null;
  record: string | null;
};

function compact(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

async function pageText(page: Page) {
  return compact(await page.locator("body").innerText({ timeout: 10_000 }));
}

async function clickButton(page: Page, name: string | RegExp) {
  const button = page.getByRole("button", { name }).first();

  if (!(await button.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return false;
  }

  await button.click({ noWaitAfter: true });
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForTimeout(600);
  return true;
}

async function clickButtonAndWaitForUrl(page: Page, name: string | RegExp, url: RegExp) {
  const button = page.getByRole("button", { name }).first();

  if (!(await button.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return false;
  }

  await Promise.all([
    page.waitForURL(url, { timeout: 45_000 }),
    button.click({ noWaitAfter: true }),
  ]);
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForTimeout(600);
  return true;
}

async function go(page: Page, href: string) {
  await page.goto(href, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(400);
}

async function firstLinkHref(page: Page, name: string | RegExp) {
  const link = page.getByRole("link", { name }).first();

  if (!(await link.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return null;
  }

  return link.getAttribute("href");
}

async function chooseDepthChart(page: Page) {
  await go(page, `${DASHBOARD_ROUTE}/team/depth-chart`);
  const before = await pageText(page);
  const quarterback = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Quarterback" }) })
    .first();
  const slotDown = quarterback.getByRole("button", { name: "Slot runter" }).first();

  if (await slotDown.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await slotDown.click({ noWaitAfter: true });
    await page.waitForURL(/feedback=success/, { timeout: 45_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
  }

  return `${before}\n\nAFTER DEPTH CHART ACTION\n${await pageText(page)}`;
}

async function playWeek(page: Page, week: number): Promise<Observation> {
  const observation: Observation = {
    week,
    blockedAt: null,
    error: null,
    dashboardBefore: "",
    depthChart: "",
    setup: "",
    live: "",
    report: "",
    dashboardAfter: "",
    setupHref: null,
    score: null,
    record: null,
  };

  try {
    await go(page, DASHBOARD_ROUTE);
    observation.dashboardBefore = await pageText(page);

    await clickButton(page, "Woche vorbereiten");
    await page.waitForTimeout(800);

    observation.depthChart = await chooseDepthChart(page);

    await go(page, DASHBOARD_ROUTE);
    observation.setupHref = await firstLinkHref(page, "Gameplan vorbereiten");
    if (!observation.setupHref) {
      observation.blockedAt = "Game Preview";
      observation.error = "Kein sichtbarer Link 'Gameplan vorbereiten'.";
      observation.dashboardAfter = await pageText(page);
      return observation;
    }

    await go(page, observation.setupHref);
    observation.setup = await pageText(page);

    if (!(await clickButtonAndWaitForUrl(page, /Spiel starten|Match starten/, /\/game\/live/))) {
      observation.blockedAt = "Live";
      observation.error = "Kein sichtbarer automatischer Startbutton.";
      return observation;
    }

    if (!page.url().includes("/game/live")) {
      const liveHref = await firstLinkHref(page, /Live|Spiel verfolgen/);
      if (liveHref) {
        await go(page, liveHref);
      }
    }

    observation.live = await pageText(page);
    await page.screenshot({ path: resolve(OUT_DIR, `week-${week}-live.png`), fullPage: true });

    if (!(await clickButtonAndWaitForUrl(page, "Zum Match Report", /\/game\/report/))) {
      observation.blockedAt = "Match Report";
      observation.error = "Kein sichtbarer Button 'Zum Match Report'.";
      return observation;
    }

    observation.report = await pageText(page);
    await page.screenshot({ path: resolve(OUT_DIR, `week-${week}-report.png`), fullPage: true });
    observation.score = compact(await page.getByText(/\d+\s:\s\d+/).first().textContent().catch(() => null)) || null;

    await go(page, DASHBOARD_ROUTE);
    observation.dashboardAfter = await pageText(page);
    observation.record = compact(await page.getByText(/\b\d+-\d+\b/).first().textContent().catch(() => null)) || null;
    await clickButton(page, "Naechste Woche");
  } catch (error) {
    observation.error = error instanceof Error ? error.message : String(error);
  }

  return observation;
}

test("AP6 final validation playtest: three-week first-user flow", async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(OUT_DIR, { recursive: true });

  await signInViaDevLogin(page, DASHBOARD_ROUTE);

  const observations: Observation[] = [];
  for (let week = 1; week <= 3; week += 1) {
    observations.push(await playWeek(page, week));
  }

  writeFileSync(
    resolve(OUT_DIR, "observations.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), observations }, null, 2),
  );
});
