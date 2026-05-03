# Performance Work Packages

## Ziel

Konkrete Arbeitspakete fuer Performance-Verbesserungen, priorisiert nach Risiko, Aufwand und Nutzen. Die Pakete sind so geschnitten, dass zuerst Messbarkeit und kleine sichere Schritte kommen, danach groessere Architekturarbeiten.

## Quick Wins

### QW-P1: Development Read Metrics fuer `subscribeToLeague()`

Ziel:
- Sichtbar machen, wie oft Listener feuern und wie viele Snapshot-Reads daraus entstehen.

Betroffene Dateien:
- `src/lib/online/repositories/firebase-online-league-repository.ts`

Konkrete Aenderung:
- Nur im Development-Modus zaehlen:
  - Listener-Events pro Datenbereich.
  - `getSnapshot()`-Aufrufe.
  - Array-Groessen fuer Teams, Memberships, Picks, Available Players.

Risiko:
- Niedrig, wenn Logs nur Development-guarded sind.

Akzeptanz:
- Keine Produktionslogs mit sensiblen Daten.
- Messwerte im Browser/Console nachvollziehbar.

### QW-P2: Memoized Standings-/Record-Map im Online App Shell

Ziel:
- Results-Fallback nicht bei jedem Render neu scannen.

Betroffene Dateien:
- `src/components/online/online-league-app-shell.tsx`

Konkrete Aenderung:
- `standingsByTeamId` und Fallback-Records per `useMemo`.
- Keine Aenderung an Labels oder Verhalten.

Risiko:
- Niedrig-Mittel wegen Statuslogik.

Tests:
- Dashboard Record-Label mit gespeicherten Standings.
- Dashboard Record-Label nur aus Match Results.

### QW-P3: Admin Debug Panels lazy mounten

Ziel:
- Seltene Debug-Ansichten nicht rendern, solange sie geschlossen sind.

Betroffene Dateien:
- `src/components/admin/admin-league-detail.tsx`
- ggf. Admin-Display-Komponenten.

Konkrete Aenderung:
- Debug-Bereich nur bei aktivem Toggle mounten.
- Keine Action-/Confirm-Logik anfassen.

Risiko:
- Niedrig.

Tests:
- Debug Toggle zeigt dieselben Inhalte.
- Admin Actions unveraendert.

### QW-P4: Client-Import Guard fuer Server-only Module

Ziel:
- Verhindern, dass `firebase-admin` oder Engine-Servermodule in Client-Bundles geraten.

Betroffene Dateien:
- `package.json`
- ggf. `scripts/analysis/*`

Konkrete Aenderung:
- Read-only Check-Script:
  - `rg "firebase-admin" src/components src/app`
  - `rg "@/lib/firebase/admin" src/components src/app`
  - optional Engine-Importliste.

Risiko:
- Niedrig.

### QW-P5: Bundle-Report dokumentieren

Ziel:
- Wiederholbare Bundle-Groessen fuer Release-Checks.

Betroffene Dateien:
- `docs/reports/full-project-analysis/05-performance/bundle-and-build-analysis.md`
- optional `package.json` fuer read-only Script.

Konkrete Aenderung:
- Noch kein schwerer Analyzer zwingend.
- Erst Next Build Output und `.next`-Artefaktgroessen standardisiert dokumentieren.

Risiko:
- Niedrig.

## Groessere Arbeitspakete

### PERF-1: Subscription Profile fuer Online League

Ziel:
- `subscribeToLeague()` in nutzungsbasierte Profile aufteilen.

Profile:
- `core`: League, Teams, Memberships, Events.
- `draft`: Draft State, Picks, Available Players.
- `week`: Schedule, Results, Standings.
- `admin`: Debug-/Membership-/Repair-Daten.

