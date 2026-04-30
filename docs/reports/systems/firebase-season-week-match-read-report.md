# Firebase Season/Week/Match Read Report

Datum: 2026-04-26

Scope: Lesende Firestore-Unterstuetzung fuer Seasons, Weeks und Matches. Prisma bleibt Default und Fallback. Game Engine, Week Loop, Match-Ergebnisse, Stats-Persistenz und Reports wurden nicht migriert.

## Status

Status: Gruen

Begruendung: `DATA_BACKEND=firestore` bleibt durch den bestehenden Emulator-/`demo-*` Guard geschuetzt. In diesem Modus werden Seasons, Weeks und Matches lesend aus Firestore bedient; alle kritischen Schreibpfade bleiben unveraendert Prisma-/Server-gebunden. Die neuen Read-Repositories und bestehenden Query-Pfade wurden gegen den Firestore Emulator getestet.

## Geaenderte Dateien

Neu:

- `src/server/repositories/firestoreAccess.ts`
- `src/server/repositories/seasonRepository.firestore.ts`
- `src/server/repositories/weekRepository.firestore.ts`
- `src/server/repositories/weekRepository.prisma.ts`
- `src/server/repositories/matchRepository.firestore.ts`
- `src/server/repositories/firestoreSeasonWeekMatch.test.ts`
- `docs/reports/systems/firebase-season-week-match-read-report.md`

Aktualisiert:

- `src/server/repositories/index.ts`
- `src/server/repositories/types.ts`
- `src/server/repositories/index.test.ts`
- `package.json`

## Firestore-faehige Reads

Seasons:

- `getRepositories().seasons.findBySaveGame(saveGameId, seasonId)`
- `getRepositories().seasons.findOwnedByUser(userId, saveGameId, seasonId)`
- `seasonRepositoryFirestore.findCurrentBySaveGame(saveGameId)`
- bestehender Query-Pfad `getSeasonOverview(saveGameId, seasonId)` mit `DATA_BACKEND=firestore`

Weeks:

- `getRepositories().weeks.findBySaveGame(saveGameId, weekId)`
- `getRepositories().weeks.findOwnedByUser(userId, saveGameId, weekId)`
- `getRepositories().weeks.findCurrentBySaveGame(saveGameId)`

Matches:

- `getRepositories().matches.findDetailForUser(userId, saveGameId, matchId)`
- `matchRepositoryFirestore.findBySaveGame(saveGameId, matchId)`
- `matchRepositoryFirestore.findByWeek(saveGameId, weekId)`
- bestehender Query-Pfad `getMatchDetailForUser(userId, saveGameId, matchId)` mit `DATA_BACKEND=firestore`

Firestore Collections:

- `leagues`
- `leagueMembers`
- `seasons`
- `weeks`
- `matches`
- `teamStats` nur als optionaler Season-Standing-Snapshot

## Bewusst Nicht Migriert

Keine Writes wurden auf Firestore umgestellt:

- keine Game-Engine-Migration
- keine Week-Loop-State-Transitions
- keine Match-Ergebnisse
- keine `advanceWeekAction`
- keine `finishGameAction`
- keine Simulation-Drives-Persistenz
- keine Player-/Team-Stats-Persistenz
- keine Reports
- keine Season-/Week-Commands

`matchRepositoryFirestore` liefert fuer Match Detail bewusst leere Arrays fuer `teamMatchStats`, `simulationDrives` und `playerMatchStats`, solange Stats/GameEvents nicht migriert sind. Dadurch bleiben bestehende Detail-Views lesbar, aber es werden keine Simulationsergebnisse vorgetaeuscht.

## DATA_BACKEND-Schutz

Unveraendert:

- Default bleibt Prisma.
- `DATA_BACKEND=prisma` bleibt Prisma.
- `DATA_BACKEND=firestore` ist nur erlaubt, wenn `FIRESTORE_EMULATOR_HOST` oder `FIREBASE_EMULATOR_HOST` gesetzt ist.
- Die Projekt-ID muss mit `demo-` beginnen.
- Ohne Emulator-/Demo-Konfiguration wirft der Provider sofort.

Im Firestore-Modus werden nun diese Read-Bereiche umgeschaltet:

- Teams
- Players
- Seasons
- Weeks
- Matches

Andere Bereiche bleiben Prisma:

- SaveGames
- Team Management Commands
- Season Simulation
- Match Preparation
- Stats
- Reports
- Auth

## Tests

Ausgefuehrt:

- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.
- `npm run test:firebase`: Gruen, 3 Testdateien / 12 Tests.
- `npm run test:firebase:repositories`: Gruen, 1 Testdatei / 9 Tests.
- `npm run test:firebase:season-week-match`: Gruen, 1 Testdatei / 8 Tests.

Abgedeckte Season/Week/Match-Szenarien:

- Season laden.
- aktuelle Season laden.
- Week laden.
- aktuelle Week laden.
- Matches einer Week laden.
- Match Detail laden.
- bestehender `getSeasonOverview(...)` Query-Pfad liest aus Firestore.
- bestehender `getMatchDetailForUser(...)` Query-Pfad liest aus Firestore.
- Missing Season/Week/Match gibt `null` zurueck.
- Fremde Liga gibt `null` zurueck.
- Nicht-Mitglied bekommt keine Match-Reads.
- `DATA_BACKEND=firestore` schaltet Seasons/Weeks/Matches um.

Test-Hinweis:

- Firestore-Repository-Suites resetten und seeden denselben Emulator.
- Deshalb duerfen `test:firebase:repositories` und `test:firebase:season-week-match` nicht parallel gegen denselben Emulator laufen.
- Ein paralleler Versuch erzeugte erwartbar eine Reset/Seed-Kollision; beide Suites laufen isoliert gruen.

## Risiken

- Firestore-Season- und Match-Mapper bilden weiterhin Prisma-aehnliche Read Records nach. Das ist fuer diesen Slice bewusst klein, aber noch keine finale DTO-Abstraktion.
- `weeks` existiert in Prisma nicht als eigenes Model. Fuer Prisma wurde deshalb ein synthetischer `weekRepositoryPrisma` aus `SaveGame.weekState` und `Season.week` angelegt.
- Match Detail zeigt ohne Stats-/GameEvents-Migration keine Drives, keine Player Lines und keine Team Match Stats.
- Browser-E2E wurde nicht auf Firestore umgestellt, weil SaveGame/Auth weiter Prisma/legacy session system sind.
- Emulator-Suites muessen sequentiell laufen, solange sie denselben Demo-Projekt-Namespace resetten.

## Empfehlung

Naechster sicherer Schritt:

1. Einen gemeinsamen Firestore-Test-Harness fuer Reset/Seed/Namespace-Isolation bauen, damit Emulator-Suites nicht kollidieren.
2. Danach Stats/GameEvents nur als Readmodel evaluieren, nicht als Game-Engine-Write.
3. Week-Loop- und Match-Ergebnis-Writes erst nach expliziter Transaktions-/Parity-Test-Matrix migrieren.

## Statuspruefung

- Seasons lesen funktioniert mit Firestore Emulator? Gruen.
- Weeks lesen funktioniert mit Firestore Emulator? Gruen.
- Matches lesen funktioniert mit Firestore Emulator? Gruen.
- Prisma bleibt Default/Fallback? Gruen.
- Keine Game-Engine-/Week-Loop-Writes migriert? Gruen.
- Tests gruen? Gruen.

Status: Gruen.
