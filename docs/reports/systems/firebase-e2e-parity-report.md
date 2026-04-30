# Firebase E2E Parity Report

Datum: 2026-04-26

Scope: Validierung von Prisma-Default/Fallback und Firestore-Emulator-Backend fuer die bisher migrierten Datenbereiche. Keine Prisma-Entfernung, keine Auth-Umstellung, keine produktiven Firebase-Zugriffe.

## Status

Status: Gruen fuer serverseitige Kern-Parity.

Begruendung: AP 1 und AP 2 haben die gemeinsame Fixture-Basis, lokale PostgreSQL-Reproduzierbarkeit und Firestore-Parity-Gates stabilisiert. `npm run test:firebase:parity` laeuft gegen den Firestore-Emulator gruen und deckt Seed Counts, Team/Player/Season/Match-Readmodels, Week Loop, Game Finish, Advance Week, Stats und Reports ab. Der Prisma-E2E-Seed und der Browser-Week-Loop laufen lokal gegen PostgreSQL.

Wichtige Grenze: Das ist kein Go fuer produktive Firestore-Aktivierung und kein Go fuer Prisma-Entfernung. legacy session system, SaveGame-Root, Browser-Navigation und mehrere transaktionale Fachpfade bleiben bewusst Prisma-basiert.

## Gelesene Firebase-Berichte

Beruecksichtigt wurden alle vorhandenen Firebase-Berichte unter `docs/reports/firebase-*.md`, insbesondere:

- `firebase-migration-analysis.md`
- `firebase-migration-readiness-plan.md`
- `firebase-repository-abstraction-report.md`
- `firebase-passive-setup-report.md`
- `firebase-seed-report.md`
- `firebase-teams-players-migration.md`
- `firebase-season-week-match-read-report.md`
- `firebase-week-match-state-write-report.md`
- `firebase-game-output-persistence-report.md`
- `firebase-stats-aggregates-report.md`
- `firebase-reports-readmodels-report.md`
- `firebase-final-migration-decision.md`

## Parity-Tests

Script:

```text
npm run test:firebase:parity
```

Abgedeckt:

- Seed-Daten:
  - 1 Liga
  - 8 Teams
  - 64 Spieler
  - 1 Season
  - 7 Weeks
  - 28 Matches
  - 8 Team Season Stats
  - 64 Player Season Stats
  - 1 Report
- Team Overview:
  - Team-ID, Abbreviation, Player Count, Record, Punkte
- Player/Roster:
  - Player-ID, Position, Games Played, Yards
- Season Overview:
  - 28 Matches, Standings, Record, Punkte
- Match Detail:
  - finaler Score, Status, Drive Count, Passing Leader
- Week Loop:
  - `PRE_WEEK -> READY`
  - `READY -> GAME_RUNNING`
  - `GAME_RUNNING -> POST_GAME`
  - `POST_GAME -> PRE_WEEK`
- Game Finish:
  - Match wird abgeschlossen und Scores werden gesetzt
- Advance Week:
  - `currentWeekId` springt auf Week 2
- Stats:
  - Team-/Player-Match-Stats und Season-Aggregates
- Reports:
  - Seed-Report-Dokument aus `reports`

## Prisma vs Firestore Vergleich

### Validiert

- Prisma bleibt Default/Fallback:
  - lokaler PostgreSQL-Start ueber `npm run db:up`
  - Prisma Migration und E2E Seed laufen lokal
  - Browser-Week-Loop laeuft gegen Prisma/PostgreSQL
- Firestore migrierte Kernbereiche liefern konsistente Kernresultate gegen den Emulator:
  - IDs innerhalb des Firestore-Seeds stabil
  - Counts stabil
  - Statusuebergaenge stabil
  - Scores/Results stabil
  - Stats stabil und idempotent
  - Report-Readmodel vorhanden
- Die Multi-Match-Week-State-Erwartung ist aktualisiert:
  - Nach einem einzelnen abgeschlossenen Match bleibt die Woche `READY`, solange weitere Matches offen sind.
  - `POST_GAME` wird erst nach dem letzten aktuellen Wochenmatch erreicht.

### Nicht als produktionsreif validiert

- Browser-E2E Week Loop mit `DATA_BACKEND=firestore`:
  - App-Auth und SaveGame-Liste bleiben Prisma/legacy session system.
  - Ein echter Firestore-Browser-Flow wuerde aktuell gemischte Auth-/SaveGame-Daten oder eine Auth-Migration erfordern.
- Vollstaendige Produktivmigration:
  - Firestore bleibt Emulator-/`demo-*`-geschuetzt.
  - Prisma bleibt Runtime-Default und Rollback-Pfad.
