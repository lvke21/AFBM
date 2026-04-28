# Analyse der Gameengine & Datenbasis

Datum: 2026-04-22  
Rolle: Game Systems Analyst, Technical Researcher  
Status: Gruen

## Ziel

Diese Analyse dokumentiert den tatsaechlichen Stand der Gameplay-Engine im Projekt. Grundlage ist ausschliesslich der aktuelle Code in `src/modules/gameplay` sowie angrenzende Module fuer Ratings und Match-Simulation.

## 1. Tatsaechlicher Projektstand

Die Gameplay-Engine liegt als eigenes Modul unter `src/modules/gameplay` vor und besteht aus:

- Play Selection Engine
- Outcome Resolution Engine
- Pre-Snap Legality Engine
- statischer Play Library inklusive Formationen, Personnel Packages und Playbooks
- Kalibrierungs- und Validierungsschicht

Wichtig fuer die Dokumentation:

- Es wurde keine produktive Einbindung dieses Gameplay-Moduls in andere Module gefunden.
- Ein repo-weites Import-Screening zeigt keine externen Imports von `src/modules/gameplay`.
- Die aktuelle reale Nutzung innerhalb des Gameplay-Moduls erfolgt vor allem ueber:
  - `gameplay-calibration.ts`
  - Engine-Tests
  - Library- und Legality-Validierung

Parallel dazu existiert ein separates Saison-/Match-Simulationssystem in:

- `src/modules/seasons/application/simulation/match-engine.ts`

Dieses System nutzt eigene Attributlogik und ist derzeit nicht an die neue Gameplay-Engine gekoppelt.

## 2. Identifizierte Systeme

### Play Selection Engine

Datei:

- `src/modules/gameplay/application/play-selection-engine.ts`

Aufgabe:

- waehlt Offense- und Defense-Play gleichzeitig aus
- bewertet Kandidaten ueber Playbook, Situation, EV/Floor/Risk, Clock, Four Down, Self-Scout, Fatigue und Randomness
- klassifiziert Spielsituationen ueber Down, Distance, Field Zone, Clock, Score und Tempo
- unterstuetzt `CONSERVATIVE`, `BALANCED`, `AGGRESSIVE`
- fuehrt eine Pre-Snap-Legalitaetspruefung in der Auswahlstrecke mit

Wichtige Eingaben:

- `GameSituationSnapshot`
- `PreSnapStructureSnapshot`
- Offense-/Defense-Playbook
- Offense-/Defense-Kandidaten
- Strategy Profiles
- Personnel Fit
- Usage Memory

Wichtige Ergebnisdaten:

- gewaehltes Offense-Play
- gewaehltes Defense-Play
- vollstaendige Selection Trace mit Modifiers, Kandidaten, Rejections und Erwartungsraum

### Outcome Resolution Engine

Datei:

- `src/modules/gameplay/application/outcome-resolution-engine.ts`

Aufgabe:

- loest das gewaehlte Play-Duell in ein Ergebnis auf
- bestimmt Run- oder Pass-Pfad
- modelliert Completion, Pressure, Sack, Turnover, Explosive, Success, First Down, Touchdown und Clock Runoff
- erzeugt eine Outcome Trace mit Wahrscheinlichkeiten und Einflussfaktoren

Wichtige Eingaben:

- Situation
- Pre-Snap-Struktur
- gewaehlter Play Call
- Legality Result
- `ResolutionMatchupSnapshot`
- optionale `MatchupFeature[]`
- optionales `StateValueModel`

Wichtige Ergebnisdaten:

- `ResolvedPlayEvent`
- Outcome Family
- Yards
- Success
- Turnover
- Pressure Event
- EPA/WP-Swing falls State Value Model uebergeben wird

### Pre-Snap Legality Engine

Datei:

- `src/modules/gameplay/application/pre-snap-legality-engine.ts`

Aufgabe:

- validiert Formation, Personnel, On-Line-Count, Backfield-Count, Receiver Eligibility, Motion, Shift und Downfield-Regeln
- normalisiert die Offense-Struktur fuer weitere Verarbeitung
- unterscheidet NFL- und College-Regelprofil

Wichtige Ergebnisdaten:

- `LegalityResult`
- Normalized Snapshot
- strukturierte Issue-Liste mit Empfehlung

