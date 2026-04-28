# Firebase Reports Read Models Report

Datum: 2026-04-26

Scope: Firestore-faehige Read Models fuer Team Overview, Player Overview, Match Summary, Season Overview, Stats Views und gespeicherte Report-Dokumente. Prisma bleibt Default/Fallback. Keine Auth-Umstellung, keine Prisma-Entfernung.

## Status

Status: Gruen

Begruendung: App-nahe Firestore-Readmodels laufen gegen den Emulator, bestehende Team/Player/Season/Match-Read-Pfade bleiben Firestore-faehig, gespeicherte Report-Dokumente koennen gelesen werden, und Report-Generation-Tests bleiben gruen. Alle Firestore-Zugriffe bleiben durch Emulator-/`demo-*` Guard geschuetzt.

## Geaenderte Dateien

Neu:

- `src/server/repositories/readModelRepository.firestore.ts`
- `src/server/repositories/firestoreReportsReadModels.test.ts`
- `docs/reports/systems/firebase-reports-readmodels-report.md`

Aktualisiert:

- `firestore.indexes.json`
- `package.json`

## Analysierte Reports

Gefunden wurden drei Report-Klassen:

- App-Reports: Game Report / Match Detail ueber `getMatchDetailForUser`, `match-report-model.ts`, Box Score, Drive Log und Top Performer.
- Season/Stats Readmodels: Season Overview, Standings, Team Detail, Player Detail und Dashboard-Modelle.
- Debug/QA/HTML-Reports: `simulation-debug.service`, `game-stats-reporting`, sowie diverse QA-Skripte unter `scripts/`.

Dieser Slice macht die app-nahen Readmodels und gespeicherten Firestore-Report-Dokumente nutzbar. Datei-basierte QA-HTML-Skripte bleiben lokale Tooling-Reports und werden nicht in Firestore geschrieben.

## Implementierte Firestore Read Models

Neu: `readModelRepositoryFirestore`

- `getTeamOverview(userId, leagueId, teamId)`
- `getPlayerOverview(userId, leagueId, playerId)`
- `getMatchSummary(userId, leagueId, matchId)`
- `getSeasonOverview(userId, leagueId, seasonId)`
- `getStatsViews(userId, leagueId, seasonId)`
- `listReports(userId, leagueId, limit)`

Die bestehenden App-Pfade bleiben ebenfalls Firestore-faehig:

- `getTeamDetailForUser(...)`
- `getPlayerDetailForUser(...)`
- `getSeasonOverviewForUser(...)`
- `getMatchDetailForUser(...)`

## Query-Strategie

Team Overview:

- `leagues/{leagueId}`
- `teams/{teamId}`
- `players where roster.teamId == teamId`
- `teamStats/season_{seasonId}_{teamId}`

Player Overview:

- `leagues/{leagueId}`
- `players/{playerId}`
- `playerStats where leagueId + seasonId + playerId + scope=SEASON`

Match Summary:

- nutzt `matchRepositoryFirestore.findDetailForUser`
- liest Match-Dokument, Drive Events, Team Match Stats und Player Match Stats
- nutzt vorhandene Aggregates statt Live-Berechnung aus Plays

Season Overview:

- nutzt `seasonRepositoryFirestore.findOwnedByUser`
- liest Season, Matches und `teamStats scope=SEASON`

Stats Views:

- `teamStats where leagueId + seasonId + scope=SEASON`
- `playerStats where leagueId + seasonId + scope=SEASON`
- Sortierung erfolgt auf dem season-scoped Resultset, nicht auf Full Collections

Reports:

- `reports where leagueId orderBy createdAt desc limit N`

## Performance-Bewertung

