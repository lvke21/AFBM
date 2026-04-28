# Firebase Final Migration Decision

Datum: 2026-04-26

Scope: Entscheidungsvorlage, ob Prisma entfernt, behalten oder als Legacy-Fallback weitergefuehrt wird. Es wurde nichts geloescht, keine Auth-Umstellung vorgenommen und kein produktiver Firebase-Datenpfad aktiviert.

## Kurzentscheidung

Empfehlung: Option A, Prisma behalten.

Begruendung: Die serverseitige Firestore-Kern-Parity ist nach AP 1 bis AP 12 gruen, aber die Voraussetzungen fuer Prisma-Entfernung oder Firestore als alleinigen Runtime-Pfad sind nicht erfuellt. Auth.js, SaveGame-Root, Browser-Navigation, Referenzdaten, lokale Seeds und mehrere transaktionale Fachpfade bleiben Prisma/PostgreSQL-basiert. Firestore ist stark im Emulator abgesichert, aber nicht produktiv aktiviert.

Option B, Prisma nur als Legacy/Fallback, ist ein spaeteres Ziel nach Auth-/SaveGame-Klaerung, produktionsnaher Datenmigration und Firestore-Browser-Strategie. Option C, Prisma entfernen, bleibt aktuell No-Go.

## Aktueller Test- und Parity-Stand

Gruen:

- `npm run db:up`
- `npm run prisma:migrate -- --name init`
- `npm run test:e2e:seed`
- `node scripts/tools/e2e-preflight.mjs`
- `npm run test:firebase:parity`
  - 1 Testdatei / 3 Tests.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:week-state"`
  - 1 Testdatei / 8 Tests.
- `npm run test:e2e:week-loop`
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.
- `npx tsc --noEmit`
- `npm run lint`

Bewertung: Server-seitige Kern-Parity ist belastbar gruen. Produktive Firestore-Aktivierung und Prisma-Removal sind trotzdem nicht freigegeben.

## Prisma-Abhaengigkeiten

### Runtime, Auth und DB-Bootstrap

| Bereich | Dateien | Bedeutung |
|---|---|---|
| Prisma Client Singleton | `src/lib/db/prisma.ts` | Zentraler Runtime-Zugriff auf PostgreSQL. |
| Auth.js Adapter | `src/auth.ts`, `package.json` | `@auth/prisma-adapter` bindet User, Accounts und Sessions an Prisma. |
| ENV | `.env.example`, lokale `.env` | `DATABASE_URL` ist weiterhin noetig. |
| Prisma Schema | `prisma/schema.prisma` | Fuehrende Quelle fuer relationale Modelle, Enums und Constraints. |
| Package Scripts | `package.json` | `postinstall`, `prisma:generate`, `prisma:migrate`, `prisma:seed`, `test:e2e:*` haengen an Prisma/PostgreSQL. |

### Repository- und Service-Schicht

| Bereich | Dateien/Bereiche | Bedeutung |
|---|---|---|
| Repository Provider | `src/server/repositories/index.ts`, `src/server/repositories/types.ts` | Prisma bleibt Default/Fallback. |
| Prisma Repository Implementierungen | `src/server/repositories/*Repository.prisma.ts` | Aktiver Persistenzpfad fuer SaveGames, Teams, Players, Seasons, Weeks, Matches, Stats. |
| Team/Player/Season Infrastruktur | `src/modules/teams/infrastructure/*`, `src/modules/players/infrastructure/*`, `src/modules/seasons/infrastructure/*` | Prisma Includes, Payload-Typen und Transaktionen. |
| SaveGame und Inbox | `src/modules/savegames/infrastructure/savegame.repository.ts`, `src/modules/inbox/infrastructure/inbox-task.repository.ts` | SaveGame Root und Inbox bleiben Prisma-basiert. |
| Draft und Scouting | `src/modules/draft/application/*` | Direkte Prisma-Services und Transaktionsgrenzen. |
| Simulation und Week Flow | `src/modules/seasons/application/simulation/*`, `src/modules/savegames/application/week-flow.service.ts` | Kritische Transaktionen, State-Transitions, Game Output, Player Development und Persistenzlogik. |
| Reference Data | `src/modules/shared/infrastructure/reference-data.ts`, `prisma/seed.ts` | Referenzdaten werden ueber Prisma gepflegt und zur Laufzeit abgefragt. |

