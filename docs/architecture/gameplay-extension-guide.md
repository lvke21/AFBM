# Gameplay Extension Guide

## Zweck

Dieses Dokument beschreibt, wie der aktuelle Gameplay-Kern erweitert werden soll, ohne die vorhandene Architektur zu unterlaufen.

## 1. Neue Plays ergaenzen

### Offensive oder defensive Familie waehlen

Pruefe zuerst, ob der neue Call in eine bestehende Familie passt:

- Offense: `ZONE_RUN`, `GAP_RUN`, `OPTION_RPO`, `QUICK_PASS`, `DROPBACK`, `PLAY_ACTION`, `SCREEN`
- Defense: `MATCH_COVERAGE`, `ZONE_COVERAGE`, `MAN_COVERAGE`, `ZERO_PRESSURE`, `FIRE_ZONE`, `SIMULATED_PRESSURE`, `RED_ZONE_PACKAGE`

Nur wenn der Call fachlich nicht in eine vorhandene Familie passt, sollte eine neue Familie eingefuehrt werden.

### Relevante Dateien

- [play-library.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/infrastructure/play-library.ts:1)
- [play-library.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/play-library.ts:1)
- [play-library-service.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-library-service.ts:1)

### Pflichtbestandteile eines neuen Plays

Jeder neue Play-Datensatz braucht:

- `structure`
- `situationTags`
- `triggers`
- `reads`
- `assignments`
- `expectedMetrics`
- `counters`
- `audibles`
- `legalityTemplate`

Optional, rueckwaertskompatibel und fuer groessere Libraries empfohlen:

- `variantGroupId`
- `packageTags`
- `structure.defensiveConceptTag` fuer Defensive Plays

### Guardrails

- `structure.personnelPackageId` und `legalityTemplate.offensePersonnel` bzw. `defensePersonnel` muessen zusammenpassen
- `structure.formationFamilyId` und `legalityTemplate.formation.familyId` muessen zusammenpassen
- `legalityTemplate` muss unter dem gewuenschten Ruleset legal sein
- `audibles` und `counters` duerfen nur auf existierende Play-IDs zeigen

### Validierung

Nach dem Hinzufuegen mindestens laufen lassen:

- `validatePlayDefinition()`
- `validatePlayLibraryCatalog()`
- `buildPreSnapStructureForPlay()`
- `validatePreSnapStructure()`

## 2. Neue Regeln oder neues Ruleset ergaenzen

### Relevante Dateien

- [competition-rules.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/competition-rules.ts:1)
- [pre-snap-legality.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/pre-snap-legality.ts:1)
- [pre-snap-legality-engine.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/pre-snap-legality-engine.ts:1)

### Vorgehen

1. `CompetitionRuleset` erweitern
2. neues `CompetitionRuleProfile` in `COMPETITION_RULE_PROFILES` anlegen
3. falls noetig neue `LegalityIssueCode`s oder neue Regelpfade modellieren
4. nur regelneutralen Engine-Code anfassen, keine Sonderfaelle in UI oder Controller verlagern
5. neue Ruleset-Tests fuer:
   - legalen Basiscase
   - illegalen Basiscase
   - Ruleset-Differenz

### Guardrail

Ruleset-Unterschiede gehoeren in `CompetitionRuleProfile`, nicht in verstreute `if (ruleset === ...)`-Abzweigungen ueber mehrere Layer.

## 3. Neue Team- oder Coach-Profile ergaenzen

### Relevante Dateien

- [default-playbooks.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/infrastructure/default-playbooks.ts:1)
- [play-selection.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/play-selection.ts:1)
- [play-selection-engine.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/play-selection-engine.ts:1)

### Heutiger Stand

Aktuell kommen Team- und Coach-Neigungen aus:

- `PlaybookPolicy`-Gewichten
- `SelectionStrategyProfile`
- `schemeCode`
- `SelectionUsageMemory`

### Empfohlener Ausbaupfad

1. neues team- oder coachspezifisches Playbook anlegen
2. `schemeCode` sauber auf Selection-Heuristik abbilden
3. nur dann neue Mode- oder Bias-Regeln einfuehren, wenn sie in mehreren Teams wiederverwendbar sind

### Guardrail

Ein Teamprofil sollte ueber Gewichte, Policies und nachvollziehbare Biases wirken, nicht ueber versteckte Einzelabzweigungen fuer ein bestimmtes Team.

## 4. Outcome-Modell erweitern

### Relevante Dateien

- [outcome-model-parameters.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/outcome-model-parameters.ts:1)
- [outcome-resolution-engine.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/outcome-resolution-engine.ts:1)
- [simulation-metrics.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/domain/simulation-metrics.ts:1)

### Vorgehen

1. neue Einflussgroesse zuerst als klaren Parameter modellieren
2. Gewichte zentral in `outcome-model-parameters.ts` halten
3. erst dann den Modellpfad in der Engine ergaenzen
4. Verteilungs- und Grenztests nachziehen

### Guardrail

Keine verteilte Magie in mehreren Helpern. Neue Wahrscheinlichkeiten oder Biases gehoeren zuerst in die zentralen Modellparameter.

## 5. Calibration erweitern

### Relevante Dateien

- [gameplay-calibration.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/gameplay-calibration.ts:1)
- [calibration-suite.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/calibration-suite.ts:1)
- [gameplay-calibration.test.ts](/Users/lukashanzi/Documents/AFBM/src/modules/gameplay/application/gameplay-calibration.test.ts:1)

### Vorgehen

1. neues Szenario in `createDefaultCalibrationScenarios()` anlegen
2. neue Zielbaender in `createDefaultCalibrationExpectations()` definieren, wenn die Metrik stabil und sinnvoll ist
3. situative Plausibilitaet in `gameplay-calibration.test.ts` als Regression absichern

### Guardrail

Zielbaender sollen reale, robuste Regression-Grenzen sein. Zu enge Grenzwerte zwingen sonst ungesunde Ueberanpassung an einzelne Seeds.

## 6. Produktive Integration in Seasons

Die spaetere Einhaengung sollte nicht direkt gegen `match-engine.ts` erfolgen, sondern ueber eine klare Adapter-Schicht.

Empfohlener Pfad:

1. Spielsituation aus `match-context.ts` normalisieren
2. Gameplay-Kern fuer Selection und Resolution aufrufen
3. Event- und State-Transition zurueck in den Seasons-Write-Flow mappen
4. erst dann den alten drive-basierten Pfad schrittweise ersetzen

## 7. Mindest-Checkliste vor dem Merge

- neuer oder geaenderter Play-Datensatz ist legal validierbar
- neue Regeln sind ruleset-neutral modelliert
- Selection-Trace bleibt erklaerbar
- Outcome-Verteilungen bleiben in plausiblen Baendern
- `npm run test:run` ist gruen
- `npm run build` ist gruen
