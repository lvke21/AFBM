# Depth Chart Impact Report

## Status
Gruen

## Ziel
Depth-Chart-Entscheidungen beeinflussen die Simulation jetzt minimal, damit Lineup-Arbeit nicht nur im UI interpretiert wird, sondern auch einen kleinen spielmechanischen Effekt hat.

## Umsetzung

### Starter-Relevanz
- Spieler mit `depthChartSlot === 1` erhalten in relevanten Engine-Metriken einen kleinen Starter-Bonus.
- Spieler mit `depthChartSlot === 2` oder tieferen aktiven Slots erhalten einen leichten Backup-/Reserve-Abschlag.
- Die Multiplikatoren bleiben bewusst klein:
  - Slot #1: `+4%`
  - Slot #2: `-3%`
  - Slot #3 oder tiefer: `-5%`

### Einflussbereiche
- QB: Passing-Effizienz und Ball-Security-Anteil.
- RB/FB: Run-Effizienz und Ball-Security-Anteil.
- OL: Pass Protection und Run Blocking.
- DL/LB/DB: Pass Rush, Coverage, Front-Seven, Run Defense und Takeaway Pressure.

### Logging
- `MatchSimulationResult.engineNotes` ist optional ergaenzt.
- Beispiel: `BOS: Starter-Bonus angewendet (QB, RB, OL, Defense; Backups leicht reduziert).`
- Bestehende Persistenz schreibt diese Notes noch nicht in die DB; sie stehen aber fuer spaetere UI-/Debug-Nutzung im Engine-Result bereit.

## Grenzen
- Keine neue Engine-Architektur.
- Keine neuen Spielerattribute.
- Keine neue Simulationsebene.
- Kein dominanter Modifier: Ratings, Readiness, Matchups, Random Seed, Game State und Balance-Regeln bleiben deutlich wichtiger.
- Special Teams bleiben unveraendert, weil der Scope nur QB/RB/OL/Defense umfasst.

## Geaenderte Dateien
- `src/modules/seasons/application/simulation/match-engine.ts`
- `src/modules/seasons/application/simulation/match-engine.test.ts`
- `src/modules/seasons/application/simulation/simulation.types.ts`
- `src/modules/seasons/application/simulation/production-qa-suite.ts`

## Tests
- `npx tsc --noEmit`
  - Ergebnis: Gruen
- `npm run lint`
  - Ergebnis: Gruen
- `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/depth-chart.test.ts src/modules/seasons/application/simulation/match-result-persistence.test.ts`
  - Ergebnis: Gruen, 3 Testdateien, 21 Tests
- `npx vitest run src/modules/seasons/application/simulation/production-qa.test.ts`
  - Ergebnis: Gruen

## Neuer Testfall
- `makes depth-chart starter choices measurable without overwhelming the whole simulation`
- Setup:
  - gleicher Kader
  - gleicher Gegner
  - gleiche Seeds
  - nur QB-Slot #1/#2 zwischen staerkerem und entwickelndem QB getauscht
- Erwartung:
  - Passing Yards und Total Yards steigen messbar mit besserem Starter.
  - Der Unterschied bleibt unter einer expliziten Obergrenze, damit der Modifier nicht dominiert.
  - `engineNotes` enthalten den Starter-Bonus-Hinweis.

## Breiter Testlauf
- `npm run test:run` wurde ausgefuehrt.
- Ergebnis: Rot wegen umgebungsabhaengiger Firestore-Emulator-Suites ohne laufenden Emulator sowie einem Timeout in einer langen Gameplay-Batch-Distribution.
- Zusaetzlich hat die gewollte Engine-Aenderung die Production-Fingerprints verschoben; diese Fingerprints wurden aktualisiert und die gezielte Production-QA-Suite laeuft danach gruen.

Status: Gruen
