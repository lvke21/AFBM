# Multiplayer Week Simulation Audit

## Kurzfazit

Die Singleplayer-Simulation ist ein vollwertiger Season-Week-Flow mit geplantem Schedule, Match-Locks, Orchestrator-Schritten, echter Match Engine, Ergebnis-Persistenz, Stat-Aggregaten, Season-Transition und Week-Advance.

Die Multiplayer/Firebase-Simulation ist aktuell eine sichere Minimal-Version: Sie läuft nur über die Admin API, prüft Liga-/Draft-/Ready-State, erzeugt Matchups aus aktiven Memberships, simuliert mit der Minimal-Match-Engine, schreibt Ergebnisse und `completedWeeks`, setzt Ready-State zurück und schützt gegen doppelte Ausführung über `adminActionLocks`. Sie ist aber noch nicht parity mit Singleplayer.

Empfehlung: Jetzt keine große Engine-Migration erzwingen. Zuerst eine robuste Multiplayer-Week-Minimalarchitektur mit persistiertem Schedule, Match-Subcollection, Standings und Jobstatus bauen. Danach schrittweise Training, Finance, Attendance und tiefere Roster-Simulation anbinden.

## Ist-Zustand

### Singleplayer Week Flow

Relevante Pfade:
- `src/app/app/savegames/[savegameId]/week-actions.ts`
- `src/modules/savegames/application/week-flow.service.ts`
- `src/modules/seasons/application/season-simulation.service.ts`
- `src/modules/seasons/application/simulation/match-engine.ts`
- `src/modules/seasons/infrastructure/simulation/match-context.ts`
- `src/modules/seasons/infrastructure/simulation/match-result-persistence.ts`
- `src/modules/savegames/application/bootstrap/double-round-robin-schedule.ts`

Der Singleplayer-Flow arbeitet in zwei verwandten, aber getrennten Phasen:

1. Match-/Week-Simulation über `simulateSeasonWeekForUser`.
2. Savegame Week Advance über `advanceWeekForUser`.

`simulateSeasonWeekForUser`:
- lädt die aktuelle Season für User/Savegame,
- blockiert nicht-current Seasons,
- lädt scheduled Matches für die aktuelle Woche,
- führt `runWeeklyPreparation` aus,
- repariert/prüft Stat-Anker über `ensureSimulationStatAnchors`,
- setzt stale Locks frei,
- blockiert parallele Simulation, wenn Matches `IN_PROGRESS` sind,
- lockt alle scheduled Matches atomar auf `IN_PROGRESS`,
- baut Match-Kontexte,
- prüft Depth Charts über `assertTeamCanSimulate`,
- simuliert deterministisch per `generateMatchStats`,
- persistiert Ergebnisse über `persistMatchResult`,
- erzeugt Playoff-Runden bei Bedarf,
- aktualisiert Season Phase/Woche,
- schreibt Savegame Touch,
- führt einen Orchestrator mit Schritten `lock`, `simulate`, `persist-game-output`, `persist-stats`, `generate-readmodels`, `unlock`.

`advanceWeekForUser`:
- läuft nach `POST_GAME`,
- blockiert offene current-week Matches,
- wendet wöchentliche Entwicklung an,
- aktualisiert Season Phase/Woche,
- setzt Savegame zurück auf `PRE_WEEK`.

Singleplayer-Schedule:
- `buildDoubleRoundRobinSchedule` erzeugt einen Double-Round-Robin-Spielplan für gerade Teamanzahl.
- Matches haben `week`, `homeTeamId`, `awayTeamId`, `scheduledAt`, `stadiumName`.

Singleplayer-Ergebnisdaten:
- Match Status: `SCHEDULED`, `IN_PROGRESS`, abgeschlossen.
- Spieler-Matchstats, Passing/Rushing/Receiving/Defense/Kicking/Punting/Return Blocks.
- Player Season/Career Stats.
- Team Season Stats/Standings.
- Player condition, injuries/recovery, development history.
- Gameplan/X-Factor-Summary.

### Multiplayer / Firebase League Flow

Relevante Pfade:
- `src/lib/online/online-league-service.ts`
- `src/lib/online/online-league-week-service.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/app/api/admin/online/actions/route.ts`
- `src/components/admin/admin-league-detail.tsx`
- `src/lib/online/types.ts`

Multiplayer hat zwei Varianten:

