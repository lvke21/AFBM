# Race Condition Risks

Stand: 2026-05-02

## Ziel der Analyse

Identifikation von Race Conditions, parallelen Requests, Doppelklicks, stale Snapshots und lokalen/persistierten State-Konflikten im Multiplayer-System.

## Untersuchte Dateien/Bereiche

- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/sync-guards.ts`
- `src/components/online/online-league-route-state.tsx`
- `src/lib/admin/online-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`
- `firestore.rules`
- `src/components/online/online-fantasy-draft-room-model.ts`

## Aktuelle Schutzmechanismen

| Bereich | Schutz |
|---|---|
| Route-State | `active` Flag + `unsubscribe()` Cleanup |
| Subscription Emission | `createOrderedAsyncEmitter()` verwirft alte async Ergebnisse |
| Join | Firestore Transaction + Rules After-State |
| Ready | Firestore Transaction + expected season/week |
| Depth Chart | Firestore Transaction + own-team check + payload equality |
| Draft Pick | Firestore Transaction + AvailablePlayer delete + Rules |
| Week Simulation | Admin API + expected step + lock + Transaction |
| Doppelte Simulation | lock status + lastSimulatedWeekKey + existing results |

## Hauptrisiken

### 1. Join zweier User auf dasselbe freie Team

Aktueller Ablauf:

- Vor der Transaction wird `publicTeamsSnapshot` gelesen.
- Innerhalb der Transaction werden Team-Dokumente erneut gelesen.
- `chooseFirstAvailableFirestoreTeam()` entscheidet.
- Team/Membership/Mirror werden geschrieben.

Bewertung: **weitgehend abgesichert**, weil Transaction Team-Dokumente liest und schreibt. Bei Konflikt sollte Firestore retryen und der zweite User danach einen anderen Team-State sehen.

Rest-Risiko: Wenn `publicTeamsSnapshot` vor der Transaction stale ist und `teamPool` nicht alle Teams umfasst, koennte Auswahl suboptimal werden. Kein klares Datenkorruptionsrisiko.

### 2. Ready waehrend Simulation

Schutz:

- Ready Transaction liest League.
- Blockiert bei `weekStatus === "simulating"` oder `"completed"`.
- Admin Simulation setzt Ready auf false in derselben Transaction wie Week Advance.

Rest-Risiko:

- In der Simulation Transaction wird `weekStatus` vorher nicht auf `simulating` gesetzt, sondern am Ende wieder `pre_week`. Der eigentliche parallele Schutz ist Lock + Transaction, nicht ein sichtbarer `weekStatus=simulating`.
- UI kann waehrend laufender Admin-Transaction kurz stale Ready anzeigen.

### 3. Zwei Admins simulieren gleiche Woche

Schutz:

- Lock-Dokument pro League/Season/Week.
- `assertCanStartOnlineLeagueWeekSimulation()` blockiert `simulating` und `simulated`.
- Existing Results und `lastSimulatedWeekKey` blockieren zusaetzlich.
- Firestore Transaction buendelt Writes.

Rest-Risiko:

- Der Lock wird aktuell in der erfolgreichen Transaction direkt als `simulated` geschrieben, nicht vorher separat als `simulating`. Bei langer Simulation innerhalb Transaction koennen zwei Requests beide Simulation lokal vorbereiten, aber nur eine Transaction sollte committen koennen, wenn der Lock gelesen/geschrieben wird. Firestore-Retry/Conflict ist hier entscheidend.
- Bei sehr teurer Simulation innerhalb Transaction ist Firestore-Transaction-Laufzeit riskant.

### 4. Draft Pick Doppelklick

Schutz:

- Pick muss aktuelle `pickNumber/currentTeamId/status` treffen.
- AvailablePlayer-Dokument muss existieren und wird geloescht.
- Rules erlauben nur Current-Team-Pick.

Bewertung: **gut abgesichert.**

Rest-Risiko:

- `mappedLeagueBeforePick` ist ein vorgelagerter Snapshot. PlayerPool sollte mittelfristig innerhalb/nahe der Transaction konsistenter gelesen werden.

### 5. Subscription Fanout und stale route state

`subscribeToLeague()` startet Listener fuer:

- League
- memberships
- teams
- events
- draft/main
- picks
- availablePlayers

Jede Aenderung ruft `mapLeague()` auf, das alle Bereiche neu liest. `createOrderedAsyncEmitter()` verhindert out-of-order delivery.

Risiko:

- Hohe Read-Amplification.
- Mehrere schnelle Events erzeugen viele Full Snapshot Reads.
- Ein Fehler in einer Subcollection kann die ganze Route belasten.

### 6. LocalStorage stale `lastLeagueId`

Schutz:

- ID wird validiert.
- Bei permission/not-found wird Pointer geloescht.
- `lastLeagueId` wird erst nach erfolgreichem Join/Rejoin gesetzt.

Rest-Risiko:

- UX kann trotzdem kurz "nicht berechtigt" wirken, wenn Membership/Mirror inkonsistent ist.

### 7. Admin/Repair Scripts

Risiko:

- Scripts, Auto-Draft und Finalize koennen User-Team-Zuordnung ueberschreiben, wenn sie Teamdaten aus Katalogen neu schreiben statt bestehende Assignments zu respektieren.

Gegenmassnahme:

- Vorher/Nachher-Mapping `teamId -> assignedUserId` validieren.

## Race-Risikomatrix

| Risiko | Wahrscheinlichkeit | Impact | Aktueller Schutz | Prioritaet |
|---|---:|---:|---|---|
| Zwei Admin simulateWeek | niedrig/mittel | hoch | Lock + Transaction | hoch |
| Draft Doppelklick | niedrig | mittel | Transaction + Rules | mittel |
| Join gleiche Team-ID | niedrig | hoch | Transaction + Rules | mittel |
| Mirror/Membership drift durch Script | mittel | hoch | Reports/Repair | hoch |
| Stale Subscription UI | mittel | mittel | Ordered emitter | mittel |
| Ready waehrend Week Advance | niedrig/mittel | mittel | expected step + transaction | mittel |
| Results array overwrite | niedrig | hoch | transaction | mittel |
| Failed simulation leaves lock failed | niedrig | niedrig/mittel | retry erlaubt | niedrig |

## Empfohlene Hardening-Massnahmen

1. Lock vor teurer Simulation als `simulating` setzen, danach Ergebnis in zweiter transaktionaler Phase schreiben oder Job-Modell nutzen.
2. Per-game Dokumente mit Status fuer Simulation einfuehren.
3. Full Snapshot Subscription splitten.
4. Draft PlayerPool fuer Pick naeher an Transaction/AvailablePlayer-Doc binden.
5. Staging Validator nach jedem Seed/Auto-Draft/Finalize verpflichtend.
6. Admin Scripts duerfen Manager-Mappings nur mit explizitem Conflict-Report veraendern.

## Offene Fragen

- Wie lange darf eine Firestore Transaction mit Simulation laufen, bevor Timeouts relevant werden?
- Soll Simulation in Job-Schritten statt einer Transaction laufen?
- Soll `simulating` fuer UI sichtbar vor Simulation geschrieben werden?

## Naechste Arbeitspakete

- AP-RC1: Parallel simulateWeek Tests gegen Firestore Emulator weiter ausbauen.
- AP-RC2: Simulation Job State statt nur Lock-Dokument designen.
- AP-RC3: Subscription Fanout messen und pro View reduzieren.
- AP-RC4: Script Invariant Guard fuer User-Team-Link.
