# PROMPT 10.3 - Simulation & Stabilitaetstests

Datum: 2026-04-22
Rolle: Simulation Engineer
Status: Gruen

## Ziel

Pruefung der erweiterten Play Library unter realer Engine-Nutzung:

- zufaellige Play Selection
- Offense-vs-Defense-Kombinationen
- 500-Snap-Simulationsbatch
- Stabilitaet ohne Crashes, Exceptions oder Endlosschleifen
- Plausibilitaet von Run/Pass-Balance, Erfolgsraten und Extremwerten

## Durchgefuehrte Pruefungen

### 1. Custom 500-Snap Batch

Seeded Simulationsbatch ueber 8 Situationscluster:

- `early-down-neutral`: 150
- `shot-window`: 50
- `third-short`: 75
- `third-medium`: 75
- `third-long`: 75
- `red-zone`: 50
- `four-down-territory`: 15
- `two-minute`: 10

Alle Snaps liefen durch:

- `DefaultPlaySelectionEngine`
- `validatePreSnapStructure(...)`
- `DefaultOutcomeResolutionEngine`

### 2. Regression-Tests

Ausgefuehrt:

- `npm run test:run -- src/modules/gameplay/application/play-library-service.test.ts src/modules/gameplay/application/play-selection-engine.test.ts src/modules/gameplay/application/outcome-resolution-engine.test.ts src/modules/gameplay/application/pre-snap-legality-engine.test.ts src/modules/gameplay/application/gameplay-calibration.test.ts`

Ergebnis:

- `5/5` Testdateien gruen
- `50/50` Tests gruen

## Simulationsergebnisse

### Aggregate Batch-Metriken (500 Snaps)

- Plays: `500`
- Exceptions: `0`
- Illegal pre-snap snapshots: `0`
- Touchdowns: `21`
- Yards per play: `6.314`
- Success rate: `57.2%`
- Turnover rate: `1.6%`
- Run rate: `35.2%`
- Completion rate: `60.19%`
- Sack rate: `5.86%`
- Interception rate: `1.85%`
- Explosive run rate: `7.95%`
- Explosive pass rate: `13.27%`
- First-down rate: `48.6%`

### Selection-Abdeckung

- Offense plays im Katalog: `29`
- Defense plays im Katalog: `26`
- Genutzte Offense plays: `29/29`
- Genutzte Defense plays: `26/26`
- Einzigartige Offense-vs-Defense-Kombinationen: `359`

Interpretation:

- Die zufaellige Play Selection funktioniert ueber die komplette Library.
- Die Library wird nicht auf wenige sichere Calls zusammengedrueckt.
- Die neue Breite ist praktisch nutzbar, nicht nur formal vorhanden.

## Situationale Plausibilitaet

### Offense-Tendenzen

- Early down bleibt run-/RPO-nah: `ZONE_RUN`, `OPTION_RPO`, `PLAY_ACTION`
- Third short ist klar kurz-yardage-orientiert: `GAP_RUN`, `DESIGNED_QB_RUN`, `OPTION_RPO`
- Third medium kippt in `QUICK_PASS` und `SCREEN`
- Third long ist stark passlastig mit `SCREEN`, `QUICK_PASS`, `DROPBACK`
- Two-minute zeigt `EMPTY_TEMPO` als Top-Familie

### Defense-Tendenzen

- Early down: `MATCH_COVERAGE`, `ZONE_COVERAGE`, `SIMULATED_PRESSURE`
- Third short: `RUN_BLITZ`, `ZERO_PRESSURE`, `RED_ZONE_PACKAGE`
- Third long: `SIMULATED_PRESSURE`, `FIRE_ZONE`, `MAN_COVERAGE`
- Red zone: `BRACKET_SPECIALTY` und `RED_ZONE_PACKAGE` fuehren das Menu

Interpretation:

- Die Family-Verteilungen reagieren sichtbar auf Down, Distance und Clock-Kontext.
- Offense- und Defense-Profile bleiben coach-plausibel.
- Die neuen Families sind im Live-Selection-Pfad angekommen.

## Extremwerte und Auffaelligkeiten

### Keine technischen Fehler

- keine Crashes
- keine Exceptions
- keine Endlosschleifen
- keine verbleibenden Legality-Probleme

### Sportlich auffaellige, aber akzeptable Ausreisser

- Max gain: `24` Yards
- Max loss: `-9` Yards
- Longest run: `17` Yards
- Longest pass: `24` Yards
- Outlier-Ereignisse im Batch: `30`

Bewertung:

- Die Ausreisser bleiben in einem kontrollierten Rahmen.
- Es gibt keine unrealistischen 40- bis 70-Yard-Spikes aus dem Nichts.
- Negative Extremwerte sind fast ausschliesslich saubere Sack-/Turnover-Faelle.

### Gefundener echter Modellfehler

Bei der Analyse fiel eine Inkonsistenz in der Feldpositions-Semantik auf:

- `ballOnYardLine` wird in der Outcome-Engine als Fortschritt von `0 -> 100` interpretiert
- Red-Zone-Helfer verwendeten teils Werte wie `15` oder `16`
- Das war unvereinbar mit `fieldZone = LOW_RED_ZONE`
- Folge: Red-Zone-Snaps konnten Touchdowns unplausibel unterdruecken

Korrigiert in:

- [gameplay-calibration.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/gameplay-calibration.ts:543)
- [play-library-service.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-library-service.ts:214)
- [play-selection-engine.test.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-selection-engine.test.ts:308)
- [play-library-service.test.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-library-service.test.ts:292)
- [gameplay-calibration.test.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/gameplay-calibration.test.ts:139)

Nach der Korrektur:

- offizieller Kalibrierungs-Regressionstest bleibt gruen
- der 500-Snap-Batch bleibt stabil
- Red-Zone-Touchdowns erscheinen wieder plausibel (`21` Touchdowns im 500-Snap-Batch, `83` Touchdowns im Default-2000-Snap-Kalibrierungsbatch)

## Gesamtbewertung

Die Simulation ist stabil und engine-kompatibel.

- Random Play Selection funktioniert
- Offense-vs-Defense-Kombinationen funktionieren
- 500 Snaps laufen fehlerfrei durch
- Ergebnisse sind insgesamt plausibel
- einziger relevanter Befund wurde direkt korrigiert

## Statuspruefung

- Simulation stabil? `Ja`
- Ergebnisse plausibel? `Ja`
- Keine technischen Fehler? `Ja`

## Abschlussstatus

Status: Gruen

PROMPT 10.4 kann gestartet werden.
