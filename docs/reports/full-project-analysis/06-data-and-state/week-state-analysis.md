# Week State Analysis

Stand: 2026-05-02

## Ziel der Analyse

Analyse von Ready-State, Week-State, Simulation-Status, Ergebnis-Speicherung, Standings und Week-Progression fuer Multiplayer/Firebase-Ligen.

## Untersuchte Dateien/Bereiche

- `src/lib/online/online-league-week-service.ts`
- `src/lib/online/online-league-week-simulation.ts`
- `src/lib/admin/online-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/components/online/online-league-detail-model.ts`
- `firestore.rules`
- `docs/reports/multiplayer-week-simulation-audit.md`
- `docs/reports/staging-smoke-report-eb812d3.md`

## Aktuelles Week-Modell

```text
leagues/{leagueId}
  status: lobby | active | completed | archived
  currentSeason
  currentWeek
  weekStatus?: pre_week | ready | simulating | completed
  schedule[]
  matchResults[]
  completedWeeks[]
  standings[]
  lastSimulatedWeekKey

leagues/{leagueId}/memberships/{uid}
  ready: boolean

leagues/{leagueId}/weeks/{sX-wY}
  status
  startedAt/completedAt
  simulatedByUserId

leagues/{leagueId}/adminActionLocks/{leagueId-sX-wY}
  status: idle | simulating | simulated | failed
```

## Aktueller Flow

```text
pre_week
  -> GMs setzen membership.ready=true
  -> readyState.allReady wird abgeleitet
  -> Admin ruft simulateWeek mit expected season/week
  -> Transaction prueft Lock + State
  -> Games werden simuliert
  -> Results/Standings/CompletedWeek geschrieben
  -> currentWeek/currentSeason weitergeschaltet
  -> memberships.ready=false
  -> next week document pre_week
```

Wichtig: `weekStatus="ready"` wird nicht zwingend persistiert, sondern Ready wird primaer abgeleitet.

## Preconditions fuer Simulation

`prepareOnlineLeagueWeekSimulation()` prueft:

- League existiert.
- `league.status === "active"`.
- `league.weekStatus !== "simulating"`.
- Draft ist nicht offen.
- Expected Season/Week passt.
- `lastSimulatedWeekKey` ist nicht aktuelle Woche.
- Kein `matchResult` existiert fuer aktuelle Woche.
- Alle aktiven Week-Participants sind ready.
- Schedule fuer aktuelle Woche existiert.
- Home/Away Teams sind aufloesbar.
- Simulation liefert fuer alle Matches Ergebnis.

## Ergebnis-Speicherung

Aktuelle Writes:

- `leagues/{leagueId}.matchResults = [newResults, ...existing]`
- `leagues/{leagueId}.completedWeeks = [completedWeek, ...existingWithoutSameKey]`
- `leagues/{leagueId}.standings = standingsSummary`
- `leagues/{leagueId}.currentWeek/currentSeason = next`
- `leagues/{leagueId}.lastSimulatedWeekKey = current weekKey`
- `leagues/{leagueId}.weekStatus = "pre_week"`
- `weeks/{oldWeek}.status = "completed"`
- `weeks/{nextWeek}.status = "pre_week"`
- `memberships.ready = false`
- `adminActionLocks/{week}.status = "simulated"`
- event + adminLog

## Gute Schutzmechanismen

- Expected Step verhindert Simulation gegen stale UI.
- Firestore Transaction buendelt State-Aenderungen.
- Lock-Dokument verhindert doppelte parallele Ausfuehrung.
- Existing Results und `lastSimulatedWeekKey` blockieren Re-Simulation.
- Ready wird nach erfolgreicher Simulation zurueckgesetzt.
- Fehler vor Writes erzeugen keine Week-Advance.
- Nicht-doppelte Simulation wird in Tests/Smoke geprueft.

## Problematische States

| State | Risiko | Bewertung |
|---|---|---|
| `weekStatus=completed` auf League | Ready blockiert, obwohl next Week evtl. vorbereitet | mittel |
| `weeks/{current}.completed`, League currentWeek nicht weiter | UI/Simulation widerspricht sich | hoch |
| Results fuer Week vorhanden, lastSimulatedWeekKey fehlt | Re-Simulation wird trotzdem durch results check blockiert | niedrig/mittel |
| lastSimulatedWeekKey gesetzt, Results fehlen | Simulation blockiert, Ergebnisse nicht sichtbar | hoch |
| standings leer, results vorhanden | UI fallback moeglich | niedrig |
| schedule fehlt fuer currentWeek | Simulation blockiert | korrekt, aber Admin braucht klaren Fix |
| membership.ready bleibt true nach failed simulation | Retry moeglich | sinnvoll |
| lock failed | Retry erlaubt | korrekt |

## Doppelte Source of Truth

1. **Week-Status**
   - League `weekStatus`
   - Week Document `weeks/{s-w}.status`
   - Ready-State aus Memberships
   - Lock Status

2. **Results**
   - `matchResults` Array
   - `completedWeeks.resultMatchIds`
   - `weeks/{s-w}.status`

3. **Standings**
   - persistiertes `standings`
   - ableitbar aus `matchResults`

Diese Doppelungen sind fuer MVP okay, muessen aber formale Invarianten bekommen.

## Empfohlene Week State Machine

```text
pre_week
  entry:
    currentWeek gesetzt
    memberships.ready=false
    games status scheduled
  allowed:
    setReady
    unsetReady

ready
  derived or persisted:
    all active GMs ready
  allowed:
    simulateWeek
    unsetReady

simulating
  server-only:
    lock status simulating
  allowed:
    completeSimulation
    failSimulation

simulated
  server-only terminal for old week:
    results written
    standings updated
    completedWeek written
  transition:
    advance to next pre_week

failed
  server-only:
    lock failed
    no currentWeek advance
  allowed:
    retry
```

Empfehlung: `ready` kann weiter abgeleitet bleiben; `simulating`, `simulated`, `failed` sollten persistiert sein.

## Blockierende Multiplayer-Risiken

1. Hauptdokument-Arrays fuer Results/Standings skalieren schlecht.
2. Week-Dokumente sind aktuell eher Audit/Marker, nicht echte Source of Truth.
3. Kein per-game Status: einzelne Games koennen nicht separat validiert/repariert werden.
4. `weekStatus` wird nicht voll als State Machine genutzt.
5. Schedule fuer 8-Team-Staging musste manuell bereitgestellt werden, waehrend Generator auf 16 Teams fokussiert ist.

## Empfehlungen

1. `weekStatus`-Werte und erlaubte Transitionen zentralisieren.
2. `weeks/{weekKey}` als primaeren Week-Status fuehren oder explizit nur Audit nennen.
3. Results in `games/results` Subcollection verschieben, wenn Saisonlaenge steigt.
4. Admin UI soll `schedule_missing`, `teams_not_ready`, `week_already_simulated` direkt als State anzeigen.
5. Validator fuer "currentWeek passt zu completedWeeks/results" einfuehren.

## Offene Fragen

- Soll `weekStatus=ready` persistiert werden, sobald alle GMs ready sind?
- Soll Admin "Woche abschliessen" und "Woche simulieren" semantisch getrennt bleiben?
- Wie wird Week 18 -> Season 2 im Online-Modus produktseitig definiert?

## Naechste Arbeitspakete

- AP-WS1: Pure Week State Machine Helper.
- AP-WS2: Week Invariant Tests.
- AP-WS3: Per-game Firestore-Modell entwerfen.
- AP-WS4: Schedule Missing Repair/Admin Action.
