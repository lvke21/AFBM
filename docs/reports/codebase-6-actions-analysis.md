# Codebase 6 Actions Analysis

Stand: 2026-05-01

Ziel dieses Berichts: genau drei konkrete Verbesserungen und drei konkrete Code-Verkleinerungen mit Bezug auf reale Dateien und sichtbare Code-Hotspots. Es wurden keine Produktivcode-Aenderungen vorgenommen.

## Analysebasis

Groesste Dateien nach LOC:

| Datei | LOC | Beobachtung |
| --- | ---: | --- |
| `src/lib/online/online-league-service.ts` | 8977 | Online-Monolith mit Storage, Defaults, Normalisierung, Draft, Training, Trades, Woche |
| `src/modules/gameplay/infrastructure/play-library.ts` | 6970 | grosse Play-Library/Datenkataloge plus Helper |
| `src/modules/seasons/application/simulation/match-engine.ts` | 5225 | zentrale Simulation Engine, No-Go fuer Quick-Refactor |
| `src/modules/gameplay/application/play-selection-engine.ts` | 2747 | komplexe Spielzugauswahl |
| `src/modules/gameplay/application/outcome-resolution-engine.ts` | 2715 | komplexe Outcome-Logik |
| `src/components/online/online-league-placeholder.tsx` | 1977 | groesste Client-Komponente im Online-Flow |
| `src/lib/admin/online-admin-actions.ts` | 1906 | viele Admin-Transaktionen und Action-Verzweigungen |
| `scripts/seeds/e2e-seed.ts` | 1848 | grosser Seed, aktuell nicht idempotent |
| `src/components/admin/admin-league-detail.tsx` | 1761 | groesste Admin-UI-Komponente |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | 1391 | Firestore Repository mit breiten Reads/Subscriptions |

Komplexitaetsindikatoren:

| Datei | Branch-/Kontrollfluss-Funde |
| --- | ---: |
| `src/lib/online/online-league-service.ts` | 369 |
| `src/lib/admin/online-admin-actions.ts` | 115 |
| `src/components/online/online-league-placeholder.tsx` | 67 |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | 66 |
| `src/components/admin/admin-league-detail.tsx` | 55 |

## 1. Typ: Verbesserung

### Titel

Online-League-Datenquelle pro Route konsolidieren

### Betroffene Dateien

- `src/app/online/league/[leagueId]/page.tsx`
- `src/app/online/league/[leagueId]/draft/page.tsx`
- `src/components/online/online-league-app-shell.tsx`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-draft-page.tsx`
- `src/lib/online/repositories/firebase-online-league-repository.ts`

### Problem

Die Online-League-Routen wrappen Child-Komponenten in `OnlineLeagueAppShell`, aber Shell und Child laden dieselbe Liga jeweils selbst.

Konkrete Stellen:

- `src/app/online/league/[leagueId]/page.tsx:15-18` rendert `OnlineLeagueAppShell` und darin `OnlineLeaguePlaceholder`.
- `src/components/online/online-league-app-shell.tsx:75-101` ruft `getCurrentUser()`, `getLeagueById()` und `subscribeToLeague()` auf.
- `src/components/online/online-league-placeholder.tsx:141-171` laedt erneut den User.
- `src/components/online/online-league-placeholder.tsx:193-269` ruft erneut `getLeagueById()` und `subscribeToLeague()` auf.
- `src/app/online/league/[leagueId]/draft/page.tsx:15-18` nutzt dieselbe Shell-Struktur.
- `src/components/online/online-league-draft-page.tsx:46-74` laedt ebenfalls User, Liga und Subscription erneut.
- `src/lib/online/repositories/firebase-online-league-repository.ts:1236-1252` startet pro `subscribeToLeague()` sieben Firestore Listener.

Dadurch kann eine einzelne Online-League-Seite doppelte oder mehrfache Live-Subscriptions und Initial Reads erzeugen. Das ist nicht nur Performance-/Kostenproblem, sondern erhoeht auch die Chance auf abweichende Zwischenzustaende in Shell, Dashboard und Draft-Page.

### Loesung

Eine routeweite Datenquelle einfuehren, z. B. `OnlineLeagueRouteProvider` oder ein Hook `useOnlineLeagueRouteState(leagueId)`, der genau einmal:

- aktuellen User laedt
- League initial laedt
- Subscription startet
- Loading/Error/Recovery-State bereitstellt

`OnlineLeagueAppShell`, `OnlineLeaguePlaceholder` und `OnlineLeagueDraftPage` sollen denselben Snapshot und dieselben Actions aus diesem Provider lesen, statt eigene `getCurrentUser`/`getLeagueById`/`subscribeToLeague`-Effekte zu starten.

Zweiter Schritt: `subscribeToLeague()` in Core-/Draft-/Events-Subscriptions splitten, damit Dashboard-Seiten nicht immer Draft Picks und Available Players abonnieren.

### Risiko

**Mittel bis hoch.** Der Online-Flow ist empfindlich: Join, Rejoin, Reload, Draft und Sidebar-Locks haengen am gleichen Zustand.

### Erwarteter Impact

- Weniger Firestore Reads und Listener pro Online-League-Seite.
- Weniger Re-Renders durch einen einzigen Snapshot-Owner.
- Stabilerer Kontext fuer Sidebar, Dashboard und Draft.
- Bessere Grundlage, um den Firebase-Multiplayer-E2E wieder verlaesslich gruen zu bekommen.

### Notwendige Tests

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:run`
- `npm run test:e2e:multiplayer:firebase`
- gezielt: `src/lib/online/repositories/online-league-repository.test.ts`
- gezielt: `src/components/online/online-league-dashboard-panels.test.tsx`
- manuell: Join, Reload, Draft-Menue, Zurueck ins Dashboard

