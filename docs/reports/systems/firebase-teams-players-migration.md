# Firebase Teams/Players Migration

Datum: 2026-04-26

Scope: Erster echter Firestore-Datenbereich fuer American Football Manager / FBManager. Nur Team- und Player-Read-/Smoke-Write-Pfade sind Firestore-faehig. Prisma bleibt Default und Fallback. Game Engine, Week Loop, Matches, Stats, Reports, Auth und Prisma-Dateien bleiben unveraendert.

## Status

Status: Gruen

Begruendung: `DATA_BACKEND=firestore` ist nur im lokalen Emulator mit `demo-*` Projekt-ID erlaubt. In diesem Modus werden ausschliesslich Team- und Player-Repositories auf Firestore umgeschaltet; alle anderen Repositories bleiben Prisma. Team-/Player-Laden, Roster-Laden, einfache Team-/Player-Saves und Fehlerfaelle sind gegen den Firestore Emulator getestet. Prisma bleibt Default und der Provider-Fallback ist getestet.

## Geaenderte Dateien

Neu:

- `src/server/repositories/firestoreGuard.ts`
- `src/server/repositories/firestoreRepositoryMappers.ts`
- `src/server/repositories/teamRepository.firestore.ts`
- `src/server/repositories/playerRepository.firestore.ts`
- `src/server/repositories/firestoreTeamsPlayers.test.ts`
- `docs/reports/systems/firebase-teams-players-migration.md`

Aktualisiert:

- `src/server/repositories/index.ts`
- `src/server/repositories/types.ts`
- `src/server/repositories/index.test.ts`
- `package.json`

## Firestore-faehige Zugriffe

Teams:

- `getRepositories().teams.findBySaveGame(saveGameId, teamId)`
- `getRepositories().teams.findOwnedByUser(userId, saveGameId, teamId)`
- `teamRepositoryFirestore.listByLeague(leagueId)` fuer Repository-/E2E-Vorbereitung
- `teamRepositoryFirestore.save(team)` als Emulator-Smoke-Write
- bestehender Query-Pfad `getTeamDetail(saveGameId, teamId)` funktioniert mit `DATA_BACKEND=firestore`

Players:

- `getRepositories().players.findBySaveGame(saveGameId, playerId)`
- `getRepositories().players.findOwnedByUser(userId, saveGameId, playerId)`
- `playerRepositoryFirestore.findByTeam(saveGameId, teamId)` fuer Roster-/Team-Reads
- `playerRepositoryFirestore.save(player)` als Emulator-Smoke-Write
- bestehender Query-Pfad `getPlayerDetail(saveGameId, playerId)` funktioniert mit `DATA_BACKEND=firestore`

Die Firestore-Repositories lesen aus:

- `teams`
- `players`
- `leagues`
- `leagueMembers`
- `seasons`
- `teamStats` nur als optionaler Team-Record-Snapshot
- `playerStats` nur als optionaler Player-Detail-Snapshot

Die App-Mapper in `team-query.service.ts` und `player-query.service.ts` wurden nicht umgebaut. Stattdessen formen die Firestore-Mapper die Dokumente in die bestehende Prisma-aehnliche Detail-Record-Struktur. Das haelt den Slice klein und minimiert UI-Risiko.

## Bewusst Prisma-only

Diese Bereiche bleiben unveraendert Prisma-basiert:

- SaveGames / League-Liste
- Team Management Commands und Roster-Mutationen ausserhalb der Firestore-Smoke-Saves
- Game Engine
- Week Loop
- Seasons/Weeks
- Matches
- Match State
- Game Events
- Stats-Persistenz
- Reports
- Inbox
- Draft
- Auth/legacy session system
- E2E-Prisma-Seed
- Prisma Schema und Prisma Client

Wichtig: `DATA_BACKEND=firestore` schaltet nur `teams` und `players` um. Alle anderen Eintraege in `AppRepositories` bleiben Prisma-Implementierungen.

## DATA_BACKEND-Schutz

Default:

- Leeres `DATA_BACKEND` oder `DATA_BACKEND=prisma` nutzt Prisma.