## 3. Regel- und Situationsbasis

### Verfuegbare Rulesets

- `NFL_PRO`
- `COLLEGE`

Datei:

- `src/modules/gameplay/domain/competition-rules.ts`

Wesentliche Unterschiede:

- Hash Marks: NFL vs College
- Overtime Format
- Clock: College stoppt bei First Downs, NFL nicht
- Ineligible Downfield: NFL `1` Yard, College `3` Yards

### Situationsmodell

Datei:

- `src/modules/gameplay/domain/game-situation.ts`

Zentrale Felder:

- `ruleset`
- `hashMarkProfile`
- `quarter`
- `down`
- `yardsToGo`
- `ballOnYardLine`
- `distanceBucket`
- `fieldZone`
- `clockBucket`
- `scoreBucket`
- `offenseScore`
- `defenseScore`
- `secondsRemainingInQuarter`
- `secondsRemainingInGame`
- `offenseTimeouts`
- `defenseTimeouts`
- `tempoProfile`
- `possessionTeamId`
- `defenseTeamId`

Verfuegbare Buckets:

- Distance: `INCHES`, `SHORT`, `MEDIUM`, `LONG`, `VERY_LONG`
- Field Zone: `BACKED_UP`, `OWN_TERRITORY`, `MIDFIELD`, `PLUS_TERRITORY`, `HIGH_RED_ZONE`, `LOW_RED_ZONE`, `GOAL_TO_GO`
- Clock: `OPENING`, `EARLY`, `MIDDLE`, `LATE`, `TWO_MINUTE`, `ENDGAME`
- Score: `LEADING_BIG`, `LEADING`, `TIED`, `TRAILING`, `TRAILING_BIG`
- Tempo: `SLOW`, `NORMAL`, `HURRY_UP`, `TWO_MINUTE`

## 4. Datenbasis: Kataloggroesse

Der aktuelle `PLAY_LIBRARY_CATALOG` enthaelt:

- Personnel Packages: `13`
- Offense Formation Families: `9`
- Defense Formation Families: `10`
- Motion Families: `6`
- Protection Families: `8`
- Offensive Concept Families: `37`
- Front Families: `8`
- Coverage Families: `14`
- Pressure Families: `12`
- Offense Plays: `29`
- Defense Plays: `26`

Gesamtzahl aktiver Plays:

- `55`

## 5. Personnel Packages

Datei:

- `src/modules/gameplay/infrastructure/play-library.ts`

### Offense

- `off-10` - 10 Personnel
- `off-11` - 11 Personnel
- `off-12` - 12 Personnel
- `off-13` - 13 Personnel
- `off-20` - 20 Personnel
- `off-21` - 21 Personnel

### Defense

- `def-base-43` - 4-3 Base
- `def-base-34` - 3-4 Base
- `def-nickel` - Nickel 4-2-5
- `def-nickel-335` - Nickel 3-3-5
- `def-bear-515` - Bear Nickel 5-1-5
- `def-dime` - Dime 4-1-6
- `def-goal-line` - Goal Line 5-3-3

## 6. Formationen

### Offense Formation Families

- `off-gun-doubles-11` - Gun Doubles - `off-11`
- `off-gun-trips-11` - Gun Trips - `off-11`
- `off-singleback-tight-12` - Singleback Tight - `off-12`
- `off-pistol-twins-20` - Pistol Twins - `off-20`
- `off-gun-bunch-11` - Gun Bunch - `off-11`
- `off-gun-empty-10` - Gun Empty - `off-10`
- `off-pistol-trips-11` - Pistol Trips - `off-11`
- `off-i-right-21` - I Right - `off-21`
- `off-heavy-tight-13` - Heavy Tight - `off-13`

### Defense Formation Families

- `def-nickel-over` - Nickel Over - `def-nickel`
- `def-nickel-match` - Nickel Match - `def-nickel`
- `def-dime-zero` - Dime Zero - `def-dime`
- `def-odd-fire-zone` - Odd Fire Zone - `def-nickel-335`
- `def-goal-line-bracket` - Goal Line Bracket - `def-goal-line`
- `def-base-over-43` - Base Over 4-3 - `def-base-43`
- `def-base-okie-34` - Okie 3-4 - `def-base-34`
- `def-tite-nickel` - Tite Nickel - `def-nickel-335`
- `def-bear-nickel` - Bear Nickel - `def-bear-515`
- `def-dime-two-high` - Dime Two High - `def-dime`

