# Draft State Analysis

Stand: 2026-05-02

## Ziel der Analyse

Bewertung des Fantasy-Draft-State-Modells, der Firestore-Pfade, der Konsistenzregeln und der Race-Condition-Risiken.

## Untersuchte Dateien/Bereiche

- `src/lib/online/online-league-draft-service.ts`
- `src/lib/online/multiplayer-draft-logic.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/lib/online/types.ts`
- `firestore.rules`
- `docs/reports/multiplayer-firestore-draft-model-refactor-report.md`

## Aktuelles Draft-Modell

```text
leagues/{leagueId}/draft/main
  status: not_started | active | completed
  round
  pickNumber
  currentTeamId
  draftOrder[]
  startedAt
  completedAt
  draftRunId

leagues/{leagueId}/draft/main/picks/{0001}
  pickNumber
  round
  teamId
  playerId
  pickedByUserId
  timestamp
  draftRunId
  playerSnapshot

leagues/{leagueId}/draft/main/availablePlayers/{playerId}
  player data
  draftRunId
```

Legacy-Fallback:

```text
leagues/{leagueId}.settings.fantasyDraft
leagues/{leagueId}.settings.fantasyDraftPlayerPool
```

Der Mapper bevorzugt Subcollections und faellt nur bei fehlendem Subcollection-State auf Legacy-Felder zurueck.

## Draft-State Machine aktuell

```text
missing
  -> initializeFantasyDraft
not_started
  -> startFantasyDraft
active
  -> makeFantasyDraftPick*
completed
  -> league.status active
  -> rosters/depth charts gesetzt
  -> Ready/Week Flow freigegeben
```

## Draft-Pick-Konsistenz

Client Pick prueft:

- Liga-ID, Team-ID, Player-ID sind safe.
- Authenticated user existiert.
- Draft ist active.
- Membership ist active.
- membership.teamId entspricht Pick-Team.
- `state.currentTeamId` entspricht Team.
- `draft/main` hat noch gleiche `pickNumber/currentTeamId/status`.
- Spieler ist in `availablePlayerIds`.
- Pick-Liste enthaelt Spieler noch nicht.
- `availablePlayers/{playerId}` existiert.

Transaktion schreibt:

- `picks/{pickNumber}`
- delete `availablePlayers/{playerId}`
- update `draft/main`
- event
- bei completion: alle Team-Rosters/DepthCharts und League active

## Gute Schutzmechanismen

- Firestore Transaction fuer Pick.
- Firestore Rules erzwingen aktuellen Pick und AvailablePlayer-Existenz.
- `draftRunId` filtert stale Subcollection-Dokumente.
- Snake-Draft-Logik ist pure und getestet.
- Roster Completion beruecksichtigt Positionsanforderungen.

## Risikoanalyse

### Veralteter Snapshot vor Transaktion

`makeFantasyDraftPick()` laedt `mappedLeagueBeforePick` vor der Firestore-Transaction. Innerhalb der Transaction werden Draft-Doc und AvailablePlayer geprueft, aber `state`/`playerPool` koennen aus dem vorgelagerten Snapshot stammen.

Aktuelle Absicherung:

- Draft-Doc muss PickNumber/currentTeam/status matchen.
- AvailablePlayer-Dokument muss existieren.
- Player muss im vorgelagerten PlayerPool sein.

Rest-Risiko:

- Bei sehr schnellen parallelen Updates kann PlayerSnapshot/PlayerPool theoretisch stale sein, solange AvailablePlayer noch existiert. Praktisch fuer MVP gering.

### Roster-Finalisierung im Client-Write-Pfad

Wenn ein Client-Pick den Draft completed, schreibt die Client-Transaction alle Team-Rosters/DepthCharts und League active. Rules erlauben diese Finalisierung eingeschraenkt.

Risiko:

- Viel Schreiblogik liegt im Client-Repository.
- Bei 16 Teams und grossen Rostern kann die Transaction schwer werden.

Empfehlung:

- Langfristig Draft Completion serverseitig finalisieren oder als Cloud/Admin Command ausfuehren.

### Stale DraftRunId-Dokumente

Alte Picks/AvailablePlayers bleiben erhalten und werden per `draftRunId` ignoriert.

Risiko:

- Storage-Kosten.
- Queries lesen ohne serverseitige `where("draftRunId")` aktuell potentiell mehr Daten.

### Doppelte Draft-Wahrheit

Subcollection-State und Legacy `settings.fantasyDraft` koennen parallel existieren.

Aktuelle Regel:

- Subcollection gewinnt.

Empfehlung:

- Legacy-Felder nach stabiler Migration nur noch in read-only Repair/Archive behandeln.

## Blockierende Zustände

| Zustand | Effekt | Fix/Richtung |
|---|---|---|
| `draft/main.status=active`, League active | Ready blockiert | korrekt, aber UI muss Draft zeigen |
| `draft/main.status=completed`, League lobby | Ready/Week blockiert | Finalize Script/Admin Action |
| Picks existieren, availablePlayers stale | Draft UI falsch/verwirrend | `draftRunId` Filter hilft |
| currentTeamId verweist auf nicht existierendes Team | Draft stoppt | State Validator |
| Membership teamId nicht im draftOrder | GM kann nicht picken | Join/Draft Prep Validator |
| Client completed Draft, aber Team roster write fail | Transaction sollte alles rollbacken | Firestore Transaction schuetzt |

## Empfohlene Draft State Machine

```text
draft.uninitialized
  allowed: initialize

draft.ready
  allowed: start
  invariant: draftOrder valid, playerPool complete

draft.active
  allowed: pick, pause, adminAutoPick
  invariant:
    currentTeamId in draftOrder
    pickNumber == picks.length + 1
    picked players not in availablePlayers

draft.finalizing
  server-only
  invariant: no further picks

draft.completed
  invariant:
    all rosters valid
    league.foundationStatus roster_ready if present
    league.status active
```

## Empfehlungen

1. Draft Completion mittelfristig serverseitig finalisieren.
2. `validateDraftState()` als pure Funktion fuer Admin UI, Smoke und Tests.
3. Server-/Admin-Command zum Entfernen/Archivieren alter DraftRunIds.
4. Query auf `draftRunId` serverseitig einschraenken, wenn Firestore Index passt.
5. Legacy Draft-Fallback mit Ablaufdatum dokumentieren.

## Offene Fragen

- Soll interaktiver Draft dauerhaft Client-Transaction bleiben?
- Wie viele Spieler sollen maximal im live abonnierten AvailablePool sein?
- Braucht Draft einen Pause/Resume/Failed Status?

## Naechste Arbeitspakete

- AP-DR1: `validateOnlineDraftState()` implementieren.
- AP-DR2: Draft Completion Finalizer als Admin/Server Command.
- AP-DR3: Stale DraftRunId Cleanup Dry-Run Script.
- AP-DR4: Draft Subscription nur auf Draft-Route laden.
