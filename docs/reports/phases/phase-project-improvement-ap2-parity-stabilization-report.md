# AP 2 - Parity-Testlauf und lokale PostgreSQL/E2E-Stabilisierung

Datum: 2026-04-26

Status: Gruen

## Ziel

Prisma- und Firestore-Testlaeufe reproduzierbar machen und den Parity-Status serverseitig belastbar bewerten.

## Implementierung

Aktualisiert:

- `docker-compose.yml`
- `package.json`
- `.env.example`
- `.gitignore`
- `scripts/tools/db-up.mjs`
- `scripts/seeds/e2e-seed.ts`
- `scripts/seeds/parity-fixture.ts`
- `scripts/tools/e2e-preflight.mjs`
- `prisma/migrations/20260426123001_init/migration.sql`
- `docs/reports/systems/firebase-e2e-parity-report.md`

## Was umgesetzt wurde

- Eine explizite Parity-Testmatrix wurde in `scripts/seeds/parity-fixture.ts` ergaenzt:
  - Seed-Daten
  - Team Overview
  - Player/Roster
  - Season Overview
  - Match Detail
  - Week Loop
  - Stats
  - Reports
- Der E2E-Preflight gibt bei nicht erreichbarer PostgreSQL-Instanz jetzt konkrete lokale Fix-Hinweise aus:
  - Homebrew-Beispiel
  - Docker-Compose-Beispiel ueber `npm run db:up`
  - Migrate- und Seed-Befehle
- Eine lokale Docker-Compose-PostgreSQL-Konfiguration wurde ergaenzt:
  - Service: `postgres`
  - Image: `postgres:16`
  - Container: `afbm-postgres`
  - DB/User/Pass passend zu `.env.example`
  - Port: `5432:5432`
  - Healthcheck via `pg_isready`
- Neue npm Scripts:
  - `npm run db:up`
  - `npm run db:down`
  - `npm run db:reset`
- `npm run db:up` ist jetzt reproduzierbar auf lokalen Entwicklungsmaschinen:
  - nutzt Docker Compose, wenn `docker` verfuegbar ist
  - nutzt alternativ Homebrew PostgreSQL 16 ueber `scripts/tools/db-up.mjs`
  - initialisiert eine lokale DB unter `.local/postgres16-data`
  - legt `afbm_manager` fuer `DATABASE_URL` an
- `.gitignore` ignoriert `.local`, damit lokale PostgreSQL-Daten nicht eingecheckt werden.
- `npm run test:firebase:parity` startet den Firestore-Emulator jetzt selbst ueber `firebase emulators:exec`.
- `.env.example` dokumentiert den lokalen DB-Default als passend zu `npm run db:up`.
- `scripts/seeds/e2e-seed.ts` verweist bei nicht erreichbarer DB jetzt ebenfalls auf `npm run db:up`.
- `firebase-e2e-parity-report.md` wurde auf den Stand nach AP 1/AP 2 aktualisiert:
  - Fixture-Mapping vorhanden
  - Firestore-Parity gruen
  - Prisma-DB-Seed laeuft lokal gegen PostgreSQL

## Tests

Gruen:

- `npm run db:up`
  - Docker war lokal nicht verfuegbar.
  - Homebrew PostgreSQL 16 wurde bereitgestellt und ueber `scripts/tools/db-up.mjs` gestartet.
  - Ergebnis: PostgreSQL laeuft auf `127.0.0.1:5432`, Datenbank `afbm_manager` vorhanden.
- `npm run prisma:migrate -- --name init`
  - Migration `20260426123001_init` erstellt und angewendet.
  - Prisma Client generiert.
- `npm run test:e2e:seed`
  - DB erreichbar unter `localhost:5432`.
  - Seed erfolgreich: User, Savegame, 2 Teams, 8 Players, Match, Draft Class, 24 Prospects.
- `node scripts/tools/e2e-preflight.mjs`
  - Port 3100 frei.
  - Chromium vorhanden.
  - DB erreichbar.
  - Migrationen vorhanden.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:firebase:parity`
  - 1 Testdatei / 3 Tests

## Nachpruefung 2026-04-26

Erneut ausgefuehrt und gruen:

- `npm run db:up`
  - PostgreSQL laeuft auf `127.0.0.1:5432`.
  - Datenbank `afbm_manager` ist vorhanden.
- `npm run prisma:migrate -- --name init`
  - Schema bereits synchron.
  - Prisma Client generiert.
- `npm run test:e2e:seed`
  - Seed erfolgreich in 1132ms.
- `node scripts/tools/e2e-preflight.mjs`
  - Port 3100 frei.
  - Chromium vorhanden.
  - DB erreichbar.
  - Migrationen vorhanden.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:firebase:parity`
  - 1 Testdatei / 3 Tests.

## Finaler lokaler Abschlusscheck 2026-04-28

Ausgangslage:

- AP 2 war funktional vorbereitet.
- Der formale lokale PostgreSQL/Docker-Abschlusscheck wurde erneut gefordert.
- Es wurde keine Game-Engine-Aenderung, keine UI-Feature-Aenderung und keine neue Firebase-Migration gestartet.

Ausgefuehrte Commands:

```bash
npm run db:up
npm run prisma:migrate -- --name init
npm run test:e2e:seed
node scripts/e2e-preflight.mjs
npx tsc --noEmit
npm run lint
npm run test:firebase:parity
```

Ergebnisse:

- `npm run db:up`: Gruen.
  - In der Sandbox blockierte der lokale TCP-Zugriff auf PostgreSQL.
  - Ausserhalb der Sandbox erfolgreich: PostgreSQL laeuft auf `127.0.0.1:5432`, Datenbank `afbm_manager` ist vorhanden.
- `npm run prisma:migrate -- --name init`: Gruen.
  - Schema ist synchron.
  - Prisma Client `v6.15.0` wurde generiert.
- `npm run test:e2e:seed`: Gruen.
  - DB erreichbar unter `localhost:5432`.
  - Seed erfolgreich: User, Savegame, 2 Teams, 52 Players, Match, Draft Class, 24 Prospects.
- `node scripts/e2e-preflight.mjs`: Gruen.
  - Port 3100 frei.
  - Chromium vorhanden.
  - DB erreichbar.
  - Migrationen vorhanden.
- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.
- `npm run test:firebase:parity`: Gruen.
  - Firebase CLI `15.15.0`.
  - Firestore Emulator startet gegen `demo-afbm`.
  - 1 Testdatei / 3 Tests bestanden.

AP2-bezogene Fixes:

- `scripts/e2e-preflight.mjs` als stabiler Entry-Point fuer den geforderten Gate-Command ergaenzt.
- `firebase-tools` von der defekten Altversion `1.2.0` auf `15.15.0` wiederhergestellt, damit `firebase emulators:exec` tatsaechlich verfuegbar ist.
- `test:firebase:parity` nutzt `XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools`, damit die lokale Dev Dependency verwendet wird und Firebase CLI Update-/Config-Dateien nicht in das User-Home schreiben muessen.
- `.gitignore` schuetzt lokale Laufzeit-Artefakte:
  - `.local/`
  - `*.tsbuildinfo`
  - `firebase-emulator-data/`
  - `reports-output/`
  - `test-results/`
  - `playwright-report/`
- Bereits getrackte lokale `.local/postgres16-data`-Artefakte und `tsconfig.tsbuildinfo` wurden aus dem Git-Index entfernt, bleiben aber lokal erhalten.

Geaenderte Dateien:

- `.gitignore`
- `package.json`
- `package-lock.json`
- `scripts/e2e-preflight.mjs`
- `docs/reports/phases/phase-project-improvement-ap2-parity-stabilization-report.md`
- Git-Index: lokale `.local/postgres16-data`-Artefakte und `tsconfig.tsbuildinfo` werden aus der Versionskontrolle entfernt.

Entscheidung:

- Status AP 2: Gruen.
- Freigabe Firebase-DB-Migration: Ja, fuer den naechsten kontrollierten Migrationsschritt.
- Einschraenkung: keine Production-Aktivierung und kein automatischer Firestore-Go-Live.

## Firebase-Parity-Tooling-Fix 2026-04-28

Ursache des letzten Blockers:

- `firebase --version` findet keine globale Firebase CLI.
- `which firebase` findet keine globale Firebase CLI.
- `npx firebase-tools --version` findet die lokale CLI `15.15.0`, scheiterte ohne eigenes Config-Home aber am Update-Check unter `/Users/lukashanzi/.config`.
- Das alte Script war damit nicht reproduzierbar genug, weil es implizit `firebase` aus der Shell-/npm-PATH-Aufloesung nutzte.

Fix:

- `firebase-tools` ist als Dev Dependency auf `15.15.0` gesetzt.
- `npm run test:firebase:parity` nutzt jetzt explizit:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools emulators:exec --only firestore --project demo-afbm "vitest run src/server/repositories/firestoreE2eParity.test.ts"
```

Nachweis:

- `XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools --version`: `15.15.0`, Gruen.
- `npm run test:firebase:parity`: Gruen.
  - Firestore Emulator startet gegen `demo-afbm`.
  - `src/server/repositories/firestoreE2eParity.test.ts`: 1 Testdatei / 3 Tests bestanden.
- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.

Status AP 2: Gruen.

Freigabe Firebase-DB-Migration: Ja, fuer den naechsten kontrollierten Migrationsschritt.

## Lokale Infrastruktur-Freigabe 2026-04-30

Ausgangslage:

- Die Multiplayer-Parity-Pruefung sollte erneut auf der lokalen Entwicklungsumgebung abgeschlossen werden.
- Fokus war ausschliesslich Infrastruktur, Setup, Preflight und Dokumentation.
- Es wurden keine Game-Engine-, Week-Flow- oder Firestore-Parity-Fachlogik-Aenderungen vorgenommen.
- Es wurden keine produktiven Daten oder Secrets verwendet.

Voraussetzungen fuer reproduzierbare lokale Pruefung:

- PostgreSQL:
  - `DATABASE_URL` muss auf die lokale Testdatenbank zeigen, z.B. `postgresql://postgres:postgres@localhost:5432/afbm_manager?schema=public`.
  - `npm run db:up` startet/prueft PostgreSQL lokal. Wenn Docker vorhanden ist, wird Docker Compose genutzt; sonst faellt das Script auf Homebrew PostgreSQL 16 zurueck.
