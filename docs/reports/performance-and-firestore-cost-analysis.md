# Performance and Firestore Cost Analysis

Stand: 2026-05-01

## Executive Summary

Der groesste Performance- und Kostenhebel liegt aktuell nicht in der Simulation, sondern im Online-League-Frontend: Die League-Ansicht laedt und abonniert Daten mehrfach, waehrend einzelne Views sehr breite Client Components mit vielen lokalen States und abgeleiteten Listen enthalten.

Die kritischsten Befunde:

- `/online/league/[leagueId]` hat mit ca. 292 kB First Load JS den schwersten untersuchten Einstieg.
- `OnlineLeagueAppShell` und `OnlineLeaguePlaceholder` laden bzw. subscriben dieselbe Liga parallel. Dadurch koennen auf einer League-Seite doppelte Firestore-Listener entstehen.
- `subscribeToLeague` erstellt pro League-View bis zu sieben Live-Listener: League, Memberships, Teams, Draft, Picks, Available Players und Events.
- Draft- und Roster-Listen berechnen groessere Datenmengen im Renderpfad, z. B. Filter/Sort ueber den gesamten Spielerpool vor `slice(0, 120)`.
- Die groessten Client Components sind schwer wartbar und beguenstigen unnoetige Re-Renders.
- Die echte Week-Simulation ist ueber Admin/API weitgehend serverseitig angebunden. UI-Thread-Simulation ist vor allem bei Demo-/Match-Komponenten ein Risiko, nicht der Hauptpfad.

Gesamtbewertung: **Gelb**. Das System ist funktional, aber Firebase-Kosten und Renderzeit koennen bei mehr Nutzern, groesseren Spielerpools oder laenger offenen Admin-/Online-Sessions schnell steigen.

## Messbasis

Statische Zaehlung im Projekt:

| Signal | Fundstellen |
| --- | ---: |
| `onSnapshot(` | 27 |
| `getDoc(` | 47 |
| `getDocs(` | 13 |
| `setDoc(` | 50 |
| `updateDoc(` | 18 |
| `runTransaction(` | 20 |
| `writeBatch(` | 2 |
| `subscribeTo...` | 31 |
| `useState` | 171 |
| `useEffect` | 52 |
| `useMemo` | 46 |
| `useCallback` | 8 |
| `localStorage` | 9 |

Groesste Client Components nach Zeilen:

| Datei | Zeilen | Risiko |
| --- | ---: | --- |
| `src/components/online/online-league-placeholder.tsx` | 1977 | sehr viele States, viele UI-Pfade, eigene League-Subscription |
| `src/components/admin/admin-league-detail.tsx` | 1761 | grosse Admin-Client-Komponente, viele Daten-/Action-Zustaende |
| `src/components/admin/admin-control-center.tsx` | 749 | Admin-Hub mit vielen Bereichen in einer Client-Komponente |
| `src/components/match/live-simulation-flow.tsx` | 640 | UI-nahe Simulationsdarstellung |
| `src/components/team/roster-table.tsx` | 600 | grosse Tabellen-/Listenansicht |
| `src/components/admin/admin-league-manager.tsx` | 586 | Liga-Liste/Formular/Admin-Actions |
| `src/components/online/online-league-search.tsx` | 526 | Online-Hub-/Join-Flow |

Build-Beobachtung:

| Route | First Load JS | Bemerkung |
| --- | ---: | --- |
| `/online/league/[leagueId]` | ca. 292 kB | teuerste League-Route |
| `/app/savegames` | ca. 289 kB | Einstieg laedt viel Client-/Auth-Kontext |
| `/online/league/[leagueId]/draft` | ca. 276 kB | Draft teilt grosse Online-Abhaengigkeiten |
| `/admin/league/[leagueId]` | ca. 265 kB | Admin-Detailseite clientlastig |
| `/admin` | ca. 264 kB | Admin Control Center clientlastig |
| Shared First Load JS | ca. 102 kB | Baseline akzeptabel, aber Route-Chunks addieren deutlich |

## Top Performance Bottlenecks

### 1. Doppelte Online-League-Subscriptions

Betroffene Dateien:

