# Defense Play Families Implementation - 2026-04-22

## Auftrag

PROMPT 8 - Defense Play Families Implementierung

Rolle: Defensive Architect

Ziel: Defense-Struktur implementieren, mit Fokus auf Coverages, Pressures und Fronts.

## Ergebnis

Die Defense-Library hat jetzt eine explizite Family-Taxonomie fuer den naechsten Ausbau:

- Bestehende Kernfamilien:
  - `MATCH_COVERAGE`
  - `ZONE_COVERAGE`
  - `MAN_COVERAGE`
  - `ZERO_PRESSURE`
  - `FIRE_ZONE`
  - `SIMULATED_PRESSURE`
  - `RED_ZONE_PACKAGE`
- Neue strukturelle Familien:
  - `DROP_EIGHT`
  - `RUN_BLITZ`
  - `BRACKET_SPECIALTY`
  - `THREE_HIGH_PACKAGE`

Diese Familien sind jetzt in drei Buckets organisiert:

- `COVERAGE`
  - `MATCH_COVERAGE`
  - `ZONE_COVERAGE`
  - `MAN_COVERAGE`
  - `BRACKET_SPECIALTY`
- `PRESSURE`
  - `ZERO_PRESSURE`
  - `FIRE_ZONE`
  - `SIMULATED_PRESSURE`
  - `RUN_BLITZ`
- `STRUCTURE`
  - `DROP_EIGHT`
  - `THREE_HIGH_PACKAGE`
  - `RED_ZONE_PACKAGE`

## Implementierte Struktur

### 1. Domainmodell

In `play-library.ts` wurde die Defense-Taxonomie erweitert:

- neue `DefensivePlayFamily`-Werte
- neue Bucket-Definition `DefensivePlayFamilyBucket`
- zentrale Arrays:
  - `DEFENSIVE_PLAY_FAMILIES`
  - `DEFENSIVE_PLAY_FAMILY_GROUPS`

Damit ist die Defense-Struktur jetzt auf Top-Level klar typisiert und engine-lesbar.

### 2. Family Blueprints fuer Coverages, Pressures und Fronts

In der Infrastruktur gibt es jetzt `DEFENSIVE_FAMILY_BLUEPRINTS`.

Jede Defense-Familie beschreibt dort:

- Family-Bucket
- priorisierte `frontFamilyIds`
- priorisierte `coverageFamilyIds`
- priorisierte `pressureFamilyIds`
- semantische Tags

Wichtige neue Blueprints:

- `DROP_EIGHT`
  - Fronts: `front-tite`, `front-okie`
  - Coverages: `coverage-cover-6`, `coverage-palms-c7`, `coverage-tampa-2`
  - Pressure: `pressure-none`
- `RUN_BLITZ`
  - Fronts: `front-bear`, `front-hybrid-bear`, `front-okie`
  - Coverages: `coverage-cover-1-lurk`, `coverage-cloud-2`, `coverage-cover-3-buzz`
  - Pressures: `pressure-cross-dog`, `pressure-bear-plug`, `pressure-overload-nickel`
- `BRACKET_SPECIALTY`
  - Fronts: `front-under`, `front-goal-line`, `front-tite`
  - Coverages: `coverage-red-zone-bracket`, `coverage-palms-c7`, `coverage-cover-6`
  - Pressures: `pressure-red-zone-mug`, `pressure-none`
- `THREE_HIGH_PACKAGE`
  - Fronts: `front-tite`, `front-okie`
  - Coverages: `coverage-cover-6`, `coverage-palms-c7`, `coverage-cloud-2`
  - Pressures: `pressure-none`, `pressure-boundary-creeper`

## Engine-Integration

Die neue Struktur ist in die Engines eingebunden, ohne bestehende Defense-Plays zu brechen:

- Play Selection:
  - Scheme-Bias erweitert
  - Situationslogik fuer `RUN_BLITZ`, `DROP_EIGHT`, `BRACKET_SPECIALTY`, `THREE_HIGH_PACKAGE`
  - Default-Playbooks referenzieren die neuen Families in Early Down, Passing Down, Short Yardage, Red Zone und Two Minute
- Outcome Resolution:
  - Coverage-Blends fuer die neuen Families ergaenzt
- Outcome Parameters:
  - Pressure-, Coverage-Disruption- und Run-Fit-Boni fuer alle neuen Defense-Familien hinterlegt

## Bewusste Abgrenzung

Prompt 8 fuegt die Defense-Familien-Struktur ein, aber noch keine breite neue Defense-Play-Tiefe.

Das bedeutet:

- Die bestehenden Defense-Plays bleiben unveraendert nutzbar.
- Die neuen Familien sind als strukturierte Erweiterung vorbereitet.
- Konkrete Defense-Varianten und volle neue Play-Definitionen folgen in Prompt 9.

## Verifikation

Ausgefuehrte Tests:

- `play-library-service.test.ts`
- `play-selection-engine.test.ts`
- `outcome-resolution-engine.test.ts`
- `pre-snap-legality-engine.test.ts`
- `gameplay-calibration.test.ts`

Ergebnis:

- 5 von 5 Testdateien gruen
- 42 von 42 Tests gruen

## Statuspruefung

- Vollstaendig? Ja, fuer den Scope von Prompt 8.
- Logisch? Ja, Defense-Familien, Buckets und Blueprints sind konsistent.
- Engine-kompatibel? Ja, inklusive Selection-, Outcome- und Calibration-Verifikation.

## Status

Gruen
