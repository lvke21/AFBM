# Multiplayer Playability Red Audit

Datum: 2026-05-03  
Umgebung: Staging  
Base URL: `https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app`  
League ID: `afbm-multiplayer-test-league`  
Deployter Commit: `1a28d88eaaa99a182612638652d0165705ce6901`  
Revision: `afbm-staging-backend-build-2026-05-03-000`

## Executive Summary

**Multiplayer spielbar:** Nein.

Staging ist erreichbar, `/api/build-info` ist korrekt, Auth/Admin-Token funktioniert, die Testliga laedt, und der Admin-User ist mit einem Team verknuepft. Der eigentliche Multiplayer-Core-Loop ist aber im aktuellen Staging-State nicht spielbar, weil die Liga auf `currentWeek=8` steht, der Schedule nur `28` Spiele fuer Wochen 1-7 enthaelt und fuer Woche 8 keine Spiele existieren. Damit ist der Week-Flow nach Reload/naechster Woche blockiert.

Zusaetzlich ist der aktuelle mutierende Staging-Smoke rot, weil `scripts/staging-admin-week-smoke.ts` keine `confirmed: true`-Bestaetigung fuer Admin-Mutationen mitsendet, waehrend API/Policy diese inzwischen zwingend verlangen.

**Rollout-Entscheidung:** Zurueckziehen / nicht als spielbaren Multiplayer-Rollout akzeptieren.

## Live-Evidenz

### Build-Info

```text
GET /api/build-info -> HTTP 200
commit=1a28d88eaaa99a182612638652d0165705ce6901
environment=staging
revision=afbm-staging-backend-build-2026-05-03-000
firebaseProjectId=afbm-staging
```

### Read-only Auth Smoke

Command:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:auth -- --league-id afbm-multiplayer-test-league --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
```

Ergebnis:

```text
[staging-smoke] status=GREEN
[staging-smoke] admin auth ok; leagues=2
[staging-smoke] token identity ok; uid=KFy5PrqAzzP7vRbfP4wIDamzbh43 adminClaim=true email=present
[staging-smoke] league load ok; currentWeek=8 teams=8 users=2 schedule=28
[staging-smoke] user-team assignment ok; teamId=basel-rhinos readyForWeek=false assignedUserId=matches
```

### Mutating Admin Week Smoke

Command:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
```

Ergebnis:

```text
[staging-smoke] league before simulation; currentWeek=8 users=2 teams=8 schedule=28
[staging-smoke] failed: Ready-state smoke failed (400): ADMIN_ACTION_POLICY_VIOLATION Admin-Mutation benötigt eine explizite Bestätigung.
[staging-smoke] status=RED
```

### Read-only Firestore Snapshot

```json
{
  "leagueId": "afbm-multiplayer-test-league",
  "status": "active",
  "currentSeason": 1,
  "currentWeek": 8,
  "weekStatus": "pre_week",
  "completedWeeks": ["s1-w1", "s1-w2", "s1-w3", "s1-w4", "s1-w5", "s1-w6", "s1-w7"],
  "scheduleCount": 28,
  "currentWeekGames": 0,
  "resultCount": 28,
  "standingsCount": 8,
  "memberships": 2,
  "readyCount": 0,
  "draft": {
    "exists": true,
    "status": "completed",
    "draftRunId": "foundation-player-pool-v1",
    "draftOrder": 8
  },
  "picksCount": 424,
  "availablePlayersCount": 80
}
```

### Route Reachability

| Route | Ergebnis | Bewertung |
| --- | --- | --- |
| `/online` | HTTP 200 | App erreichbar |
| `/online/league/afbm-multiplayer-test-league` | HTTP 200 | Dashboard-Route erreichbar |
| `/online/league/afbm-multiplayer-test-league/draft` | HTTP 200 | Draft-Route erreichbar |
| `/online/league/afbm-multiplayer-test-league/schedule` | HTTP 307 -> `#week-loop` | Abschnittsroute ist nur Anchor-Fallback |
| `/online/league/afbm-multiplayer-test-league/roster` | HTTP 307 -> `#roster` | Abschnittsroute ist nur Anchor-Fallback |
| `/online/league/afbm-multiplayer-test-league/depth-chart` | HTTP 307 -> `#depth-chart` | Abschnittsroute ist nur Anchor-Fallback |
| `/online/league/afbm-multiplayer-test-league/standings` | HTTP 307 -> `#league` | Keine echte Standings-Subpage |
| `/online/league/afbm-multiplayer-test-league/coming-soon/contracts-cap` | HTTP 200 | Nicht-MVP-Route korrekt als Coming Soon erreichbar |