## 2. Typ: Verbesserung

### Titel

Firestore Join-/Membership-Rules null-safe und E2E-nah absichern

### Betroffene Dateien

- `firestore.rules`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/firebase/firestore.rules.test.ts`
- `e2e/multiplayer-firebase.spec.ts`

### Problem

Der globale Mirror-Pfad `leagueMembers/{leagueMemberId}` liest direkt Felder aus `resource.data`:

- `firestore.rules:444-451`
- konkret `resource.data.userId == request.auth.uid`
- konkret `hasLeagueRole(resource.data.leagueId, ["OWNER", "ADMIN"])`

Beim letzten Regression-Check schlug der Firebase-Multiplayer-E2E nach `Beitreten` sichtbar mit der UI-Meldung `Du hast fuer diese Online-Liga oder Aktion keine Berechtigung` fehl. Der Emulator loggte dazu eine Rules-Auswertung im `leagueMembers`-Read-Pfad mit `Null value error`.

Der bestehende Rules-Test deckt den Happy Path einer vollstaendigen Batch-Erstellung ab:

- `src/lib/firebase/firestore.rules.test.ts:375-425`

Er prueft aber nicht den Browser-Fehlerfall, bei dem Join/Read/Mirror-Existenz in unguenstiger Reihenfolge oder mit fehlendem Mirror-Feld auftritt.

### Loesung

Rules und Tests am echten Join-Flow ausrichten:

1. In `firestore.rules` globale `leagueMembers` Reads null-safe formulieren.
2. `isGlobalAdmin()` ebenfalls null-safe gegen fehlende `request.auth.token.admin` machen, weil Rules-Logs bereits `Property admin is undefined on object` zeigen koennen.
3. In `src/lib/firebase/firestore.rules.test.ts` einen Test ergaenzen, der exakt den neuen User Join prueft:
   - User ist eingeloggt.
   - Membership und Mirror werden angelegt.
   - Direkt danach darf derselbe User den Mirror lesen.
   - Fehlender oder fremder Mirror bleibt geblockt.
4. In `firebase-online-league-repository.ts:683-760` sicherstellen, dass `joinLeague()` Mirror und Membership in derselben Transaktion konsistent schreibt, bevor UI-Routing/`lastLeagueId` greift.

### Risiko

**Mittel.** Security Rules muessen streng bleiben. Der Fix darf keine fremden Memberships oeffnen.

### Erwarteter Impact

- Stabilerer Multiplayer Join/Rejoin.
- Weniger false-negative Permission-Fehler.
- Rules-Test schliesst die aktuelle Coverage-Luecke zwischen gruenem Rules-Test und rotem Browser-E2E.

### Notwendige Tests

- `npm run test:firebase:rules`
- `npm run test:firebase:parity`
- `npm run test:e2e:multiplayer:firebase`
- `npm run test:run`
- manuell Staging: neuer User joined Testliga, Reload, Rejoin, falscher User wird blockiert

## 3. Typ: Verbesserung

### Titel

Draft-Room Renderpfad vollstaendig memoizieren und indizieren

### Betroffene Dateien

- `src/components/online/online-fantasy-draft-room.tsx`
- optional spaeter: `src/components/admin/admin-league-detail.tsx`

### Problem

`OnlineFantasyDraftRoom` memoiziert bereits `playerPool`, `playersById`, `pickedPlayerIds` und `availablePlayerIds`, aber mehrere abgeleitete Listen laufen weiterhin direkt im Renderpfad:

- `src/components/online/online-fantasy-draft-room.tsx:81-88` filtert und sortiert `availablePlayers`.
- `src/components/online/online-fantasy-draft-room.tsx:90-98` baut `pickedPlayers`.
- `src/components/online/online-fantasy-draft-room.tsx:99-103` baut `ownRoster` und `rosterCounts`.
- `src/components/online/online-fantasy-draft-room.tsx:36-42` sucht Teamnamen pro Aufruf mit mehreren `find()`-Laeufen.

Bei 500+ Spielern im Multiplayer-Pool und Live-Updates durch Draft-Picks wird Filter/Sort bei jedem Render erneut ausgefuehrt. Das ist konkret relevant, weil der Spielerpool bewusst gross ist und Draft-Updates haeufig sind.

### Loesung

Memoization sauber abschliessen:

- `teamNameById` per `useMemo` einmal aus `league.users` und `league.teams` bauen.
- `availablePlayers` per `useMemo` aus `playerPool`, `availablePlayerIds`, `positionFilter`, `sortDirection`.
- `pickedPlayers`, `ownRoster` und `rosterCounts` per `useMemo`.
- `getRosterCounts()` intern nicht pro Position das komplette Roster filtern, sondern einmal zaehlen.
- Optional: nur Top-N nach sortierter Auswahl rendern oder Pagination/Virtualisierung messen, bevor UI erweitert wird.

### Risiko

**Niedrig bis mittel.** Die Logik bleibt gleich, aber Memo-Abhaengigkeiten muessen exakt stimmen.

### Erwarteter Impact

- Weniger Renderarbeit bei Draft-Updates.
- Bessere Responsiveness auf mobilen Geraeten.
- Geringere Gefahr, dass Firestore-Subscription-Updates sichtbares UI-Jank erzeugen.

### Notwendige Tests

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:run`
- gezielt: `src/lib/online/fantasy-draft-service.test.ts`
- gezielt: `src/lib/online/fantasy-draft.test.ts`
- manuell: Positionsfilter, Sortierung, eigener Pick, fremder Pick, completed Draft

