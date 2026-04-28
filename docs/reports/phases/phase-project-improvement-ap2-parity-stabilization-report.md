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
