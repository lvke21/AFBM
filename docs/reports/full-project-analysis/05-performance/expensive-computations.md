# Expensive Computations

## Ziel der Analyse

Identifikation teurer Berechnungen in Renderpfaden, View-Modellen, Simulationen und Daten-Mapping.

## Untersuchte Bereiche

- `src/components/online/online-league-detail-model.ts`
- `src/components/online/online-fantasy-draft-room-model.ts`
- `src/components/online/online-league-app-shell.tsx`
- `src/components/dashboard/dashboard-model.ts`
- `src/components/team/roster-model.ts`
- `src/components/team/depth-chart-model.ts`
- `src/lib/online/types.ts`
- `src/lib/online/online-league-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/modules/gameplay/*`
- `src/modules/seasons/application/simulation/*`

## Wichtige teure Muster

### 1. Map/Filter/Sort in Online Detail Models

Datei: `src/components/online/online-league-detail-model.ts`

Beobachtung:
- Viele Ableitungen fuer Dashboard, Teams, Week State, Results, Standings, Draft, Ready-State und Navigation.
- Wiederholte Sorts und Map-Erzeugungen sind fachlich sauber, koennen aber bei jedem League-Objektwechsel neu laufen.

Risiko:
- Breite Firestore-Updates erzeugen ein neues League-Objekt.
- Danach koennen viele Derived States neu berechnet werden, auch wenn nur ein kleiner Teil geaendert wurde.

Empfehlung:
- Zentrale Maps einmal erzeugen:
  - `teamsById`
  - `membersByUserId`
  - `standingsByTeamId`
  - `resultsByWeek`
- Detailmodelle aus diesen Maps ableiten.

### 2. Results-/Standings-Fallbacks

Datei: `src/components/online/online-league-app-shell.tsx`

Beobachtung:
- Wenn keine Standings vorhanden sind, wird aus `matchResults` ein Team Record berechnet.

Risiko:
- Korrekt als Fallback, aber bei wachsender Historie teurer.

Empfehlung:
- Fallback memoized pro `matchResults` berechnen.
- Langfristig Standings immer persistiert und normalisiert bereitstellen.

### 3. Draft Player Pool

Datei: `src/components/online/online-fantasy-draft-room-model.ts`

Beobachtung:
- `deriveAvailableDraftPlayers` filtert und sortiert ueber den Spielerpool.
- Bei ca. 500 Spielern ist das akzeptabel.
- Draft Room ist bereits virtualisiert.

Risiko:
- Bei groesserem Player Pool oder hoher Pick-Frequenz kann Sortieren zum Hotspot werden.

Empfehlung:
- Erst messen.
- Falls noetig Positions-/Rating-Indexe im Model einfuehren.

### 4. Roster Filter/Sort

Dateien:
- `src/components/team/roster-table.tsx`
- `src/components/team/roster-model.ts`

Beobachtung:
- Filter nach Position, Status, Role, Rating-Tier.
- Sort nach Cap, Position, Overall, Status.

Risiko:
- Fuer 53 Spieler niedrig.
- Fuer Free-Agent- oder All-Player-Listen mittel.

Empfehlung:
- Kein grosser Umbau fuer Team-Roster.
- Fuer globale Spielerlisten direkt Virtualisierung/Pagination einplanen.

### 5. Depth Chart Gruppierung

Datei: `src/components/team/depth-chart-model.ts`

Beobachtung:
- Sortierung nach Position/Slot/Overall.
- Konflikterkennung via Gruppierung.
- Readiness- und Auto-Fill-Signale.

Risiko:
- Bei jeder Kader-/Statusaenderung koennen mehrere Durchlaeufe ueber den Kader entstehen.

Empfehlung:
- Korrekt als reine Helper halten.
- In UI nur memoized aufrufen.
- Bei Drag-and-drop spaeter debouncen oder optimistic diffing nutzen.

### 6. Dashboard Model

Datei: `src/components/dashboard/dashboard-model.ts`

Beobachtung:
- Viele Card- und Summary-Ableitungen.
- Sorts/Maps ueber Teams, Saves, Ergebnisse und Statusdaten.

Risiko:
- Dashboard ist Einstiegsseite und sollte leicht bleiben.

Empfehlung:
- Keine schweren Online-/Admin-Daten laden, bevor der Nutzer den Pfad waehlt.
- Savegames und Online-League-Status getrennt und lazy laden.

### 7. Firestore Snapshot Mapping

Datei: `src/lib/online/types.ts`

Beobachtung:
- Firestore-Dokumente werden in `OnlineLeague` gemappt.
- Dabei werden Draft Picks, Available Players, Teams, Memberships und Events transformiert.

Risiko:
- Mapping laeuft nach jedem vollen Snapshot.
- Grosse Arrays erhoehen CPU und Garbage Collection im Browser.

Empfehlung:
- Granulare Snapshot-Updates oder profilbasierte Subscriptions.
- Bei unveraenderten Subcollections Referenzen stabil halten, wenn machbar.

### 8. Week Simulation Standings

Datei: `src/lib/online/online-league-week-simulation.ts`

Beobachtung:
- Standings werden aus Spielen/Results berechnet.
- Server-seitig sinnvoll, aber bei Re-Simulation/Retry muss doppelte Zaehlen verhindert werden.

Risiko:
- Weniger UI-Performance, mehr Konsistenz-/Write-Performance.

Empfehlung:
- Server-seitig belassen.
- Results/Standings normalisieren und transaktionssicher schreiben.

### 9. Match Engine

Dateien:
- `src/modules/seasons/application/simulation/match-engine.ts`
- `src/modules/gameplay/application/play-selection-engine.ts`
- `src/modules/gameplay/application/outcome-resolution-engine.ts`
- `src/modules/gameplay/infrastructure/play-library.ts`

Beobachtung:
- Sehr grosse Engine- und Play-Library-Module.
- Simulation kann viele Plays/Entscheidungen berechnen.

Risiko:
- Server-CPU und Build-/Parse-Zeit.
- Bundle-Risiko, falls Client-Import entsteht.

Empfehlung:
- Engine serverseitig halten.
- Keine Simulation im Client-Renderpfad.
- Fuer Admin Week Simulation langfristig Job-/Queue-Modell pruefen.

## Top teure Berechnungen

1. Vollstaendiges Mapping eines Online-League-Snapshots.
2. Detail-State-Ableitungen aus dem gesamten League-Objekt.
3. Draft Available Players Filter/Sort ueber Player Pool.
4. Results/Standings-Fallback aus `matchResults`.
5. Depth-Chart-Konflikt- und Readiness-Berechnungen.
6. Roster Sort/Filter bei groesseren Listen.
7. Dashboard Summary Maps/Sorts.
8. Week Simulation Standings-Updates.
9. Match Engine Play-by-Play-Simulation.
10. Admin-Action-Datenaufbereitung fuer Teams/Memberships/Debug.

## Empfehlungen

1. Derived Data nicht global optimieren, sondern an Firestore-Snapshot-Grenzen messen.
2. Wo Daten historisch wachsen, Maps und week-spezifische Indizes nutzen.
3. Simulation konsequent aus Client-Routen fernhalten.
4. View-Model-Helper rein und testbar halten.
5. Virtualisierung nur fuer Listen mit klar groesserem Umfang als Team-Roster.