- `src/components/online/online-league-app-shell.tsx`
- `src/components/online/online-league-placeholder.tsx`
- `src/lib/online/repositories/firebase-online-league-repository.ts`

`OnlineLeagueAppShell` laedt User und Liga, ruft `getLeagueById` auf und oeffnet anschliessend `subscribeToLeague`. `OnlineLeaguePlaceholder` macht fuer dieselbe Route erneut User-/League-Loading und ebenfalls `subscribeToLeague`.

Auswirkung:

- bis zu zwei aktive Subscriptions fuer denselben League-Snapshot
- doppelte Initial Reads
- doppelte Re-Renders bei jedem Firestore-Update
- hoeheres Risiko fuer inkonsistente Zwischenzustaende

Erwarteter Nutzen einer Optimierung: **hoch**. Eine zentrale Online-League-Data-Source kann Reads, Listener und Re-Renders unmittelbar reduzieren.

Risiko: **mittel**, weil League-Kontext, Dashboard-Status und Child-Komponenten sauber umgehaengt werden muessen.

Messbarkeit:

- Anzahl aktiver `onSnapshot` Listener pro Route
- Firestore Emulator Read Count beim Oeffnen einer League
- React Profiler Commit Count fuer `/online/league/[leagueId]`
- Zeit bis League-Dashboard sichtbar ist

### 2. Zu breiter `subscribeToLeague` Fanout

Betroffene Datei:

- `src/lib/online/repositories/firebase-online-league-repository.ts`

`subscribeToLeague` registriert mehrere Listener gleichzeitig:

- League-Dokument
- `memberships`
- `teams`
- `draft`
- `draft/picks`
- `draft/availablePlayers`
- `events` mit Limit 20

Das ist fuer eine Draft- oder Admin-Detailseite nachvollziehbar, aber fuer alle League-Views zu teuer. Nach completed Draft braucht ein Dashboard normalerweise nicht dauerhaft `availablePlayers` und alle Picks live.

Auswirkung:

- jedes League-Update kann mehrere Subcollection-Reads ausloesen
- Draft-Pool mit ca. 500 Spielern ist als Live-Subcollection teuer
- mehrere offene Tabs vervielfachen Listener-Kosten
- Admin- und Spieleransicht konkurrieren um dieselben Daten

Erwarteter Nutzen: **hoch**.

Risiko: **hoch**, weil eine phasenabhaengige Subscription-Strategie das Datenmodell der Views beruehrt.

Messbarkeit:

- Listener pro View und Phase
- Reads beim Dashboard-Load vs. Draft-Route
- Reads nach Draft completion
- Kostenvergleich vor/nach Subscription-Split

### 3. Vollstaendige Snapshots fuer Views mit kleinem Datenbedarf

Betroffene Datei:

- `src/lib/online/repositories/firebase-online-league-repository.ts`

`getSnapshot` laedt League, Memberships, Teams, Events, Draft, Picks und Available Players. Fuer Dashboard, Sidebar, Continue/Rejoin oder einfache Statusanzeigen reichen oft deutlich kleinere Projektionen.

Auswirkung:

- Online-Flow liest mehr als fuer Permission/Navigation noetig
- Member-spezifische Loads koennen durch Mirror-/Membership-Fallbacks zusaetzliche Reads erzeugen
- breite Snapshots erschweren Cache- und Memo-Strategien

Erwarteter Nutzen: **mittel bis hoch**.

Risiko: **mittel**, weil zu aggressive Reduktion fehlende Daten in bestehenden Views verursachen kann.

Messbarkeit:

- Reads pro Flow: Continue, Liga suchen, Dashboard, Draft
- Payload-Groesse je Repository-Methode
- Anzahl geladener Spieler/Picks auf Nicht-Draft-Seiten

### 4. Draft-Room berechnet grosse Listen im Renderpfad

Betroffene Datei:

- `src/components/online/online-fantasy-draft-room.tsx`

Die verfuegbaren Spieler werden im Renderpfad aus `playerPool` gefiltert, mehrfach gefiltert und sortiert. Erst danach wird auf 120 Spieler begrenzt. Dazu kommen abgeleitete Listen fuer gepickte Spieler, eigenes Roster, Positionszaehler und Teamnamen.