- Vollstaendige Datenmigration:
  - Es gibt keinen produktionsnahen Backfill mit Checksum-/Count-/ID-Vergleich.

## Ausgefuehrte Tests

Gruen:

- `npm run db:up`
- `npm run prisma:migrate -- --name init`
- `npm run test:e2e:seed`
- `node scripts/tools/e2e-preflight.mjs`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:firebase:parity`
  - 1 Testdatei / 3 Tests.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:week-state"`
  - 1 Testdatei / 8 Tests.
- `npm run test:e2e:week-loop`
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.

## Nachpruefung lokale Infrastruktur 2026-04-30

Die lokale Multiplayer-Parity-Infrastruktur wurde erneut geprueft. Keine Game-Engine-, Week-Flow- oder Firestore-Parity-Fachlogik wurde geaendert.

Gruen:

- `npm run db:up`
  - PostgreSQL laeuft auf `127.0.0.1:5432`.
  - Datenbank `afbm_manager` ist vorhanden.
- `npm run prisma:migrate -- --name init`
  - Schema synchron.
  - Prisma Client `v6.15.0` generiert.
- `npm run test:e2e:seed`
  - Seed erfolgreich: User, Savegame, 2 Teams, 52 Players, Match, Draft Class, 24 Prospects.
- `node scripts/e2e-preflight.mjs`
  - Port `3100` frei.
  - Chromium vorhanden.
  - DB erreichbar.
  - Migrationen vorhanden.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:firebase:parity`
  - Firestore Emulator gegen `demo-afbm`.
  - 1 Testdatei / 3 Tests bestanden.

Freigabe fuer weitere Multiplayer-E2E-Arbeiten: Ja.

## Dokumentierte Unterschiede

| Bereich | Prisma | Firestore | Status |
|---|---|---|---|
| Auth | legacy session system/Prisma | nicht migriert | bewusst unterschiedlich |
| SaveGame Root | `SaveGame` | `leagues`/Demo-Seed | bewusst unterschiedlich |
| E2E IDs | `e2e-*` | `league-demo-2026`, `team-demo-*` | Mapping vorhanden, Browser-Flows bleiben Prisma |
| Teams/Players | Prisma Records | Firestore Docs mit Prisma-aehnlichem Mapper | Firestore gruen |
| Seasons/Weeks/Matches | Prisma relational | Firestore Collections | Firestore gruen |
| Week Loop | Prisma Browser/Unit gruen | Firestore Emulator-Parity gruen | serverseitig vergleichbar |
| Game Output | Prisma Simulation-Persistenz vollstaendig | Firestore Score/Summary/Drives | bewusst teilweise |
| Stats | Prisma inkl. Career/Development-Folgepfade | Firestore Match/Season Aggregates, keine Career Stats | bewusst teilweise |
| Reports | App/Debug/QA lokal und Prisma-Reads | Firestore Readmodels + gespeicherte Report-Dokumente | app-nah gruen, QA-Dateien nicht migriert |

## Go/No-Go

Go fuer:

- Weitere serverseitige Firestore-Parity-Erweiterungen im Emulator.
- Firestore-Simulation-Orchestrator nur im Emulator.
- Fortlaufende Regressionen fuer Week-State, Readmodels, Stats und Reports.

No-Go fuer:

- Produktive Firestore-Aktivierung.
- Prisma-Entfernung.
- Auth-Umstellung als Nebenprodukt.
- Behauptung vollstaendiger Browser-E2E-Parity fuer Firestore, solange Auth/SaveGame weiterhin Prisma-basiert sind.

## Naechste Schritte

1. Firestore-E2E-Entry ohne Auth-Migration klaeren, z.B. serverseitige Test-Route oder dedizierte Hybrid-Fixture.
2. Auth-/Session-Strategie fuer einen spaeteren Firestore-Modus entscheiden.
3. Produktnahe Datenmigration mit Backfill, Checksummen und Rollback-Snapshot separat planen.
4. Prisma weiter als Default/Fallback behalten, bis diese Punkte geloest sind.

## Statuspruefung

- Prisma und Firestore liefern gleiche serverseitige Kernresultate? Gruen.
- Week Loop laeuft mit beiden Backends serverseitig? Gruen.
- Prisma Browser-Week-Loop laeuft lokal? Gruen.
- Firestore Browser-Week-Loop produktionsnah validiert? Nein, bewusst No-Go.
- Stats und Reports sind fuer die migrierten Kernbereiche vergleichbar? Gruen.
- Unterschiede sind dokumentiert? Gruen.
- Tests gruen? Gruen.

Status: Gruen fuer serverseitige Kern-Parity.
