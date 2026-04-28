# Depth Chart Outcome Integration Report

## Status
Gruen

## Ziel
Depth-Chart-Entscheidungen werden nicht mehr nur als gespeicherte Aktion gezeigt, sondern im UI als moegliche Folge im Spielverlauf eingeordnet. Alle Aussagen sind bewusst als Ableitung aus vorhandenen Daten markiert.

## Umgesetzte Bereiche

### Gemeinsamer Outcome-Interpreter
- Neue Datei: `src/components/match/lineup-outcome-model.ts`
- Nutzt vorhandene Daten:
  - `TeamDetail.recentDecisionEvents`
  - gespeicherte Match-Stats
  - gespeicherte Drive-Daten
  - Season Match Summary fuer Dashboard-Rueckblick
- Keine Engine-Aenderung, keine neue Simulation, keine neuen Datenmodelle.
- Ausgaben enthalten Formulierungen wie `Abgeleitet aus Lineup-Historie und Spielberichtsdaten`.

### Match Report
- `buildPostGameReportState` nimmt optional `teamDetail` entgegen.
- Wenn vor dem Spiel eine Depth-Chart-Aenderung existiert, wird im `Team Impact` ein `Lineup Outcome` eingefuegt.
- Beispiele:
  - `Ausgezahlt`, wenn die betroffene Phase mit besseren Stats korrespondiert.
  - `Risiko sichtbar`, wenn ein negatives Lineup-Signal und schwache Outcome-Daten zusammenfallen.
- Key Moments koennen zusaetzlich einen abgeleiteten Lineup-Kontext anzeigen, wenn der neue Starter am Drive beteiligt war oder die Positionsphase zum Drive passt.

### Play-by-Play / Live Timeline
- `buildLiveSimulationState` nimmt optional `teamDetail` entgegen.
- Wichtige Drives erhalten optional `lineupContext`.
- Beispiele:
  - `Neuer Lineup-Fokus Alex Carter war an diesem wichtigen Drive beteiligt.`
  - `QB-Lineup-Entscheidung passt zu diesem Passing-Drive.`

### Dashboard Rueckblick
- `buildDashboardDecisionFeedbackItems` kann nun `season` verwenden.
- Nach einem Spiel wird ein `Lineup Rueckblick` erzeugt, wenn seit der letzten Lineup-Aenderung ein abgeschlossenes Spiel des Manager-Teams vorliegt.
- Die Bewertung bleibt vorsichtig und nutzt das Ergebnis:
  - gewonnen: `hat sich im Ergebnis ausgezahlt`
  - verloren: `hat den Ergebnis-Rueckschlag nicht verhindert`
  - unentschieden/unklar: `bleibt uneindeutig`

### Game Preview Rueckkopplung
- Negative Lineup-Entscheidungen erscheinen im Preview als `Lineup Warning`.
- Positive/unkritische Aenderungen bleiben `Lineup Update`.
- Beschreibung ist als Ableitung markiert und zeigt die letzte Bewertung, z. B. `Passing Risiko steigt`.

## Geaenderte Dateien
- `src/components/match/lineup-outcome-model.ts`
- `src/components/match/post-game-report-model.ts`
- `src/components/match/post-game-report-model.test.ts`
- `src/components/match/post-game-key-moments.tsx`
- `src/components/match/live-simulation-model.ts`
- `src/components/match/live-simulation-model.test.ts`
- `src/components/match/play-by-play-timeline.tsx`
- `src/components/match/game-preview-model.ts`
- `src/components/match/game-preview-model.test.ts`
- `src/components/match/team-impact-panel.tsx`
- `src/components/dashboard/dashboard-model.ts`
- `src/components/dashboard/dashboard-model.test.ts`
- `src/app/app/savegames/[savegameId]/page.tsx`
- `src/app/app/savegames/[savegameId]/game/live/page.tsx`
- `src/app/app/savegames/[savegameId]/game/report/page.tsx`

## Tests
- `npx tsc --noEmit`
  - Ergebnis: Gruen
- `npm run lint`
  - Ergebnis: Gruen
- `npx vitest run src/components/match/post-game-report-model.test.ts src/components/match/live-simulation-model.test.ts src/components/match/game-preview-model.test.ts src/components/dashboard/dashboard-model.test.ts`
  - Ergebnis: Gruen, 4 Testdateien, 43 Tests

## Abgedeckte Szenarien
- Match Report erzeugt `Lineup Outcome`, wenn eine Depth-Chart-Aenderung vor dem Spiel existiert.
- Key Moment zeigt Starter-Bezug, wenn der neue Lineup-Fokus an einem wichtigen Drive beteiligt war.
- Live Timeline zeigt denselben abgeleiteten Starter-/Positionskontext.
- Dashboard zeigt nach abgeschlossenem Spiel einen Lineup-Rueckblick.
- Game Preview warnt bei negativer letzter Lineup-Entscheidung.
- Fehlende Lineup-Historie bleibt stabil und erzeugt keine Fake-Folge.

## Grenzen
- Es wird keine Kausalitaet behauptet. Das UI formuliert bewusst `abgeleitet` und `korrespondiert`.
- Es gibt keine neue Snap-by-Snap-Analyse, weil der aktuelle Read-Model-Stand Drive-Level-Daten nutzt.
- Team-OVR oder Engine-Outcomes werden nicht neu berechnet.
- Bei fehlenden Stats faellt der Report auf Score-/Fallback-Kontext zurueck.

## Statuspruefung
- Match Report erweitert: Ja
- Play-by-Play Kontext sichtbar: Ja
- Dashboard Rueckblick nach Spiel: Ja
- Game Preview Warnung fuer negative letzte Entscheidung: Ja
- Nur vorhandene Daten interpretiert: Ja
- Keine Engine-Aenderung: Ja
- Tests gruen: Ja

Status: Gruen