1. Lokaler Online-State:
   - `simulateOnlineLeagueWeek` in `online-league-service.ts`.
   - Nutzt `getOnlineLeagueWeekReadyState`.
   - Blockiert bei offenem Draft, `weekStatus === "simulating"` oder fehlender Ready-State.
   - Erzeugt Matchups aus `league.schedule` oder fallback aus aktiven Users.
   - Nutzt Minimal-Match-Engine.
   - Schreibt `matchResults`, `completedWeeks`, `lastSimulatedWeekKey`, Logs und Events.
   - Führt lokale Training-/Attendance-Hooks teilweise aus.

2. Firebase/Admin:
   - `simulateWeek` in `online-admin-actions.ts`.
   - Läuft nur serverseitig über `/admin/api/online/actions`.
   - Admin Guard prüft Bearer Token serverseitig.
   - Prüft `league.status === "active"`.
   - Prüft Draft abgeschlossen.
   - Prüft aktive Memberships und Ready-State.
   - Prüft expected Season/Week.
   - Nutzt `adminActionLocks/{leagueId}-simulate-sX-wY`.
   - Prüft vorhandene `matchResults`.
   - Erzeugt Matchups aus aktiven Memberships, sortiert nach `teamId`.
   - Nutzt `simulateMatch` aus `minimal-match-simulation.ts`.
   - Schreibt `matchResults`, `completedWeeks`, `weeks/sX-wY`, `weeks/sNext-wNext`, `adminLogs`, Event, Version-Increment und Ready-Reset.
   - Blockiert jetzt, wenn keine gültigen Matchups entstehen.

Admin UI:
- `Simulation & Woche` im Control Center führt zur ausgewählten Detailseite.
- Detailseite zeigt Ready-State und Simulation Status.
- `Woche simulieren / Advance Week` ruft `simulateWeek` über Admin API auf.

## Singleplayer vs Multiplayer Vergleich

| Bereich | Singleplayer | Multiplayer/Firebase |
|---|---|---|
| Engine | Große Match Engine mit Kontext, Spielerlinien, Drives, Gameplan | Minimal-Match-Engine mit Teamrating |
| Schedule | Persistierte Matches pro Season/Woche | Kein eigenes Firebase-Schedule-Modell; Matchups aus Memberships |
| Locking | Matchstatus `IN_PROGRESS`, stale lock recovery | `adminActionLocks` pro Season/Week |
| Idempotenz | Keine scheduled Matches -> kein zweites Simulieren; Matchstatus schützt | Lock + existing `matchResults` schützt |
| Stats | Spieler-, Team-, Season-, Career-Stats | Nur kompakte `OnlineMatchResult` Teamstats |
| Standings | TeamSeasonStats/Query Readmodels | Kein persistiertes Standings-Modell |
| Week Advance | Season transition, playoff scheduling, savegame state | currentWeek/currentSeason direkt auf League-Dokument |
| Training | Weekly preparation + development | Lokal teilweise, Firebase noch nicht sauber integriert |
| Attendance/Finance/Fans | Singleplayer/Online-Domain vorhanden, aber nicht Firebase-Week-parity | Nicht vollständig im Firebase-Week-Flow |
| Admin API | Singleplayer primär app/server flow | Admin API mutiert Firebase serverseitig |
| Tests | Umfangreiche Unit Tests für Locking/Advance/Persistenz | Admin Action Tests plus Online-Service Tests |

## Datenmodell-Analyse

### Singleplayer / Prisma

Wichtige Konzepte:
- SaveGame mit `weekState`.
- Season mit `phase`, `week`, `endsAt`.
- Match mit `status`, `week`, `scheduledAt`, Home/Away Teams.
- TeamSeasonStats/Standings.
- PlayerMatchStats, PlayerSeasonStats, PlayerCareerStats.
- Player condition/injury/development histories.

Das Modell trennt klar:
- geplantes Match,
- laufende Simulation,
- abgeschlossenes Ergebnis,
- aggregierte Readmodels.

### Multiplayer / Firestore

