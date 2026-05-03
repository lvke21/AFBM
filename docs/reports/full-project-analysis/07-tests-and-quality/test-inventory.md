# Test Inventory

## Ziel der Analyse

Inventar der vorhandenen Testabdeckung fuer Unit Tests, Integration Tests, E2E Tests, Firebase-/Emulator-Tests, Seeds/Fixtures, Simulation, Multiplayer, Auth und UI-Flows.

## Untersuchte Dateien/Bereiche

- `package.json`
- `playwright.config.ts`
- `e2e/*.spec.ts`
- `src/**/*.test.ts`
- `src/**/*.test.tsx`
- `scripts/**/*.test.ts`
- `scripts/seeds/*`
- `scripts/tools/e2e-preflight.mjs`
- `scripts/staging-admin-week-smoke.ts`

## Testdateien nach Kategorie

Statische Inventur der Testdateien:

| Kategorie | Dateien | Test-Statements ca. | Bewertung |
| --- | ---: | ---: | --- |
| E2E / Playwright | 23 | 26 | Breite Smoke-Flows, aber lokale Ausfuehrung haengt an DB/Seed-Infrastruktur. |
| Firebase / Firestore | 18 | 107 | Gute Emulator-/Repository-/Rules-Abdeckung. |
| Online / Multiplayer | 35 | 241 | Gute Unit-/Service-Abdeckung fuer Draft, Week, Ready, Models und MVP-Actions. |
| Admin | 4 | 26 | API/Admin Actions vorhanden, UI-E2E nur indirekt. |
| Simulation / Gameplay / Seasons | 46 | 255 | Sehr starke deterministische und balancierende Tests. |
| Seeds | 3 | 10 | Mehrere Seed-Skripte besitzen Tests, aber nicht jeder operative Staging-Flow ist E2E abgesichert. |
| UI / Components / Models | 30 | 217 | Viele Model-Tests, wenige echte Browser-Interaktions-Assertions. |
| Weitere Module | 21 | 86 | Savegames, Teams, Players, Finance, Inbox, Trades etc. gut modellseitig vertreten. |
| Sonstige | 11 | 51 | Env, Guards, Utilities. |
| Gesamt statisch | 191 | 1019 | Enthält E2E und gated Tests; nicht identisch mit einer normalen Vitest-Ausfuehrung. |

## Vitest-Ausfuehrung

`npm test -- --run` und `npm run test -- --run` fuehren dieselbe Vitest-Suite aus.

Ergebnis:

- 158 Testdateien bestanden.
- 936 Tests bestanden.
- Keine fehlgeschlagenen Tests.
- Wiederholte Node-Warnung: `DEP0040 punycode module is deprecated`.
- Langsame Tests:
  - `src/modules/gameplay/application/gameplay-calibration.test.ts`
  - `src/lib/online/fantasy-draft-service.test.ts`
  - `src/modules/gameplay/application/play-selection-engine.test.ts`

## E2E Tests

Playwright-Konfiguration:

- Test-Ordner: `e2e`
- Browser: Chromium Desktop
- Webserver: `npm run dev -- --hostname 127.0.0.1 --port 3100`
- Datenbackend default fuer viele Scripts: `prisma`
- E2E Preflight prueft lokale Datenbank.
- Reporter: list, html, json.
- Traces/Screenshots/Videos bei Fehlern.

Vorhandene E2E-Specs:

- `smoke.spec.ts`
- `navigation.spec.ts`
- `dashboard.spec.ts`
- `depth-chart.spec.ts`
- `draft-mvp.spec.ts`
- `week-loop.spec.ts`
- `multiplayer-smoke.spec.ts`
- `multiplayer-firebase.spec.ts`
- `multiplayer-firebase-fantasy-draft.spec.ts`
- `firebase-browser-flow.spec.ts`
- weitere UX-/Feature-Smokes fuer Finance, Trades, Inbox, Development, First 10 Minutes, Time to Fun.

Lokaler E2E-Smoke wurde versucht, aber durch nicht erreichbare PostgreSQL-DB blockiert. Details stehen in `qa-command-results.md`.

## Firebase / Emulator Tests

Wichtige Scripts:

- `test:firebase`
- `test:firebase:parity`
- `test:firebase:rules`
- `test:firebase:mvp`
- `test:e2e:multiplayer:firebase`
- `test:e2e:multiplayer:firebase:draft`

Ergebnis dieser Analyse:

- `npm run test:firebase:parity` bestand nach Ausfuehrung ausserhalb der Sandbox.
- Der erste Sandbox-Versuch scheiterte nicht fachlich, sondern an Port-Bindings fuer lokale Emulatoren.

## Seeds und Fixtures

Wichtige Dateien:

- `scripts/seeds/e2e-seed.ts`
- `scripts/seeds/firestore-seed.ts`
- `scripts/seeds/firestore-browser-e2e-fixture.ts`
- `scripts/seeds/parity-fixture.ts`
- `scripts/seeds/multiplayer-e2e-firestore-seed.ts`
- `scripts/seeds/multiplayer-test-league-firestore-seed.ts`
- `scripts/seeds/multiplayer-player-pool-firestore-seed.ts`
- `scripts/seeds/multiplayer-draft-prep-firestore-seed.ts`
- `scripts/seed-online-league.ts`
- `scripts/staging-admin-week-smoke.ts`

Qualitaetslage:

- E2E-Seed wurde bereits auf Idempotenz ausgerichtet.
- Multiplayer-Seed-Skripte haben mehrere Unit-Tests.
- Staging-Smoke ist vorhanden, benoetigt aber echte lokale Env-Secrets oder ID Token.

## Deterministische Simulation

Starke Abdeckung vorhanden:

- `determinism-validation.test.ts`
- `simulation-regression-snapshots.test.ts`
- `simulation-replay.service.test.ts`
- `match-engine.test.ts`
- `minimal-match-simulation.test.ts`
- `production-qa.test.ts`
- `simulation-balancing.test.ts`
- `extended-season-balance-suite.test.ts`

Bewertung:

- Simulation ist der am besten getestete Kernbereich.
- Die Tests sind teilweise rechenintensiv, aber fachlich wertvoll.

## Gesamtbewertung

Status: Gruen fuer lokale Unit-/Integration-/Build-Gates.

Status: Gelb fuer Browser-E2E und Live-Staging, weil lokale Infrastruktur und Secrets/Token nicht immer verfuegbar sind.
