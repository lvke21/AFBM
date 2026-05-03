# E2E Coverage

## Ziel der Analyse

Bewertung der Playwright-/Browser-Abdeckung fuer reale Nutzerflows, inklusive lokaler Ausfuehrbarkeit und Infrastruktur-Risiken.

## Playwright Setup

Datei: `playwright.config.ts`

Konfiguration:

- `testDir`: `./e2e`
- Browser: Desktop Chromium
- `fullyParallel`: false
- `maxFailures`: 1
- Retry in CI: 1
- Webserver: `npm run dev -- --hostname 127.0.0.1 --port 3100`
- Default `baseURL`: `http://127.0.0.1:3100`
- Reporter: list, html, json
- Trace: retain-on-failure
- Screenshot: only-on-failure
- Video: retain-on-failure

## E2E Specs

| Datei | Testanzahl | Abdeckung |
| --- | ---: | --- |
| `e2e/smoke.spec.ts` | 1 | Basis-Startseite / Smoke |
| `e2e/navigation.spec.ts` | 1 | Navigation |
| `e2e/dashboard.spec.ts` | 1 | Dashboard |
| `e2e/depth-chart.spec.ts` | 1 | Depth Chart |
| `e2e/draft-mvp.spec.ts` | 1 | Draft MVP |
| `e2e/week-loop.spec.ts` | 1 | Week Loop Prisma |
| `e2e/firebase-browser-flow.spec.ts` | 1 | Firebase Browser Flow |
| `e2e/multiplayer-smoke.spec.ts` | 4 | Multiplayer Smoke |
| `e2e/multiplayer-firebase.spec.ts` | 1 | Multiplayer Firebase |
| `e2e/multiplayer-firebase-fantasy-draft.spec.ts` | 1 | Firebase Draft |
| `e2e/first-10-minutes.spec.ts` | 1 | First-time UX |
| `e2e/time-to-fun.spec.ts` | 1 | UX Time-to-Fun |
| weitere Specs | 11 | Finance, Contracts, Trades, Inbox, Data Trust, Main Flow etc. |

## E2E Scripts

Wichtige Scripts:

- `npm run test:e2e`
- `npm run test:e2e:navigation`
- `npm run test:e2e:multiplayer`
- `npm run test:e2e:multiplayer:firebase`
- `npm run test:e2e:multiplayer:firebase:draft`
- `npm run test:e2e:week-loop`
- `npm run test:e2e:week-loop:prisma`
- `npm run test:e2e:all`

## Lokale Ausfuehrung in dieser Analyse

Command:

```bash
npm run test:e2e
```

Ergebnis:

- Fehlgeschlagen vor Browser-Ausfuehrung.
- Ursache: E2E Preflight konnte PostgreSQL auf `localhost:5432` nicht erreichen.
- Fehlermeldung:
  - Datenbank nicht erreichbar.
  - Verwendete E2E-Datenbank: `postgresql://postgres:***@localhost:5432/afbm_manager?schema=public`
  - Vorschlag des Scripts: PostgreSQL starten oder `npm run db:up`.

Bewertung:

- Kein fachlicher E2E-Fehler.
- Lokale E2E-Ausfuehrbarkeit ist aber nicht self-contained.
- Fuer Release-Gates muss die DB-Infrastruktur explizit gestartet oder in CI garantiert werden.

## Coverage-Bewertung nach Flow

| Flow | E2E-Abdeckung | Risiko |
| --- | --- | --- |
| Savegames Einstieg | Vorhanden ueber Smoke/Main/First-10-Minutes, aber lokaler Lauf DB-blockiert. | Mittel |
| Offline Spiel / Week Loop | Vorhanden ueber `week-loop` und Prisma Scripts. | Mittel |
| Multiplayer Local Smoke | Vorhanden ueber `multiplayer-smoke`. | Mittel |
| Multiplayer Firebase | Vorhanden, aber Emulator/Auth-Setup noetig. | Mittel-Hoch |
| Fantasy Draft | Vorhanden fuer MVP und Firebase Draft. | Mittel |
| Admin Hub | Nicht als vollstaendiger Browser-Admin-Flow sichtbar abgesichert. | Hoch |
| Admin Week Simulation | Script-Smoke vorhanden, aber nicht normaler Playwright-Flow. | Hoch |
| Sidebar/Coming Soon | Teilweise, aber keine klare Vollmatrix ueber alle Menuepunkte. | Hoch |
| Auth Login/Logout | Unit-Tests vorhanden; Browser-Live-Auth nur begrenzt. | Hoch |
| Reload auf Unterseiten | Teilweise; nicht fuer alle Multiplayer-Seiten nachgewiesen. | Mittel-Hoch |

## Hauptprobleme

1. E2E ist stark von lokaler Infrastruktur abhaengig.
2. Prisma-E2E braucht lokale PostgreSQL-DB.
3. Firebase-E2E braucht Emulatoren und teilweise Auth-Emulator.
4. Staging-Smoke braucht echte Secrets/Token, die lokal nicht committed werden duerfen.
5. Viele E2E-Specs sind einzelne breite Smokes; das ist gut fuer Release-Signal, aber weniger gut fuer isolierte Fehlerdiagnose.

## Empfehlungen

1. `npm run db:up` oder dedizierter CI-Service muss vor Prisma-E2E verpflichtend sein.
2. `test:e2e:smoke:ci` als zusammengesetztes Script definieren:
   - DB up.
   - migrate/seed.
   - smoke.
   - navigation.
   - multiplayer.
3. Firebase-E2E separat halten:
   - Emulator tests fuer PR.
   - Staging-Smoke fuer Release.
4. Admin Week Simulation als eigenen E2E/API-Smoke mit Secret Store in CI.
5. Sidebar-Menue als tabellarischer Browser-Test: aktive MVP-Seiten vs Coming Soon.

## Status

Gelb.

Die E2E-Abdeckung ist breit angelegt, aber die lokale Ausfuehrbarkeit ist aktuell durch Infrastruktur abhaengig. Ohne gestartete DB ist `npm run test:e2e` kein reproduzierbar gruener Entwickler-Check.
