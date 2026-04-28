# Gameplay Engine

## Zweck

Dieses Dokument beschreibt den aktuell implementierten Gameplay-Kern im Modul `src/modules/gameplay`. Es ist die fuehrende Referenz fuer:

- Pre-Snap-Legality
- Playbook- und Play-Library-Modellierung
- Play Selection
- Outcome Resolution
- Calibration- und Teststrategie

Wichtig: Die Gameplay-Engine ist fachlich implementiert und testbar, aber noch **nicht** der produktive Write-Pfad der Seasons-Simulation. Der produktive Wochen-Write-Flow laeuft weiterhin ueber `src/modules/seasons/application/simulation/*`.

## Aktueller Stand

Der Gameplay-Kern besteht heute aus drei Schichten:

- `domain/*`
  - fachliche Typen fuer Rulesets, Pre-Snap-Struktur, Playbooks, Plays, Selection, Resolution, Value und Calibration
- `application/*`
  - Engines, Validatoren, Batch-Simulation und Calibration-Suites
- `infrastructure/*`
  - Default-Playbooks und die erste referenzielle Play-Library

## Kernfluss

Der vorgesehene End-to-End-Fluss ist:

1. `CompetitionRuleProfile` aufloesen
2. `PreSnapStructureSnapshot` fuer die aktuelle Situation bilden
3. Legality validieren
4. Offense- und Defense-Kandidaten aus Playbook und Play-Library ableiten
5. situativ und probabilistisch selektieren
6. Run- oder Pass-Outcome probabilistisch aufloesen
7. `PlayValueAssessment` aus dem Zustandswechsel ableiten
8. Verteilungen ueber Calibration-Szenarien pruefen

Die zentralen Einstiegspunkte liegen in:

- [pre-snap-legality-engine.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/pre-snap-legality-engine.ts:1)
- [play-library-service.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-library-service.ts:1)
- [play-selection-engine.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-selection-engine.ts:1)
- [outcome-resolution-engine.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/outcome-resolution-engine.ts:1)
- [gameplay-calibration.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/gameplay-calibration.ts:1)

## Legality Engine

### Ziel

Vor jeder taktischen Logik und vor jeder Outcome-Resolution muss der Snap fachlich legal sein.

### Eingaben

- `CompetitionRuleProfile` aus [competition-rules.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/competition-rules.ts:1)
- `PreSnapStructureSnapshot` aus [pre-snap-structure.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/pre-snap-structure.ts:1)

### Ergebnis

`validatePreSnapStructure()` liefert ein `LegalityResult` aus [pre-snap-legality.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/pre-snap-legality.ts:1):

- `isLegal`
- strukturierte `issues`
- `normalizedSnapshot`

Jeder Fehler hat:

- `code`
- betroffene `side`
- menschenlesbare `message`
- optionale `recommendation`

### Abgedeckte Regeln

- Spielerzahl auf Offense und Defense
- Mindestanzahl Spieler an der Line of Scrimmage
- maximale Backfield-Groesse
- Mindestanzahl eligibler Receiver
- eligibile Receiver an beiden LOS-Enden
- ineligible Interior-Logik
- Motion-Anzahl
- Motion auf der LOS
- Motion-Richtung
- Shift-Reset und Mindest-Set-Zeit
- ineligible man downfield
- NFL-vs-College-Differenzen ueber `CompetitionRuleProfile`

### Integrationspunkte

- `validatePlaySelectionPreSnap()` validiert den Selection-Kontext
- `validatePlayResolutionPreSnap()` validiert direkt vor der Resolution
- `validateIneligibleDownfield()` ist als separater Post-Snap-Check verfuegbar

## Playbook Domain Model

### Trennung der Begriffe

Das Modell trennt bewusst:

- `PersonnelPackage`
- `FormationSnapshot` bzw. Formation Family
- Motion/Shift
- Concept/Front/Coverage/Pressure Family
- `PlayCall`
- `PlaybookPolicy`

Die fachliche Basis liegt in:

- [play-library.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/play-library.ts:1)
- [play-call.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/play-call.ts:1)
- [playbook.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/playbook.ts:1)

### Play-Definition

Ein Play besteht aus:

- `id`, `side`, `family`, `label`
- `structure`
- `situationTags`
- `triggers`
- `reads`
- `assignments`
- `expectedMetrics`
- `counters`
- `audibles`
- `legalityTemplate`

### Playbook-Definition

Ein `Playbook` ist eine Menge gewichteter Policies:

- `offensePolicies`
- `defensePolicies`

Jede Policy besitzt:

- `SituationFilter`
- gewichtete `WeightedPlayReference`
- optionale `minimumCallRate` und `maximumCallRate`

### Library und Serialisierung

Die erste Referenz-Library ist code-first implementiert in [play-library.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/infrastructure/play-library.ts:1). Das ist im aktuellen Projekt sinnvoller als JSON/YAML, weil:

- die Referenzdaten bereits stark typisiert sind
- die Engine noch keinen produktiven Authoring-Workflow besitzt
- Compile-Time-Checks wichtiger sind als freie Datenbearbeitung

Trotzdem ist die Library serialisierbar:

- `serializePlayLibraryCatalog()`
- `parseSerializedPlayLibraryCatalog()`

## Play Selection Engine

### Verantwortung

Die Selection Engine waehlt aus legalen und situationspassenden Calls probabilistisch aus.