Auswirkung:

- jeder Draft-/Subscription-Update triggert teure Array-Arbeit
- Sortierung ueber den vollen Spielerpool bleibt teuer, obwohl nur 120 Eintraege angezeigt werden
- bei 500+ Spielern heute noch tragbar, bei groesseren Pools oder mobilen Geraeten spuerbar

Erwarteter Nutzen: **mittel bis hoch**.

Risiko: **niedrig bis mittel**, da Memoization und Indexierung ohne Verhaltenaenderung moeglich sind.

Messbarkeit:

- React Profiler Commit Duration
- `performance.mark` um Filter/Sort
- FPS/Interaction Delay beim Positionsfilter

### 5. Sehr grosse Client Components

Betroffene Dateien:

- `src/components/online/online-league-placeholder.tsx`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/admin/admin-league-manager.tsx`

Diese Komponenten enthalten viele UI-Zustaende, Actions, Loading/Error-Pfade und Datenformate in einer Datei. Das erschwert gezielte Memoization und beguenstigt Re-Renders grosser Teilbaeume.

Auswirkung:

- kleine State-Aenderungen invalidieren grosse UI-Bereiche
- schwer vorhersehbare Renderkosten
- schwierige Bundle-Splits
- hoehere Regressiongefahr bei Performance-Fixes

Erwarteter Nutzen: **mittel**.

Risiko: **mittel**, wenn strukturell refactored wird; **niedrig**, wenn zunaechst nur Panels extrahiert und memoisiert werden.

Messbarkeit:

- React Profiler: Welche Subtrees rendern bei welchen Actions?
- Chunk-Groesse vor/nach Dynamic Imports
- Component LOC und Props-Flaeche

### 6. Admin-UI laedt viele selten genutzte Bereiche sofort

Betroffene Dateien:

- `src/components/admin/admin-control-center.tsx`
- `src/components/admin/admin-league-detail.tsx`

Debug, Simulation, League-Details und Listen werden in grossen Client-Komponenten kombiniert. Ein Admin braucht Debug-Details oder Simulationsergebnisse nicht zwingend beim ersten Paint.

Auswirkung:

- groessere Route-Chunks
- laengerer Hydration-Pfad
- langsamere Interaktion auf schwachen Geraeten

Erwarteter Nutzen: **mittel**.

Risiko: **niedrig bis mittel**, wenn Debug-/Detail-Panels lazy geladen werden.

Messbarkeit:

- First Load JS `/admin` und `/admin/league/[leagueId]`
- Hydration Time
- Interaction-to-Next-Paint nach Admin-Load

### 7. Savegames-Einstieg ist fuer einen Startscreen schwer

Betroffene Route:

- `/app/savegames`

Der Einstieg liegt bei ca. 289 kB First Load JS. Fuer einen zentralen Startscreen ist das hoch, besonders wenn Auth-/Online-/Admin-Widgets direkt mitgeladen werden.

Auswirkung:

- First-Time Experience wird durch Hydration-Kosten belastet
- Online/Admin-Abhaengigkeiten koennen Offline-Nutzer mitbezahlen

Erwarteter Nutzen: **mittel**.

Risiko: **mittel**, weil Auth-State und UX-Flow nicht beschaedigt werden duerfen.

Messbarkeit:

- Route chunk size
- Time to Interactive
- Anzahl Firebase/Auth Imports im Startscreen

### 8. Tabellen und grosse Listen ohne klare Render-Budgets

Betroffene Dateien:

- `src/components/team/roster-table.tsx`
- `src/components/draft/draft-overview-screen.tsx`
- `src/components/trades/trade-board.tsx`
- Online Draft-/Roster-Views

Roster-, Draft-, Trade- und Player-Listen koennen wachsen. Aktuell ist nicht ueberall ersichtlich, ob Pagination, Windowing oder Memoized Row Rendering verwendet wird.

Auswirkung:

- spaetere Datenmengen verursachen Render-Jank
- Filter/Sort koennen unbemerkt in den Renderpfad wandern

Erwarteter Nutzen: **mittel**.

Risiko: **niedrig**, wenn zuerst gemessen und nur Hotspots optimiert werden.

Messbarkeit:

- Row Count pro View
- Renderzeit bei 500/1000/2000 Spielern
- React Profiler Row Re-render Count

### 9. UI-Thread-Simulation in Demo-/Match-Komponenten

Betroffene Dateien:

- `src/components/match/minimal-match-result-demo.tsx`
- `src/components/match/live-simulation-flow.tsx`

Die produktive Multiplayer-Week-Simulation ist serverseitig ueber Admin/API angebunden. Trotzdem existieren clientnahe Simulations-/Demo-Komponenten. Diese sollten nicht versehentlich in produktive, haeufig besuchte Pfade gezogen werden.

Auswirkung:

- UI-Jank bei komplexerer Simulation
- groessere Route-Chunks, wenn Engine-Code clientseitig importiert wird
- unklare Trennung zwischen Demo und produktivem Server-Flow

Erwarteter Nutzen: **niedrig bis mittel**.

Risiko: **niedrig**, wenn Demos lazy oder dev-only gehalten werden.

Messbarkeit:

- Client bundle imports der Simulation Engine
- Main-thread long tasks im Matchscreen
- Build analyzer fuer Match-Routen

## Top Firebase-Kostenrisiken

### 1. Doppelte Listener pro League-Seite

Kostenrisiko: **sehr hoch**. Wenn zwei Komponenten denselben League-State subscriben, verdoppeln sich Listener und Read-Events fast direkt.

Optimierung:

- eine zentrale `OnlineLeagueProvider`-/Hook-Quelle pro Route
- Child-Komponenten erhalten Snapshot/Actions ueber Context oder Props
- Repository-Subscription nur einmal pro League-View starten

Messbarkeit:

- Dev-Telemetrie fuer `onSnapshot:start` und `onSnapshot:stop`
- Firestore Emulator Usage beim Route-Load

### 2. Draft Available Players als Live-Listener

Kostenrisiko: **hoch**. Ein Pool mit ca. 500 Spielern ist als Live-Subcollection fuer Dashboard-Views teuer, besonders wenn nur Draft-Route oder Admin-Debug ihn braucht.

Optimierung:

- Draft-Pool nur auf Draft-Seite subscriben
- nach `draft.status === completed` nur Summary/Free-Agent-Count laden
- fuer Such-/Filter-UI paginierte Queries statt kompletter Live-Liste pruefen

Messbarkeit:

- Reads beim Oeffnen des Dashboards mit completed Draft
- Reads beim Oeffnen der Draft-Route
- Payload-Groesse `availablePlayers`

### 3. Broad Snapshot statt View-spezifischer Projektion

Kostenrisiko: **hoch**. `getSnapshot` laedt grosse Datenbloecke auch fuer Views, die nur Permission, Team und League-Metadaten brauchen.

Optimierung:

- kleine Repository-Methoden fuer:
  - League Header
  - Membership/Team Assignment
  - Dashboard Summary
  - Draft Data
  - Admin Detail
- keine parallele Datenstruktur, nur bewusst kleinere Reads aus der bestehenden Struktur

Messbarkeit:

- Reads je Flow
- Dokumentanzahl je Repository-Aufruf
- P95 Load Time fuer Online Hub und League Dashboard

### 4. Lobby und Membership-Suche koennen dauerhaft subscriben

Kostenrisiko: **mittel**. `subscribeToAvailableLeagues` verbindet verfügbare Ligen und aktuelle User-Memberships. Fuer einen Hub ist das sinnvoll, sollte aber beim Verlassen sicher beendet werden und nicht parallel zu League-Detail-Subscriptions laufen.

Optimierung:

- Subscription-Lifecycle strikt an sichtbare Route binden
- Hub-Listen ggf. initial als `getDocs` laden und nur bei Bedarf live halten
- Retry/Refresh-Button statt permanenter Listener, wenn Echtzeit nicht noetig ist

Messbarkeit:

- aktive Listener nach Navigation Hub -> League -> Dashboard
- Unsubscribe-Logs in Dev

### 5. Admin-Detail und Admin-Liste koennen mehr lesen als noetig

Kostenrisiko: **mittel**. Admins brauchen viele Daten, aber nicht jeder Admin-Tab braucht sofort Memberships, Teams, Draft, Games, Debug und Standings.

Optimierung:

- Admin-Detail in Tabs/Sektionen mit lazy Data Load splitten
- Debug-Daten erst beim Oeffnen des Debug-Panels laden
- Simulationsergebnis und Schedule getrennt laden

Messbarkeit:

- Reads beim initialen `/admin`
- Reads beim Oeffnen einer Liga
- Reads beim Oeffnen von Debug

### 6. Wiederholte Fehler-/Recovery-Reads

Kostenrisiko: **mittel**. Ungueltige `lastLeagueId`, kaputte Memberships oder Mirror-Fallbacks koennen wiederholt League-, Membership- und Team-Reads ausloesen.

Optimierung:

- lokale Recovery-States nach einem fehlgeschlagenen Load sauber setzen
- `lastLeagueId` erst nach erfolgreicher Membership validieren
- fehlende Mirror-Daten nicht bei jedem normalen Load reparieren, sondern dedizierte Repair-Pfade nutzen

Messbarkeit:

- Reads bei fehlender Membership
- Anzahl wiederholter Permission-Fails pro Session
- lokale Storage-Korrekturen pro Login

### 7. Write-Kosten durch haeufige UI-Actions

Kostenrisiko: **mittel**. Das Projekt enthaelt viele `setDoc`-/`updateDoc`-Pfade. Kritisch sind UI-Actions, die bei Doppelklick, mehrfachen Statuswechseln oder Draft-/Week-Updates mehrfach schreiben.

Optimierung:

- idempotente Action-Keys
- Buttons waehrend Requests deaktivieren
- Transaktionen fuer Statuswechsel
- Debounce nur fuer echte Eingabefelder, nicht fuer kritische Mutationen

Messbarkeit:

- Writes pro Simulate Week
- Writes pro Join/Rejoin
- Writes pro Draft Pick
- Fehlerquote bei parallelen Requests

## Konkrete Optimierungen

| Prioritaet | Optimierung | Erwarteter Nutzen | Risiko | Messbarkeit |
| --- | --- | --- | --- | --- |
| P1 | Online-League-Subscription in einen Provider konsolidieren | sehr hoch: weniger Reads, weniger Re-Renders | mittel | Listener Count, Reads beim League-Load |
| P1 | `subscribeToLeague` in Core/Draft/Admin/Event-Subscriptions splitten | hoch: deutlich geringere Live-Kosten | hoch | Reads nach View/Phase |
| P1 | Dev-only Firestore-Telemetrie einfuehren | hoch: Kosten werden sichtbar | niedrig | Counter pro Flow |
| P2 | Draft-Room Listen memoizieren und indizieren | mittel/hoch: weniger Renderarbeit | niedrig/mittel | React Profiler, Sort-Dauer |
| P2 | Admin Debug/Details lazy laden | mittel: kleinere Route-Chunks | niedrig/mittel | First Load JS, Hydration |
| P2 | View-spezifische Repository-Reads definieren | mittel/hoch: weniger unnötige Reads | mittel | Docs pro Flow, Load Time |
| P3 | Bundle Analyzer und Route Budgets etablieren | mittel: Regressionen sichtbar | niedrig | Bundle Report pro Build |
| P3 | Tabellen/List Rendering messen, dann ggf. virtualisieren | mittel: stabil bei grossen Daten | mittel | Renderzeit bei grosser Fixture |
| P3 | Savegames Entry weiter entkoppeln | mittel: schnellerer Einstieg | mittel | First Load JS `/app/savegames` |
| P3 | Demo-Simulation clientseitig lazy/dev-only halten | niedrig/mittel | niedrig | Client-Bundle Imports |

## Messbarkeit und Instrumentierung

Empfohlene Metriken:

- `firestore.getDoc.count`
- `firestore.getDocs.count`
- `firestore.onSnapshot.active`
- `firestore.onSnapshot.started`
- `firestore.onSnapshot.stopped`
- `firestore.write.count`
- `onlineLeague.load.ms`
- `onlineLeague.snapshot.documents`
- `draftRoom.filterSort.ms`
- `adminLeague.load.ms`
- `savegames.load.ms`

Empfohlene Messpunkte:

- Online Hub: Erstes Laden, Liga suchen, Rejoin
- League Dashboard: initialer Load, Reload, Navigation zu Draft
- Draft: Positionsfilter, Pick-Update, Wechsel eigener/anderer Pick
- Admin: `/admin`, `/admin/league/[leagueId]`, Debug Panel, Week Simulation
- Savegames: First-Time User ohne Saves, Returning User mit Saves, Logout/Login

Die Telemetrie sollte strikt dev-/staging-only sein und keine Secrets oder personenbezogenen Daten loggen. Fuer Firestore-Kosten reicht eine Zaehlung von Operationstyp, Collection/Feature-Label und Flow-Name.

## Empfohlene Umsetzungsprompts

### AP-PF1: Online-League-Subscription konsolidieren

Rolle: Senior React/Firebase Performance Engineer

Aufgabe: Entferne doppelte Firestore-Subscriptions in der Online-League-Ansicht. Baue eine zentrale Datenquelle fuer `/online/league/[leagueId]`, sodass `OnlineLeagueAppShell` und Child-Komponenten denselben Snapshot verwenden.

Akzeptanz:

- pro League-Seite nur eine Core-League-Subscription
- kein doppeltes `subscribeToLeague` durch Shell und Placeholder
- Join/Rejoin, Dashboard, Draft-Link und Reload bleiben funktional
- Firestore-Listener-Zahl ist messbar reduziert

### AP-PF2: Phase-aware Firestore Subscriptions

Rolle: Senior Firebase Cost Optimizer

Aufgabe: Teile `subscribeToLeague` in Core-, Draft-, Events- und Admin-Subscriptions auf. Dashboard soll nicht dauerhaft Draft Available Players subscriben, wenn der Draft abgeschlossen ist oder die Draft-Route nicht offen ist.

Akzeptanz:

- Core Dashboard laedt League, Membership, Teams und notwendige Summary
- Draft-Daten werden nur auf Draft-/Admin-Draft-Views geladen
- Completed Draft laedt keine 500 Available Players live fuer normale Dashboard-Ansichten
- Tests fuer active/completed Draft und fehlende Draft-Daten

### AP-PF3: Firestore Cost Telemetry fuer Dev/Staging

Rolle: Senior Observability Engineer

Aufgabe: Fuehre dev-only Metriken fuer Firestore Reads, Writes und aktive Listener ein. Die Metriken sollen pro Flow auslesbar sein, ohne Production-Overhead und ohne personenbezogene Daten.

Akzeptanz:

- Counters fuer `getDoc`, `getDocs`, `onSnapshot`, `setDoc`, `updateDoc`, `runTransaction`
- Listener Start/Stop wird korrekt gezaehlt
- Debug-Ausgabe nur in Development/Staging
- kein Logging von Tokens, E-Mails oder Secrets

### AP-PF4: Draft-Room Renderpfad optimieren

Rolle: Senior Frontend Performance Engineer

Aufgabe: Memoiziere abgeleitete Draft-Daten in `online-fantasy-draft-room.tsx`: Picked Player IDs, verfuegbare Spieler, eigenes Roster, Positionszaehler und Teamnamen-Index.

Akzeptanz:

- keine Verhaltensaenderung
- Filter/Sort laeuft nur bei relevanten Input-Aenderungen
- Positionsfilter bleibt identisch
- React Profiler zeigt weniger Renderarbeit bei Pick-/Filter-Updates

### AP-PF5: Admin Debug und Detailbereiche lazy laden

Rolle: Senior Next.js Performance Engineer

Aufgabe: Reduziere initiale Admin-Bundle-Kosten durch lazy geladene Debug-/Detailbereiche. Admin-Sicherheit und API-Guards bleiben unveraendert.

Akzeptanz:

- `/admin` und `/admin/league/[leagueId]` bleiben funktional
- Debug-Daten werden erst beim Oeffnen des Debug-Bereichs geladen
- First Load JS der Admin-Routen sinkt messbar
- keine Secrets in Debug-Output

### AP-PF6: View-spezifische Online Repository Reads

Rolle: Senior Firebase Data Model Engineer

Aufgabe: Definiere kleine, kompatible Repository-Methoden fuer Online-Hub, Membership-Pruefung, Dashboard-Summary, Draft-Daten und Admin-Detail. Bestehende Datenstruktur bleibt erhalten.

Akzeptanz:

- Online Hub laedt keine unnoetigen Draft-Spieler
- Dashboard laedt nur benoetigte Summary-Daten
- Draft-Route laedt weiterhin vollstaendige Draft-Daten
- Tests fuer Legacy-Ligen ohne neue Summary-Felder

### AP-PF7: Bundle Analyzer und Route Budgets

Rolle: Build Performance Engineer

Aufgabe: Fuehre Bundle-Analyse und dokumentierte Route-Budgets ein. Ziel ist nicht sofortige Reduktion, sondern Regressionsschutz.

Akzeptanz:

- lokaler Analyzer-Command vorhanden
- Report zeigt groesste Route-Chunks und Shared Chunks
- Budgets fuer `/app/savegames`, `/online/league/[leagueId]`, `/admin`
- Dokumentation, wie Bundle-Deltas bewertet werden

### AP-PF8: Tabellen- und Listen-Performance messen

Rolle: Senior UI Performance Engineer

Aufgabe: Messe Roster-, Draft-, Trade- und Player-Listen mit grossen Fixtures. Entscheide danach, ob Memoized Rows, Pagination oder Virtualisierung noetig sind.

Akzeptanz:

- Messfixtures fuer 500/1000/2000 Spieler
- dokumentierte Renderzeiten
- keine Virtualisierung ohne nachgewiesenen Bedarf
- keine Aenderung an Game-/Firestore-Logik

### AP-PF9: Savegames Entry Bundle reduzieren

Rolle: Senior Next.js Frontend Engineer

Aufgabe: Analysiere, welche Firebase-/Online-/Admin-Abhaengigkeiten im Savegames-Einstieg sofort geladen werden. Entkopple selten genutzte Bereiche vorsichtig.

Akzeptanz:

- Startscreen bleibt UX-kompatibel
- Auth-Zustand bleibt sichtbar
- Online/Admin-Actions bleiben erreichbar
- First Load JS sinkt messbar oder Analyse begruendet, warum nicht

### AP-PF10: LocalStorage/Remote-Sync Recovery budgetieren

Rolle: Senior Multiplayer Reliability Engineer

Aufgabe: Stelle sicher, dass ungueltige `lastLeagueId`-/Membership-Zustaende nicht wiederholt teure Firestore-Recovery-Loops ausloesen.

Akzeptanz:

- ungueltige lokale IDs werden nach validiertem Fehler bereinigt
- Rejoin bleibt fuer bestehende Manager stabil
- keine Memberships werden geloescht oder ueberschrieben
- Read-Anzahl bei defektem lokalen Zustand ist begrenzt

## No-Go-Bereiche fuer Performance-Arbeiten

Diese Bereiche sollten nicht ohne gezielte Regressionstests veraendert werden:

- Firebase Auth/Admin-Rechte und UID-Allowlist
- Membership-/leagueMembers-Mirror-Logik
- Auto-Draft- und Manager-Team-Zuordnung
- Week-Simulation und Firestore-Transaktionslogik
- Draft-Pick-Validierung
- Singleplayer-Simulation Engine
- bestehende Seed-/Finalize-Scripts fuer Staging

## Empfehlung

Die ersten drei Massnahmen sollten sein:

1. **AP-PF3 Firestore Cost Telemetry**: macht die Kosten sichtbar und reduziert Blindflug.
2. **AP-PF1 Online-League-Subscription konsolidieren**: groesster direkter Kosten- und Renderhebel.
3. **AP-PF4 Draft-Room Renderpfad optimieren**: risikoarmer Frontend-Quick-Win.

Danach sollte **AP-PF2 Phase-aware Subscriptions** folgen. Diese Massnahme hat vermutlich den groessten Langzeitnutzen, ist aber riskanter und braucht vorher bessere Messbarkeit.

Status: **Gelb**. Es gibt keine akute Blockade, aber klare Skalierungs- und Kostenrisiken in den Online-/Firebase-Flows.