## Flow-Bewertung

| Flow-Schritt | Status | Befund |
| --- | --- | --- |
| 1. Login / User-Verknuepfung | Teilweise ok | IAM-Custom-Token/Admin-Auth funktioniert. Echter Browser-Login eines normalen Spielers wurde in diesem Audit nicht bewiesen. |
| 2. Liga betreten | Teilweise ok | Liga laedt read-only. Echter Join neuer Spieler wurde gegen Staging nicht mutierend getestet. |
| 3. Eigenes Team erkennen | Ok fuer Admin-User | Membership `KFy5PrqAzzP7vRbfP4wIDamzbh43 -> basel-rhinos`; `team.assignedUserId` passt. |
| 4. Draft-Status | Ok, aber nicht spielbar pruefbar | Draft steht bereits auf `completed`; kein aktiver Draft-Flow in dieser Liga. |
| 5. Draft abschliessen | Nicht pruefbar / blockiert durch State | Staging-Liga ist bereits auto-backfilled completed. Abschluss eines echten aktiven Drafts wurde nicht belegt. |
| 6. Menue-Freischaltung nach Draft | Teilweise ok | Draft completed, Dashboard/Draft erreichbar. Mehrere Section-Routen sind nur Anchor-Redirects. |
| 7. Week-Flow | P0 rot | Liga steht auf Woche 8, Schedule hat keine Woche-8-Spiele. |
| 8. Ready-State | P1 rot fuer Gate, fraglich fuer Spieler | Read-only: `readyCount=0/2`. Mutierender Smoke kann wegen fehlender `confirmed`-Bestaetigung nicht einmal alle ready setzen. |
| 9. Simulation starten | P0 rot | Ohne Woche-8-Schedule kann die Simulation nach Ready nicht sauber laufen; Admin-Smoke ist vorher schon rot. |
| 10. Ergebnisse anzeigen | Teilweise ok | `resultCount=28`, `standingsCount=8`; Ergebnisse bis Woche 7 vorhanden. |
| 11. Naechste Woche erreichen | P0 rot | Woche 8 wurde erreicht, aber es gibt keine spielbare Woche 8. |
| 12. Rueckkehr ins Team nach Reload | Teilweise ok | Read-only Smoke findet Membership und Team wieder. Echter Browser-Rejoin/Reload gegen Staging wurde nicht belegt. |

## Blocker P0

### P0-1: Liga ist in Woche 8 ohne Schedule

Beschreibung: Die Staging-Testliga steht auf `currentWeek=8`, hat aber nur `28` Schedule-Eintraege fuer sieben Wochen. `currentWeekGames=0`. Damit ist der Week-Loop nach der letzten simulierten Woche in einem toten Zustand: Ready/Simulation/naechste Woche koennen keinen normalen Spieltag mehr bilden.

Reproduktion:

1. Read-only Staging-State auslesen.
2. `currentWeek=8` feststellen.
3. `scheduleCount=28` und `currentWeekGames=0` feststellen.
4. In `src/lib/admin/online-week-simulation.ts` wirft `validateScheduledMatches` bei leerer Woche `schedule_missing`.

Betroffene Dateien/Services:

- `src/lib/admin/online-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`
- `scripts/staging-admin-week-smoke.ts`
- Staging Firestore: `leagues/afbm-multiplayer-test-league`

Minimaler Fix:

1. Staging-Testliga in einen definierten spielbaren Zustand zuruecksetzen oder frische Playability-Testliga seed-en.
2. Sicherstellen, dass `currentWeek` nie ueber den vorhandenen Schedule hinausgeschoben wird, ohne Offseason/Season-Rollover oder neuen Schedule.
3. Regressionstest: completedWeeks bis letzte Woche + currentWeek danach muss klare Season-End/Offseason-Phase zeigen, nicht `pre_week`.

### P0-2: Aktueller Staging Admin Week Smoke ist rot

Beschreibung: Der mutierende Smoke nutzt `setAllReady` und `simulateWeek`, sendet aber keine `confirmed: true`-Bestaetigung. Die API/Policy blockiert seit der Admin-Hardening-Aenderung jede Mutation ohne explizite Bestaetigung.

Reproduktion:

1. `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901`
2. Ergebnis: HTTP 400, `ADMIN_ACTION_POLICY_VIOLATION`.

Betroffene Dateien/Services:

- `scripts/staging-admin-week-smoke.ts`
- `src/app/api/admin/online/actions/route.ts`
- `src/lib/admin/online-admin-action-policy.ts`

