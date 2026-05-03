# Render Performance

## Ziel der Analyse

Bewertung der React/Next.js Render-Risiken: unnoetige Re-Renders, grosse Client-Komponenten, fehlende Memoization, grosse Listen und teure Berechnungen im Renderpfad.

## Untersuchte Dateien/Bereiche

- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-app-shell.tsx`
- `src/components/online/online-league-route-state.tsx`
- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/online/online-league-detail-model.ts`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/team/roster-table.tsx`
- `src/components/team/depth-chart-view.tsx`
- `src/components/team/depth-chart-model.ts`
- `src/components/dashboard/dashboard-model.ts`

## Render-Hotspots

### 1. Online League Placeholder

Datei: `src/components/online/online-league-placeholder.tsx`

Risiko:
- Sehr grosse Client-Komponente mit vielen lokalen UI-States.
- Action-Feedback, Ready-State, Advanced-Actions, Team-Claims, Media-Expectation, Modal-/Panel-Zustaende und Dashboard-Rendering liegen nah beieinander.
- Jeder State-Wechsel kann grosse Teile des Baums neu rendern.

Aktueller positiver Zustand:
- Route-State ist inzwischen zentralisiert.
- Viele Anzeige-Bloecke wurden teilweise in separate Komponenten ausgelagert.

Empfehlung:
- Keine grosse JSX-Migration auf einmal.
- Als naechstes nur nicht-kritische Display-Sektionen mit kleinen Props extrahieren.
- Derived State per `useMemo` stabilisieren, besonders League-Detail-State und team-/week-basierte Maps.

### 2. Admin League Detail

Datei: `src/components/admin/admin-league-detail.tsx`

Risiko:
- Grosse Client-Komponente fuer Liga-Uebersicht, Teams, Memberships, Week-Simulation, Debug-Infos und Admin-Actions.
- Viele nicht immer sichtbare Informationen werden in einer Route gebuendelt.
- Confirm-/Mutation-Logik sollte stabil bleiben, aber Display-Panels koennen weiter entkoppelt werden.

Empfehlung:
- Debug- und reine Anzeige-Sektionen nur mounten, wenn sichtbar.
- Weitere Display-Komponenten extrahieren.
- Mutierende Actions nicht in generische Render-Configs pressen.

### 3. Online League App Shell

Datei: `src/components/online/online-league-app-shell.tsx`

Risiko:
- Berechnet spielbare Roster, Draft-Status und Team-Record-Fallbacks aus dem gesamten League-Objekt.
- Fallback fuer Team Record scannt `matchResults`, wenn keine Standings vorhanden sind.

Empfehlung:
- `standingsByTeamId` einmal memoized ableiten.
- Record-Fallback aus `matchResults` nur memoized berechnen.
- Fuer grosse Ligen nicht bei jeder Navigation erneut scannen.

### 4. Roster Table

Datei: `src/components/team/roster-table.tsx`

Risiko:
- Filter/Sort ueber Roster und Rendering fuer Desktop-/Mobile-Ansichten.
- Keine Virtualisierung.
- Fuer 53 Spieler akzeptabel, fuer groessere Player-Pools nicht.

Empfehlung:
- Aktuell keine sofortige Virtualisierung noetig, solange nur aktive Team-Roster angezeigt werden.
- Bei Free-Agent-/All-Player-Views Virtualisierung oder Pagination einplanen.
- Sort-/Filter-Modell weiter stabil per `useMemo` halten.

### 5. Depth Chart

Dateien:
- `src/components/team/depth-chart-view.tsx`
- `src/components/team/depth-chart-model.ts`

Risiko:
- Viele Gruppierungen nach Position, Slot, Status und Readiness.
- `detectDepthChartConflicts`, `getDepthChartGroups` und Readiness-Ableitungen arbeiten ueber den Kader.

Empfehlung:
- Fuer 53 Spieler akzeptabel.
- Bei haeufigen Drag-/Move-Interaktionen koennen Konflikt- und Gruppenberechnung teuer werden.
- Reine Helper mit kleinen Unit-Tests erhalten, dann gezielt memoizen.

### 6. Draft Room

Dateien:
- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/online/online-fantasy-draft-room-model.ts`

Aktueller positiver Zustand:
- Virtualisierte Tabelle vorhanden.
- Kritische Ableitungen wie verfuegbare Spieler, gepickte Spieler, eigener Roster und Positionscounts sind memoized.

Restrisiko:
- `deriveAvailableDraftPlayers` sortiert ueber den Player Pool.
- Bei sehr grossem Pool oder schnellen Draft-Events kann diese Ableitung haeufig laufen.

Empfehlung:
- Aktuelle Loesung beibehalten.
- Erst nach Profiling weitere Indexe einfuehren.

## Fehlende oder schwache Memoization

| Bereich | Risiko | Empfehlung |
| --- | --- | --- |
| Online Detail State | Grosses Objekt wird aus League/User abgeleitet. | `useMemo` an League/User-Grenze pruefen und dokumentieren. |
| Team Record Labels | Fallback scannt Results. | Standings-/Results-Map memoizen. |
| Admin Debug Daten | Selten sichtbar, potenziell gross. | Lazy mounten. |
| Roster/Depth Chart | Gruppierung und Sortierung pro Statewechsel. | Bestehende Model-Helper weiterhin memoized aufrufen. |
| Dashboard Models | Viele Sorts/Maps fuer Cards. | Datenmodell-Maps wiederverwenden. |

## Listen und Tabellen

| Liste/Tabelle | Groesse heute | Risiko | Empfehlung |
| --- | ---: | --- | --- |
| Draft Player Pool | ca. 500 Spieler | Bereits virtualisiert, gutes Muster. | Beibehalten. |
| Team Roster | ca. 53 Spieler | Noch ok. | Keine sofortige Virtualisierung. |
| Depth Chart | ca. 53 Spieler, mehrfach gruppiert | Mittel bei Interaktion. | Memoization statt Virtualisierung. |
| Admin Teams/Memberships | 8-16 Teams heute | Niedrig-Mittel. | Kein grosser Umbau. |
| Future Free Agents | 80+ bis mehrere hundert | Mittel-Hoch. | Vor Implementierung virtualisieren. |

## Top Render-Risiken

1. Grosse Client-Komponenten als breite Re-Render-Flache.
2. Breite League-Objekt-Updates triggern viele Anzeige-Ableitungen.
3. Seltene Panels werden nicht konsequent lazy gerendert.
4. Einige Fallbacks scannen Results/Standings im UI-Pfad.
5. Roster-/Depth-Chart-Modelle sind korrekt, aber bei haeufigen Interaktionen potenziell teuer.

## Empfehlungen

1. Keine pauschale Memoization einbauen.
2. Zuerst League-Objekt-Fanout messen: Welche Komponenten rendern bei Firestore-Updates neu?
3. Grosse Views weiter in kleine Display-Komponenten mit stabilen Props schneiden.
4. Draft Room als positives Muster fuer virtuelle Listen verwenden.
5. Admin-Debug und seltene Bereiche lazy mounten.
