# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: week-loop.spec.ts >> Minimaler Week Loop >> durchlaeuft PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK
- Location: e2e/week-loop.spec.ts:69:7

# Error details

```
TimeoutError: page.waitForResponse: Timeout 15000ms exceeded while waiting for event "response"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - paragraph [ref=e7]: GM Console
          - paragraph [ref=e8]: Boston Guardians
          - paragraph [ref=e9]: E2E Minimal Savegame
        - navigation "GM Navigation" [ref=e10]:
          - generic [ref=e11]:
            - paragraph [ref=e12]: Core
            - generic [ref=e13]:
              - link "Dashboard" [ref=e14] [cursor=pointer]:
                - /url: /app/savegames/e2e-savegame-minimal
                - generic [ref=e15]: Dashboard
              - link "Inbox" [ref=e16] [cursor=pointer]:
                - /url: /app/savegames/e2e-savegame-minimal/inbox
                - generic [ref=e17]: Inbox
          - generic [ref=e18]:
            - paragraph [ref=e19]: Team
            - link "Team" [ref=e21] [cursor=pointer]:
              - /url: /app/savegames/e2e-savegame-minimal/team
              - generic [ref=e22]: Team
          - generic [ref=e23]:
            - paragraph [ref=e24]: Game
            - link "Game" [ref=e26] [cursor=pointer]:
              - /url: /app/savegames/e2e-savegame-minimal/game/live?matchId=e2e-match-week-1
              - generic [ref=e27]: Game
          - generic [ref=e29]:
            - paragraph [ref=e30]: League
            - link "League" [ref=e32] [cursor=pointer]:
              - /url: /app/savegames/e2e-savegame-minimal/league
              - generic [ref=e33]: League
          - generic [ref=e34]:
            - paragraph [ref=e35]: Finance
            - link "Finance" [ref=e37] [cursor=pointer]:
              - /url: /app/savegames/e2e-savegame-minimal/finance
              - generic [ref=e38]: Finance
          - generic [ref=e39]:
            - paragraph [ref=e40]: Development
            - generic [ref=e41]:
              - link "Development" [ref=e42] [cursor=pointer]:
                - /url: /app/savegames/e2e-savegame-minimal/development
                - generic [ref=e43]: Development
              - link "Draft" [ref=e44] [cursor=pointer]:
                - /url: /app/savegames/e2e-savegame-minimal/draft
                - generic [ref=e45]: Draft
          - generic [ref=e46]:
            - paragraph [ref=e47]: Tools
            - link "Savegames" [ref=e49] [cursor=pointer]:
              - /url: /app/savegames
              - generic [ref=e50]: Savegames
    - generic [ref=e51]:
      - banner [ref=e52]:
        - generic [ref=e53]:
          - link "AFBM Manager" [ref=e54] [cursor=pointer]:
            - /url: /app
          - generic [ref=e55]:
            - generic [ref=e56]: E2E Minimal Savegame
            - generic [ref=e57]: 2026 · REGULAR_SEASON · Woche 1
        - generic [ref=e58]:
          - generic [ref=e59]:
            - paragraph [ref=e60]: GM Team
            - paragraph [ref=e61]: BOS · 0-0
          - generic [ref=e62]:
            - paragraph [ref=e63]: Liga
            - paragraph [ref=e64]: American Football Manager League
      - main [ref=e65]:
        - navigation "Breadcrumbs" [ref=e67]:
          - link "App" [ref=e69] [cursor=pointer]:
            - /url: /app
          - generic [ref=e70]:
            - generic [ref=e71]: /
            - link "Savegames" [ref=e72] [cursor=pointer]:
              - /url: /app/savegames
          - generic [ref=e73]:
            - generic [ref=e74]: /
            - link "E2E Minimal Savegame" [ref=e75] [cursor=pointer]:
              - /url: /app/savegames/e2e-savegame-minimal
          - generic [ref=e76]:
            - generic [ref=e77]: /
            - generic [ref=e78]: Game Center
        - generic [ref=e81]:
          - heading "Game Center" [level=1] [ref=e82]
          - paragraph [ref=e83]: E2E Minimal Savegame · American Football Manager League
        - generic [ref=e84]:
          - generic [ref=e85]:
            - generic [ref=e86]:
              - paragraph [ref=e87]: Phase
              - paragraph [ref=e88]: Live
            - generic [ref=e89]:
              - paragraph [ref=e90]: Woche
              - paragraph [ref=e91]: "1"
            - generic [ref=e92]:
              - paragraph [ref=e93]: Status
              - paragraph [ref=e94]: IN PROGRESS
            - generic [ref=e95]:
              - paragraph [ref=e96]: Datum
              - paragraph [ref=e97]: 06.09.2026
            - generic [ref=e98]:
              - paragraph [ref=e99]: Drives
              - paragraph [ref=e100]: "0"
          - generic [ref=e101]:
            - generic [ref=e102]:
              - generic [ref=e103]:
                - paragraph [ref=e104]: Game Flow
                - heading "BOS vs NYT" [level=2] [ref=e105]
              - generic [ref=e106]: "Status: Live"
            - generic [ref=e107]:
              - link "Schritt 1 Pre-Game Setup" [ref=e108] [cursor=pointer]:
                - /url: /app/savegames/e2e-savegame-minimal/game/setup?matchId=e2e-match-week-1
                - generic [ref=e109]: Schritt 1
                - generic [ref=e110]: Pre-Game Setup
              - link "Schritt 2 Game Center" [ref=e111] [cursor=pointer]:
                - /url: /app/savegames/e2e-savegame-minimal/game/live?matchId=e2e-match-week-1
                - generic [ref=e112]: Schritt 2
                - generic [ref=e113]: Game Center
              - link "Schritt 3 Game Report" [ref=e114] [cursor=pointer]:
                - /url: /app/savegames/e2e-savegame-minimal/game/report?matchId=e2e-match-week-1
                - generic [ref=e115]: Schritt 3
                - generic [ref=e116]: Game Report
          - generic [ref=e117]:
            - generic [ref=e118]:
              - generic [ref=e119]:
                - heading "Game Center" [level=2] [ref=e120]
                - paragraph [ref=e121]: BOS vs. NYT auf einen Blick.
              - link "Spielbericht oeffnen" [ref=e123] [cursor=pointer]:
                - /url: /app/savegames/e2e-savegame-minimal/game/report?matchId=e2e-match-week-1
            - generic [ref=e124]:
              - generic [ref=e125]:
                - paragraph [ref=e126]: Spielstatus
                - generic [ref=e127]: Laeuft
                - paragraph [ref=e128]: Der Spielbericht kann geoeffnet werden, wird aber erst nach Abschluss vollstaendig.
              - generic [ref=e129]:
                - paragraph [ref=e130]: Score
                - paragraph [ref=e131]: "BOS - : - NYT"
                - paragraph [ref=e132]: 0 persistierte Drives
              - generic [ref=e133]:
                - paragraph [ref=e134]: Letzter Drive
                - paragraph [ref=e135]: Noch keine Drives gespeichert. Sobald eine Simulation laeuft oder abgeschlossen ist, erscheint hier der aktuelle Verlauf.
          - generic [ref=e136]:
            - generic [ref=e138]:
              - heading "Spiel abschliessen" [level=2] [ref=e139]
              - paragraph [ref=e140]: Erfasse den finalen Score und wechsle danach in den Post-Game-Zustand.
            - generic [ref=e141]:
              - generic [ref=e142]:
                - generic [ref=e143]:
                  - paragraph [ref=e144]: Week State
                  - paragraph [ref=e145]: GAME_RUNNING
                - generic [ref=e146]:
                  - paragraph [ref=e147]: Match Status
                  - paragraph [ref=e148]: IN PROGRESS
                - generic [ref=e149]:
                  - paragraph [ref=e150]: Aktueller Score
                  - paragraph [ref=e151]: "BOS - : - NYT"
              - generic [ref=e152]:
                - generic [ref=e153]:
                  - generic [ref=e154]:
                    - text: BOS
                    - spinbutton "BOS" [ref=e155]: "24"
                  - generic [ref=e156]:
                    - text: NYT
                    - spinbutton "NYT" [ref=e157]: "17"
                - button "Spiel wird abgeschlossen..." [disabled] [ref=e158]
          - generic [ref=e159]:
            - generic [ref=e161]:
              - heading "DriveLog" [level=2] [ref=e162]
              - paragraph [ref=e163]: Der persistierte Drive-Log macht den Matchablauf, die Resultattypen und die wichtigsten Akteure pro Possession nachvollziehbar.
            - paragraph [ref=e164]: Noch kein persistierter Drive-Log vorhanden. Bei abgeschlossenen oder laufenden Simulationen erscheinen die Drives hier automatisch.
          - generic [ref=e165]:
            - link "Setup oeffnen" [ref=e166] [cursor=pointer]:
              - /url: /app/savegames/e2e-savegame-minimal/game/setup?matchId=e2e-match-week-1
            - link "Report Preview" [ref=e167] [cursor=pointer]:
              - /url: /app/savegames/e2e-savegame-minimal/game/report?matchId=e2e-match-week-1
  - button "Open Next.js Dev Tools" [ref=e173] [cursor=pointer]:
    - img [ref=e174]
  - alert [ref=e177]
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | 
  3   | import {
  4   |   E2E_TEST_IDS,
  5   |   E2E_TEST_LABELS,
  6   |   E2E_TEST_ROUTES,
  7   | } from "./fixtures/minimal-e2e-context";
  8   | 
  9   | const DASHBOARD_ROUTE = E2E_TEST_ROUTES.dashboard.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  10  | const GAME_SETUP_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/setup`;
  11  | const GAME_LIVE_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/live`;
  12  | const GAME_REPORT_ROUTE = `${E2E_TEST_ROUTES.dashboard}/game/report`;
  13  | const UPCOMING_MATCH_QUERY = `matchId=${encodeURIComponent(E2E_TEST_IDS.upcomingMatchId)}`;
  14  | 
  15  | async function signInToDashboard(page: Page) {
  16  |   await page.goto(
  17  |     `/api/e2e/dev-login?callbackUrl=${encodeURIComponent(E2E_TEST_ROUTES.dashboard)}`,
  18  |   );
  19  |   await page.waitForURL(`**${E2E_TEST_ROUTES.dashboard}`, { timeout: 15_000 });
  20  | }
  21  | 
  22  | async function expectDashboard(page: Page, reload = false) {
  23  |   await expect(async () => {
  24  |     if (reload) {
  25  |       await page.goto(E2E_TEST_ROUTES.dashboard);
  26  |     }
  27  | 
  28  |     await expect(page).toHaveURL(new RegExp(`${DASHBOARD_ROUTE}(?:\\?.*)?$`));
  29  |     await expect(page.getByRole("heading", { name: "GM Office" })).toBeVisible({ timeout: 5_000 });
  30  |     await expect(page.getByText(E2E_TEST_LABELS.saveGameName).first()).toBeVisible();
  31  |   }).toPass({ timeout: 20_000 });
  32  | }
  33  | 
  34  | function weekLoopPanel(page: Page) {
  35  |   return page.locator("section").filter({ hasText: "Week Loop" }).first();
  36  | }
  37  | 
  38  | async function submitServerAction(
  39  |   page: Page,
  40  |   postPath: string,
  41  |   submit: () => Promise<void>,
  42  | ) {
> 43  |   const redirectResponse = page.waitForResponse((response) => {
      |                                 ^ TimeoutError: page.waitForResponse: Timeout 15000ms exceeded while waiting for event "response"
  44  |     const url = new URL(response.url());
  45  |     return (
  46  |       url.pathname === postPath &&
  47  |       response.request().method() === "POST" &&
  48  |       response.status() === 303
  49  |     );
  50  |   }, { timeout: 15_000 });
  51  | 
  52  |   await submit();
  53  |   await redirectResponse;
  54  | }
  55  | 
  56  | async function expectFinishedReport(page: Page) {
  57  |   await expect(async () => {
  58  |     await page.goto(`${GAME_REPORT_ROUTE}?${UPCOMING_MATCH_QUERY}`);
  59  |     await expect(page).toHaveURL(/\/game\/report\?matchId=e2e-match-week-1/);
  60  |     await expect(page.getByText("Finished").first()).toBeVisible({ timeout: 5_000 });
  61  |   }).toPass({ timeout: 20_000 });
  62  | 
  63  |   await expect(page.getByText("COMPLETED").first()).toBeVisible();
  64  |   await expect(page.getByText("24").first()).toBeVisible();
  65  |   await expect(page.getByText("17").first()).toBeVisible();
  66  | }
  67  | 
  68  | test.describe("Minimaler Week Loop", () => {
  69  |   test("durchlaeuft PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK", async ({
  70  |     page,
  71  |   }) => {
  72  |     test.setTimeout(90_000);
  73  | 
  74  |     await test.step("PRE_WEEK anzeigen", async () => {
  75  |       await signInToDashboard(page);
  76  |       await expectDashboard(page);
  77  |       await expect(weekLoopPanel(page).getByText("PRE_WEEK")).toBeVisible();
  78  |       await expect(weekLoopPanel(page).getByRole("button", { name: "Woche vorbereiten" })).toBeVisible();
  79  |     });
  80  | 
  81  |     await test.step("prepareWeekAction ausfuehren und READY pruefen", async () => {
  82  |       await submitServerAction(page, E2E_TEST_ROUTES.dashboard, () =>
  83  |         weekLoopPanel(page).getByRole("button", { name: "Woche vorbereiten" }).click(),
  84  |       );
  85  |       await page.goto(E2E_TEST_ROUTES.dashboard);
  86  |       await expect(weekLoopPanel(page).getByText("READY")).toBeVisible({ timeout: 20_000 });
  87  |       await expect(page.getByRole("link", { name: "Gameplan vorbereiten" }).first()).toBeVisible();
  88  |     });
  89  | 
  90  |     await test.step("Game Setup oeffnen", async () => {
  91  |       await expect(page.getByRole("link", { name: "Gameplan vorbereiten" }).first()).toHaveAttribute(
  92  |         "href",
  93  |         `${GAME_SETUP_ROUTE}?${UPCOMING_MATCH_QUERY}`,
  94  |       );
  95  |       await page.goto(`${GAME_SETUP_ROUTE}?${UPCOMING_MATCH_QUERY}`);
  96  |       await expect(page).toHaveURL(/\/game\/setup\?matchId=e2e-match-week-1/, { timeout: 15_000 });
  97  |       await expect(page.getByRole("heading", { name: "Pre-Game Setup" })).toBeVisible();
  98  |       await expect(page.getByText(E2E_TEST_LABELS.opponentTeamName).first()).toBeVisible();
  99  |       await expect(page.getByRole("button", { name: "Spiel starten" })).toBeVisible();
  100 |     });
  101 | 
  102 |     await test.step("startGameAction ausfuehren und GAME_RUNNING pruefen", async () => {
  103 |       await submitServerAction(page, GAME_SETUP_ROUTE, () =>
  104 |         page.getByRole("button", { name: "Spiel starten" }).click(),
  105 |       );
  106 |       await page.goto(`${GAME_LIVE_ROUTE}?${UPCOMING_MATCH_QUERY}`);
  107 |       await expect(page).toHaveURL(/\/game\/live\?matchId=e2e-match-week-1/);
  108 |       await expect(page.getByText("GAME_RUNNING").first()).toBeVisible();
  109 |       await expect(page.getByText("IN PROGRESS").first()).toBeVisible();
  110 |       await expect(page.getByRole("button", { name: "Spiel abschliessen" })).toBeVisible();
  111 |     });
  112 | 
  113 |     await test.step("finishGameAction ausfuehren und POST_GAME pruefen", async () => {
  114 |       const finishForm = page
  115 |         .locator("form")
  116 |         .filter({ has: page.getByRole("button", { name: "Spiel abschliessen" }) })
  117 |         .first();
  118 | 
  119 |       await finishForm.locator('input[name="homeScore"]').fill("24");
  120 |       await finishForm.locator('input[name="awayScore"]').fill("17");
  121 |       await submitServerAction(page, GAME_LIVE_ROUTE, () =>
  122 |         finishForm.getByRole("button", { name: "Spiel abschliessen" }).click(),
  123 |       );
  124 |       await expectFinishedReport(page);
  125 |     });
  126 | 
  127 |     await test.step("advanceWeekAction ausfuehren und neue PRE_WEEK pruefen", async () => {
  128 |       await page.goto(E2E_TEST_ROUTES.dashboard);
  129 |       await expectDashboard(page, true);
  130 |       await expect(weekLoopPanel(page).getByText("POST_GAME")).toBeVisible();
  131 |       await expect(weekLoopPanel(page).getByRole("button", { name: "Naechste Woche" })).toBeVisible();
  132 | 
  133 |       await submitServerAction(page, E2E_TEST_ROUTES.dashboard, () =>
  134 |         weekLoopPanel(page).getByRole("button", { name: "Naechste Woche" }).click(),
  135 |       );
  136 |       await page.goto(E2E_TEST_ROUTES.dashboard);
  137 |       await expect(weekLoopPanel(page).getByText("PRE_WEEK")).toBeVisible({ timeout: 20_000 });
  138 |       await expect(page.getByText("2026 / W2")).toBeVisible();
  139 |       await expect(weekLoopPanel(page).getByRole("button", { name: "Woche vorbereiten" })).toBeVisible();
  140 |       await expect(page.getByText(E2E_TEST_IDS.nextWeekMatchId)).toHaveCount(0);
  141 |     });
  142 |   });
  143 | });
```