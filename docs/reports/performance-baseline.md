# Performance Baseline

Datum: 2026-05-02

## Messmethode

- Bundle-Baseline: `npm run build` mit Next.js 15.5.15.
- Read-Baseline: statische Pruefung der Firebase-Repository-Pfade in `src/lib/online/repositories/firebase-online-league-repository.ts`.
- Kein Browser-Lighthouse und kein Firestore-Emulator-Usage-Trace in diesem Lauf. Read-Zahlen sind deshalb eine strukturelle Schaetzung aus Codepfaden, keine abgerechneten Firebase-Metriken.

## Route-Bundles

| Route | Route Size | First Load JS | Bewertung |
| --- | ---: | ---: | --- |
| `/online/league/[leagueId]` | 18.1 kB | 300 kB | Groesster untersuchter App-Route-Entry. |
| `/online/league/[leagueId]/draft` | 1.14 kB | 283 kB | Kleiner Entry, aber teilt grossen Online/App-Shell-Client-Anteil. |
| `/online/league/[leagueId]/[...section]` | 1.06 kB | 283 kB | Direct-URL-Fallback laedt fast denselben Online-Stack. |
| `/online/league/[leagueId]/coming-soon/[feature]` | 1.7 kB | 284 kB | Coming-Soon ist UI-klein, traegt aber Online-Shell/Auth-State mit. |
| `/online` | 6.59 kB | 267 kB | Lobby/Search-Route mit Firebase/Auth-Client-Anteil. |
| `/admin` | 9.36 kB | 270 kB | Admin Control Center ist sichtbar hoeher als Singleplayer-Detailrouten. |
| `/admin/league/[leagueId]` | 12.4 kB | 273 kB | Detailseite mit Tabellen, Draft, Finance, Training und GM-Kontrollen. |
| `/app/savegames` | 150 B | 292 kB | Kleiner Entry, aber teilt den grossen Root-/App-Client-Stack. |
| `/app/savegames/[savegameId]/draft` | 3.16 kB | 105 kB | Singleplayer-Draft ist deutlich kleiner als Online-Draft. |
| `/app/savegames/[savegameId]/team/roster` | 8.32 kB | 114 kB | Groesste untersuchte Singleplayer-Subroute. |

Shared First Load JS: 102 kB.

## Firestore Read-Baseline

### `getSnapshot(leagueId)`

Ein voller League-Snapshot liest parallel:

- `leagues/{leagueId}`: 1 Doc
- `leagues/{leagueId}/memberships`: alle Membership-Docs
- `leagues/{leagueId}/teams`: alle Team-Docs
- `leagues/{leagueId}/events` mit `orderBy(createdAt desc), limit(20)`: bis zu 20 Event-Docs
- `leagues/{leagueId}/draft/main`: 1 Doc
- `leagues/{leagueId}/draft/main/picks`: alle Pick-Docs
- `leagues/{leagueId}/draft/main/availablePlayers`: alle verfuegbaren Spieler

Schaetzung pro vollem Snapshot: `2 + memberships + teams + min(events, 20) + picks + availablePlayers`.

### `getMemberScopedSnapshot(leagueId, user)`

Route-Initialisierung liest zusaetzlich:

- League-Doc
- eigene Membership
- globalen `leagueMembers/{leagueId}_{userId}` Mirror
- alle Teams zur Membership-/Team-Projektionspruefung
- danach den vollen `getSnapshot`

Risiko: League-Doc und Teams werden im Initialpfad doppelt gelesen.

### `subscribeToLeague`

Listener:

- League-Doc
- Memberships-Collection
- Teams-Collection
- Events-Query `limit(20)`
- Draft-State-Doc
- Draft-Picks-Collection
- Draft-Available-Players-Collection

Vor Optimierung konnte ein Burst aus mehreren Listener-Initialevents mehrfach `mapLeague -> getSnapshot` anstossen. Die implementierte Low-Risk-Optimierung coalesct diese Bursts mit einem kurzen 25-ms-Fenster, sodass die neueste Aenderung nur einen vollen Snapshot-Reload startet.

Wichtig: Der Listener selbst liest weiterhin die initialen Docs seiner Query. Die Optimierung reduziert den zusaetzlichen Full-Snapshot-Reload, nicht die Listener-Baseline.

## Umgesetzte Low-Risk-Optimierung

- `createCoalescedAsyncEmitter` in `src/lib/online/sync-guards.ts` ergaenzt.
- `subscribeToLeague` nutzt jetzt Coalescing fuer Firebase-League-Sync.
- Ziel: weniger redundante Full-Snapshot-Reloads bei initialen oder bursty Listener-Events.
- Verhalten bleibt fachlich gleich: neuester Snapshot gewinnt, nach `close()` wird nichts mehr emittiert.

## Top 5 Performance-Risiken

1. Online League First Load JS ist mit 300 kB der groesste untersuchte Route-Bundle.
2. Online Draft/Coming-Soon/Fallback laden trotz kleiner Route-Entries fast denselben 283-284-kB Online-Stack.
3. `subscribeToLeague` liest fuer jede relevante Aenderung wieder den vollen Snapshot inklusive Draft-Picks und Available-Players.
4. Draft Available Players und Picks sind unlimitiert. Mit wachsendem Draft-Pool steigt jeder Full-Snapshot linear.
5. Initialer Member-Scoped Load liest League/Teams vor dem Full-Snapshot erneut. Das ist korrektheitsfreundlich, aber teuer.

## Konkrete naechste Arbeitspakete

1. Bundle-Analyse mit Next Bundle Analyzer oder `next build --profile`: Online-App-Shell, Auth-Gate, Firebase SDK und Dashboard-Panels getrennt bewerten.
2. Online-Shell splitten: Coming-Soon und Direct-URL-Fallback sollten keine Dashboard-/Draft-heavy Client-Komponenten laden.
3. Firestore-Snapshot in Read-Model trennen: League-Core, Teams/Memberships, Events und Draft nur dort laden, wo die UI sie braucht.
4. Draft-Reads paginieren oder statusbasiert begrenzen: abgeschlossener Draft braucht keine komplette Available-Players-Collection.
5. Read-Usage-Messung im Emulator ergaenzen: Script mit konkreten Countern fuer Route Load, Join, Ready, Draft Pick und Admin Simulation.

## Status

- Bundle-Baseline: gemessen.
- Firestore-Read-Baseline: strukturell dokumentiert.
- Low-Risk-Optimierung: umgesetzt.
- Grosse Refactors: nicht umgesetzt.
