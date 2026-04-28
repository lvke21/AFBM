# Live Simulation Implementation Report

## Status
Grün

## Route / Screen
- Route: `/app/savegames/[savegameId]/game/live?matchId=[matchId]`
- Geprüfte E2E-Route: `/app/savegames/e2e-savegame-minimal/game/live?matchId=e2e-match-week-1`
- Zielscreen: Live Simulation / Game Center mit Drive-basierter Play-by-Play Timeline
- Einstieg: bestehende Live-Route wurde verbessert, keine neue Route angelegt

## Umgesetzte Komponenten
- `LiveMatchHeader`
  - Zeigt Teams, Score, Status, Week/Phase, Datum, Stadium und Drive-Anzahl.
- `FieldSituationPanel`
  - Zeigt Quarter/Phase, Clock, Possession, Down/Distance und Field Position.
  - Fehlende Snap-Daten werden klar als `Fallback` markiert.
- `PlayByPlayTimeline`
  - Zeigt chronologische Drive-Timeline.
  - Wichtige Drives werden visuell hervorgehoben: Touchdown, Turnover, Field Goal, Big Gain, Red Zone, Sack.
  - Empty-State ist sichtbar, wenn noch keine persistierten Drives vorhanden sind.
- `LiveControlPanel`
  - Leichte Control-Area mit bestehender `finishGameAction`.
  - Zeigt Setup-/Report-Navigation und klare Locked-Zustände.
- `MomentumFlowPanel`
  - Einfache Flow-Indikatoren aus Score, letztem Drive und den letzten Drives.
- `LiveSimulationModel`
  - Bündelt Scoreboard, Situation, Timeline, Control-State und Flow-Indikatoren in einen stabilen UI-Vertrag.

## Verwendete Datenquellen
- `loadGameFlowData`
  - Lädt Savegame, Season, Match, Manager-Team und Week State.
- `getMatchDetailForUser`
  - Matchstatus, Teams, Scores, Stadium, Week, Simulation-Timestamps, Teamstats, Player-Leader und persistierte Drives.
- `getSeasonOverviewForUser`
  - Kontext für automatische Matchauswahl.
- `getSaveGameFlowSnapshot`
  - Week-State und Savegame-Kontext.
- Bestehende Server Action:
  - `finishGameAction`

## UI-Fixtures / Fallbacks
- Down/Distance, Clock und Field Position sind im aktuellen Match-Read-Model nicht snap-genau vorhanden.
- Der Screen zeigt diese Felder deshalb als Fallback statt scheinbarer Echtzeitdaten.
- Die Play-by-Play Timeline nutzt persistierte Drive-Daten. Wenn keine Drives vorhanden sind, erscheint ein markierter Fallback-Empty-State.
- Momentum-Indikatoren fallen auf `Fallback` zurück, solange Score und Drives fehlen.

## Browser-/Screenshot-Review
Setup:
- E2E-Seed: `npm run test:e2e:seed`
- Dev-Server: `http://127.0.0.1:3100`
- Auth: `/api/e2e/dev-login`

Geprüfte Viewports:
- Desktop: `1440x1200`
- Mobile/narrow: `390x1200`

Screenshots:
- Desktop initial: `/tmp/afbm-live-simulation-desktop.png`
- Mobile initial: `/tmp/afbm-live-simulation-mobile.png`
- Desktop final: `/tmp/afbm-live-simulation-final-desktop.png`
- Mobile final: `/tmp/afbm-live-simulation-final-mobile.png`

Gefundene UI-/UX-Probleme:
- Die bestehende Live-Route war stark technisch: StatCards, GameCenterPanel, Finish-Form und DriveLog standen ohne klare Informationshierarchie nebeneinander.
- Empty-State fuer fehlende Drives war nicht stark genug als erwartbarer Datenzustand sichtbar.
- Locked-/Fallback-Texte nutzten anfangs zu technische Week-State-Formulierungen.
- Status-Badges wurden auf Mobile teilweise zu breit gestreckt.

Durchgeführte Verbesserungen:
- Screen-Reihenfolge stabilisiert: Game Flow Navigation -> Live Header -> Field Context + Control -> Timeline + Flow.
- Drive-basierte Play-by-Play Timeline als Hauptbereich eingeführt.
- Field/Situation-Daten sauber getrennt und fehlende Daten markiert.
- Locked-Copy nutzerorientiert formuliert.
- Status-Badges durch `w-fit` gegen Mobile-Stretching stabilisiert.
- Bestehende Finish-Action bleibt erhalten, aber in einer klaren Control-Area.

## Testresultate
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün
- `npx vitest run src/components/match/live-simulation-model.test.ts src/components/match/game-center-model.test.ts src/components/match/game-flow-model.test.ts`
  - Ergebnis: Grün, 3 Testdateien, 12 Tests
- `npx vitest run src/components/match/live-simulation-model.test.ts src/components/match/game-center-model.test.ts src/components/match/game-flow-model.test.ts 'src/app/app/savegames/[savegameId]/week-actions.test.ts'`
  - Ergebnis: Grün, 4 Testdateien, 19 Tests
- Browser-/Screenshot-Review
  - Ergebnis: Grün, Desktop und Mobile geprüft

## Offene Punkte
- Es gibt aktuell keine native Snap-für-Snap Play-by-Play-Historie im Read-Model dieser Route.
- Down/Distance, Clock und Field Position bleiben Fallbacks, bis vorhandene Engine-Daten in das Match-Read-Model aufgenommen werden.
- Die E2E-Fixture enthält keine persistierten Drives; Timeline-Verhalten mit echten Drives ist über Model-Tests abgesichert.
- Die globale App Shell zeigt auf Mobile weiterhin die Sidebar vor dem eigentlichen Screen. Das ist ein screenübergreifendes Shell-Thema.

## Statusprüfung
- Live-Route identifiziert und genutzt: Ja
- Match Header umgesetzt: Ja
- Field Context / Situation Panel umgesetzt: Ja
- Play-by-Play Timeline umgesetzt: Ja, drive-basiert
- Control / Decision Area umgesetzt: Ja, leichtgewichtig und mit bestehender Action
- Momentum / Flow Indicators umgesetzt: Ja, datenbasiert mit Fallback
- Keine Game Engine Änderungen: Ja
- Keine Outcome-Logik geändert: Ja
- Keine Datenmodelländerungen: Ja
- Keine neuen Dependencies: Ja

Status: Grün