## 4. Typ: Verkleinerung

### Titel

Lokale Online-Actions aus `OnlineLeaguePlaceholder` herausziehen

### Betroffene Dateien

- `src/components/online/online-league-placeholder.tsx`
- optional neu: `src/components/online/online-local-action-handlers.ts`
- optional neu: `src/components/online/online-local-actions-panel.tsx`

### Problem

`OnlineLeaguePlaceholder` ist mit 1977 LOC die groesste Client-Komponente. Ein grosser Teil der Datei besteht aus lokalen Action-Handlern, die im Firebase-Modus sofort abbrechen:

- `src/components/online/online-league-placeholder.tsx:348-715`
- mindestens 14 wiederholte Branches `if (repository.mode === "firebase")`
- wiederholt dieselbe Meldung `firebaseLocalActionMessage`
- Beispiele: Strategy, Training, Contracts, Trades, Draft Prospect, Coaches, Media, Pricing

Diese Logik sitzt in der Haupt-League-Komponente, obwohl viele Actions im Firebase-MVP bewusst nicht serverseitig aktiv sind. Das vergroessert die Datei, erschwert Review und macht echte Dashboard-/Load-Probleme schwerer sichtbar.

### Loesung

Die lokalen Actions in eine getrennte Struktur ziehen:

- `OnlineLeaguePlaceholder` behaelt League Loading, Error State und die Auswahl, welcher Panelbereich sichtbar ist.
- Lokale Action-Handler gehen in `online-local-action-handlers.ts` oder einen Hook `useLocalOnlineLeagueActions`.
- Firebase-MVP-Guard wird als eine zentrale Funktion abgebildet, z. B. `guardFirebaseMvpAction(setFeedback)`.
- Panels, die nur im lokalen Expert-Modus nutzbar sind, in `OnlineLocalActionsPanel` kapseln.