- Docker:
  - Optional fuer den PostgreSQL-Containerpfad.
  - Nicht zwingend erforderlich, solange Homebrew PostgreSQL 16 lokal verfuegbar ist.
- Prisma:
  - Migrationen muessen unter `prisma/migrations` vorhanden sein.
  - `npm run prisma:migrate -- --name init` muss gegen die lokale Test-DB laufen koennen.
- E2E Seed:
  - `npm run test:e2e:seed` befuellt nur lokale Testdaten.
- Preflight:
  - Der geforderte Entry-Point `node scripts/e2e-preflight.mjs` delegiert auf `scripts/tools/e2e-preflight.mjs`.
  - Der Preflight prueft `DATABASE_URL`, PostgreSQL-Erreichbarkeit, Port `3100`, Playwright Chromium und Prisma-Migrationen.
- Firebase/Testmodus:
  - `npm run test:firebase:parity` nutzt `XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools`.
  - Der Firestore Emulator laeuft gegen `demo-afbm`.
  - `AFBM_INCLUDE_FIRESTORE_TESTS=true` wird im Script gesetzt.

Ausgefuehrte Commands:

```bash
npm run db:up
npm run prisma:migrate -- --name init
npm run test:e2e:seed
node scripts/e2e-preflight.mjs
npx tsc --noEmit
npm run lint
npm run test:firebase:parity
```

Ergebnisse:

- `npm run db:up`: Gruen.
  - PostgreSQL laeuft auf `127.0.0.1:5432`.
  - Datenbank `afbm_manager` ist vorhanden.
- `npm run prisma:migrate -- --name init`: Gruen.
  - Schema ist synchron.
  - Keine ausstehende Migration.
  - Prisma Client `v6.15.0` wurde generiert.
  - Hinweis: Prisma meldet ein Major-Update `6.15.0 -> 7.8.0`; nicht Bestandteil dieses Infrastrukturabschlusses.
- `npm run test:e2e:seed`: Gruen.
  - DB erreichbar unter `localhost:5432`.
  - Seed erfolgreich: User, Savegame, 2 Teams, 52 Players, Match, Draft Class, 24 Prospects.
- `node scripts/e2e-preflight.mjs`: Gruen.
  - Port `3100` frei.
  - Chromium vorhanden.
  - DB erreichbar.
  - Migrationen vorhanden.
- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.
- `npm run test:firebase:parity`: Gruen.
  - Firestore Emulator startet gegen `demo-afbm`.
  - `src/server/repositories/firestoreE2eParity.test.ts`: 1 Testdatei / 3 Tests bestanden.

Bekannte lokale Einschraenkung:

- In der Codex-Sandbox sind lokale TCP-/IPC-Zugriffe fuer PostgreSQL, Prisma, `tsx` und Emulator-Ports teilweise blockiert. Die reproduzierbare lokale Pruefung ist ausserhalb der Sandbox gruen.

Entscheidung:

- Status lokale Infrastruktur: Gruen.
- Freigabe fuer weitere Multiplayer-E2E-Arbeiten: Ja.
- Kein Production-Firestore-Go-Live und keine Prisma-Entfernung.

## Ergebnis

Der vorherige Blocker ist behoben. Docker ist weiterhin nicht verfuegbar, aber AP 2 ist nicht mehr davon abhaengig, weil `npm run db:up` lokal reproduzierbar auf Homebrew PostgreSQL 16 zurueckfallen kann.

## Keine Umsetzung gestartet fuer

- keine Auth-Umstellung
- keine Prisma-Entfernung
- keine produktive Firebase-Aktivierung
- keine Browser-E2E-Firestore-Umgehung
- keine neue Persistenzmigration

## Akzeptanzkriterien

- PostgreSQL-Preflight verstaendlich: Gruen.
- Firestore-Parity-Testlauf gruen: Gruen.
- Parity-Matrix dokumentiert: Gruen.
- Prisma-Testlauf erfolgreich: Gruen.
- Vollstaendige serverseitige Kern-Parity: Gruen.

## AP-3-Freigabe

AP 3 darf gestartet werden. AP 2 ist Gruen, weil alle geforderten Gate-Commands erfolgreich gelaufen sind:

```bash
npm run db:up
npm run prisma:migrate -- --name init
npm run test:e2e:seed
node scripts/tools/e2e-preflight.mjs
npx tsc --noEmit
npm run lint
npm run test:firebase:parity
```

Status: Gruen.