Zentraler Einstieg:

- `DefaultPlaySelectionEngine.select()` in [play-selection-engine.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-selection-engine.ts:1565)

### Schritte

1. Situation klassifizieren mit `classifySelectionSituation()`
2. Playbook-Policies matchen
3. Kandidaten auf Legalitaet pruefen
4. Erwartungsraum fuer Offense und Defense bilden
5. Kandidaten ueber Heuristik scoren
6. ueber Softmax-artige Gewichtung sampeln
7. Decision Trace zurueckgeben

### Bewertungsachsen

- Basisgewicht aus dem Playbook
- EV
- Floor
- Risk
- Teamphilosophie
- Personnel Fit
- Self-Scout
- Clock
- Four-down-Territory
- defensiver Erwartungsraum bzw. offensiver Erwartungsraum
- kontrollierte Randomness

### Nachvollziehbarkeit

`SelectionDecisionTrace` dokumentiert:

- Situation Classification
- gematchte Policies
- Kandidaten-Rejections
- einzelne Modifikatoren
- finale Wahrscheinlichkeiten
- `randomRoll`

Damit bleibt die Engine probabilistisch, aber erklaerbar.

## Outcome Resolution

### Verantwortung

Die Outcome-Engine ersetzt starre Yards-Skripte durch probabilistische Run- und Pass-Modelle.

Zentraler Einstieg:

- `DefaultOutcomeResolutionEngine.buildDistribution()`
- `DefaultOutcomeResolutionEngine.resolve()`

Sie liegen in [outcome-resolution-engine.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/outcome-resolution-engine.ts:1504).

### Pass-Pfad

Beruecksichtigte Faktoren:

- pressure vs. protection
- separation
- air yards
- leverage
- QB accuracy und decision
- route quality und ball skills
- coverage context
- sack
- throwaway
- interception risk
- YAC

### Run-Pfad

Beruecksichtigte Faktoren:

- box count
- front und run fit
- leverage
- OL run blocking, combo blocking und edge control
- RB vision, acceleration, balance, power und ball security
- stuffed probability
- explosive probability
- fumble probability

### Ausgabe

Ein `ResolvedPlayEvent` liefert unter anderem:

- `path`
- `family`
- `yards`
- `success`
- `explosive`
- `turnoverType`
- `pressureEvent`
- `completion`
- `throwaway`
- `airYards`
- `yardsAfterCatch`
- `value`
- `trace`

### Parameter und Value Layer

Die zentralen Modellparameter liegen in [outcome-model-parameters.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/outcome-model-parameters.ts:1). Die erste EPA-/WP-nahe Bewertung kommt aus [default-state-value-model.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/default-state-value-model.ts:1).

## Calibration und Teststrategie

### Testschichten

Die Gameplay-Engine wird aktuell ueber fuenf Schichten abgesichert:

- Unit-Tests fuer Legality
- Unit-Tests fuer Play-Library-Validierung
- Unit-Tests fuer Selection
- Unit-Tests fuer Outcome Resolution
- Batch- und Calibration-Tests fuer Verteilungen und situative Plausibilitaet

Die wichtigsten Testdateien liegen in:

- [pre-snap-legality-engine.test.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/pre-snap-legality-engine.test.ts:1)
- [play-library-service.test.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-library-service.test.ts:1)
- [play-selection-engine.test.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-selection-engine.test.ts:1)
- [outcome-resolution-engine.test.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/outcome-resolution-engine.test.ts:1)
- [gameplay-calibration.test.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/gameplay-calibration.test.ts:1)

### Calibration-Harness

Die Batch-Simulation sitzt in [gameplay-calibration.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/gameplay-calibration.ts:1). Sie bietet:

- `createDefaultCalibrationScenarios()`
- `simulateGameplayCalibrationScenario()`
- `simulateGameplayCalibrationReport()`
- `createDefaultCalibrationExpectations()`
- `buildCalibrationObservations()`

Die generische Bandpruefung sitzt in [calibration-suite.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/calibration-suite.ts:1).

### Aktuell beobachtete Kennzahlen

Der aktuelle gemischte Default-Batch prueft unter anderem:

- `YARDS_PER_PLAY`
- `COMPLETION_RATE`
- `RUN_RATE`
- `SACK_RATE`
- `INTERCEPTION_RATE`
- `TURNOVER_RATE`
- `EXPLOSIVE_RUN_RATE`
- `EXPLOSIVE_PASS_RATE`

## Erweiterungsgrenzen heute

Bereits implementiert:

- Regelprofile fuer NFL und College
- rechtssichere Pre-Snap-Legality fuer die modellierten Snap-Faelle
- erste Offensive- und Defensive-Play-Library
- team- und modusfaehige Selection-Profile
- probabilistische Run-/Pass-Resolution
- Calibration-Harness und Regression-Tests

Bewusst noch nicht implementiert:

- produktive Einhaengung in `season-simulation.service.ts`
- vollstaendige Play-by-Play-Game-Loop mit dynamischem Drive-State
- Special Teams
- Penalty-Katalog jenseits der modellierten Pre-Snap-/Downfield-Checks
- Coach- oder Teamprofile aus Persistenz statt Default-Playbooks

## Weiterarbeit

Fuer praktische Erweiterungen siehe:

- [gameplay-extension-guide.md](./gameplay-extension-guide.md)
- [gameplay-implementation-report.md](./gameplay-implementation-report.md)
