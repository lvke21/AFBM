# Defense Play Library Expansion - 2026-04-22

## Auftrag

PROMPT 9 - Defense Variationen und Integration

Rolle: Defensive Systems Designer

Ziel: Detaillierte Defense Plays inklusive valider Front-, Coverage- und Pressure-Kombinationen erstellen.

## Ergebnis

Die Defense-Library wurde von 7 auf 26 Plays erweitert.

Neu hinzugekommen sind 19 voll definierte Defense-Plays mit:

- realistischen `triggers`
- klaren `reads`
- rollenspezifischen `assignments`
- `variantGroupId`
- `packageTags`
- `structure.defensiveConceptTag`
- belastbaren `expectedMetrics`
- verknuepften `counters` und `audibles`

## Family-Tiefe

Die Defense-Library deckt jetzt alle 11 Defense-Familien mit mindestens 2 Plays ab:

- `MATCH_COVERAGE`: 3
- `ZONE_COVERAGE`: 3
- `MAN_COVERAGE`: 3
- `ZERO_PRESSURE`: 2
- `FIRE_ZONE`: 3
- `SIMULATED_PRESSURE`: 2
- `DROP_EIGHT`: 2
- `RUN_BLITZ`: 2
- `BRACKET_SPECIALTY`: 2
- `THREE_HIGH_PACKAGE`: 2
- `RED_ZONE_PACKAGE`: 2

## Neue Play-Gruppen

### Match / Coverage

- `def-match-palms-read`
- `def-match-cover-3-seam-carry`
- `def-zone-tampa-2-pole-runner`
- `def-zone-cover-6-boundary-cloud`
- `def-man-cover-1-lurk-rat`
- `def-man-press-1-bunch-lock`

### Pressure / Sim

- `def-zero-nickel-overload`
- `def-fire-zone-field-smoke`
- `def-fire-zone-sky-sting`
- `def-sim-double-mug-robber`

### New Families

- `def-drop8-tampa-fence`
- `def-drop8-cover-6-fence`
- `def-run-blitz-bear-plug`
- `def-run-blitz-cross-dog-spill`
- `def-bracket-palms-cut`
- `def-bracket-cone-red-zone`
- `def-three-high-middle-poach`
- `def-three-high-boundary-spin`
- `def-red-zone-bear-cage`

## Modell- und Validierungsintegration

Fuer fachlich saubere `DROP_EIGHT`-Plays wurde das Modell rueckwaertskompatibel erweitert:

- neuer `PressurePresentation`-Wert: `THREE_MAN`
- neue Pressure-Family: `pressure-drop-eight`

Zusaetzlich wurden Family-spezifische Validierungsregeln ergaenzt:

- `DROP_EIGHT` muss `THREE_MAN` praesentieren
- `RUN_BLITZ` muss `RUN_FIT` tragen und als `FIVE_MAN` auftreten
- `BRACKET_SPECIALTY` braucht mindestens eine `BRACKET`-Assignment
- `THREE_HIGH_PACKAGE` bleibt in der aktuellen Engine ueber die `TWO_HIGH`-Shell-Abstraktion modelliert

## Engine-Integration

Die neuen Defense-Plays sind direkt in die bestehende Engine-Struktur integriert:

- Selection Engine:
  - neue Families werden ueber Family-Policies selektiert
  - Tests auf breitere Defense-Menues angepasst
- Outcome Engine:
  - neue Plays laufen ohne Sonderpfad durch bestehende Resolution
  - `DROP_EIGHT`, `RUN_BLITZ`, `BRACKET_SPECIALTY` und `THREE_HIGH_PACKAGE` nutzen die bereits vorbereiteten Family-Mappings
- Legality / Validation:
  - neue Kombinationsregeln pruefen die kritischen Family-Spezifika

## Verifikation

Ausgefuehrte Tests:

- `play-library-service.test.ts`
- `play-selection-engine.test.ts`
- `outcome-resolution-engine.test.ts`
- `pre-snap-legality-engine.test.ts`
- `gameplay-calibration.test.ts`

Ergebnis:

- 5 von 5 Testdateien gruen
- 43 von 43 Tests gruen

## Statuspruefung

- Kombinationen gueltig? Ja.
- Engine-kompatibel? Ja.
- Defense Library vollstaendig? Fuer den aktuellen Zielstand ja.

## Status

Gruen
