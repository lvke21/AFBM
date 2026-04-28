import { expect, test, type Page } from "@playwright/test";

import { E2E_TEST_ROUTES } from "./fixtures/minimal-e2e-context";
import { E2E_NAVIGATION_TIMEOUT_MS, signInViaDevLogin } from "./helpers/e2e-harness";

const DRAFT_ROUTE_PATTERN = new RegExp(
  `${E2E_TEST_ROUTES.draft.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?.*)?$`,
);

async function signInToDraft(page: Page) {
  await signInViaDevLogin(page, E2E_TEST_ROUTES.draft);
  await expect(page).toHaveURL(DRAFT_ROUTE_PATTERN, { timeout: E2E_NAVIGATION_TIMEOUT_MS });
}

test.describe("Draft MVP", () => {
  test("pickt einen verfuegbaren Prospect und behaelt den Pick nach Reload", async ({
    page,
  }) => {
    test.setTimeout(75_000);

    await signInToDraft(page);

    await expect(page.getByRole("heading", { name: "Draft" })).toBeVisible();
    await expect(page.getByText("2027 E2E Draft Class")).toBeVisible();
    await expect(page.getByText("ACTIVE").first()).toBeVisible();

    const prospectRow = page.locator("tr", { hasText: "Cole Harrison" }).first();

    await test.step("verfuegbarer Prospect ist sichtbar und pickbar", async () => {
      await expect(prospectRow, "Cole Harrison row should exist in the Draft board").toBeVisible();
      await expect(prospectRow.getByText("AVAILABLE")).toBeVisible();
      await expect(prospectRow.getByRole("button", { name: "Pick pruefen" })).toBeVisible();
    });

    await test.step("Pick-Dialog zeigt Chance, Risiko und Team Need", async () => {
      const dialog = page.getByRole("dialog", { name: /Cole Harrison draften/ });

      await expect(async () => {
        await prospectRow.getByRole("button", { name: "Pick pruefen" }).click({ noWaitAfter: true });
        await expect(dialog).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: E2E_NAVIGATION_TIMEOUT_MS });

      await expect(dialog).toBeVisible();
      await expect(dialog.getByText("QB").first()).toBeVisible();
      await expect(dialog.getByText("86-90")).toBeVisible();
      await expect(dialog.getByText("MEDIUM")).toBeVisible();
      await expect(dialog.getByText("FOCUSED")).toBeVisible();
      await expect(dialog.getByText("Team-Need-Relevanz")).toBeVisible();
      await dialog.getByRole("button", { name: "Pick bestaetigen" }).click({ noWaitAfter: true });
    });

    await test.step("Success-Feedback ist sichtbar", async () => {
      await page.waitForURL(/feedback=success/, { timeout: E2E_NAVIGATION_TIMEOUT_MS });
      await expect(page.getByText("Prospect gedraftet")).toBeVisible();
      await expect(page.getByText("Cole Harrison wurde von deinem Team ausgewaehlt.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Roster und Needs pruefen" })).toBeVisible();
    });

    await test.step("Pick bleibt nach Reload erhalten und ist nicht erneut ausfuehrbar", async () => {
      await page.reload();
      await page.waitForURL(DRAFT_ROUTE_PATTERN, {
        timeout: E2E_NAVIGATION_TIMEOUT_MS,
        waitUntil: "domcontentloaded",
      });

      const persistedRow = page.locator("tr", { hasText: "Cole Harrison" }).first();

      await expect(persistedRow).toBeVisible();
      await expect(persistedRow.getByText("DRAFTED")).toBeVisible();
      await expect(persistedRow.getByRole("button", { name: "Pick pruefen" })).toHaveCount(0);
      await expect(persistedRow.getByText("Nicht verfuegbar")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Rookie Rights" })).toBeVisible();
      await expect(
        page.locator("article", { hasText: "Cole Harrison" }).getByText("Needs Contract"),
      ).toBeVisible();
    });
  });
});