## 7. Play-Familien und Strukturmodell

### Offense Play Families

- `ZONE_RUN`
- `GAP_RUN`
- `DESIGNED_QB_RUN`
- `OPTION_RPO`
- `QUICK_PASS`
- `DROPBACK`
- `PLAY_ACTION`
- `MOVEMENT_PASS`
- `SCREEN`
- `EMPTY_TEMPO`

Buckets:

- Run: `ZONE_RUN`, `GAP_RUN`, `DESIGNED_QB_RUN`
- Pass: `QUICK_PASS`, `DROPBACK`, `PLAY_ACTION`, `MOVEMENT_PASS`, `SCREEN`, `EMPTY_TEMPO`
- RPO: `OPTION_RPO`

### Defense Play Families

- `MATCH_COVERAGE`
- `ZONE_COVERAGE`
- `MAN_COVERAGE`
- `ZERO_PRESSURE`
- `FIRE_ZONE`
- `SIMULATED_PRESSURE`
- `DROP_EIGHT`
- `RUN_BLITZ`
- `BRACKET_SPECIALTY`
- `THREE_HIGH_PACKAGE`
- `RED_ZONE_PACKAGE`

Buckets:

- Coverage: `MATCH_COVERAGE`, `ZONE_COVERAGE`, `MAN_COVERAGE`, `BRACKET_SPECIALTY`
- Pressure: `ZERO_PRESSURE`, `FIRE_ZONE`, `SIMULATED_PRESSURE`, `RUN_BLITZ`
- Structure: `DROP_EIGHT`, `THREE_HIGH_PACKAGE`, `RED_ZONE_PACKAGE`

### Play-Struktur

Jedes Play enthaelt:

- `id`
- `side`
- `family`
- `label`
- `variantGroupId`
- `packageTags`
- `supportedRulesets`
- `situationTags`
- `triggers`
- `reads`
- `assignments`
- `expectedMetrics`
- `counters`
- `audibles`
- `legalityTemplate`
- `structure`

Offense-spezifische Struktur:

- `formationFamilyId`
- `personnelPackageId`
- `conceptFamilyId`
- `motionFamilyIds`
- `protectionFamilyId`

Defense-spezifische Struktur:

- `formationFamilyId`
- `personnelPackageId`
- `frontFamilyId`
- `coverageFamilyId`
- `pressureFamilyId`
- `coverageShell`
- `pressurePresentation`
- `defensiveConceptTag`

## 8. Play Library - Offense

### Counts by Family

- `ZONE_RUN`: `3`
- `GAP_RUN`: `3`
- `DESIGNED_QB_RUN`: `2`
- `OPTION_RPO`: `3`
- `QUICK_PASS`: `4`
- `DROPBACK`: `4`
- `PLAY_ACTION`: `3`
- `MOVEMENT_PASS`: `2`
- `SCREEN`: `3`
- `EMPTY_TEMPO`: `2`

### ZONE_RUN

- `off-zone-inside-split` - Inside Zone Split
- `off-zone-insert-bunch` - Zone Insert Bunch
- `off-outside-zone-stretch` - Outside Zone Stretch

### GAP_RUN

- `off-gap-counter-gt` - Counter GT
- `off-gap-duo-tight` - Duo Tight
- `off-gap-power-o-i-right` - Power O I Right

### DESIGNED_QB_RUN

- `off-qb-draw-empty` - QB Draw Empty
- `off-qb-power-read-bash` - QB Power Read Bash

### OPTION_RPO

- `off-rpo-glance-bubble` - Glance / Bubble RPO
- `off-rpo-slant-flat` - Slant / Flat RPO
- `off-zone-read-slice` - Zone Read Slice

### QUICK_PASS

- `off-quick-stick-spacing` - Stick Spacing
- `off-quick-slant-flat` - Quick Slant / Flat
- `off-quick-hitch-out` - Quick Hitch / Out
- `off-quick-rub-pivot` - Rub Pivot

### DROPBACK

