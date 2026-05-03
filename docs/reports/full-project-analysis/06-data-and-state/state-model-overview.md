# State Model Overview

Stand: 2026-05-02

## Ziel der Analyse

Gesamtueberblick ueber persistierte Multiplayer-States, lokale UI-States, abgeleitete View-States und die Konsistenzgrenzen zwischen Firebase, Repository, Route-State und UI.

## Untersuchte Dateien/Bereiche

- `src/lib/online/types.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/online-league-types.ts`
- `src/lib/online/online-league-week-service.ts`
- `src/lib/online/online-league-week-simulation.ts`
- `src/lib/admin/online-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/components/online/online-league-route-state.tsx`
- `src/components/online/online-league-detail-model.ts`
- `src/lib/online/online-league-storage.ts`
- `firestore.rules`

Keine produktiven Daten wurden gelesen oder geschrieben.

## Aktuelles State-Modell

```text
Firebase Auth User
  uid
  email/displayName
  admin claim oder UID-Allowlist fuer Admin UI/API

Firestore Persisted State
  leagues/{leagueId}
    status
    currentSeason/currentWeek
    weekStatus
    schedule
    matchResults
    completedWeeks
    standings
    lastSimulatedWeekKey
    settings
    version

  leagues/{leagueId}/memberships/{uid}
    userId
    role
    teamId
    ready
    status
    joinedAt/lastSeenAt

  leagueMembers/{leagueId_uid}
    global mirror fuer Rejoin/List/Permission Recovery
    leagueId/userId/teamId/role/status

  leagues/{leagueId}/teams/{teamId}
    assignedUserId
    status
    displayName
    contractRoster
    depthChart

  leagues/{leagueId}/draft/main
    status
    round/pickNumber/currentTeamId
    draftOrder
    draftRunId

  leagues/{leagueId}/draft/main/picks/{pickId}
  leagues/{leagueId}/draft/main/availablePlayers/{playerId}

  leagues/{leagueId}/weeks/{seasonWeekId}
  leagues/{leagueId}/events/{eventId}
  leagues/{leagueId}/adminActionLocks/{lockId}
  leagues/{leagueId}/adminLogs/{logId}

Repository Mapping
  FirestoreOnlineLeagueSnapshot
    -> mapFirestoreSnapshotToOnlineLeague()
    -> OnlineLeague

UI Route State
  useOnlineLeagueRouteState()
    league
    currentUser
    loaded/loadError
    retryLoad()

Local Browser State
  afbm.online.lastLeagueId
  afbm.online.leagues fuer Local Mode
```

## Persistierte vs. abgeleitete States

| State | Persistenz | Abgeleitet von | Risiko |
|---|---|---|---|
| Liga-Status | `leagues/{leagueId}.status` | direkt | niedrig |
| Week-Step | `currentSeason`, `currentWeek` | direkt | mittel bei Simulation/Reload |
| Week-Status | `weekStatus`, `weeks/{s-w}` | doppelt persistiert | mittel |
| Ready-State | Memberships `ready` | `getOnlineLeagueWeekReadyState()` | mittel |
| User-Team-Link | membership + mirror + team | mehrere Pfade | hoch |
| Draft-State | `draft/main`, picks, availablePlayers | Mapper baut `OnlineFantasyDraftState` | mittel/hoch |
| Results | `matchResults` Array | UI recent results | mittel |
| Standings | `standings` Array oder aus Results | `buildOnlineLeagueTeamRecords()` | mittel |
| Route Access | Firestore read + local `lastLeagueId` | Route-State validation | mittel |
| Admin Simulation Lock | `adminActionLocks/{id}` | status mapping | mittel |

## Single Source of Truth je Bereich

