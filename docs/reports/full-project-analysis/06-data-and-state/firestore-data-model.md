# Firestore Data Model

Stand: 2026-05-02

## Ziel der Analyse

Dokumentation des aktuellen Firestore-Datenmodells fuer Multiplayer/Firebase-Ligen inklusive Collections, Schreibpfade, Sicherheitsgrenzen und Skalierungsrisiken.

## Untersuchte Dateien/Bereiche

- `src/lib/online/types.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/lib/admin/online-week-simulation.ts`
- `firestore.rules`
- `src/lib/firebase/firestore.rules.test.ts`
- bestehende Draft-/Week-/Smoke-Reports

## Aktuelle Firestore Collections

```text
leagues/{leagueId}
  id
  name
  status: lobby | active | completed | archived
  currentWeek
  currentSeason
  weekStatus?: pre_week | ready | simulating | completed
  maxTeams
  memberCount
  schedule?: OnlineLeagueScheduleMatch[]
  matchResults?: OnlineMatchResult[]
  completedWeeks?: OnlineCompletedWeek[]
  standings?: OnlineLeagueTeamRecord[]
  lastSimulatedWeekKey?: string
  settings
  version

leagues/{leagueId}/memberships/{uid}
  userId
  username/displayName
  role: admin | gm
  status: active | inactive | removed
  teamId
  ready
  joinedAt
  lastSeenAt

leagueMembers/{leagueId_uid}
  global mirror
  leagueId
  userId
  role: GM | ADMIN | OWNER
  status: ACTIVE | INACTIVE | REMOVED
  teamId
  createdAt/updatedAt

leagues/{leagueId}/teams/{teamId}
  id
  displayName
  cityId/cityName/teamNameId/teamName
  assignedUserId
  status: available | assigned | vacant | ai
  contractRoster?
  depthChart?
  createdAt/updatedAt

leagues/{leagueId}/draft/main
  leagueId
  status: not_started | active | completed
  round
  pickNumber
  currentTeamId
  draftOrder
  startedAt/completedAt
  draftRunId

leagues/{leagueId}/draft/main/picks/{pickId}
  pickNumber
  round
  teamId
  playerId
  pickedByUserId
  timestamp
  draftRunId
  playerSnapshot

leagues/{leagueId}/draft/main/availablePlayers/{playerId}
  OnlineContractPlayer fields
  displayName
  draftRunId

leagues/{leagueId}/weeks/{sX-wY}
  season
  week
  status
  startedAt/completedAt
  simulatedByUserId

leagues/{leagueId}/events/{eventId}
  type
  createdAt
  createdByUserId
  payload

leagues/{leagueId}/adminActionLocks/{lockId}
  action
  status
  season/week
  adminUserId/adminSessionId
  errorCode/errorMessage?

leagues/{leagueId}/adminLogs/{logId}
  server-only audit trail
```

## Schreibende Akteure

| Akteur | Erlaubte Writes | Pfad |
|---|---|---|
| GM Client | Join atomic batch/transaction | league, membership, mirror, team, event |
| GM Client | Ready Toggle | eigene membership |
| GM Client | Depth Chart | eigenes team |
| GM Client | Draft Pick | draft/main, picks, availablePlayers, league touch, event |
| Admin API | Liga erstellen/loeschen/reset/debug | serverseitig |
| Admin API | Draft initialisieren/starten/auto-draft | serverseitig |
| Admin API | Week simulieren | serverseitig |
| Admin API | GM entfernen/vacant/warnen | serverseitig |

## Firestore Rules Bewertung

Gute Schutzpunkte:

- Anonyme Reads sind fuer Online-Ligen blockiert.
- Client kann keine Admin Logs schreiben.
- Client kann keine Liga erstellen oder loeschen.
- Ready Update ist auf eigene Membership und `ready/lastSeenAt` begrenzt.
- Team Claim muss atomar zur Membership passen.
- Draft Pick muss aktuelles Team, PickNumber, Spielerexistenz und AvailablePlayer-Delete erfuellen.
- Simulation/Week Writes sind clientseitig blockiert.

Risiken:

- Firestore Rules kennen nur Custom Claims fuer globale Admins. Die App/API hat zusaetzlich eine UID-Allowlist. Fuer Firestore-Client-Reads ist das nicht deckungsgleich.
- Rules erlauben bestimmte Client-Draft-Finalisierungswrites. Das ist fuer MVP okay, aber komplex.
- Join Counter Update basiert auf atomaren After-States, ist aber weiterhin ein sensibler Pfad.

## Datenmodell-Risiken

### Wachsendes League-Dokument

`schedule`, `matchResults`, `completedWeeks` und `standings` liegen als Arrays im League-Dokument. Fuer 8-16 Teams und MVP-Wochen funktioniert das, langfristig droht:

- Firestore Dokumentgroesse
- teure Snapshots
- hoher Write-Payload pro Week-Simulation
- Konflikte auf Hot Document

Empfehlung:

```text
leagues/{leagueId}/schedule/{gameId}
leagues/{leagueId}/results/{gameId}
leagues/{leagueId}/standings/{teamId}
leagues/{leagueId}/weeks/{sX-wY}
```

### Doppelter Membership State

Lokale Membership und globaler Mirror sind notwendig fuer Query/Discovery, aber muessen als Invariant behandelt werden:

```text
membership.userId == mirror.userId == team.assignedUserId
membership.teamId == mirror.teamId == team.id
membership.status active <-> mirror.status ACTIVE
membership.role gm/admin <-> mirror.role GM/ADMIN/OWNER
```

### DraftRunId als Filter statt Cleanup

Alte `picks` und `availablePlayers` koennen in Subcollections bleiben. `draftRunId` filtert sie logisch aus. Das ist sicher, aber Speicher-/Read-Kosten bleiben, wenn Queries nicht serverseitig filtern.

### Week Status doppelt

`leagues/{leagueId}.weekStatus` und `leagues/{leagueId}/weeks/{sX-wY}.status` koennen auseinanderlaufen. Der UI-Hauptpfad nutzt League-Mapping; Admin writes setzen beide.

## Empfohlene Zielstruktur

```text
leagues/{leagueId}
  only meta + current pointers

leagues/{leagueId}/memberships/{uid}
leagues/{leagueId}/teams/{teamId}
leagueMembers/{leagueId_uid}

leagues/{leagueId}/draft/main
leagues/{leagueId}/draft/main/picks/{pickId}
leagues/{leagueId}/draft/main/availablePlayers/{playerId}

leagues/{leagueId}/weeks/{weekKey}
  status
  readyClosedAt
  simulatedAt
  simulationLockId

leagues/{leagueId}/games/{gameId}
  season/week/home/away/status/result

leagues/{leagueId}/standings/{teamId}
  wins/losses/ties/points/streak

leagues/{leagueId}/simulationJobs/{jobId}
  step/status/error/retry
```

## Blockierende Multiplayer-Risiken

1. Keine eigene `games`-Subcollection fuer Week-Matches: Results sind schwer gezielt zu laden/locken.
2. Hauptdokument bleibt Hot Document fuer jede Simulation.
3. Membership-Mirror-Drift kann Join/Load blockieren.
4. Custom Claims vs UID-Allowlist sind nicht voll deckungsgleich zwischen API und Rules.

## Empfehlungen

1. Kurzfristig: Invarianten per Validation Script/Test pruefen.
2. Kurzfristig: Membership-Mirror-Reparatur als nicht-destruktive Admin-Action pflegen.
3. Mittelfristig: Results/Standings in Subcollections migrieren.
4. Mittelfristig: `draftRunId` Queries serverseitig filtern oder stale Docs archivieren.
5. Langfristig: Week-Simulation ueber `simulationJobs` orchestrieren.

## Offene Fragen

- Werden historische Results komplett im Dashboard benoetigt oder nur aktuelle/letzte Woche?
- Soll ein GM ohne Mirror, aber mit gueltiger local Membership, den Mirror selbst reparieren duerfen?
- Muss die Admin-UID-Allowlist in Rules gespiegelt werden oder wird Custom Claim wieder Pflicht?

## Naechste Arbeitspakete

- AP-FDM1: Firestore Invariant Validator fuer Staging/Emulator.
- AP-FDM2: `games`/`results` Subcollection-Migrationsdesign.
- AP-FDM3: Mirror Repair Flow als Admin-Command hardenen.
- AP-FDM4: Rules/API Admin-Modell harmonisieren.