- `off-dropback-dagger` - Dagger
- `off-dropback-mesh-rail` - Mesh Rail
- `off-dropback-y-cross` - Y Cross
- `off-dropback-mills` - Mills

### PLAY_ACTION

- `off-play-action-boot-flood` - Boot Flood
- `off-play-action-yankee-shot` - Yankee Shot
- `off-play-action-leak-over` - Leak Over

### MOVEMENT_PASS

- `off-movement-sprint-sail` - Sprint Sail
- `off-movement-naked-keep` - Naked Keep Pass

### SCREEN

- `off-screen-rb-slip` - RB Slip Screen
- `off-screen-wr-tunnel` - WR Tunnel Screen
- `off-screen-te-delay` - TE Delay Screen

### EMPTY_TEMPO

- `off-empty-stick` - Empty Stick
- `off-empty-choice` - Empty Choice

## 9. Play Library - Defense

### Counts by Family

- `MATCH_COVERAGE`: `3`
- `ZONE_COVERAGE`: `3`
- `MAN_COVERAGE`: `3`
- `ZERO_PRESSURE`: `2`
- `FIRE_ZONE`: `3`
- `SIMULATED_PRESSURE`: `2`
- `DROP_EIGHT`: `2`
- `RUN_BLITZ`: `2`
- `BRACKET_SPECIALTY`: `2`
- `THREE_HIGH_PACKAGE`: `2`
- `RED_ZONE_PACKAGE`: `2`

### MATCH_COVERAGE

- `def-match-quarters-poach` - Quarters Poach
- `def-match-palms-read` - Palms Read Match
- `def-match-cover-3-seam-carry` - Cover 3 Match Seam Carry

### ZONE_COVERAGE

- `def-zone-cover-3-buzz` - Cover 3 Buzz
- `def-zone-tampa-2-pole-runner` - Tampa 2 Pole Runner
- `def-zone-cover-6-boundary-cloud` - Cover 6 Boundary Cloud

### MAN_COVERAGE

- `def-man-cover-1-robber` - Cover 1 Robber
- `def-man-cover-1-lurk-rat` - Cover 1 Lurk Rat
- `def-man-press-1-bunch-lock` - Press 1 Bunch Lock

### ZERO_PRESSURE

- `def-zero-double-a-pressure` - Double A Zero
- `def-zero-nickel-overload` - Nickel Overload Zero

### FIRE_ZONE

- `def-fire-zone-boundary` - Boundary Fire Zone 3-Deep
- `def-fire-zone-field-smoke` - Field Fire Zone Smoke
- `def-fire-zone-sky-sting` - Sky Sting Fire Zone

### SIMULATED_PRESSURE

- `def-sim-pressure-creeper` - Two-High Creeper
- `def-sim-double-mug-robber` - Sim Double Mug Robber

### DROP_EIGHT

- `def-drop8-tampa-fence` - Drop 8 Tampa Fence
- `def-drop8-cover-6-fence` - Drop 8 Cover 6 Fence

### RUN_BLITZ

- `def-run-blitz-bear-plug` - Bear Plug Run Blitz
- `def-run-blitz-cross-dog-spill` - Cross Dog Spill

### BRACKET_SPECIALTY

- `def-bracket-palms-cut` - Palms Cut Bracket
- `def-bracket-cone-red-zone` - Cone Bracket Red Zone

### THREE_HIGH_PACKAGE

- `def-three-high-middle-poach` - Three High Middle Poach
- `def-three-high-boundary-spin` - Three High Boundary Spin

### RED_ZONE_PACKAGE

- `def-red-zone-bracket-goal-line` - Goal Line Bracket
- `def-red-zone-bear-cage` - Bear Cage Red Zone

## 10. Unterstuetzende Katalogdaten

### Motion Families

- `motion-none` - No Motion
- `motion-jet` - Jet Motion
- `motion-orbit` - Orbit Motion
- `motion-return` - Return Motion
- `motion-short` - Short Zip
- `motion-bluff` - Bluff Motion

### Protection Families

- `protection-half-slide` - Half Slide
- `protection-full-slide` - Full Slide
- `protection-play-action-boot` - Boot Protection
- `protection-screen-invite` - Screen Invite
- `protection-six-man-scan` - Six-Man Scan
- `protection-max-shot` - Max Protect Shot
- `protection-sprint-launch` - Sprint Launch
- `protection-empty-quick` - Empty Quick