### Seeds, E2E und QA

| Bereich | Dateien/Bereiche | Bedeutung |
|---|---|---|
| Prisma Seed | `prisma/seed.ts` | Referenzdatenquelle fuer lokale Entwicklung. |
| E2E Seed | `scripts/seeds/e2e-seed.ts` | Erstellt Prisma-E2E-Daten inklusive SaveGame, Teams, Players, Season, Matches, Draft und Stats. |
| E2E Preflight | `scripts/tools/e2e-preflight.mjs` | Erwartet `DATABASE_URL`, PostgreSQL und Prisma-Migrationen. |
| QA Simulation Scripts | `scripts/simulations/qa-*.ts` | Nutzen Prisma-nahe Simulationstypen oder Prisma-Enums. |
| Playwright E2E | `e2e/*`, `package.json` Scripts | E2E-Flows starten ueber Prisma-Seed und Prisma/Auth.js SaveGames. |

## Optionenbewertung

| Kriterium | Option A: Prisma behalten | Option B: Prisma als Legacy/Fallback | Option C: Prisma entfernen |
|---|---|---|---|
| Risiko | Niedrig. Aktueller Default bleibt stabil. | Mittel bis hoch. Firestore muss produktionsreif sein, Prisma bleibt fuer Rollback. | Sehr hoch. Aktuell fachlich und technisch blockiert. |
| Wartungsaufwand | Mittel. Firestore-Emulator-Slices existieren zusaetzlich. | Hoch in der Uebergangsphase, spaeter mittel. Feature Flags, Parity und Datenabgleich noetig. | Niedrig nach Abschluss, aber sehr hoher Vorbereitungsaufwand. |
| Testabdeckung | Stark fuer Prisma plus Firestore-Emulator-Kernbereiche. | Muss Browser-, Auth-, Datenmigrations- und Rollback-Tests dauerhaft abdecken. | Unzureichend, solange Runtime-Abhaengigkeiten bestehen. |
| Datenmigration | Keine neue Migration noetig. | Kontrollierte Backfills, ID-Parity und Dual-Run-Pruefung noetig. | Vollstaendige Datenmigration und Cutover zwingend. |
| Rollback | Sehr gut. Prisma bleibt aktiv. | Gut, wenn Prisma-Daten aktuell oder wiederherstellbar bleiben. | Schwach, wenn Prisma bereits entfernt oder Daten nicht synchron sind. |
| Kosten | PostgreSQL-Kosten bleiben. Firestore-Emulator/Tests zusaetzlich. | Doppelte Betriebskosten waehrend Parallelphase. | Potenziell weniger Postgres-Kosten, aber Firestore-Read/Write-Kosten muessen bewiesen werden. |
| Performance | Bekanntes Verhalten bei relationalen Joins und Transaktionen. | Muss fuer Firestore-Readmodels und Aggregates weiter gemessen werden. | Riskant ohne vollstaendige Kosten- und Performance-Parity. |

## Kritische Blocker fuer Entfernung

1. Auth.js nutzt Prisma Adapter.
   - Betroffen: `src/auth.ts`, `@auth/prisma-adapter`, `DATABASE_URL`.

2. SaveGame Root und Navigation bleiben Prisma-basiert.
   - Betroffen: `src/modules/savegames/*`, E2E-Seed, App-Routen unter `src/app/app/savegames/*`.

3. Mehrere transaktionale Fachpfade sind nicht vollstaendig Firestore-nativ.
   - Betroffen: Team Management, Draft, Scouting, Week Flow, Season Management, Simulation, Player Development.

4. Prisma Seeds und E2E-Fixtures sind weiterhin notwendig.
   - Betroffen: `prisma/seed.ts`, `scripts/seeds/e2e-seed.ts`, `scripts/tools/e2e-preflight.mjs`, `package.json`.

5. Dokumentation und Betriebsmodell sind weiter Prisma-zentriert.
   - Betroffen: `README.md`, `docs/guides/operations-*.md`, `docs/architecture/*`, `docs/architecture/decisions/*`.

6. Firestore-Browser-Flow ist nicht produktionsnah validiert.
   - Server- und Emulator-Parity ist gruen, aber Auth/SaveGame-Browser-Einstieg bleibt Prisma.

## Entfernung nur als separater Removal-Plan