Aktuelle Dokumente/Collections:
- `leagues/{leagueId}` mit `status`, `currentWeek`, `currentSeason`, `weekStatus`, `settings`, `matchResults`, `completedWeeks`, `version`.
- `leagues/{leagueId}/memberships/{uid}` mit `teamId`, `ready`, `status`.
- `leagueMembers/{leagueId_uid}` als globaler Mirror.
- `leagues/{leagueId}/teams/{teamId}` mit `contractRoster`, `depthChart`, `assignedUserId`, `status`.
- `leagues/{leagueId}/draft/main`, `picks`, `availablePlayers`.
- `leagues/{leagueId}/weeks/{sX-wY}` mit Week Status.
- `leagues/{leagueId}/events/*`.
- `leagues/{leagueId}/adminLogs/*`.
- `leagues/{leagueId}/adminActionLocks/*`.

Was fehlt für echte Multiplayer-Week-Simulation:
- Persistierte `schedule`/`matches` Subcollection mit Status pro Match.
- Persistierte Standings/Team Records.
- Per-match idempotency locks, nicht nur Week-Lock.
- Simulation Job-Dokument mit Stepstatus und Fehlerdetails.
- Spieler-/Teamstatistikmodell für Multiplayer.
- Firestore-kompatibler Match Context aus `contractRoster` und `depthChart`.
- Ergebnis-Readmodel für UI, Reports und spätere Playoffs.
- Klare Trennung zwischen completed Week, current Week und generated next Week.

## Risikoanalyse

### Firestore Write-Risiken

1. Dokumentgröße:
   `leagues/{leagueId}` speichert `matchResults` und `completedWeeks` als Arrays. Über viele Wochen kann das League-Dokument wachsen. Besser: `matches`, `completedWeeks`, `standings` als Subcollections.

2. Batch-/Transaction-Limits:
   Große Wochen mit vielen Matches, Teams, Stats und Roster-Updates können Firestore Transaction/Batch-Limits erreichen.

3. Hot document:
   Jede Simulation aktualisiert das League-Dokument. Bei vielen Admin-/Client-Listeners kann das teuer und konfliktanfällig werden.

4. Array Writes:
   `matchResults: [...new, ...existing]` ist anfällig für hohe Payloads und Race Conditions, auch wenn Transaction-Lock hilft.

5. Mirror-Konsistenz:
   Memberships und `leagueMembers` Mirror können auseinanderlaufen. Simulation sollte nicht aus dem Mirror lesen, aber UI/Permissions hängen daran.

6. Missing roster/depth chart:
   Firebase-Minimalrating fällt auf 70 zurück, wenn Roster leer ist. Für echte Simulation darf das nicht als normaler Zustand gelten.

7. Partial writes:
   Die aktuelle Firebase-Simulation schreibt viel in einer Transaction. Spätere Stats/Finance/Attendance sollten in orchestrierten Steps mit Resume/Retry laufen.

### Wo doppelte Simulation passieren kann

Singleplayer:
- Parallelaufrufe vor Locking.
- Stale `IN_PROGRESS` Matches.
- Scheduled-Matches werden nach Vorbereitung erneut gelesen, um diese Fälle zu reduzieren.
- Keine scheduled Matches -> kein zweites Simulieren.

Multiplayer/Firebase:
- Doppelklick im Admin UI.
- Zwei Admins simulieren gleichzeitig.
- Retry nach Netzwerkabbruch.
- Race zwischen `setAllReady` und `simulateWeek`.
- Direct API calls mit gleicher Season/Week.

Aktuelle Schutzmaßnahmen:
- UI pending state.
- Server Guard.
- Expected Season/Week.
- `adminActionLocks/{leagueId}-simulate-sX-wY`.
- Existing `matchResults` Prüfung.
- Firestore Transaction.

Noch fehlend:
- Persistierte Simulation Job-ID mit Status.
- Per-match status.
- Fehlerzustand/retryfähiger Step.
- Eindeutige `matchId`-Dokumente statt Arrays.

## Antworten auf die Leitfragen

### 1. Wie funktioniert die Singleplayer-Simulation aktuell?

Sie simuliert scheduled Matches einer Season-Week über einen orchestrierten, transaktional gelockten Service. Die große Match Engine erzeugt detaillierte Resultate, Persistenz schreibt Match Output, Player Stats, Team Stats, History und Season Transition. Week Advance ist getrennt und setzt Savegame/Season nach abgeschlossenem Spielzustand fort.

### 2. Wie funktioniert die Multiplayer-Simulation aktuell?

Lokal simuliert `simulateOnlineLeagueWeek` auf dem Browser-/Local-State. Firebase simuliert über Admin API serverseitig. Der Firebase-Pfad verwendet aktive Memberships als Matchup-Quelle, berechnet Teamrating aus `contractRoster`, simuliert mit der Minimal-Match-Engine, schreibt Ergebnisarrays und Week-Docs, setzt Ready zurück und schützt per Lock.

