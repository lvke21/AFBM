import { chromium, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.PLAYTEST_BASE_URL ?? "http://localhost:3000";
const saveGameId = process.env.E2E_SAVEGAME_ID ?? "e2e-savegame-minimal";
const dashboardPath = `/app/savegames/${saveGameId}`;
const outDir = resolve(process.cwd(), "reports-output", "playtests", "ap6-final-validation");

type WeekObservation = {
  weekIndex: number;
  dashboardBefore: string;
  depthChart: string;
  setup: string;
  live: string;
  report: string;
  dashboardAfter: string;
  scoreText: string | null;
  recordText: string | null;
  blockedAt?: string;
  error?: string;
};

function compact(text: string | null | undefined) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

async function bodyText(page: Page) {
  return compact(await page.locator("body").innerText({ timeout: 10_000 }));
}

async function clickIfVisible(page: Page, name: string | RegExp) {
  const button = page.getByRole("button", { name }).first();

  if (!(await button.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return false;
  }

  await Promise.all([
    page.waitForLoadState("domcontentloaded").catch(() => undefined),
    button.click(),
  ]);
  await page.waitForTimeout(600);
  return true;
}

async function go(page: Page, path: string) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(500);
}

async function openWithDevLogin(page: Page) {
  await page.goto(
    `${baseUrl}/api/e2e/dev-login?callbackUrl=${encodeURIComponent(dashboardPath)}`,
    { waitUntil: "domcontentloaded", timeout: 45_000 },
  );
  await go(page, dashboardPath);
}

async function findFirstMatchLink(page: Page, label: string | RegExp) {
  const link = page.getByRole("link", { name: label }).first();

  if (!(await link.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return null;
  }

  return link.getAttribute("href");
}

async function chooseDepthChart(page: Page) {
  await go(page, `${dashboardPath}/team/depth-chart`);
  const before = await bodyText(page);
  const article = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Quarterback" }) })
    .first();
  const slotDown = article.getByRole("button", { name: "Slot runter" }).first();

  if (await slotDown.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await slotDown.click();
    await page.waitForURL(/feedback=success/, { timeout: 45_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
  }

  return `${before}\n\nAFTER_CHOICE\n${await bodyText(page)}`;
}

async function captureWeek(page: Page, weekIndex: number): Promise<WeekObservation> {
  const observation: WeekObservation = {
    weekIndex,
    dashboardBefore: "",
    depthChart: "",
    setup: "",
    live: "",
    report: "",
    dashboardAfter: "",
    scoreText: null,
    recordText: null,
  };

  try {
    await go(page, dashboardPath);
    observation.dashboardBefore = await bodyText(page);

    const prepared = await clickIfVisible(page, "Woche vorbereiten");
    if (!prepared && !observation.dashboardBefore.includes("READY")) {
      observation.blockedAt = "Prepare Week";
      observation.error = "No visible prepare action and dashboard was not ready.";
      return observation;
    }

    observation.depthChart = await chooseDepthChart(page);

    await go(page, dashboardPath);
    const setupHref = await findFirstMatchLink(page, "Gameplan vorbereiten");
    if (!setupHref) {
      observation.blockedAt = "Game Preview";
      observation.error = "No visible Gameplan vorbereiten link.";
      observation.dashboardAfter = await bodyText(page);
      return observation;
    }

    await go(page, setupHref);
    observation.setup = await bodyText(page);

    const started = await clickIfVisible(page, /Spiel starten|Match starten/);
    if (!started) {
      observation.blockedAt = "Live";
      observation.error = "No visible automatic start button.";
      return observation;
    }

    const liveHref = page.url().replace(baseUrl, "");
    if (!liveHref.includes("/game/live")) {
      const liveLink = await findFirstMatchLink(page, /Live|Spiel verfolgen/);
      if (liveLink) {
        await go(page, liveLink);
      }
    }

    observation.live = await bodyText(page);
    await page.screenshot({ path: resolve(outDir, `week-${weekIndex}-live.png`), fullPage: true });

    const finished = await clickIfVisible(page, "Zum Match Report");
    if (!finished) {
      observation.blockedAt = "Match Report";
      observation.error = "No visible Zum Match Report action.";
      return observation;
    }

    observation.report = await bodyText(page);
    await page.screenshot({ path: resolve(outDir, `week-${weekIndex}-report.png`), fullPage: true });
    observation.scoreText = compact((await page.getByText(/\d+\s:\s\d+/).first().textContent().catch(() => null)) ?? "");

    await go(page, dashboardPath);
    observation.dashboardAfter = await bodyText(page);
    observation.recordText = compact((await page.getByText(/\b\d+-\d+\b/).first().textContent().catch(() => null)) ?? "");

    await clickIfVisible(page, "Naechste Woche");
    await page.waitForTimeout(700);
    return observation;
  } catch (error) {
    observation.error = error instanceof Error ? error.message : String(error);
    return observation;
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const observations: WeekObservation[] = [];

  await openWithDevLogin(page);

  for (let weekIndex = 1; weekIndex <= 3; weekIndex += 1) {
    observations.push(await captureWeek(page, weekIndex));
  }

  await browser.close();
  const outputPath = resolve(outDir, "observations.json");
  writeFileSync(outputPath, JSON.stringify({ baseUrl, observations }, null, 2));
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
