import { expect, test, type Page } from "@playwright/test";

import {
  E2E_TEST_IDS,
  E2E_TEST_LABELS,
  E2E_TEST_ROUTES,
} from "./fixtures/minimal-e2e-context";
import { E2E_NAVIGATION_TIMEOUT_MS, signInViaDevLogin } from "./helpers/e2e-harness";

const SAVEGAME_ROUTE = E2E_TEST_IDS.saveGameId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const DASHBOARD_ROUTE = E2E_TEST_ROUTES.dashboard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type NavigationTarget = {
  label: string;
  urlPattern: RegExp;
  heading: string;
  visibleText: string | RegExp;
};

const navigationTargets: NavigationTarget[] = [
  {
    label: "Spielablauf",
    urlPattern: new RegExp(`/app/savegames/${SAVEGAME_ROUTE}/game/(setup|live|report)(?:\\?.*)?$`),
    heading: "Boston Guardians",
    visibleText: "Spielvorbereitung",
  },
  {
    label: "Roster",
    urlPattern: new RegExp(`/app/savegames/${SAVEGAME_ROUTE}/team/roster(?:\\?.*)?$`),
    heading: "Team Roster",
    visibleText: "Roster Command",
  },
  {
    label: "Depth Chart",
    urlPattern: new RegExp(`/app/savegames/${SAVEGAME_ROUTE}/team/depth-chart(?:\\?.*)?$`),
    heading: "Team Depth Chart",
    visibleText: "Depth Chart & Assignments",
  },
  {
    label: "Contracts/Cap",
    urlPattern: new RegExp(`/app/savegames/${SAVEGAME_ROUTE}/team/contracts(?:\\?.*)?$`),
    heading: "Team Contracts",
    visibleText: "Cap Overview",
  },
  {
    label: "Development",
    urlPattern: new RegExp(`/app/savegames/${SAVEGAME_ROUTE}/development(?:\\?.*)?$`),
    heading: "Development",
    visibleText: "Player Development",
  },
  {
    label: "Trade Board",
    urlPattern: new RegExp(`/app/savegames/${SAVEGAME_ROUTE}/team/trades(?:\\?.*)?$`),
    heading: "Trade Board",
    visibleText: "Trade Vorbereitung",
  },
];

async function signInToDashboard(page: Page) {
  await signInViaDevLogin(page, E2E_TEST_ROUTES.dashboard);
}

async function expectDashboard(page: Page) {
  await expect(page).toHaveURL(new RegExp(`${DASHBOARD_ROUTE}/?$`));
  await expect(page.getByText("GM Buero")).toBeVisible();
  await expect(page.getByText(E2E_TEST_LABELS.saveGameName).first()).toBeVisible();
}

async function openNavigationTarget(page: Page, target: NavigationTarget) {
  const navigation = page.getByRole("navigation", { name: "GM Navigation" });
  const link = navigation.getByRole("link", { name: target.label, exact: true });

  await expect(navigation).toBeVisible();
  await expect(link).toBeVisible();
  await link.click({ noWaitAfter: true });
  await page.waitForURL(target.urlPattern, {
    timeout: E2E_NAVIGATION_TIMEOUT_MS,
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: target.heading, exact: true })).toBeVisible();
  await expect(page.getByText(target.visibleText).first()).toBeVisible();
  await expect(navigation.getByRole("link", { name: target.label, exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
}

test.describe("Hauptnavigation", () => {
  test("priorisiert Core Actions und oeffnet zentrale Manager-Flows", async ({ page }) => {
    test.setTimeout(120_000);

    await signInToDashboard(page);
    await expectDashboard(page);

    for (const target of navigationTargets) {
      await test.step(`${target.label} ist erreichbar und rendert`, async () => {
        await openNavigationTarget(page, target);
      });
    }
  });
});