### 3. Welche Features hat Singleplayer, die Multiplayer noch braucht?

- Persistierter Schedule.
- Per-match Status.
- Standings/Records.
- Vollständige Team-/Spielerstatistiken.
- Player condition/injury/development.
- Weekly preparation.
- Playoff scheduling/Season transition.
- Simulation Orchestrator mit Stepstatus.
- Readmodel-Generation.
- Match Context aus Roster, Depth Chart, Gameplan.

### 4. Welche Daten fehlen für eine echte Week-Simulation?

- `leagues/{leagueId}/matches/{matchId}`.
- `leagues/{leagueId}/standings/{teamId}`.
- `leagues/{leagueId}/simulationJobs/{jobId}`.
- Optional `playerStats`, `teamStats`, `boxScores`, `drives` Subcollections.
- Stable schedule seed/variant.
- Team records fields: wins/losses/ties/pointsFor/pointsAgainst.
- Roster health/condition fields für Multiplayer.
- Gameplan/training input pro Team.

### 5. Welche Risiken gibt es bei Firestore Writes?

Hauptsächlich Dokumentwachstum, Transaction-Limits, Hot-Document-Konflikte, Array-write-Kosten, partial failure, fehlende Resume-Fähigkeit und Mirror-Konsistenz.

### 6. Wo kann doppelte Simulation passieren?

Bei parallelen Admin-Requests, UI-Doppelklicks, Netzwerk-Retries, fehlendem/gelöschtem Lock, unstimmiger expected Week und zukünftigen Job-Retries ohne idempotente Match-IDs. Aktuell reduzieren Week-Lock und existing result check das Risiko, aber ein Jobmodell wäre stabiler.

### 7. Welche Minimal-Version ist sicher umsetzbar?

Sicher umsetzbar ist AP-WS1 bis AP-WS4:
- Persistierter Multiplayer-Schedule.
- Match-Subcollection.
- Standings-Minimalmodell.
- Admin `simulateWeek` schreibt pro Match-Dokument und Standing statt nur League-Arrays.

Dabei weiterhin Minimal-Match-Engine verwenden, keine große Singleplayer Engine erzwingen.

### 8. Welche spätere Zielarchitektur ist sinnvoll?

Ein Multiplayer Week Simulation Service mit Firestore Job-Orchestrator:
- `simulationJobs/{leagueId_sX_wY}` als zentrale Idempotenz.
- Steps analog Singleplayer: `lock`, `prepare`, `simulate`, `persist-results`, `update-standings`, `advance-week`, `unlock`.
- `matches` als Quelle der Wahrheit.
- `standings` und `weekSummaries` als Readmodels.
- Spätere Engine-Adapter-Schicht, die entweder Minimal-Engine oder große Match Engine nutzen kann.

## Empfohlene Zielarchitektur

### Collections

```text
leagues/{leagueId}
leagues/{leagueId}/teams/{teamId}
leagues/{leagueId}/memberships/{uid}
leagues/{leagueId}/matches/{matchId}
leagues/{leagueId}/weeks/{weekKey}
leagues/{leagueId}/standings/{teamId}
leagues/{leagueId}/simulationJobs/{jobId}
leagues/{leagueId}/events/{eventId}
leagues/{leagueId}/adminLogs/{logId}
```

### Match-Dokument

```ts
{
  id: string;
  leagueId: string;
  season: number;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  status: "scheduled" | "in_progress" | "completed" | "failed";
  scheduledAt: string;
  result?: OnlineMatchResult;
  simulationSeed: string;
  startedAt?: string;
  completedAt?: string;
  simulatedByUserId?: string;
}
```

### Simulation Job

```ts
{
  id: string; // `${leagueId}_s${season}_w${week}`
  leagueId: string;
  season: number;
  week: number;
  status: "pending" | "running" | "completed" | "failed";
  steps: Array<{
    id: string;
    status: "pending" | "running" | "completed" | "skipped" | "failed";
    message?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}
```

## Arbeitspakete

### AP-WS1: Schedule Read/Write Model

Ziel:
- Firestore `matches` Subcollection einführen.
- Deterministischen 8-Team-Spielplan erzeugen.
- Seeds/Finalize-Scripts sollen Schedule für Testliga anlegen können.