Minimaler Fix:

1. Smoke-Requests fuer mutierende Admin-Actions mit `confirmed: true` senden.
2. Danach Smoke erneut laufen lassen.
3. Erwartetes Folgeproblem nicht verdecken: Wenn Ready danach klappt, muss Woche 8 wegen fehlendem Schedule sauber rot oder als Season-End behandelt werden.

## Schwere Fehler P1

### P1-1: Staging belegt keinen echten Spieler-Browserflow

Beschreibung: Der erfolgreiche Live-Check nutzt IAM sign-jwt fuer einen Admin-User. Er belegt Admin-Auth, League-Load und Team-Link, aber keinen normalen Spieler-Login, keinen Browser-Rejoin mit persisted Auth und keinen echten Join-Flow.

Reproduktion:

1. Read-only Auth-Smoke ausfuehren.
2. Feststellen: `tokenSource=IAM sign-jwt custom token`, `adminClaim=true`.
3. Kein normaler Player-Browserflow wurde in diesem Audit gegen Staging ausgefuehrt.

Betroffene Dateien/Services:

- `scripts/staging-admin-week-smoke.ts`
- `src/components/auth/online-auth-gate.tsx`
- `src/components/auth/use-firebase-admin-access.ts`
- `src/components/online/online-continue-button.tsx`

Minimaler Fix:

1. Dedizierten Staging-Spieler-Testaccount oder CI-sicheren Auth-Pfad definieren.
2. Browser-Playability-Smoke gegen Staging ergaenzen: Login, Liga oeffnen, Team erkennen, Reload/Rejoin.

### P1-2: Draft-Abschluss ist im aktuellen Staging-State nicht verifizierbar

Beschreibung: Draft ist bereits `completed`, Picks sind per `server-auto-draft-backfill` erzeugt, und `availablePlayers` enthaelt noch `80` Free-Agent-Dokumente. Das kann als Free-Agent-Pool plausibel sein, belegt aber keinen echten aktiven Draftabschluss durch Spieler/Admin.

Reproduktion:

1. Draft-Doc read-only lesen.
2. `status=completed`, `picksCount=424`, `availablePlayersCount=80` feststellen.
3. Pick-Samples zeigen `pickedByUserId=server-auto-draft-backfill`.

Betroffene Dateien/Services:

- `src/lib/online/fantasy-draft-service.ts`
- `src/lib/online/multiplayer-draft-logic.ts`
- `src/lib/online/repositories/firebase-online-league-queries.ts`
- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/online/online-league-draft-page.tsx`

Minimaler Fix:

1. Separaten Staging-Draft-Testzustand bereitstellen: `draftActive` mit kleinem Pool.
2. Browser- oder API-Smoke fuer Draft pick -> completed -> menu unlock schreiben.
3. Completed-Draft mit remaining Free Agents klar als Free-Agent-Pool benennen, falls gewollt.

### P1-3: Team-Identitaet ist fuer Menschen uneindeutig

Beschreibung: Membership zeigt `teamId=basel-rhinos`, das Team-Dokument heisst aber `Solothurn Guardians`; `bern-wolves` heisst `Sion Glaciers`. Das ist technisch nicht zwingend falsch, aber fuer Recovery/Support und Spieler-Kommunikation riskant.

Reproduktion:

1. Teams read-only auslesen.
2. `id=basel-rhinos`, `displayName/teamName=Solothurn Guardians` feststellen.
3. Membership/Smoke meldet nur `teamId=basel-rhinos`.

Betroffene Dateien/Services:

- `src/lib/online/repositories/firebase-online-league-mappers.ts`
- `src/components/online/online-league-detail-model.ts`
- `src/components/online/online-league-app-shell.tsx`

Minimaler Fix:

1. UI/Reports immer Team-ID und Display-Name zusammen anzeigen, wenn IDs historisch/statisch bleiben.
2. Staging-Testdaten entweder ID/name konsistent seed-en oder bewusst als renamed team dokumentieren.

## Fehlende Funktionen P1/P2

| Prioritaet | Funktion | Befund |
| --- | --- | --- |
| P1 | Staging-Spieler-Browserflow | Kein aktueller live Browser-Smoke fuer normalen Spieler-Login, Join/Rejoin, Ready und Reload. |
| P1 | Draft-End-to-End auf Staging | Aktuelle Liga ist post-draft; aktiver Draftabschluss nicht pruefbar. |
| P1 | Season-End / Week-8-Handling | Kein sauberer Zustand nach letzter geplanter Woche. |
| P2 | Standings-Subpage | `/standings` ist nur Redirect auf `#league`, keine echte eigene Seite. |
| P2 | Schedule/Roster/Depth direkte URLs | Direct URLs sind Anchor-Redirects. Das ist akzeptabel, aber kein vollwertiger Subpage-Flow. |

