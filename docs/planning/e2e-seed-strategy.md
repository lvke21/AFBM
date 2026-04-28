# E2E Seed Strategy

## Ziel

Die E2E-Testdatenbasis erzeugt einen kleinen, deterministischen Spielstand fuer Navigationstests, ohne den normalen Savegame-Bootstrap mit vollstaendiger Liga, grossem Spielerpool oder langem Schedule zu verwenden.

## Fixture

- 1 Dev-User: `dev-user:<AUTH_DEV_EMAIL>`
- 1 Savegame: `e2e-savegame-minimal`
- 1 Liga-Referenz: vorhandene `AFM` Reference Data
- 2 dynamische Teams: `BOS`, `NYT`
- 8 Spieler insgesamt
- 1 aktuelle Regular-Season
- 1 kommendes Match in Woche 1
- 1 Finance Event fuer sichtbare Finance-Historie

Die fixen IDs und Login-Daten sind in `e2e/fixtures/minimal-e2e-context.ts` zentral definiert. E2E-Tests und Seed-Skript verwenden damit denselben Test-Kontext.

| Bereich | Wert |
|---|---|
| Test-User | `dev-user:<AUTH_DEV_EMAIL>` |
| Test-Login | `AUTH_DEV_EMAIL` oder `e2e-gm@example.test` |
| Test-Passwort | `AUTH_DEV_PASSWORD` oder `e2e-password` |
| Savegame | `e2e-savegame-minimal` |
| Manager-Team | `e2e-team-bos` / `Boston Guardians` |
| Gegnerteam | `e2e-team-nyt` / `New York Titans` |
| Season | `e2e-season-2026`, Woche 1 |
| Kommendes Match | `e2e-match-week-1` |

## Nicht Enthalten

- keine vollstaendige Liga-Generierung
- keine grossen Roster
- keine Free-Agent-Pools
- keine Simulation
- kein langer Spielplan

## Ausfuehrung

```bash
npm run test:e2e:seed
```

Der Seed ist idempotent fuer den E2E-User: vorhandene E2E-Daten werden geloescht und neu aufgebaut.

Der erste echte Dashboard-E2E-Test nutzt genau diese Fixture:

```bash
npm run test:e2e:dashboard
```

Der Hauptnavigationstest nutzt dieselbe Fixture und prueft nur Erreichbarkeit/Rendering:

```bash
npm run test:e2e:navigation
```

Der erste risikoarme Action-Test nutzt die Inbox und markiert genau einen Task als gelesen:

```bash
npm run test:e2e:action
```

## Playwright Stabilisierung

Standard-E2E lokal:

```bash
npm run test:e2e
```

Debug-E2E fuer Fehleranalyse:

```bash
npm run test:e2e:debug
```

Schutzmechanismen:

- `scripts/tools/e2e-preflight.mjs` laeuft vor Playwright und prueft `DATABASE_URL`, DB-Socket, Chromium und Port-Konflikte.
- Playwright nutzt einen harten globalen Timeout von `90s` und pro Test standardmaessig `30s`.
- Der Dev-Server muss innerhalb von `45s` erreichbar sein.
- Es laeuft nur ein Worker; bei erstem Fehler wird gestoppt.
- Trace, Screenshot und Video werden nur bei Fehlern behalten.
- Der Webserver bekommt nach dem Test ein `SIGTERM` mit `5s` Graceful-Shutdown.
- Reporter schreiben `list`, HTML nach `reports-output/test-runs/playwright` und JSON nach `reports-output/test-runs/playwright-results.json`.

Optionale Overrides:

```bash
E2E_PORT=3200 npm run test:e2e
E2E_GLOBAL_TIMEOUT_MS=120000 npm run test:e2e
E2E_REUSE_SERVER=true npm run test:e2e
```

## Voraussetzungen

- `DATABASE_URL` muss in `.env.local`, `.env` oder der Shell gesetzt sein.
- PostgreSQL muss erreichbar sein, standardmaessig unter `localhost:5432`.
- Bei einer frischen lokalen Datenbank muss vorher die Schema-Migration laufen:

```bash
npm run prisma:migrate -- --name init
```

## Laufzeitbewertung

Der dynamische Seed erzeugt nur 2 Teams, 8 Spieler, 1 Season und 1 Match. Dadurch ersetzt er den schweren Savegame-Bootstrap fuer E2E-Smoke- und Navigationschecks. In der aktuellen lokalen Umgebung konnte die Seed-Laufzeit nicht final gemessen werden, weil PostgreSQL unter `localhost:5432` nicht erreichbar war. Der Seed bricht diesen Fall jetzt vor dem Prisma-Bootstrap mit einer klaren Fehlermeldung ab.

## Aktueller DB-/Seed-Blocker

- E2E verwendet `DATABASE_URL` aus `.env.local` beziehungsweise `.env`.
- Aktueller Ziel-Endpunkt: `postgresql://postgres:***@localhost:5432/afbm_manager?schema=public`.
- Auf `localhost:5432` ist in dieser Umgebung kein PostgreSQL-Listener erreichbar.
- E2E fuehrt Migrationen nicht automatisch aus. Das ist Absicht, damit Tests keine lokale DB-Struktur unkontrolliert veraendern.
- Der Seed ist separat ausfuehrbar und misst seine Laufzeit. Bei fehlender DB bricht er vor dem Prisma-Bootstrap ab.
- `scripts/tools/e2e-preflight.mjs` prueft jetzt vor Playwright explizit DB-Erreichbarkeit, Testserver-Port, Chromium und den Migrationshinweis.