Tests:
- 8 Teams bekommen gültige Wochen.
- Keine Team-Doppelbelegung in derselben Woche.
- Match IDs reproduzierbar.

### AP-WS2: Admin Week Job Guard

Ziel:
- `simulationJobs/{leagueId_sX_wY}` einführen.
- Bestehenden `adminActionLocks`-Ansatz in ein sichtbares Jobmodell überführen.

Tests:
- parallele Requests nur ein Job.
- Retry nach completed ist idempotent.
- failed kann kontrolliert erneut gestartet werden.

### AP-WS3: Match-Subcollection Simulation

Ziel:
- `simulateWeek` liest scheduled Matches statt Membership-Pairing.
- Ergebnisse werden in Match-Dokumente geschrieben.
- League-Arrays nur noch optional als kompakte Legacy-/Summary-Felder.

Tests:
- completed Match kann nicht erneut simuliert werden.
- Week ohne scheduled Matches wird sauber blockiert.

### AP-WS4: Standings Minimalmodell

Ziel:
- `standings/{teamId}` mit wins/losses/ties/pointsFor/pointsAgainst.
- Admin-Detailseite zeigt Records.

Tests:
- Ergebnis aktualisiert beide Teams korrekt.
- Re-run bleibt idempotent.

### AP-WS5: Week Advance und Week Summary

Ziel:
- `weeks/{weekKey}` als authoritative Week-Dokument.
- `weekStatus` und `currentWeek/currentSeason` sauber aus Job ableiten.
- `weekSummaries` oder `weeks` mit Ergebnisreferenzen.

Tests:
- Advance 1 -> 2.
- Week 18 -> nächste Season oder Saisonabschluss nach definierter Regel.

### AP-WS6: Roster-/Depth-Chart-basierte Ratings

Ziel:
- Teamrating aus aktiven Spielern, Depth Chart und Positionsgewichtung.
- Blockieren, wenn Roster/Depth Chart unvollständig ist.

Tests:
- full roster erlaubt Simulation.
- missing QB/K/P oder leeres Roster blockiert.

### AP-WS7: Training, Attendance, Finance Hooks

Ziel:
- Online-Domainfunktionen für Training/Attendance/Finance in serverseitigen Firebase-Flow integrieren.
- Keine Browser-Storage-Abhängigkeit.

Tests:
- Training Outcomes entstehen.
- Attendance/Finance ändern sich deterministisch.
- Hooks sind idempotent pro Match/Week.

### AP-WS8: Engine Adapter zur großen Match Engine

Ziel:
- Adapter von Firestore Multiplayer-Team/Roster auf `SimulationMatchContext`.
- Große Match Engine optional für Multiplayer nutzen.
- Fallback auf Minimal-Engine nur als bewusstes Featureflag.

Tests:
- Match Engine deterministisch.
- Player stat anchors oder Multiplayer-Statmodell vorhanden.
- Performance/Firestore Write-Limits validiert.

## Klare Empfehlung

Jetzt implementieren:
- AP-WS1 bis AP-WS4.
- Minimal-Match-Engine behalten.
- Ergebnisse in Match-Dokumente und Standings schreiben.
- Admin UI mit Jobstatus und Match-Ergebnisliste ergänzen.

Später implementieren:
- AP-WS5 bis AP-WS8.
- Große Engine erst anbinden, wenn Multiplayer-Roster, Depth Chart, Player Stats und Firestore-Write-Strategie stabil sind.

Nicht jetzt tun:
- Die Singleplayer-Engine direkt auf Firebase-Ligen zwingen.
- Große Stats-/Drive-Outputs in ein einziges League-Dokument schreiben.
- Simulation ohne persistierten Schedule ausbauen.
- UI-Erfolg anzeigen, wenn keine Match-Dokumente oder gültigen Matchups existieren.

## Tests und Checkliste für nächste Umsetzung

- Unit: Schedule Builder.
- Unit: Week Job Idempotenz.
- Unit: Match Result -> Standings.
- Unit: Missing roster/depth chart Guards.
- API: Request ohne Token 401.
- API: Non-Admin 403.
- API: Admin simulateWeek happy path.
- API: parallel simulateWeek idempotent.
- Firestore rules: Clients dürfen Simulation nicht direkt schreiben.
- E2E/Admin: Liga öffnen, Ready-State sehen, Simulation starten, Ergebnisse sehen.