Wichtig: Keine Funktion entfernen. Lokale Funktionalitaet bleibt erhalten, Firebase zeigt weiterhin klare Nicht-synchronisiert-Meldungen.

### Risiko

**Mittel.** Viele kleine UI-Actions haengen an Feedback-State und `setLeague`.

### Erwarteter Impact

- `OnlineLeaguePlaceholder` wird deutlich kleiner und fokussierter.
- Wiederholte Firebase-MVP-Branches verschwinden.
- Zukuenftige Firebase-Implementierungen einzelner Actions werden leichter, weil jede Action klar isoliert ist.

### Notwendige Tests

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:run`
- manuell lokal: Expert Mode an/aus, Training speichern, Trade/Contract lokale Warnungen
- manuell Firebase: gleiche Actions zeigen weiterhin keine Fake-Erfolgsmeldung

## 5. Typ: Verkleinerung

### Titel

Admin-League-Detail Actions und Tabellenzeilen konfigurativ zusammenfassen

### Betroffene Dateien

- `src/components/admin/admin-league-detail.tsx`
- optional neu: `src/components/admin/admin-league-action-config.ts`
- optional neu: `src/components/admin/admin-gm-actions-cell.tsx`

### Problem

`AdminLeagueDetail` ist mit 1761 LOC eine grosse Client-Komponente. Der Code enthaelt viele sehr aehnliche Handler und Buttons:

- einfache Admin Actions: `src/components/admin/admin-league-detail.tsx:437-529`
- GM-bezogene Actions: `src/components/admin/admin-league-detail.tsx:614-696`
- Tabellen-Buttons pro GM: `src/components/admin/admin-league-detail.tsx:1588-1721`

Die Handler unterscheiden sich oft nur durch:

- Action-ID
- API-Action-Name
- Success Message
- optional Confirm-/Prompt-Text
- Buttonfarbe/Label

Das ist reale Dopplung, keine Stilfrage. Jede neue Admin-Action braucht aktuell zusaetzlichen Handler- und JSX-Code.

### Loesung

Zwei kleine Konfigurationsschichten einfuehren:

1. `ADMIN_LEAGUE_ACTIONS` fuer ligaweite Actions:
   - `id`
   - `label`
   - `apiAction`
   - `successMessage`
   - optional `confirmMessage`
2. `ADMIN_GM_ACTIONS` fuer GM-Zeilenaktionen:
   - `id`
   - `label`
   - `apiAction`
   - `variant`
   - `buildPayload(user)`
   - optional `confirmMessage(user)`

Ein generischer Runner nutzt weiterhin `requestAdminAction()` und `runAdminAction()`. Kritische Aktionen behalten Confirm Dialoge. Keine Admin-Sicherheitslogik aendern.

### Risiko

**Mittel.** Admin-Actions sind mutierend; Konfiguration darf keine falschen Payloads erzeugen.

### Erwarteter Impact

- Weniger Handler-Boilerplate.
- Kuerzere und besser reviewbare Admin-Detail-Komponente.
- Einheitlichere Confirm-/Pending-/Feedback-Logik.
- Weniger Risiko, dass einzelne Buttons unterschiedliche Pending- oder Fehlermeldungslogik bekommen.

### Notwendige Tests

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:run`
- gezielt: `src/app/api/admin/online/actions/route.test.ts`
- gezielt: `src/lib/admin/online-admin-actions.test.ts`
- manuell Admin UI: Liga aktualisieren, Woche simulieren, Debug anzeigen, GM-Actions in Local/Firebase-Modus

## 6. Typ: Verkleinerung

### Titel

`online-league-service.ts` als Runtime-Barrel und Monolith reduzieren

### Betroffene Dateien

- `src/lib/online/online-league-service.ts`
- `src/lib/online/online-league-types.ts`
- `src/lib/online/online-league-draft-service.ts`
- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-detail-model.ts`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/admin/admin-league-manager.tsx`
- `src/lib/admin/online-admin-actions.ts`

### Problem

