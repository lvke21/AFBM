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
const GAME_REPORT_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/report`;
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

test.describe("Match Report Consequences", () => {
  test("zeigt nach dem Spiel klare Post-Game-Konsequenzen fuer die naechste Woche", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await signInViaDevLogin(page, E2E_TEST_ROUTES.dashboard);
    await moveToLiveGame(page);

    const finishForm = page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: "Zum Match Report" }) })
      .first();

    await waitForServerActionRedirect(page, GAME_LIVE_ROUTE, () =>
      finishForm.getByRole("button", { name: "Zum Match Report" }).click({ noWaitAfter: true }),
    );

    await gotoAppRoute(page, `${GAME_REPORT_ROUTE}?${UPCOMING_MATCH_QUERY}`);

    await expect(page.getByRole("heading", { name: "What This Means For Next Week" })).toBeVisible();
    await expect(page.getByText("Was hat das Spiel entschieden?").first()).toBeVisible();
    await expect(page.getByText("Was bedeutet das fuer naechste Woche?").first()).toBeVisible();
    await expect(page.getByText("Welche Entscheidung braucht Aufmerksamkeit?").first()).toBeVisible();
  });
});