| Bereich | Empfohlene Source of Truth | Aktueller Stand |
|---|---|---|
| Auth Identity | Firebase Auth UID | ja |
| Admin-Zugriff | Server-Guard: claim oder UID-Allowlist | ja, Firestore Rules nutzen weiter claims |
| User-Team-Link | Membership + Team muessen konsistent sein | mehrere Pfade, Mirror als Fallback |
| League Progress | `leagues/{leagueId}.currentSeason/currentWeek/weekStatus` | ja, plus `weeks`-Subcollection |
| Draft Progress | `leagues/{leagueId}/draft/main` | ja, Legacy-Fallback in Settings |
| Draft Player Availability | `availablePlayers` Subcollection | ja |
| Results | aktuell `leagues/{leagueId}.matchResults` | funktioniert, langfristig Dokumentgroessenrisiko |
| Standings | aktuell `leagues/{leagueId}.standings`, fallback aus Results | funktioniert, doppelter Zustand |
| Local Continue | `afbm.online.lastLeagueId` nur Pointer | ja, Recovery loescht bei Fehler |

## Inkonsistente Zustände

| Zustand | Auswirkung | Aktuelle Gegenmassnahme | Rest-Risiko |
|---|---|---|---|
| Membership fehlt, Mirror existiert | User kann ausgesperrt werden | `resolveFirestoreMembershipForUser()` baut Fallback | Fallback wird nicht automatisch zurueckgeschrieben |
| Team assignedUserId passt nicht zu membership.userId | Route blockiert | `getMembershipLoadProblem()` | hoch, wenn Auto-Draft/Repair falsch schreibt |
| Mirror zeigt anderes Team als Membership | Rejoin/List kann falsche Liga zeigen | Member-scoped Load bevorzugt gueltige Membership | mittel |
| `lastLeagueId` zeigt auf nicht erreichbare Liga | harter Permission-Fehler moeglich | Route-State loescht Pointer bei not-found/permission | mittel |
| Draft completed, League nicht active | Menues bleiben gesperrt | Finalize/Simulation Guards pruefen Draft | mittel |
| Results vorhanden, standings leer | UI kann fallback berechnen | Mapping liest `standings`, fallback aus Results | niedrig/mittel |
| `lastSimulatedWeekKey` gesetzt, currentWeek nicht weiter | Simulation blockiert | expected step + results check | mittel |
| Lock status `failed` nach Fehler | Retry moeglich | `assertCanStart` blockiert nur simulating/simulated | niedrig/mittel |

## Blockierende Multiplayer-Risiken

1. **User-Team-Link Drift**: Wenn Membership, Mirror und Team-Assignment auseinanderlaufen, blockiert Route-State den User korrekt, aber aus Sicht des Spielers wirkt es wie "nicht verbunden".
2. **Breite Live-Snapshot-Abhaengigkeit**: `subscribeToLeague()` laedt League, Memberships, Teams, Events, Draft, Picks und Available Players. Ein Teilfehler kann die ganze Route belasten.
3. **League-Dokument als wachsender Aggregat-Container**: `matchResults`, `completedWeeks` und `standings` wachsen auf dem Hauptdokument.
4. **Doppelter Week-State**: `weekStatus/currentWeek` auf League plus `weeks/{s-w}` koennen auseinanderlaufen.
5. **Draft Legacy-Fallback**: Neue Draft-Subcollections sind korrekt, aber Legacy `settings.fantasyDraft` bleibt als Fallback und kann falsche Annahmen verdecken.

## Empfehlungen

1. User-Team-Link als expliziten Consistency-Check/Repair-Service kapseln.
2. `OnlineLeagueStateMachine` als pure Validierungsschicht vor UI und Admin Actions einfuehren.
3. Results und Standings mittelfristig in Subcollections/Readmodels verschieben.
4. `subscribeToLeague` in State-Profile aufteilen: dashboard, draft, roster, admin.
5. Doppelte States nur mit klaren Invarianten erlauben.

## Offene Fragen

- Soll eine fehlende lokale Membership aus einem gueltigen Mirror automatisch repariert werden oder nur Admin-Repair?
- Wie lange muessen Legacy Draft-Felder in `settings` lesbar bleiben?
- Soll `weekStatus` auf League oder `weeks/{s-w}` langfristig fuehrend sein?

## Naechste Arbeitspakete

- AP-DS1: Multiplayer-State-Invarianten als Testmatrix definieren.
- AP-DS2: Membership/Mirror/Team Consistency Service extrahieren.
- AP-DS3: Week-State-Machine als pure Helper implementieren.
- AP-DS4: Results/Standings Dokumentmodell fuer naechste Datenmigration entwerfen.
