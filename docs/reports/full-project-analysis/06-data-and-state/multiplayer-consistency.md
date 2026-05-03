# Multiplayer Consistency

Stand: 2026-05-02

## Ziel der Analyse

Bewertung der Konsistenzregeln fuer Multiplayer-Ligen: Join/Rejoin, Membership, Team Assignment, Ready, Draft, Week Simulation, Results und Reload.

## Untersuchte Dateien/Bereiche

- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/types.ts`
- `src/lib/online/online-league-week-service.ts`
- `src/components/online/online-league-route-state.tsx`
- `src/components/online/online-league-route-state-model.ts`
- `src/lib/admin/online-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`
- `firestore.rules`

## Konsistenz-Invarianten

### User-Team-Link

```text
membership.userId == auth.uid
membership.teamId == team.id
team.assignedUserId == auth.uid
mirror.userId == auth.uid
mirror.teamId == membership.teamId
membership.status == active
mirror.status == ACTIVE
team.status == assigned
```

Wenn diese Kette bricht, blockiert `validateOnlineLeagueRouteState()` die League-Route.

### Join

```text
Preconditions:
  league.status == lobby
  memberCount < maxTeams
  selected identity not taken
  available/vacant team exists

Atomic writes:
  team assigned
  membership created/merged
  global mirror created/merged
  league memberCount/version touched
  event written

Postcondition:
  lastLeagueId stored only after joined/already-member
```

Bewertung: **gut abgesichert**, aber komplex.

### Rejoin / Load

```text
getLeagueById
  -> member-scoped snapshot
  -> membership + mirror + teams
  -> resolveFirestoreMembershipForUser()
  -> full snapshot mapping
  -> route validation
```

Bewertung: **robust gegen fehlende lokale Membership, wenn Mirror und Team stimmen.**

Rest-Risiko: Fallback-Membership wird nur im gemappten Snapshot verwendet, nicht automatisch persistiert.

### Ready

```text
Preconditions:
  current season/week expected
  weekStatus != simulating/completed
  draft completed
  membership active
  membership.teamId set

Writes:
  membership.ready
  membership.lastSeenAt
  event
```

Bewertung: **gut fuer Doppelklick/Week-Wechsel abgesichert.**

Rest-Risiko: `readyAt` existiert im UI-Typ, wird aber in Firebase-Membership nicht gesetzt. UI kann also Ready-Zeitpunkte nicht verlaesslich anzeigen.

### Draft

```text
Preconditions:
  draft/main.status == active
  membership active
  membership.teamId == teamId
  state.currentTeamId == teamId
  pickNumber/currentTeam/status im Transaktions-Doc unveraendert
  player in availablePlayerIds
  availablePlayers/{playerId} exists

Writes:
  picks/{pickNo}
  delete availablePlayers/{playerId}
  update draft/main
  event
  if completed: update all team rosters/depth charts + league active
```

Bewertung: **transaktionssicher, aber liest den gemappten Draft-State vor der Transaction.**

Rest-Risiko: `mappedLeagueBeforePick` kann veraltet sein; Transaktion prueft zwar Draft-Doc, aber PlayerPool kommt aus dem vorherigen Snapshot.

### Week Simulation

```text
Admin API only:
  expected season/week required
  lock read
  league active
  draft completed
  no existing result for week
  all active participants ready
  schedule exists
  teams resolvable

Writes in transaction:
  memberships.ready=false
  league currentWeek/currentSeason
  league matchResults/completedWeeks/standings
  league lastSimulatedWeekKey
  lock simulated
  weeks completed + next pre_week
  adminLog
  event
```

Bewertung: **guter MVP-Schutz gegen doppelte Simulation.**

Rest-Risiko: grosse Array-Writes auf League-Dokument und kein per-game Status.

## Lokale UI-States vs Persistenz

| UI State | Persistierter State | Bewertung |
|---|---|---|
| `loaded/loadError/retryLoad` | keiner | korrekt lokal |
| `pendingAction` | keiner | korrekt lokal |
| `trainingFeedback/contractFeedback/...` | teilweise Events/League | UI-only, kann bei Reload verschwinden |
| `lastLeagueId` | localStorage | nur Pointer, korrekt |
| `currentUserReady` | membership.ready | korrekt abgeleitet |
| `readyProgressLabel` | memberships ready + active participants | korrekt abgeleitet |
| `nextMatchLabel` | schedule + currentWeek + team link | korrekt, aber Schedule-Feld muss stimmen |
| `standings` | standings oder matchResults | doppelte Quelle, fallback vorhanden |

## Inkonsistente Zustände

| Zustand | Blockiert User? | Aktuelle Behandlung |
|---|---|---|
| User ist im Mirror, aber Membership fehlt | Nein, wenn Team passt | Fallback-Membership im Snapshot |
| User ist in Membership, aber Team assignedUserId anders | Ja | Permission/Recovery Fehler |
| Team assignedUserId existiert, Mirror fehlt | Weiterspielen/Liga-Liste kann leiden | Repair Script/Admin noetig |
| League active, Draft status active | Ready blockiert | korrekt |
| Draft completed, League status lobby | Ready/Simulation blockiert | Finalize noetig |
| Ready true, Admin simuliert | Ready wird zurueckgesetzt | korrekt |
| Results vorhanden, currentWeek nicht weiter | Doppel-Simulation blockiert, UI verwirrend | sollte validiert werden |
| weekStatus completed, currentWeek next week | Ready blockiert | moeglicher Stuck-State |

## Blockierende Multiplayer-Risiken

1. **Membership Mirror Drift** bleibt der groesste Konsistenzfehler.
2. **League-Hauptdokument als Aggregat** kann bei wachsender Saison zum Engpass werden.
3. **Mehrere Statusfelder ohne formale State Machine** koennen Menues blockieren.
4. **Admin Repair/Auto-Draft Scripts** koennen User-Team-Verbindungen versehentlich verschieben, wenn Invarianten nicht vor/nachher geprueft werden.
5. **Local Mode vs Firebase Mode** nutzt dieselbe UI, aber nicht dieselben Writes/Rules.

## Empfehlungen

1. Zentrale `validateOnlineLeagueConsistency(leagueSnapshot)` Funktion.
2. Nicht-destruktiver `repairMembershipMirror` nur bei eindeutigem Team/User Match.
3. Persistierte `stateVersion` oder `phase` fuer League Lifecycle.
4. Admin Simulation nur ueber Step-Machine `pre_week -> ready -> simulating -> simulated -> pre_week`.
5. UI sollte blockierende State-Konflikte explizit als "Liga muss repariert werden" anzeigen.

## Offene Fragen

- Soll ein Admin Dashboard inkonsistente Memberships proaktiv anzeigen?
- Soll Ready automatisch false werden, wenn Team/Membership geaendert wird?
- Soll `weekStatus=ready` persistiert werden, sobald alle GMs ready sind, oder nur abgeleitet bleiben?

## Naechste Arbeitspakete

- AP-MC1: Consistency Invariant Tests fuer Membership/Mirror/Team.
- AP-MC2: Admin Debug Panel nutzt dieselbe Consistency-Funktion.
- AP-MC3: Staging Validator fuer blockierende States.
- AP-MC4: Ready-State Zeitstempel klaeren.