Falls Prisma spaeter entfernt werden soll, muss das als eigener Release-Plan erfolgen. Keine Datei wird in diesem Schritt entfernt.

Minimaler Removal-Plan:

1. Auth-Strategie entscheiden: Auth.js Firestore-Adapter, eigene Session-Persistenz oder explizite Hybrid-Architektur.
2. SaveGame Root, Navigation, Inbox, Draft, Scouting, Team Management, Finance, Player History und Reference Data Firestore-faehig machen.
3. Direkte Imports von `@/lib/db/prisma`, `@prisma/client` und `@auth/prisma-adapter` ausserhalb eines klar markierten Legacy-Pakets entfernen.
4. Firestore-Browser-E2E mit dedizierter Fixture gruen bekommen.
5. Datenmigration mit Probe-Backfill, Checksummen, Count-Vergleichen und Rollback-Snapshot durchfuehren.
6. Eine Release-Phase mit `DATA_BACKEND=firestore` und Prisma als read-only Fallback fahren.
7. Erst danach Prisma Scripts, Adapter, Schema, Seeds, Dependencies und Doku in einer dedizierten Removal-PR entfernen.

## Go/No-Go-Kriterien

Go fuer Option B, Prisma als Legacy/Fallback:

- Server-Parity bleibt gruen.
- Browser-E2E Week Loop laeuft fuer Prisma und Firestore.
- Auth-/SaveGame-Einstieg ist fuer Firestore geklaert, ohne Prisma-Zwang im Firestore-Modus.
- Alle kritischen Writes sind serverseitig, idempotent und gegen Emulator getestet.
- Rollback auf Prisma ist per Feature Flag und Daten-Snapshot moeglich.

Go fuer Option C, Prisma entfernen:

- Alle Go-Kriterien fuer Option B sind erfuellt.
- Keine direkten Runtime-Abhaengigkeiten auf `@/lib/db/prisma` existieren ausserhalb eines bereits deaktivierten Removal-Zweigs.
- Keine produktive Auth-, Session-, SaveGame-, Seed-, Test- oder CI-Abhaengigkeit benoetigt Prisma.
- Eine vollstaendige Datenmigration wurde in einer staging-nahen Umgebung wiederholbar validiert.
- Ein Rollback-Plan existiert, der ohne Prisma-Code-Checkout-Verlust funktioniert.

No-Go aktuell:

- Auth.js/SaveGame bleiben Prisma-basiert.
- Firestore-Browser-E2E ist nicht produktionsnah validiert.
- Prisma bleibt fuer Seeds, Referenzdaten, Transaktionen und lokale Entwicklung notwendig.
- Keine vollstaendige produktionsnahe Datenmigration ist validiert.

## Rollback-Plan

Aktueller sicherer Rollback ist einfach: Prisma bleibt Default, Firestore bleibt Emulator-/`demo-*`-geschuetzt, und produktive Datenpfade bleiben auf PostgreSQL.

Fuer einen spaeteren Firestore-Cutover:

- `DATA_BACKEND=prisma` als sofortigen Fallback behalten.
- Vor Cutover einen PostgreSQL-Snapshot erstellen.
- Firestore-Backfill mit Count-, ID-, Status-, Score-, Stats- und Report-Vergleichen pruefen.
- Kritische Writes mindestens eine Release-Phase lang auditieren.
- Bei Fehlern Feature Flag zurueck auf Prisma setzen und Firestore-Writes stoppen.
- Prisma-Code erst entfernen, wenn der Rollback nicht mehr Code-basiert, sondern daten-/releasebasiert abgesichert ist.

## Statuspruefung

- Sind alle Prisma-Abhaengigkeiten bekannt? Gruen.
- Ist die Empfehlung nachvollziehbar? Gruen.
- Gibt es einen sicheren Rollback-Plan? Gruen.
- Wurde nichts vorschnell entfernt? Gruen.
- Passt die Entscheidung zum aktuellen Parity-Status? Gruen: Parity ist serverseitig gruen, aber Runtime-/Auth-Blocker erzwingen weiter Option A.

Status: Gruen.

Entscheidung: Prisma behalten. Prisma-Entfernung bleibt No-Go, bis Auth, SaveGame-Root, Firestore-Browser-E2E und produktionsnahe Datenmigration geloest sind.