`online-league-service.ts` ist mit 8977 LOC die groesste Datei im Projekt und enthaelt 369 Kontrollfluss-Funde. In derselben Datei liegen:

- Type-Re-Exports (`export type * from "./online-league-types"`) bei `src/lib/online/online-league-service.ts:141`
- Runtime-Re-Exports fuer Draft, Schedule, Simulation und Week
- Default-Daten und Fixture-Erzeugung
- 89 Guard-/Normalize-Funktionen im Bereich etwa `src/lib/online/online-league-service.ts:653-3220`
- Online League Business Actions fuer Training, Contracts, Trades, Draft, Coaches, Media, Finance

Mehrere UI- und Admin-Dateien importieren direkt aus diesem Service-Barrel:

- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-detail-model.ts`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/admin/admin-league-manager.tsx`

Konkretes Beispiel: `OnlineFantasyDraftRoom` braucht Draft-Konstanten und Typen, importiert sie aber ueber `@/lib/online/online-league-service`, obwohl die Draft-Konstanten aus `online-league-draft-service.ts` re-exportiert werden.

### Loesung

In kleinen, sicheren Schritten verkleinern:

1. UI-Dateien, die nur Typen brauchen, auf `online-league-types.ts` umstellen.
2. UI-Dateien, die nur Draft-Konstanten brauchen, direkt auf `online-league-draft-service.ts` umstellen.
3. `online-league-service.ts` nicht mehr als allgemeines Import-Barrel fuer Client Components verwenden.
4. Danach fachliche Bereiche aus dem Monolith in bereits vorhandene oder neue Module schieben:
   - Contracts/Salary Cap
   - Trades
   - Training
   - Coaches
   - Media/Finance
   - Storage/Normalization

Das Ziel ist nicht ein Big-Bang-Refactor, sondern die Importflaeche und den Client-Bundle-Kontakt zum Monolithen Schritt fuer Schritt zu reduzieren.

### Risiko

**Mittel bis hoch.** Der Service ist stark vernetzt und viele Tests importieren aus ihm. Kleine Import-Schritte sind sicherer als ein grosser Split.

### Erwarteter Impact

- Kleinere Client-Abhaengigkeitsflaeche.
- Bessere Build-/Bundle-Kontrolle.
- Einfachere Reviews, weil Featurebereiche nicht mehr alle im 8977-LOC-Monolith liegen.
- Weniger Risiko, dass UI-Komponenten versehentlich grosse Runtime-Services importieren.

### Notwendige Tests

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run test:run`
- gezielt alle Online-Tests:
  - `src/lib/online/online-league-service.test.ts`
  - `src/lib/online/fantasy-draft.test.ts`
  - `src/lib/online/fantasy-draft-service.test.ts`
  - `src/lib/online/contracts-salary-cap.test.ts`
  - `src/lib/online/trade-system.test.ts`
  - `src/lib/online/training-system.test.ts`

## Empfohlene Reihenfolge

1. **Verbesserung 2** zuerst: Join-/Membership-Rules absichern, weil aktuell ein realer E2E-Blocker sichtbar ist.
2. **Verbesserung 1** danach: Online-League-Datenquelle konsolidieren, weil sie Kosten und Zustandsinkonsistenz reduziert.
3. **Verkleinerung 4**: lokale Online-Actions aus dem Placeholder ziehen, weil das die groesste Client-Komponente entschärft.
4. **Verbesserung 3**: Draft-Room Memoization als risikoarmer Performance-Fix.
5. **Verkleinerung 5**: Admin-Action-Konfiguration nachziehen.
6. **Verkleinerung 6** langfristig und in kleinen PRs: Online-Service-Monolith abbauen.

## Nicht empfohlene Quick-Wins

- `match-engine.ts`, `play-selection-engine.ts` und `outcome-resolution-engine.ts` nicht ohne dedizierte Simulation-Regression-Suite refactoren.
- `play-library.ts` nicht einfach mechanisch zerschneiden; die Datei ist gross, aber primär ein Play-Katalog. Ein Split bringt nur dann Nutzen, wenn Imports und Testfixtures davon profitieren.
- Keine Firestore Rules lockern, nur um E2E gruen zu bekommen. Der Join-Pfad muss korrekt modelliert werden.

Status: **Analyse abgeschlossen**.