Betroffene Dateien:
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/components/online/online-league-route-state.tsx`
- Online Dashboard/Draft/Admin-Aufrufer.

Nicht-Ziele:
- Kein Firestore-Schema-Umbau in diesem Schritt.
- Keine UI-Aenderung.

Risiko:
- Mittel-Hoch, weil Live-Datenfluss betroffen ist.

Nutzen:
- Hohe Reduktion von Firestore Reads und Re-Renders.

### PERF-2: Results/Standings normalisieren

Ziel:
- Historisch wachsende Ergebnisse nicht immer als grosse Arrays im Haupt-League-Dokument transportieren.

Moegliche Struktur:
- `leagues/{leagueId}/weeks/{week}/games`
- `leagues/{leagueId}/standings/{teamId}`
- kompakte Summary im League-Dokument.

Nicht-Ziele:
- Keine Migration ohne Backup/Backfill.
- Keine Production-Daten ungeprueft veraendern.

Risiko:
- Hoch.

Nutzen:
- Sehr hoch fuer Week Simulation, Reload und langfristige Liga-Historie.

### PERF-3: Grosse Client-Komponenten weiter schneiden

Ziel:
- Re-Render-Flache und Review-Komplexitaet reduzieren.

Betroffene Dateien:
- `online-league-placeholder.tsx`
- `admin-league-detail.tsx`
- `depth-chart-view.tsx`
- `roster-table.tsx`

Vorgehen:
- Nur Display-Komponenten und lokale Handler-Hooks.
- Keine Fachlogik oder Service-Calls verschieben, solange Scope unklar ist.

Risiko:
- Mittel.

Nutzen:
- Mittel-Hoch fuer Wartbarkeit und Render-Stabilitaet.

### PERF-4: Route-spezifisches Lazy Loading

Ziel:
- Seltene Panels und schwere Bereiche erst laden, wenn Nutzer sie oeffnet.

Kandidaten:
- Admin Debug.
- Admin Membership Repair/Diagnostics.
- Online Advanced Local Actions.
- Grosse Savegame-Detailbereiche.

Risiko:
- Mittel.

Nutzen:
- Mittel fuer First Load JS und Interaktionslatenz.

### PERF-5: Firestore Lobby Summary Denormalisierung

Ziel:
- Available Leagues / Lobby ohne pro Liga Teams-Subcollection lesen.

Betroffene Daten:
- `teamCount`
- `occupiedTeamCount`
- `currentWeek`
- `status`
- `hasOpenTeams`

Risiko:
- Mittel-Hoch wegen Denormalisierung und Sync-Regeln.

Nutzen:
- Hoch, sobald mehrere Ligen sichtbar sind.

### PERF-6: Simulation Job Model

Ziel:
- Admin Week Simulation als serverseitigen Job mit Status, Lock und Result Summary behandeln.

Nutzen:
- Bessere Fehlerbehandlung.
- Keine langen UI-Requests.
- Bessere Retry-/Monitoring-Moeglichkeiten.

Risiko:
- Hoch.

Nicht-Ziele:
- Keine neue Simulation Engine.
- Keine Playoff-Logik.

### PERF-7: Player Lists virtualisieren

Ziel:
- Virtualisierung fuer grosse globale Spielerlisten, Free Agents und Admin Player Views.

Nicht noetig fuer:
- Normale 53er Team-Roster.

Risiko:
- Mittel, weil Tabellenhoehen, Keyboard-Navigation und Mobile Layout betroffen sind.

Nutzen:
- Hoch fuer Player Pool Views.

## Priorisierte Reihenfolge

1. QW-P1: Messen, bevor groesser umgebaut wird.
2. QW-P2: Record-/Standings-Fallback memoizen.
3. QW-P3: Admin Debug lazy mounten.
4. QW-P4/QW-P5: Bundle- und Import-Gates.
5. PERF-1: Subscription Profile.
6. PERF-3: Grosse Client-Komponenten weiter schneiden.
7. PERF-4: Route-spezifisches Lazy Loading.
8. PERF-5/PERF-2: Firestore-Datenmodell gezielt normalisieren.
9. PERF-6: Simulation Job Model.
10. PERF-7: Virtualisierung fuer zukuenftige grosse Player Views.

## Go/No-Go fuer Performance-Arbeit

Aktueller Stand:
- Keine akute Performance-Blockade fuer kleine Staging-MVP-Ligen.
- Nicht ausreichend abgesichert fuer viele parallele Ligen, lange Historien oder grosse globale Spielerlisten.

Empfehlung:
- Weiterentwicklung ist moeglich.
- Vor breiter Multiplayer-Nutzung sollten mindestens QW-P1 bis QW-P5 und PERF-1 umgesetzt werden.
