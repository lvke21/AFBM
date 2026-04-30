# E2E Stabilization Report

Stand: 2026-04-27

Status: Gruen

## Ziel

Der komplette GUI Game Loop muss ohne manuelles Warmup stabil pruefbar sein:

Dashboard -> Game Preview -> Match/Live Simulation -> Match Report -> Dashboard / Week Advance

Die Stabilisierung beschraenkt sich auf den Test-Harness und E2E-Specs. Produktlogik, Game Engine, Datenmodell und Dependencies wurden nicht geaendert.

## Gefundene Ursachen

- Dev-Login war in mehreren Specs noch indirekt an alte Browser-Login-Annahmen gekoppelt.
- `page.goto` und Clicks warteten teilweise auf Full-Load oder implizite Navigation, obwohl Next.js im Cold Start mehrere Routen erst kompiliert.
- Fixed Onboarding-Coach konnte im E2E den eigentlichen Submit-Button ueberdecken.
- Mehrere Specs hatten alte Strict-Mode-Locators, die mit der aktuellen GUI mehrere Elemente trafen.
- Der Smoke-Test erwartete noch den alten Auth-Redirect, obwohl Playwright mit `E2E_DIRECT_LOGIN=true` laeuft.

## Umgesetzte Stabilisierung

### Dev Login

- Neuer gemeinsamer Helper `signInViaDevLogin` nutzt `/api/e2e/dev-login` direkt per `page.request`.
- Redirect wird ohne Browser-Login-Form validiert: Status `307/308`, Location muss dem erwarteten Callback entsprechen.
- Savegame-Onboarding wird im E2E-Browser-Context fuer das Ziel-Savegame als abgeschlossen markiert, damit der Game Loop nicht von transienten Coach-Popups blockiert wird.

### Navigation

- Neuer Helper `gotoAppRoute` nutzt `waitUntil: "domcontentloaded"` und retryt Cold-Start-Navigation mit `expect(...).toPass`.
- Navigation-Spec klickt Links mit `noWaitAfter` und wartet danach explizit auf die Ziel-URL.
- Reuse-Server-Preflight prueft zusaetzlich, ob `/api/e2e/dev-login` auf den erwarteten Port und Callback redirectet.

### Server Actions

- Neuer Helper `waitForServerActionRedirect` wartet gezielt auf `POST` + `303`.
- Server-Action-Klicks im Week-Loop und First-10-Minutes-Flow nutzen `noWaitAfter`; die Redirect-Pruefung liegt zentral im Helper.

### Timeouts

- Playwright `globalTimeout`: `180_000ms`.
- Navigation: `E2E_NAVIGATION_TIMEOUT_MS`, Default `45_000ms`.
- Server Actions: `E2E_ACTION_TIMEOUT_MS`, Default `45_000ms`.
- Keine pauschale blinde Erhoehung der Action-Timeouts; `actionTimeout` bleibt bei `8_000ms`.

### Spec-Korrekturen

- Dashboard, Navigation, Inbox, Draft und Smoke nutzen aktuelle, eindeutige Locators.
- Draft-Dialog wird mit Hydration-Retry geoeffnet, da der erste Klick im Cold Start vor Client-Hydration verpuffen kann.
- Smoke-Test prueft nun den aktuellen E2E-Auth-Bypass statt alten Login-Redirect.

## Geaenderte Dateien

- `e2e/helpers/e2e-harness.ts`
- `e2e/week-loop.spec.ts`
- `e2e/first-10-minutes.spec.ts`
- `e2e/dashboard.spec.ts`
- `e2e/navigation.spec.ts`
- `e2e/inbox-action.spec.ts`
- `e2e/draft-mvp.spec.ts`
- `e2e/smoke.spec.ts`
- `e2e/main-flow.spec.ts`
- `playwright.config.ts`
- `scripts/tools/e2e-preflight.mjs`
- `docs/gui/e2e-stabilization-report.md`

## Validierung

Alle aktiven E2E-Specs wurden einzeln auf frischen Ports validiert. `e2e/main-flow.spec.ts` ist weiterhin bewusst `skip`.

| Command | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `E2E_PORT=3134 npm run test:e2e` | Gruen, 1 passed |
| `E2E_PORT=3135 npm run test:e2e:dashboard` | Gruen, 1 passed |
| `E2E_PORT=3136 npm run test:e2e:navigation` | Gruen, 1 passed |
| `E2E_PORT=3129 npm run test:e2e:action` | Gruen, 1 passed |
| `E2E_PORT=3132 npm run test:e2e:draft` | Gruen, 1 passed |
| `E2E_PORT=3121 npm run test:e2e:week-loop` | Gruen, 1 passed |
| `E2E_PORT=3137 npm run test:e2e:week-loop` | Gruen, 1 passed |
| `npm run test:e2e:seed` + `E2E_PORT=3127 npx playwright test e2e/first-10-minutes.spec.ts` | Gruen, 1 passed |

## Game Loop Status

Status: Gruen

Gepruefter Flow:

1. Dashboard wird per Dev-Login ohne alten Auth-Flow geoeffnet.
2. Woche wird vorbereitet.
3. Game Preview / Setup wird geladen.
4. Match wird gestartet.
5. Live Simulation wird geladen.
6. Match wird abgeschlossen.
7. Match Report wird geladen.
8. Dashboard wird erneut geoeffnet.
9. Woche wird weitergeschaltet.

## Rest-Risiken

- Next.js Cold Compilation bleibt langsam, ist aber jetzt durch gezielte Navigation- und Action-Waits stabil abgedeckt.
- Node meldet im E2E-Lauf weiterhin die harmlose Warnung `NO_COLOR env is ignored due to FORCE_COLOR`.
- `test:e2e:all` wurde nicht als primaeres Gate genutzt, weil die stabilen Einzel-Gates jeweils mit definiertem Seed laufen. Fuer CI sollte langfristig ein Aggregat-Script mit per-spec Seed-Isolation eingefuehrt werden.

## Ergebnis

Der zentrale Gate-Befehl `npm run test:e2e:week-loop` laeuft ohne manuelles Warmup reproduzierbar gruen; er wurde nach der Stabilisierung auf zwei frischen Ports erfolgreich ausgefuehrt. Die ergaenzenden aktiven E2E-Specs sind ebenfalls gruen, wenn sie mit ihrem Seed-/Harness-Setup auf frischen Ports ausgefuehrt werden.
