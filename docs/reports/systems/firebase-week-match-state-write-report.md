# Firebase Week/Match State Write Report

Datum: 2026-04-26

Scope: Kontrollierte Firestore-Writes fuer Week- und Match-State im lokalen Emulator. Prisma bleibt Default/Fallback. Es wurden keine Stats, Reports oder Game-Engine-Output-Persistenz migriert.

## Status

Status: Gruen

Begruendung: Week-/Match-State-Transitions laufen mit `DATA_BACKEND=firestore` gegen den Firestore Emulator, illegale Transitions werden blockiert, Scores werden validiert, Prisma bleibt Default, und die bestehenden Prisma-Week-Flow-Tests sind weiterhin gruen.

## Geaenderte Dateien

Neu:

- `src/server/repositories/weekMatchStateRepository.firestore.ts`
- `src/server/repositories/firestoreWeekMatchState.test.ts`
- `docs/reports/systems/firebase-week-match-state-write-report.md`

Aktualisiert:

- `src/modules/savegames/application/week-flow.service.ts`
- `package.json`

## Implementierte Firestore-Writes

Nur serverseitig ueber `week-flow.service.ts` und den Emulator-Guard:

- Week State `PRE_WEEK -> READY`
  - schreibt `leagues/{leagueId}.weekState`
  - schreibt `weeks/{weekId}.state`
- Match Start `SCHEDULED -> IN_PROGRESS`
  - schreibt `matches/{matchId}.status`
  - schreibt `matches/{matchId}.simulationStartedAt`
  - schreibt Week State `READY -> GAME_RUNNING`
- Match Finish `IN_PROGRESS -> COMPLETED`
  - schreibt `matches/{matchId}.status`
  - schreibt `matches/{matchId}.homeScore`
  - schreibt `matches/{matchId}.awayScore`
  - schreibt `matches/{matchId}.simulationCompletedAt`
  - schreibt Week State `GAME_RUNNING -> POST_GAME`
- Advance Week `POST_GAME -> PRE_WEEK`
  - nur wenn keine offenen Matches der aktuellen Week existieren
  - schreibt `leagues/{leagueId}.currentWeekId`
  - schreibt `leagues/{leagueId}.currentSeasonSnapshot.weekNumber`
  - schreibt `seasons/{seasonId}.currentWeekNumber`
  - schreibt `weeks/{nextWeekId}.state`

## Validierte State-Transitions

Erlaubt:

- `PRE_WEEK -> READY`
- `READY -> GAME_RUNNING`
- `GAME_RUNNING -> POST_GAME`
- `POST_GAME -> PRE_WEEK`

Validierte Blockaden:

- `prepareWeek` blockiert, wenn der aktuelle State nicht `PRE_WEEK` ist.
- `finishGame` blockiert, wenn der aktuelle State nicht `GAME_RUNNING` ist.
- `finishGame` blockiert negative oder nicht-ganzzahlige Scores.
- `advanceWeek` blockiert, solange aktuelle Matches noch `SCHEDULED` oder `IN_PROGRESS` sind.
- Match-Start verlangt ein aktuelles Week-Match mit Status `SCHEDULED`.
- Match-Finish verlangt ein aktuelles Week-Match mit Status `IN_PROGRESS`.

## Bewusst Nicht Migriert

- keine Player Stats
- keine Team Stats
- keine Match Drives
- keine Game Events
- keine Reports
- keine vollstaendige Game-Engine-Persistenz
- keine Auth-Umstellung
- keine Prisma-Entfernung
- keine UI-Neugestaltung

## Schutzlogik

- Prisma bleibt Default.
- Firestore-State-Writes laufen nur bei `DATA_BACKEND=firestore`.
- Der bestehende Guard verlangt Emulator-Host und `demo-*` Projekt-ID.
- Client-Direktwrites bleiben durch `firestore.rules` verboten.
- Die Writes laufen serverseitig ueber Firebase Admin SDK gegen den Emulator.

## Testergebnisse

Ausgefuehrt:

- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.
- `npm run test:firebase`: Gruen, 3 Testdateien / 12 Tests.
- `npm run test:firebase:week-state`: Gruen, 1 Testdatei / 7 Tests.
- `npx vitest run src/modules/savegames/application/week-flow.service.test.ts`: Gruen, 1 Testdatei / 6 Tests.

Hinweis: Der Scriptname ist `npm run test:firebase:week-state`; das ist der passende State-Transition-Test fuer diesen Slice.

## Risiken

- Der Firestore-Week-Flow ist ein kontrollierter State-Slice, keine vollstaendige Simulation-Migration.
- `advanceWeek` fuehrt keine Weekly Player Development Logik aus. Diese bleibt bewusst Prisma/Game-Engine-gebunden.
- Match-Finish speichert nur Score und Status, keine Stats, Drives oder Reports.
- Emulator-Suites resetten/seeden denselben Demo-Namespace und sollten weiterhin sequenziell laufen.

## Empfehlung

Naechster sicherer Schritt:

1. Firestore-Test-Harness fuer sequenzielle Emulator-Suites zentralisieren.
2. Danach GameEvents/Stats erst als Readmodel-Parity vorbereiten.
3. Vollstaendige Game-Engine-Persistenz erst nach gesonderter Parity-Testmatrix migrieren.

## Statuspruefung

- Firestore State-Transition-Tests ausgefuehrt? Gruen.
- Fehler behoben oder klar dokumentiert? Gruen, keine offenen Fehler.
- Bericht erstellt? Gruen.
- Keine Stats/Reports/Game-Engine-Output-Migration gestartet? Gruen.
- Prisma bleibt Default/Fallback? Gruen.
- Finaler Status gesetzt? Gruen.

Status: Gruen.