## UI-Menues Ohne Backend-Funktion

| Bereich | Status | Bewertung |
| --- | --- | --- |
| Contracts/Cap | Coming Soon | Korrekt als Nicht-MVP markiert. |
| Development | Coming Soon | Korrekt als Nicht-MVP markiert. |
| Training | Gemischt | Direct URL ist Coming Soon; Dashboard zeigt im Firebase-MVP Training nur read-only. Nicht als echte Hauptfunktion zaehlen. |
| Trade Board | Coming Soon / Advanced local hidden | Korrekt nicht als Firebase-MVP-Funktion freigeschaltet. |
| Inbox | Coming Soon | Keine Backend-Funktion im Multiplayer. |
| Finance | Coming Soon / lokale Modelle vorhanden | Nicht als MVP-Hauptfunktion akzeptieren. |

Betroffene Dateien:

- `src/components/online/online-league-coming-soon-model.ts`
- `src/components/online/online-league-route-fallback-model.ts`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-detail-model.ts`

## State-Mismatches

| Mismatch | Evidenz | Risiko |
| --- | --- | --- |
| `currentWeek=8`, `weekStatus=pre_week`, aber `currentWeekGames=0` | Firestore Snapshot | P0: Week-Loop dead end |
| `completedWeeks` enthaelt Wochen 1-7, aber keine Season-End-Phase | Firestore Snapshot | P0/P1: Nutzer sieht naechste Woche statt abgeschlossenem Schedule |
| Ready 0/2 nach letztem Smoke, obwohl vorher fuer Simulation alle ready gesetzt wurden | Firestore Snapshot und Events | P1: Nach Simulation korrekt resetbar, aber aktuell kein simulierbarer naechster Schritt |
| Draft `completed`, aber `availablePlayersCount=80` | Firestore Snapshot | P2, falls als Free-Agent-Pool gewollt; P1, falls UI daraus aktive Draft-Verfuegbarkeit ableitet |
| Team-ID und Team-Name divergieren | `basel-rhinos` -> `Solothurn Guardians`; `bern-wolves` -> `Sion Glaciers` | P1/P2 Support- und UI-Verwirrung |

## Minimale Fix-Reihenfolge

1. **Smoke an Admin-Policy anpassen:** `scripts/staging-admin-week-smoke.ts` muss `confirmed: true` fuer `setAllReady` und `simulateWeek` senden.
2. **Staging-Testliga reparieren oder neu seed-en:** `afbm-multiplayer-test-league` in einen bekannten Zustand setzen: Draft completed, zwei aktive GMs, currentWeek mit vorhandenem Schedule, beide Teams spielbar.
3. **Season-End-Guard fixen:** Wenn `currentWeek` ueber dem letzten Schedule liegt, muss UI/API eine klare Season-End-/Offseason-Phase zeigen oder neuen Schedule erzeugen. Kein `pre_week` ohne Spiele.
4. **Echten Spieler-Browser-Smoke auf Staging schaffen:** Login, Liga oeffnen, Team erkennen, Ready setzen, Reload/Rejoin. Kein Admin-only-Ersatz.
5. **Draft-Playability separat pruefen:** frische Draft-Testliga oder kleiner Staging-Draft-Seed; pick -> complete -> unlock.
6. **UI-Menues hart markieren:** Nicht-MVP-Bereiche duerfen nicht wie spielbare Hauptfunktionen wirken; direkte URLs muessen Coming Soon bleiben.
7. **Team-ID/Display-Name transparent machen:** In Audit/Debug/Admin und ggf. Support-UI beide Werte anzeigen oder Testdaten konsistent seed-en.

## Entscheidung

**Rollout akzeptabel:** Nein.

**Empfehlung:** Staging-Multiplayer nicht als spielbar freigeben. Den Rollout fuer Multiplayer-Playability zurueckziehen oder blockieren, bis P0-1 und P0-2 geschlossen sind und danach ein echter Spieler-Browserflow gegen Staging gruen laeuft.

Production-Daten wurden in diesem Audit nicht beruehrt. Staging wurde nur read-only gelesen; der mutierende Smoke-Versuch wurde vom Admin-Policy-Guard vor Datenmutation blockiert.
