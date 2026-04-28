# Firebase Game Output Persistence Report

Datum: 2026-04-26

Scope: Kontrollierte Firestore-Persistenz fuer Game-Engine-Output im lokalen Emulator. Prisma bleibt Default/Fallback. Migriert wurden nur finaler Score, Match-Result-Summary und Drive-basierte Game Events. Stats, Reports, Auth und Prisma-Persistenz bleiben unveraendert.

## Status

Status: Gruen

Begruendung: Final Scores, Match Summary und Drive Events werden serverseitig gegen den Firestore Emulator geschrieben und wieder ueber das Match-Readmodel gelesen. Der bestehende Emulator-/`demo-*` Guard blockiert produktive Firebase-Zugriffe. Player-/Team-/Season-Stats und Reports werden nicht geschrieben.

## Geaenderte Dateien

Neu:

- `src/server/repositories/gameOutputRepository.firestore.ts`
- `src/server/repositories/firestoreGameOutput.test.ts`
- `docs/reports/systems/firebase-game-output-persistence-report.md`

Aktualisiert:

- `src/server/repositories/matchRepository.firestore.ts`
- `package.json`

## Gespeicherte Game-Engine-Daten

`gameOutputRepositoryFirestore.persistMatchOutput(...)` speichert:

- finalen `homeScore`
- finalen `awayScore`
- `status: COMPLETED`
- `simulationCompletedAt`
- `simulationSeed`
- `gameOutputPersistedAt`
- `resultSummary` mit Score-Label, Drive Count und Kurzsummary
- Drive-/Play-by-Play-nahe Events aus dem bereits existierenden `MatchDriveResult`

Drive Events werden idempotent ersetzt: bestehende `gameEvents` fuer `leagueId + matchId + eventType=MATCH_DRIVE` werden geloescht und anschliessend mit stabilen IDs neu geschrieben.

## Firestore-Struktur

Match-Dokument:

```text
matches/{matchId}
  status: COMPLETED
  homeScore: number
  awayScore: number
  simulationSeed: string
  simulationCompletedAt: timestamp
  gameOutputPersistedAt: timestamp
  resultSummary: {
    homeScore,
    awayScore,
    finalScoreLabel,
    driveCount,
    totalDrivesPlanned,
    summary
  }
```

Game Events:

```text
gameEvents/{matchId}_drive_{sequence}
  eventType: MATCH_DRIVE
  leagueId
  seasonId
  weekId
  weekNumber
  matchId
  sequence
  phaseLabel
  offenseTeamId / offenseTeamAbbreviation
  defenseTeamId / defenseTeamAbbreviation
  startedHomeScore / startedAwayScore
  endedHomeScore / endedAwayScore
  plays, passAttempts, rushAttempts, totalYards
  resultType, pointsScored, turnover, redZoneTrip
  summary
  primaryPlayerName / primaryDefenderName
  createdAt / updatedAt
```

`matchRepositoryFirestore` liest `gameEvents` mit `eventType=MATCH_DRIVE` und liefert sie als `simulationDrives` an den bestehenden Match-Detail-Mapper zurueck.

## Bewusst Nicht Gespeichert

- keine Player Match Stats
- keine Player Season Stats
- keine Player Career Stats
- keine Team Match Stats
- keine Team Season Stats
- keine Reports
- keine Player Development/History Events
- keine Injury/Fatigue/Morale Writes
- keine vollständige Game-Engine-Migration
- keine Auth-Umstellung
- keine Prisma-Entfernung

## Schutzlogik

- Prisma bleibt Default.
- Firestore Game-Output-Writes sind nur ueber Admin SDK und nur mit `assertFirestoreEmulatorOnly()` moeglich.
- `DATA_BACKEND=firestore` bleibt an Emulator-Host und `demo-*` Projekt-ID gebunden.
- Es wurden keine Client-Writes aktiviert.
- Production-Firebase-Zugriffe bleiben ausgeschlossen.

## Testergebnisse

Ausgefuehrt:

- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.
- `npm run test:firebase`: Gruen, 3 Testdateien / 12 Tests.
- `npm run test:firebase:game-output`: Gruen, 1 Testdatei / 4 Tests.
- `npm run test:firebase:season-week-match`: Gruen, 1 Testdatei / 8 Tests.
- `npm run test:firebase:week-state`: Gruen, 1 Testdatei / 7 Tests.
- `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/gameplay/application/game-stats-aggregation.test.ts`: Gruen, 2 Testdateien / 13 Tests.
- `npx vitest run src/modules/savegames/application/week-flow.service.test.ts`: Gruen, 1 Testdatei / 6 Tests.

Hinweis: Firestore-Emulator-Suites muessen weiterhin sequenziell laufen. Ein paralleler Lauf von `test:firebase:season-week-match` und `test:firebase:week-state` erzeugte eine erwartbare Reset/Seed-Kollision; beide Suites laufen isoliert gruen.

## Risiken

- `gameEvents` sind aktuell ein serverseitiges Readmodel fuer Drives, keine vollstaendige Play-by-Play-Domain mit einzelnen Snapshots pro Play.
- `resultSummary` ist bewusst kompakt und ersetzt keine Reports.
- Das Match-Detail-Summary bleibt ohne Team-Match-Stats konservativ, obwohl Score und Drives bereits sichtbar sind.
- Batch-Groessen muessen beobachtet werden, falls spaetere Engine-Ausgaben deutlich mehr Events pro Match schreiben.
- Stats-Parity ist noch nicht geloest und darf nicht implizit aus Drive Events abgeleitet werden.

## Empfehlung

Naechster sicherer Schritt:

1. Entscheiden, ob `gameEvents` Drive-Level bleibt oder spaeter echte Play-Level-Events bekommt.
2. Danach TeamMatchStats/PlayerMatchStats als eigenen, separaten Migrations-Slice mit Parity-Tests vorbereiten.
3. Vor jeder produktiven Aktivierung weiterhin Emulator-Guard, Rules und Kosten-/Batch-Limits pruefen.

## Statuspruefung

- Final Score wird gespeichert? Gruen.
- Match Summary wird gespeichert? Gruen.
- Game Events werden gespeichert oder bewusst zurueckgestellt? Gruen, Drive-basierte Game Events werden gespeichert; echte Play-Level-Events sind bewusst noch nicht migriert.
- Keine Stats/Reports migriert? Gruen.
- Prisma bleibt Default/Fallback? Gruen.
- Tests gruen? Gruen.

Status: Gruen.