- Keine neuen Full-Collection-Reads ohne `leagueId`, `seasonId`, `teamId`, `playerId` oder `matchId` Filter.
- Team/Player/Match/Season Views verwenden vorhandene Snapshots und Aggregates.
- Stats Views lesen season-scoped Aggregate-Dokumente. Das ist fuer Uebersichten angemessen, solange Season-Groessen kontrolliert bleiben.
- Report-Liste ist limitiert und nach `leagueId + createdAt` indexierbar.

## Indexe

Ergaenzt in `firestore.indexes.json`:

- `playerStats`: `leagueId + seasonId + scope + createdAt`
- `teamStats`: `leagueId + seasonId + scope + createdAt`

Bereits vorhanden und weiter genutzt:

- `reports`: `leagueId + createdAt`
- `playerStats`: `leagueId + seasonId + playerId + scope`
- `playerStats`: `leagueId + matchId + scope + createdAt`
- `teamStats`: `leagueId + seasonId + teamId + scope`
- `teamStats`: `leagueId + matchId + scope + createdAt`

## Bewusst Nicht Migriert

- keine Auth-Umstellung
- keine Prisma-Entfernung
- keine produktiven Firebase-Zugriffe
- keine Datei-basierten QA-HTML-Reports in Firestore geschrieben
- keine neue Client-Write-Freigabe
- keine vollstaendige Report-Orchestrierung nach Matchabschluss

## Testergebnisse

Ausgefuehrt:

- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.
- `npm run test:firebase`: Gruen, 3 Testdateien / 12 Tests.
- `npm run test:firebase:readmodels`: Gruen, 1 Testdatei / 3 Tests.
- `npm run test:firebase:game-output`: Gruen, 1 Testdatei / 4 Tests.
- `npm run test:firebase:stats`: Gruen, 1 Testdatei / 3 Tests.
- `npm run test:firebase:season-week-match`: Gruen, 1 Testdatei / 8 Tests.
- `npm run test:firebase:week-state`: Gruen, 1 Testdatei / 7 Tests.
- `npx vitest run src/components/match/match-report-model.test.ts src/modules/gameplay/application/game-stats-reporting.test.ts src/modules/seasons/application/simulation/simulation-debug.service.test.ts`: Gruen, 3 Testdateien / 11 Tests.
- `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/savegames/application/week-flow.service.test.ts`: Gruen, 2 Testdateien / 18 Tests.

Hinweis: Firestore-Emulator-Suites muessen weiterhin sequenziell laufen, weil Reset/Seed denselben Demo-Namespace nutzen.

## Risiken

- `getStatsViews` sortiert season-scoped Aggregate in memory. Fuer sehr grosse Ligen sollte spaeter eine Top-N-Readmodel-Collection oder sortierbare Composite-Query ergaenzt werden.
- Datei-basierte QA-Reports bleiben ausserhalb von Firestore. Das ist gewollt, sollte aber vor Produktivbetrieb als separate Reporting-Entscheidung behandelt werden.
- Match Summary haengt davon ab, dass Game Output und Stats vorher serverseitig persistiert wurden.
- Reports Collection enthaelt aktuell Seed-/QA-Readiness-Dokumente, noch keine vollautomatischen Post-Game-Reports.

## Empfehlung

Naechster sicherer Schritt:

1. Firestore-Simulation-Orchestrator bauen, der Match State, Game Output, Stats und Report-Readmodels in definierter Reihenfolge schreibt.
2. Danach Post-Game-Report-Dokumente serverseitig erzeugen.
3. Fuer Stats Views optional Top-N-Readmodels einfuehren, falls reale Ligagroessen groesser werden.

## Statuspruefung

- Reports funktionieren mit Firestore? Gruen, gespeicherte Report-Dokumente und App-Report-Readmodels funktionieren.
- Read Models sind performant? Gruen fuer aktuellen Scope; Queries sind league/season/team/player/match-scoped.
- Keine offenen Full-Collection-Reads? Gruen.
- Prisma bleibt Default/Fallback? Gruen.
- Tests gruen? Gruen.

Status: Gruen.
