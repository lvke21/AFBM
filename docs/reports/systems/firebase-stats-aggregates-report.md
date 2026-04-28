# Firebase Stats Aggregates Report

Datum: 2026-04-26

Scope: Firestore-faehige Persistenz fuer Match Stats, Player Stats, Team Stats und Season Aggregates im lokalen Emulator. Prisma bleibt Default/Fallback. Reports, Auth und Prisma-Dateien wurden nicht migriert oder entfernt.

## Status

Status: Gruen

Begruendung: Match-Team-Stats, Match-Player-Stats und Season-Aggregates werden serverseitig gegen den Firestore Emulator geschrieben. Die Writes sind idempotent, weil Match-Stats stabile Dokument-IDs nutzen und Season-Aggregates aus den vorhandenen Match-Stats neu berechnet werden. Reports bleiben unangetastet, Prisma bleibt Default/Fallback.

## Geaenderte Dateien

Neu:

- `src/server/repositories/statsRepository.firestore.ts`
- `src/server/repositories/firestoreStatsAggregates.test.ts`
- `docs/reports/systems/firebase-stats-aggregates-report.md`

Aktualisiert:

- `src/server/repositories/index.ts`
- `src/server/repositories/types.ts`
- `src/server/repositories/matchRepository.firestore.ts`
- `src/server/repositories/seasonRepository.firestore.ts`
- `src/server/repositories/playerRepository.firestore.ts`
- `firestore.indexes.json`
- `package.json`

## Analysierte Bestehende Stats

Prisma persistiert aktuell:

- `TeamMatchStat` per Upsert fuer beide Teams.
- `TeamSeasonStat` per Increment fuer Standings und Team-Aggregates.
- `PlayerMatchStat` plus Positionsfamilien fuer Match-Leistung.
- `PlayerSeasonStat` und `PlayerCareerStat` per Increment fuer Spieler-Aggregates.
- Danach folgen Player Condition, Development, History Events und Team-Recalculation.

Firestore migriert in diesem Slice nur Stats/Aggregates. Condition, Development, History, Reports und Team-Recalculation bleiben Prisma/Game-Engine-gebunden.

## Implementierte Firestore-Persistenz

`statsRepositoryFirestore.persistMatchStats(...)` schreibt:

- `teamStats/match_{matchId}_{teamId}` mit `scope: MATCH`
- `playerStats/match_{matchId}_{playerId}` mit `scope: MATCH`
- `teamStats/season_{seasonId}_{teamId}` mit `scope: SEASON`
- `playerStats/season_{seasonId}_{playerId}_{teamId}` mit `scope: SEASON`

Match-Stats werden mit stabilen IDs gesetzt. Ein erneutes Abschliessen desselben Matches ueberschreibt dieselben Match-Dokumente. Danach werden Season-Aggregates aus allen `scope=MATCH` Dokumenten fuer Season/Team bzw. Season/Player neu berechnet. Dadurch werden keine Stats doppelt gezaehlt.

## Firestore-Struktur

Team Match Stats:

```text
teamStats/match_{matchId}_{teamId}
  scope: MATCH
  leagueId, seasonId, seasonYear, matchId, teamId
  teamSnapshot
  pointsFor, pointsAgainst
  firstDowns, totalYards, passingYards, rushingYards
  turnovers, turnoversCommitted, turnoversForced
  sacks, explosivePlays
  redZoneTrips, redZoneTouchdowns
  penalties, timeOfPossessionSeconds
  wins, losses, ties
```

Team Season Aggregates:

```text
teamStats/season_{seasonId}_{teamId}
  scope: SEASON
  leagueId, seasonId, seasonYear, teamId
  teamSnapshot
  gamesPlayed, wins, losses, ties
  pointsFor, pointsAgainst
  touchdownsFor
  turnoversCommitted, turnoversForced
  passingYards, rushingYards, sacks
  explosivePlays, redZoneTrips, redZoneTouchdowns
```

Player Match Stats:

```text
playerStats/match_{matchId}_{playerId}
  scope: MATCH
  leagueId, seasonId, seasonYear, matchId, playerId, teamId
  playerSnapshot, teamSnapshot
  started, snapsOffense, snapsDefense, snapsSpecialTeams
  passing, rushing, receiving, blocking, defensive, kicking, punting, returns
  stats: compact read fields
```

Player Season Aggregates:

```text
playerStats/season_{seasonId}_{playerId}_{teamId}
  scope: SEASON
  leagueId, seasonId, seasonYear, playerId, teamId
  playerSnapshot, teamSnapshot
  passing, rushing, receiving, blocking, defensive, kicking, punting, returns
  stats.gamesPlayed
  stats.gamesStarted
  stats.snapsOffense / snapsDefense / snapsSpecialTeams
  stats.yards / touchdowns / tackles
```

## Readmodel-Anpassungen

- `matchRepositoryFirestore` liest `teamStats` und `playerStats` mit `scope=MATCH` und liefert sie an das bestehende Match-Detail-Readmodel.
- `seasonRepositoryFirestore` filtert Team Standings jetzt auf `scope=SEASON`, damit Match-Stats nicht als Standings erscheinen.
- `playerRepositoryFirestore` filtert Player-Detail-Stats auf `scope=SEASON`, damit Match-Stats nicht als Season Rows angezeigt werden.
- `getRepositories()` schaltet `stats` bei `DATA_BACKEND=firestore` auf `statsRepositoryFirestore`, bleibt aber durch den bestehenden Emulator-/`demo-*` Guard geschuetzt.

## Indizes

Ergaenzt in `firestore.indexes.json`:

- `playerStats`: `leagueId + seasonId + playerId + scope`
- `playerStats`: `leagueId + matchId + scope + createdAt`
- `teamStats`: `leagueId + seasonId + teamId + scope`
- `teamStats`: `leagueId + matchId + scope + createdAt`

Diese Queries stuetzen Match-Detail-Reads und idempotente Season-Aggregate.

## Bewusst Nicht Migriert

- keine Reports
- keine Auth-Umstellung
- keine Prisma-Entfernung
- keine Player Career Stats
- keine Player Condition/Fatigue/Injury Writes
- keine Player Development/History Events
- keine Team-Recalculation nach Development
- keine produktive Firebase-Aktivierung

## Kosten- und Konsistenzbewertung

- Match-Stats sind guenstig: stabile Dokument-IDs, direkte Writes, keine blind increments.
- Team-Season-Aggregates lesen alle Match-Team-Stats einer Season. Das ist fuer den Emulator-Slice bewusst korrekt und idempotent, kann bei langen Seasons aber teurer werden.
- Player-Season-Aggregates lesen pro betroffenen Spieler dessen Match-Stats der Season. Das vermeidet doppelte Zaehlung, ist aber bei kompletter Simulation vieler Spieler read-intensiv.
- Fuer Produktion waere spaeter ein Stats-Ledger oder Aggregate-Delta-Ansatz mit Transaktionsschutz zu pruefen.

## Testergebnisse

Ausgefuehrt:

- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.
- `npm run test:firebase`: Gruen, 3 Testdateien / 12 Tests.
- `npm run test:firebase:stats`: Gruen, 1 Testdatei / 3 Tests.
- `npm run test:firebase:game-output`: Gruen, 1 Testdatei / 4 Tests.
- `npm run test:firebase:season-week-match`: Gruen, 1 Testdatei / 8 Tests.
- `npm run test:firebase:week-state`: Gruen, 1 Testdatei / 7 Tests.
- `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/gameplay/application/game-stats-aggregation.test.ts src/modules/savegames/application/week-flow.service.test.ts`: Gruen, 3 Testdateien / 19 Tests.

Hinweis: Firestore-Emulator-Suites muessen weiterhin sequenziell laufen, weil Reset/Seed denselben Demo-Namespace nutzen.

## Risiken

- Season-Aggregates werden korrekt und idempotent neu berechnet, aber noch nicht fuer hohe Produktionslast optimiert.
- Player Career Stats sind noch nicht migriert.
- Match-Stats und Game-Output sind getrennte Repository-Calls; ein spaeterer Orchestrator muss beide serverseitig zusammen ausfuehren.
- Firestore Rules bleiben konservativ; kritische Writes muessen weiter nur serverseitig erfolgen.

## Empfehlung

Naechster sicherer Schritt:

1. Einen Firestore-Simulation-Orchestrator bauen, der Game Output und Stats in klarer Reihenfolge ausfuehrt.
2. Danach Parity-Tests gegen Prisma fuer eine kleine deterministische Simulation ergaenzen.
3. Erst danach Player Career Stats und Development/History als eigene Slices bewerten.

## Statuspruefung

- Player Stats korrekt? Gruen.
- Team Stats korrekt? Gruen.
- Match Stats korrekt? Gruen.
- Keine doppelte Zaehlung? Gruen.
- Prisma bleibt Default/Fallback? Gruen.
- Tests gruen? Gruen.

Status: Gruen.
