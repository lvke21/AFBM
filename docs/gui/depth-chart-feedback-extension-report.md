# Depth Chart Feedback Extension Report

## Status
Gruen

## Ziel
Depth-Chart-Aenderungen sollen fuer Nutzer spuerbar werden. Nach einem Move zeigt das UI nicht nur, dass die Reihenfolge gespeichert wurde, sondern auch, welche Lineup-Auswirkung aus den vorhandenen Ratings ableitbar ist.

## Umgesetzte Erweiterungen

### Vorher/Nachher Vergleich
- `moveDepthChartPlayerForUser` ermittelt vor und nach dem Move die Slot-1-Positionsstaerke der betroffenen Position.
- Grundlage ist das vorhandene `positionOverall` der Roster-/Player-Evaluation.
- Die Action gibt `starterOverallBefore`, `starterOverallAfter`, `playerOverall` und `swappedWithPlayerOverall` an das Feedback-System weiter.
- Beispielhafte Anzeige: `Positionsstaerke 74 -> 82 (+8)`.
- Der Vergleich wird sowohl bei `Slot hoch` / `Slot runter` als auch bei der direkten Depth-Chart-Speicherung verwendet.

### Kontext im Feedback
- `src/lib/actions/decision-effects.ts` enthaelt eigene Depth-Chart-Feedback-Builder:
  - `buildDepthChartLineupEvaluation`
  - `buildDepthChartLineupEffects`
  - `buildDepthChartLineupImpact`
  - `buildDepthChartLineupValueFeedback`
- Die Bewertung nutzt nur vorhandene Daten:
  - Slot-Bewegung
  - vorhandene Spieler-Ratings
  - Positionsgruppe
- Beispiele:
  - `Passing leicht verbessert`
  - `Passing Risiko steigt`
  - `Run/Protection bleibt stabil`
- Das strukturierte Value Feedback bleibt beim bestehenden Vertrag:
  - `impact: "positive" | "neutral" | "negative"`
  - `reason: string`
  - `context?: string`

### Dashboard Integration
- Persistierte `DEPTH_CHART`-History-Events werden im Dashboard Decision Feedback als letzte Lineup-Aenderungen angezeigt.
- Wenn die History-Beschreibung eine `Bewertung:` enthaelt, wird diese als kurze Dashboard-Begruendung verwendet.
- Fallbacks bleiben stabil, falls alte Events noch keine Bewertung enthalten.

### Game Preview Indicator
- Der Game Preview State zeigt optional `Lineup Update`, wenn seit dem letzten abgeschlossenen Spiel eine Depth-Chart-Aenderung passiert ist.
- Positive Bewertungen erscheinen als Strength Signal.
- Risiko-Hinweise wie `Risiko steigt` oder offene Starter erscheinen als Risk Signal.

## Geaenderte Dateien
- `src/lib/actions/decision-effects.ts`
- `src/lib/actions/decision-effects.test.ts`
- `src/app/app/savegames/[savegameId]/team/actions.ts`
- `src/app/app/savegames/[savegameId]/team/actions.test.ts`
- `src/modules/teams/application/team-roster.service.ts`
- `src/modules/teams/infrastructure/team-management.repository.ts`
- `src/components/dashboard/dashboard-model.ts`
- `src/components/dashboard/dashboard-model.test.ts`
- `src/components/match/game-preview-model.ts`
- `src/components/match/game-preview-model.test.ts`
- `e2e/depth-chart.spec.ts`

## Tests
- `npx tsc --noEmit`
  - Ergebnis: Gruen
- `npm run lint`
  - Ergebnis: Gruen
- `npx vitest run src/lib/actions/decision-effects.test.ts 'src/app/app/savegames/[savegameId]/team/actions.test.ts' src/modules/teams/application/team-roster.service.test.ts src/components/dashboard/dashboard-model.test.ts src/components/match/game-preview-model.test.ts`
  - Ergebnis: Gruen, 5 Testdateien, 64 Tests
  - Geprueft: positive, neutrale und negative Depth-Chart-Bewertungen, Action-Redirects, Dashboard-Historie und Game-Preview-Indikator
- `E2E_PORT=3143 npm run test:e2e:depth-chart`
  - Ergebnis: Gruen, 1 Playwright-Test
  - Geprueft: Roster -> Depth Chart -> Slot-Aenderung -> sichtbares Feedback mit Prioritaet, Positionsstaerke und Value Feedback -> Rueckweg zum Roster

Hinweis: Der erste E2E-Lauf in der Sandbox scheiterte an `tsx` IPC (`listen EPERM`). Der gleiche Test wurde danach ausserhalb der Sandbox erfolgreich ausgefuehrt.

## Bekannte Grenzen
- Es wurde keine Team-OVR-Neuberechnung eingefuehrt.
- Der Vorher/Nachher-Vergleich nutzt bewusst die Positionsstaerke des Slot-1-Spielers als einfache, nachvollziehbare Proxy-Metrik.
- Die Bewertung gilt fuer die betroffene Positionsgruppe, nicht fuer eine komplette Game-Engine-Simulation.
- Alte History-Events ohne `Bewertung:` bleiben lesbar, liefern aber nur generische Dashboard-Begruendungen.

## Statuspruefung
- Vorher/Nachher Vergleich sichtbar: Ja
- Kontext im Action Feedback sichtbar: Ja
- Dashboard zeigt letzte Lineup-Aenderungen mit Kurzbewertung: Ja
- Game Preview zeigt Lineup-Aenderung seit letztem Spiel: Ja
- Keine Game-Engine-Aenderung: Ja
- Keine neue Berechnungslogik im Engine-Sinn: Ja
- Tests gruen: Ja

Status: Gruen
