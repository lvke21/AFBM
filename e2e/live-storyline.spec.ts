import { expect, test, type Page } from "@playwright/test";

import {
  E2E_TEST_IDS,
  E2E_TEST_ROUTES,
} from "./fixtures/minimal-e2e-context";
import {
  gotoAppRoute,
  signInViaDevLogin,
  waitForServerActionRedirect,
} from "./helpers/e2e-harness";

const GAME_SETUP_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/setup`;
const GAME_LIVE_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/live`;
const DEPTH_CHART_ROUTE = `${E2E_TEST_ROUTES.dashboard}/team/depth-chart`;
const UPCOMING_MATCH_QUERY = `matchId=${encodeURIComponent(E2E_TEST_IDS.upcomingMatchId)}`;

function weekLoopPanel(page: Page) {
  return page.locator("#week-loop");
}

async function isVisible(locator: ReturnType<Page["locator"]>) {
  try {
    await expect(locator).toBeVisible({ timeout: 1_500 });
    return true;
  } catch {
    return false;
  }
}

async function moveToLiveGame(page: Page) {
  const prepareButton = weekLoopPanel(page).getByRole("button", { name: "Woche vorbereiten" });

  if (await isVisible(prepareButton)) {
    await waitForServerActionRedirect(page, E2E_TEST_ROUTES.dashboard, () =>
      prepareButton.click({ noWaitAfter: true }),
    );
  }

  await gotoAppRoute(page, DEPTH_CHART_ROUTE);

  const feedback = page.getByText("Depth Chart Reihenfolge aktualisiert");

  if (!(await isVisible(feedback))) {
    const quarterbackSection = page
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: "Quarterback" }) })
      .first();

    await waitForServerActionRedirect(page, DEPTH_CHART_ROUTE, () =>
      quarterbackSection.getByRole("button", { name: "Slot runter" }).first().click({
        noWaitAfter: true,
      }),
    );
  }

  await gotoAppRoute(page, `${GAME_SETUP_ROUTE}?${UPCOMING_MATCH_QUERY}`);

  const startButton = page.getByRole("button", { name: /Spiel starten|Match starten/ });

  if (await isVisible(startButton)) {
    await waitForServerActionRedirect(page, GAME_SETUP_ROUTE, () =>
      startButton.click({ noWaitAfter: true }),
    );
  }

  await gotoAppRoute(page, `${GAME_LIVE_ROUTE}?${UPCOMING_MATCH_QUERY}`);
}

test.describe("Live Simulation Storyline", () => {
  test("zeigt nach dem Match-Start eine emotionale Storyline-Schicht", async ({ page }) => {
    test.setTimeout(120_000);

    await signInViaDevLogin(page, E2E_TEST_ROUTES.dashboard);
    await moveToLiveGame(page);

    await expect(page.getByRole("heading", { name: "What This Game Feels Like" })).toBeVisible();
    await expect(page.getByText("Current Game State").first()).toBeVisible();
    await expect(page.getByText("Key Drive").first()).toBeVisible();
    await expect(page.getByText("Momentum Signal").first()).toBeVisible();
    await expect(page.getByText("Manager Impact").first()).toBeVisible();
    await expect(page.getByText("What to watch next").first()).toBeVisible();
    await expect(page.getByText("Drive Timeline").first()).toBeVisible();
    await expect(page.getByText(/Touchdown|Field Goal|Punt|Turnover/i).first()).toBeVisible();
  });
});
