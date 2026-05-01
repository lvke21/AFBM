import { expect, test } from "@playwright/test";

test("minimal match result stays visible and offers stable next actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Schnellsimulation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spiel starten" })).toBeVisible();

  await page.getByRole("button", { name: "Spiel starten" }).click();

  await expect(page.getByRole("button", { name: "Re-Match simulieren" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Zurueck zum Hub" })).toHaveAttribute(
    "href",
    "/app/savegames",
  );
  await expect(page.getByText("TOTAL YARDS")).toBeVisible();
  await expect(page.getByText("PASSING YARDS")).toBeVisible();
  await expect(page.getByText("RUSHING YARDS")).toBeVisible();
  await expect(page.getByText("TURNOVERS")).toBeVisible();
  const resultPanel = page
    .getByRole("button", { name: "Re-Match simulieren" })
    .locator("xpath=ancestor::section[1]");
  await expect(resultPanel).toContainText(/gewinnt|trennen sich/);

  await page.getByRole("button", { name: "Re-Match simulieren" }).dblclick();

  await expect(page.getByRole("button", { name: "Re-Match simulieren" })).toBeVisible();
  await expect(page.getByText("Das Ergebnis bleibt stehen")).toBeVisible();
  await expect(page.getByRole("link", { name: "Zurueck zum Hub" })).toBeVisible();
});