Firestore:

- `DATA_BACKEND=firestore` ist nur erlaubt, wenn ein Emulator-Host gesetzt ist:
  - `FIRESTORE_EMULATOR_HOST`
  - oder `FIREBASE_EMULATOR_HOST`
- Die Projekt-ID muss mit `demo-` beginnen:
  - `FIREBASE_PROJECT_ID=demo-afbm`
  - oder `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-afbm`
- Ohne Emulator-Host wirft der Provider sofort.
- Mit Production-/Nicht-Demo-Projekt-ID wirft der Provider sofort.

Damit sind produktive Firebase-Zugriffe fuer diesen Slice ausgeschlossen.

## Tests

Ausgefuehrt:

- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.
- `npm run test:firebase`: Gruen, 3 Testdateien / 12 Tests.
- `npm run test:firebase:repositories`: Gruen, 1 Testdatei / 9 Tests gegen Firestore Emulator.

Abgedeckte Firestore-Repository-Szenarien:

- Team laden.
- Team mit Roster laden.
- Team speichern und erneut laden.
- Player laden.
- Player nach Team/Roster laden.
- Player speichern und erneut laden.
- Missing Team/Player gibt `null` zurueck.
- Fremde Liga gibt `null` zurueck.
- Nicht-Mitglied bekommt keine Owned-Reads.
- `DATA_BACKEND=firestore` schaltet nur Teams/Players um.
- bestehender `getTeamDetail(...)` Query-Pfad liest aus Firestore.
- bestehender `getPlayerDetail(...)` Query-Pfad liest aus Firestore.

Prisma-Fallback:

- `DATA_BACKEND` leer bleibt Prisma.
- `DATA_BACKEND=prisma` bleibt Prisma.
- bestehender `test:firebase` Provider-Test bestaetigt Prisma als Default.

E2E:

- Kein Browser-E2E wurde auf Firestore umgestellt.
- Begruendung: SaveGame-Liste, Auth und Navigation bleiben bewusst Prisma/legacy session system-basiert. Ein echter Browser-Flow auf Firestore wuerde aktuell entweder Auth/SaveGame migrieren oder gemischte Testdaten erzwingen.
- Stattdessen wurden die bestehenden Team-/Player-Query-Pfade serverseitig gegen Firestore getestet. Das ist fuer diesen Slice die risikoaermere Validierung.

## Risiken

- Die Firestore-Mapper bilden Prisma-Detail-Records nach. Das ist bewusst klein, aber keine finale Domain-DTO-Abstraktion.
- Team-/Player-Stats werden nur als optionale Snapshots gelesen, nicht als migrierte Stats-Persistenz.
- Team-/Player-Smoke-Saves sind fuer Emulator-Validierung vorhanden, aber keine produktiven Command-Pfade.
- UI-E2E mit Firestore bleibt blockiert, bis SaveGame/Auth-Testfluss oder eine dedizierte Firestore-E2E-Fixture definiert ist.
- `DATA_BACKEND=firestore` ist ein Mixed Mode: Teams/Players Firestore, andere Bereiche Prisma. Das ist gewollt, muss aber beim Debugging sichtbar bleiben.

## Empfehlung

Naechster sicherer Schritt:

1. Firestore-Team-/Player-DTOs aus der Prisma-Record-Form herausloesen, sobald ein zweiter UI-Pfad migriert wird.
2. Danach einen kleinen nicht-kritischen Command-Pfad vorbereiten, z.B. ein serverseitiges Team-/Player-Readmodel-Refresh oder Inbox.
3. Game Engine, Week Loop, Matches und Stats erst nach separater Parity-Test-Matrix anfassen.

## Statuspruefung

- Teams funktionieren mit `DATA_BACKEND=firestore` gegen Emulator? Gruen.
- Players funktionieren mit `DATA_BACKEND=firestore` gegen Emulator? Gruen.
- Prisma bleibt Default? Gruen.
- Prisma-Fallback funktioniert? Gruen.
- Keine Production-Zugriffe? Gruen.
- Tests gruen? Gruen.

Status: Gruen.
