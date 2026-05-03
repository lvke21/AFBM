# State Machine Recommendation

Stand: 2026-05-02

## Ziel der Analyse

Empfohlene formale State Machine fuer Multiplayer-Ligen, Draft, Ready/Week, Simulation und User-Team-Linking, damit UI, Admin API und Firestore Writes dieselben erlaubten Zustaende verwenden.

## Untersuchte Dateien/Bereiche

- `src/lib/online/online-league-week-service.ts`
- `src/lib/online/online-league-week-simulation.ts`
- `src/lib/admin/online-week-simulation.ts`
- `src/lib/online/online-league-draft-service.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/components/online/online-league-detail-model.ts`
- `firestore.rules`

## Problem

Aktuell existieren mehrere getrennte Statusfelder:

- `league.status`
- `league.weekStatus`
- `draft/main.status`
- Membership `ready`
- Team `status`
- Mirror `status`
- Lock `status`
- `lastSimulatedWeekKey`
- `completedWeeks`
- `matchResults`

Diese Felder sind einzeln sinnvoll, bilden aber keine zentral definierte State Machine. Dadurch entstehen UI-Sperren und Admin-Blockaden, wenn Kombinationen formal nicht verboten, aber fachlich widerspruechlich sind.

## Empfohlene Gesamt-State-Machine

```text
league.created
  -> league.lobby

league.lobby
  allowed:
    join
    rejoin
    initializeDraft
    startDraft
  blocked:
    ready
    simulateWeek

league.draft_active
  derived:
    league.status lobby/active + draft.status active
  allowed:
    draftPick
  blocked:
    ready
    simulateWeek

league.roster_ready
  derived:
    draft.status completed
    teams have rosters
    league.status active
  allowed:
    setReady
    updateDepthChart

league.week_pre
  persisted:
    league.status active
    weekStatus pre_week
  derived:
    not all active GMs ready
  allowed:
    setReady

league.week_ready
  derived or persisted:
    all active GMs ready
  allowed:
    unsetReady
    admin.simulateWeek

league.week_simulating
  persisted server-only:
    simulationJob.status simulating
  blocked:
    ready changes
    second simulation

league.week_simulated
  persisted old week:
    completedWeek
    results
    standings
  transition:
    advance to next week_pre

league.completed
  future:
    season/league done

league.archived
  read-only
```

## Draft State Machine

```text
draft.none
  -> draft.ready

draft.ready
  invariant:
    draftOrder valid
    availablePlayers count sufficient
  -> draft.active

draft.active
  invariant:
    currentTeamId in draftOrder
    pickNumber == picks.length + 1
    picked players absent from availablePlayers
  -> draft.finalizing

draft.finalizing
  server-only preferred
  writes:
    rosters
    depth charts
    league active/roster_ready
  -> draft.completed

draft.completed
  invariant:
    currentTeamId == ""
    completedAt set
```

## User-Team Link State Machine

```text
unlinked
  -> joining

joining
  writes atomically:
    team assigned
    membership active
    mirror ACTIVE
  -> linked

linked
  invariant:
    membership/team/mirror agree
  allowed:
    ready
    depthChart
    draftPick if current team

repairable
  example:
    mirror + team agree, membership missing
  allowed:
    safe repair

broken
  example:
    membership team != assigned team
  blocked:
    league load
  allowed:
    admin repair only

removed/vacant
  blocked:
    normal GM actions
```

## Week Simulation State Machine

```text
pre_week
  entry:
    ready=false for active memberships
    currentWeek points to unsimulated schedule

ready
  derived:
    all active memberships ready

simulating
  persisted:
    simulationJobs/{weekKey}.status=simulating
    or adminActionLocks.status=simulating

failed
  persisted:
    no currentWeek advance
    retry allowed

simulated
  persisted:
    results exist
    standings updated
    completedWeek exists
    lock simulated

advanced
  currentWeek=next
  weekStatus=pre_week
```

## Empfohlene Invarianten

### League

- `currentWeek >= 1`
- `currentSeason >= 1`
- `status=active` nur, wenn Draft fehlt oder completed ist.
- `lastSimulatedWeekKey` darf nicht aktuelle Woche sein.
- Wenn Results fuer aktuelle Woche existieren, darf `currentWeek` nicht mehr diese Woche sein.

### Draft

- `pickNumber == picks.length + 1` fuer active Drafts.
- `currentTeamId` muss in `draftOrder` sein.
- Kein `playerId` in Picks doppelt.
- Kein Pick-Player in AvailablePlayers.
- Bei completed: alle Teams im `draftOrder` haben gueltiges Roster.

### Ready

- Nur aktive GM-Memberships zaehlen.
- Teams mit `vacant`, fired, admin_removed zaehlen nicht.
- Ready muss bei Week Advance false werden.

### User-Team

- Aktive GM-Membership ohne Team ist ungueltig.
- Assigned Team ohne Membership ist inkonsistent.
- Mirror darf nie eine andere TeamId als Membership haben.

### Results/Standings

- Jeder Result `homeTeamId/awayTeamId` muss existieren.
- Keine doppelten Result-MatchIds.
- Standings muessen aus Results reproduzierbar sein.

## Minimaler MVP-State

Fuer spielbaren Multiplayer-MVP reichen:

```text
league.status = active
draft.status = completed
currentWeek = N
weekStatus = pre_week
memberships active + ready flags
teams assigned + rosters/depth charts
schedule for currentWeek
matchResults history
standings current
lastSimulatedWeekKey != current week
```

## Empfehlungen zur Umsetzung

1. Pure State-Machine-Module ohne Firestore:
   - `online-league-state-machine.ts`
   - `online-draft-state-machine.ts`
   - `online-week-state-machine.ts`
   - `online-membership-consistency.ts`
2. UI nutzt diese Module fuer Labels/Disabled Reasons.
3. Admin API nutzt dieselben Module fuer Guards.
4. Seed/Finalize/Smoke nutzt dieselben Module fuer Validation.
5. Firestore Rules bleiben grob, aber App/API hat feinere Invarianten.

## Risiken

- Zu viele Statuswerte auf einmal einzufuehren kann Migration erzwingen.
- Persistiertes `ready` vs. abgeleitetes `week_ready` muss sauber getrennt bleiben.
- Neue State Machine darf bestehende Staging-Ligen nicht blockieren, wenn alte optionale Felder fehlen.

## Empfohlene Reihenfolge

1. State Machine als pure read-only Validator einfuehren.
2. UI Disabled Reasons darauf umstellen.
3. Admin API Preconditions darauf umstellen.
4. Staging Validator/Smoke darauf umstellen.
5. Erst danach neue persistierte Felder wie `simulationJobs` einfuehren.

## Offene Fragen

- Soll `foundationStatus` wieder als offizieller League-State fuer roster_ready verwendet werden?
- Soll `weekStatus=ready` persistiert oder immer abgeleitet werden?
- Soll `simulationJobs` `adminActionLocks` ersetzen oder ergaenzen?

## Naechste Arbeitspakete

- AP-SM1: Pure Validator `deriveOnlineLeagueLifecycleState()`.
- AP-SM2: Konsistenztests fuer alle oben genannten Invarianten.
- AP-SM3: UI/Route-State liest Lifecycle-State fuer Fehlermeldungen.
- AP-SM4: Admin `simulateWeek` nutzt Lifecycle-State als Guard.