### Front Families

- `front-over` - Over Front
- `front-under` - Under Front
- `front-odd` - Odd Front
- `front-bear` - Bear Front
- `front-goal-line` - Goal Line Front
- `front-tite` - Tite Front
- `front-okie` - Okie Front
- `front-hybrid-bear` - Hybrid Bear

### Coverage Families

- `coverage-quarters-match` - Quarters Match
- `coverage-cover-3-buzz` - Cover 3 Buzz
- `coverage-cover-1-robber` - Cover 1 Robber
- `coverage-zero` - Cover 0
- `coverage-fire-zone` - 3 Deep Fire Zone
- `coverage-sim-two-high` - Simulated Two High
- `coverage-red-zone-bracket` - Red Zone Bracket
- `coverage-tampa-2` - Tampa 2
- `coverage-cloud-2` - Cover 2 Cloud
- `coverage-cover-3-sky` - Cover 3 Sky
- `coverage-cover-3-match` - Cover 3 Match
- `coverage-palms-c7` - Palms / Cover 7
- `coverage-cover-6` - Cover 6
- `coverage-cover-1-lurk` - Cover 1 Lurk

### Pressure Families

- `pressure-none` - Four-Man Rush
- `pressure-double-a` - Double A Mug
- `pressure-boundary-fire` - Boundary Fire Zone
- `pressure-field-creeper` - Field Creeper
- `pressure-red-zone-mug` - Red Zone Mug
- `pressure-drop-eight` - Three-Man Drop Eight
- `pressure-field-fire` - Field Fire Zone
- `pressure-overload-nickel` - Nickel Overload
- `pressure-boundary-creeper` - Boundary Creeper
- `pressure-sim-double-mug` - Sim Double Mug
- `pressure-cross-dog` - Cross Dog
- `pressure-bear-plug` - Bear Plug

### Offensive Concept Families

Es sind aktuell `37` offensive Concept Families im Katalog hinterlegt. Sie decken unter anderem ab:

- Zone Run
- Gap Run
- Designed QB Run
- Option / RPO
- Quick Pass
- Dropback
- Play Action
- Movement Pass
- Screen
- Empty Tempo
- dazu mehrere Unterkonzepte wie Duo, Power O, Mesh, Y Cross, Mills, Yankee, Zone Read, WR Tunnel, TE Delay, Empty Choice

## 11. Verwendete Attribute / Ratings

### A. Selection Engine nutzt keine Spieler-Ratings

Die Selection Engine arbeitet aktuell mit:

- Situation
- Playbook Policies
- Play-`expectedMetrics`
- Scheme-/Mode-Profilen
- Personnel Fit Snapshot
- Usage Memory / Self-Scout
- Legality-Feedback

Play-`expectedMetrics`:

- `efficiencyRate`
- `explosiveRate`
- `turnoverSwingRate`
- `pressureRate`
- `expectedYards`
- `redZoneValue`

Selection Strategy Profile:

- `evWeight`
- `floorWeight`
- `riskWeight`
- `surpriseWeight`
- `selfScoutWeight`
- `personnelFitWeight`
- `opponentContextWeight`
- `clockWeight`
- `fourDownWeight`
- `fatigueWeight`
- `temperature`

### B. Legality Engine nutzt strukturelle Pre-Snap-Attribute

Die Legality Engine arbeitet nicht mit Ratings, sondern mit:

- Personnel Package
- Formation Snapshot
- Shift Snapshot
- Player Alignments
- `onLineOfScrimmage`
- `inBackfield`
- `receiverDeclaration`
- Motion-Typ und Motion-Richtung
- Position Codes
- Ruleset-Profil

### C. Outcome Engine nutzt abstrakte Matchup-Ratings

Datei:

- `src/modules/gameplay/domain/play-resolution.ts`

Quarterback:

- `accuracyShort`
- `accuracyIntermediate`
- `accuracyDeep`
- `decision`
- `pocketPresence`
- `mobility`
- `armStrength`

Primary Target:

- `routeQuality`
- `separation`
- `hands`
- `ballSkills`
- `yardsAfterCatch`
- `release`

Primary Runner:

- `vision`
- `acceleration`
- `balance`
- `ballSecurity`
- `power`

Offensive Line:

- `passProtection`
- `runBlocking`
- `comboBlocking`
- `edgeControl`
- `communication`

Coverage:

- `manCoverage`
- `zoneCoverage`
- `leverage`
- `ballHawk`
- `tackling`

Pass Rush:

- `pressure`
- `edgeRush`
- `interiorRush`
- `contain`
- `finishing`

Front:

- `boxControl`
- `runFit`
- `leverage`
- `pursuit`
- `tackling`
- `hitPower`

Context:

- `boxDefenders`
- `leverageAdvantage`
- `coverageTightness`

Aktueller Projektstand:

- Es wurde kein Adapter gefunden, der diese Matchup-Ratings bereits automatisch aus Team-/Player-Daten erzeugt.
- Die aktuelle Default-/Kalibrierungsnutzung arbeitet mit `createNeutralResolutionMatchup()`.
- Das Neutralmodell setzt die meisten Ratings auf `72`.

### D. Vorhandene Spieler-Ratings ausserhalb der Gameplay-Engine

Datei:

- `src/modules/players/domain/player-rating.ts`

Im Projekt existiert bereits ein ausgebautes Ratingsystem fuer Spieler mit Composite Ratings:

- `passing`
- `pocket`
- `mobility`
- `command`
- `ballCarrier`
- `protection`
- `hands`
- `receiving`
- `passBlocking`
- `runBlocking`
- `passRush`
- `runDefense`
- `linebackerCoverage`
- `coverage`
- `ballHawk`
- `returnGame`
- `kicking`
- `punting`
- `snapping`
- `specialistConsistency`

Wichtiger Ist-Stand:

- Diese Composite Ratings existieren im Projekt.
- Eine direkte Laufzeit-Kopplung in die neue Gameplay-Engine wurde im aktuellen Stand nicht gefunden.

## 12. Dokumentationsrelevante Inhalte

### Kernsysteme

- `src/modules/gameplay/application/play-selection-engine.ts`
- `src/modules/gameplay/application/outcome-resolution-engine.ts`
- `src/modules/gameplay/application/pre-snap-legality-engine.ts`

### Domainmodell

- `src/modules/gameplay/domain/play-library.ts`
- `src/modules/gameplay/domain/play-selection.ts`
- `src/modules/gameplay/domain/play-resolution.ts`
- `src/modules/gameplay/domain/pre-snap-structure.ts`
- `src/modules/gameplay/domain/pre-snap-legality.ts`
- `src/modules/gameplay/domain/game-situation.ts`
- `src/modules/gameplay/domain/competition-rules.ts`
- `src/modules/gameplay/domain/playbook.ts`
- `src/modules/gameplay/domain/simulation-metrics.ts`

### Datenkatalog / Infrastruktur

- `src/modules/gameplay/infrastructure/play-library.ts`
- `src/modules/gameplay/infrastructure/default-playbooks.ts`
- `src/modules/gameplay/infrastructure/index.ts`

### Services / Utilities

- `src/modules/gameplay/application/play-library-service.ts`
- `src/modules/gameplay/application/outcome-model-parameters.ts`
- `src/modules/gameplay/application/default-state-value-model.ts`
- `src/modules/gameplay/application/gameplay-calibration.ts`
- `src/modules/gameplay/application/calibration-suite.ts`

### Tests / Referenzverhalten

- `src/modules/gameplay/application/play-library-service.test.ts`
- `src/modules/gameplay/application/pre-snap-legality-engine.test.ts`
- `src/modules/gameplay/application/play-selection-engine.test.ts`
- `src/modules/gameplay/application/outcome-resolution-engine.test.ts`
- `src/modules/gameplay/application/gameplay-calibration.test.ts`

### Angrenzende Ratingsysteme

- `src/modules/players/domain/player-rating.ts`

### Separate, nicht gekoppelte Match-Simulation

- `src/modules/seasons/application/simulation/match-engine.ts`

## 13. Statuspruefung

- Alle Systeme identifiziert? `Ja`
- Alle Formationen erfasst? `Ja`
- Play Library vollstaendig analysiert? `Ja`

## Abschlussstatus

Status: Gruen

PROMPT 2 kann gestartet werden.
