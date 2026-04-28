# Play Expansion Blueprint

Stand: 2026-04-22

## Ziel

Dieses Dokument analysiert die bestehende Play Library und das Gameplay-Domainmodell und definiert eine skalierbare Erweiterungsstrategie fuer eine 3x bis 5x groessere Play-Abdeckung.

## Executive Summary

- Die aktuelle Gameplay-Slice ist fachlich klar strukturiert und produktiv validierbar.
- Der aktive Katalog umfasst aktuell 14 Plays: 7 Offense, 7 Defense.
- Die Engine ist heute stark familiengetrieben. Varianten innerhalb bestehender Familien sind sofort skalierbar. Neue Play-Familien sind moeglich, brauchen aber gezielte Engine-Erweiterungen.
- Der Katalog besitzt bereits deutlich mehr vorbereitete Metadatenfamilien als echte Plays. Genau dort liegt der schnellste Ausbaupfad.
- Empfohlener Ausbaupfad:
  - Phase 1: 48 Plays total, nur Varianten innerhalb bestehender Familien
  - Phase 2: 72 Plays total, gezielt neue Familien mit Engine-Erweiterung
- Status: Gruen

## 1. Ist-Analyse

### 1.1 Bestehende Play-Familien

Offense:

- `ZONE_RUN`
- `GAP_RUN`
- `OPTION_RPO`
- `QUICK_PASS`
- `DROPBACK`
- `PLAY_ACTION`
- `SCREEN`

Defense:

- `MATCH_COVERAGE`
- `ZONE_COVERAGE`
- `MAN_COVERAGE`
- `ZERO_PRESSURE`
- `FIRE_ZONE`
- `SIMULATED_PRESSURE`
- `RED_ZONE_PACKAGE`

### 1.2 Aktuelle Anzahl Plays

Aktiver Katalog:

- 7 Offensive Plays
- 7 Defensive Plays
- 14 Plays gesamt

Aktive Offensive Plays:

- `off-zone-inside-split`
- `off-gap-counter-gt`
- `off-rpo-glance-bubble`
- `off-quick-stick-spacing`
- `off-dropback-dagger`
- `off-play-action-boot-flood`
- `off-screen-rb-slip`

Aktive Defensive Plays:

- `def-match-quarters-poach`
- `def-zone-cover-3-buzz`
- `def-man-cover-1-robber`
- `def-zero-double-a-pressure`
- `def-fire-zone-boundary`
- `def-sim-pressure-creeper`
- `def-red-zone-bracket-goal-line`

Verteilung:

- Offense: genau 1 Play pro Familie
- Defense: genau 1 Play pro Familie

Das ist der groesste Skalierungsengpass. Die Engine hat Familienlogik, aber innerhalb jeder Familie praktisch keine echte Menutiefe.

### 1.3 Datenstruktur und Schema

Die zentrale Play-Definition liegt in [src/modules/gameplay/domain/play-library.ts](../../../src/modules/gameplay/domain/play-library.ts).

Jeder Play enthaelt:

- `id`
- `side`
- `family`
- `label`
- `supportedRulesets`
- `situationTags`
- `triggers`
- `reads`
- `assignments`
- `expectedMetrics`
- `counters`
- `audibles`
- `structure`
- `legalityTemplate`

Offensive Struktur:

- `formationFamilyId`
- `personnelPackageId`
- `conceptFamilyId`
- `motionFamilyIds`
- `protectionFamilyId`

Defensive Struktur:

- `formationFamilyId`
- `personnelPackageId`
- `frontFamilyId`
- `coverageFamilyId`
- `pressureFamilyId`
- `coverageShell`
- `pressurePresentation`

Wichtige Beobachtung:

- Die Library ist nicht flach. Sie modelliert Plays bereits als Kombination aus Family, Struktur, Legality-Template und Expected Metrics.
- Das ist gut genug fuer starke Skalierung innerhalb der bestehenden Familien.
- Defensive Plays besitzen noch keine eigene explizite `conceptFamilyId`-Ebene wie die Offense. Kurzfristig ist das kein Blocker. Langfristig erschwert es aber Authoring-Konsistenz.

### 1.4 Vorhandene Katalog-Scaffolds

Der Katalog ist breiter vorbereitet als die aktive Play-Abdeckung:

- `personnelPackages`: 11
- `offenseFormationFamilies`: 9
- `defenseFormationFamilies`: 10
- `motionFamilies`: 6
- `protectionFamilies`: 8
- `offensiveConceptFamilies`: 28
- `frontFamilies`: 8
- `coverageFamilies`: 14
- `pressureFamilies`: 11

Das ist der zentrale Befund der Analyse: Die Modellierung ist fuer Expansion schon vorbereitet, die Play-Dichte aber noch extrem niedrig.

### 1.5 Bereits vorhandene, aber ungenutzte Scaffolds

Offense-Formationen ohne aktive Plays:

- `off-gun-bunch-11`
- `off-gun-empty-10`
- `off-pistol-trips-11`
- `off-i-right-21`
- `off-heavy-tight-13`

Offensive Konzeptfamilien ohne aktive Plays:

- `concept-zone-insert`
- `concept-outside-zone`
- `concept-duo`
- `concept-power-o`
- `concept-power-read-bash`
- `concept-counter-gh`
- `concept-trap-wham`
- `concept-qb-draw`
- `concept-zone-read`
- `concept-triple-option`
- `concept-rpo-slant-flat`
- `concept-quick-slant-flat`
- `concept-quick-hitch-out`
- `concept-dropback-mesh`
- `concept-dropback-y-cross`
- `concept-dropback-mills`
- `concept-play-action-yankee`
- `concept-play-action-sprint-sail`
- `concept-screen-wr-tunnel`
- `concept-screen-te-delay`
- `concept-red-zone-rub`

Defense-Formationen ohne aktive Plays:

- `def-base-over-43`
- `def-base-okie-34`
- `def-tite-nickel`
- `def-bear-nickel`
- `def-dime-two-high`

Defensive Familienbausteine ohne aktive Plays:

- Fronts: `front-bear`, `front-tite`, `front-okie`, `front-hybrid-bear`
- Coverages: `coverage-tampa-2`, `coverage-cloud-2`, `coverage-cover-3-sky`, `coverage-cover-3-match`, `coverage-palms-c7`, `coverage-cover-6`, `coverage-cover-1-lurk`
- Pressures: `pressure-field-fire`, `pressure-overload-nickel`, `pressure-boundary-creeper`, `pressure-sim-double-mug`, `pressure-cross-dog`, `pressure-bear-plug`

Fazit:

- Fuer eine erste Verdreifachung braucht das System keine neue Library-Architektur.
- Es braucht vor allem Play-Datensaetze, die die bereits modellierten Families und Strukturen endlich nutzen.

### 1.6 Nutzung durch die Engines

Play Selection Engine:

- Einstieg: [src/modules/gameplay/application/play-selection-engine.ts](../../../src/modules/gameplay/application/play-selection-engine.ts)
- Nutzt `family`, `situationTags`, `triggers`, `expectedMetrics`, Playbook-Policy-Gewichte und Personnel-Fit.
- Playbooks referenzieren heute hauptsaechlich `PLAY_FAMILY`, nicht einzelne Play-IDs.
- Varianten innerhalb derselben Familie sind deshalb sofort nutzbar.

Outcome Resolution:

- Einstieg: [src/modules/gameplay/application/outcome-resolution-engine.ts](../../../src/modules/gameplay/application/outcome-resolution-engine.ts)
- Nutzt Offense-Family fuer Run- oder Pass-Pfad und greift auf familienbasierte Parameter in [src/modules/gameplay/application/outcome-model-parameters.ts](../../../src/modules/gameplay/application/outcome-model-parameters.ts) zu.
- Nutzt Defense-Family fuer Coverage-Blend, Pressure-, Coverage- und Run-Fit-Boni.

Legality Engine:

- Einstieg: [src/modules/gameplay/application/pre-snap-legality-engine.ts](../../../src/modules/gameplay/application/pre-snap-legality-engine.ts)
- Arbeitet primaer auf `legalityTemplate` plus Ruleset.
- Ist weitgehend familienneutral.

Katalogvalidierung:

- [src/modules/gameplay/application/play-library-service.ts](../../../src/modules/gameplay/application/play-library-service.ts) validiert Strukturreferenzen, Family-Matches, Ruleset-Kompatibilitaet, Counter-/Audible-Referenzen und Pre-Snap-Legality.
- `validatePlayLibraryCatalog()` ist aktuell gruen.

### 1.7 Technischer Realitaetscheck

Verifiziert am 2026-04-22:

- `validatePlayLibraryCatalog()` -> gueltig, 0 Issues
- Gameplay-Tests -> 31/31 gruen

Getestete Dateien:

- `play-library-service.test.ts`
- `pre-snap-legality-engine.test.ts`
- `play-selection-engine.test.ts`
- `outcome-resolution-engine.test.ts`

## 2. Gap-Analyse

### 2.1 Quantitative Luecken

- Nur 14 reale Plays bei bereits vorbereitetem Metadatenraum fuer deutlich mehr.
- Pro Play-Familie existiert nur eine einzige Auspraegung.
- Offense nutzt 4 von 9 Formationsfamilien.
- Defense nutzt 5 von 10 Formationsfamilien.
- Offense nutzt 7 von 28 Konzeptfamilien.
- Defense nutzt nur 7 von 14 Coverage Families und 5 von 11 Pressure Families.
- Motion ist fast nicht vorhanden: 6 von 7 Offensive Plays laufen mit `motion-none`.

### 2.2 Fachliche Luecken in bestehenden Familien

Bestehende Familien sind zu breit, aber inhaltlich zu duenn besetzt.

Offense:

- `ZONE_RUN` hat kein Outside-Zone, kein Insert/Split-Insert, kein Wide-Zone-Tendency-Play.
- `GAP_RUN` hat kein Duo, kein Power O, kein Trap/Wham, kein Counter GH, kein QB Draw/Bash.
- `OPTION_RPO` hat kein klassisches Zone Read, kein Slant/Flat RPO, kein Triple-Option-/Speed-Option-Zweig.
- `QUICK_PASS` hat kein Slant/Flat, kein Hitch/Out, kein Rub/Pivot, kein Empty-Quick-Game.
- `DROPBACK` hat kein Mesh, kein Y-Cross, kein Mills.
- `PLAY_ACTION` hat kein Yankee, kein Sprint Sail, kein Max-Protect-Shot.
- `SCREEN` hat kein WR Tunnel, kein TE Delay.

Defense:

- `MATCH_COVERAGE` hat kein Palms/Cover 7, kein Cover 3 Match.
- `ZONE_COVERAGE` hat kein Tampa 2, kein Cover 2 Cloud, kein Cover 3 Sky, kein Cover 6.
- `MAN_COVERAGE` hat kein Cover 1 Lurk als Play, kein Bracket-Man-Konzept ausserhalb Red Zone.
- `ZERO_PRESSURE` hat nur ein Mug/Double-A-Profil.
- `FIRE_ZONE` hat nur eine Boundary-Variante.
- `SIMULATED_PRESSURE` hat nur einen Creeper.
- `RED_ZONE_PACKAGE` ist auf Goal-Line-Bracket verengt.

### 2.3 Fehlende moderne Konzepte aus NFL- und College-Sicht

Priorisierung mit aktuellen Trendquellen, Stand 2025 bis 2026:

- NFL-Offense priorisiert aktuell staerker schwere Personnel-Gruppen, multiple Tight Ends, extra OL, condensed formations und chip-/attachment-nahe Protections.
- NFL-Defense bewegt sich wieder staerker in Base-Strukturen und weiter Richtung Quarters/Cover-6-Familien.
- College-Offense treibt weiterhin Duo-Varianten, Compressed/Bunch-Surfaces, Tracer/Insert-Elemente und RPO-Kopplungen.
- College- und moderne Defense bleibt stark bei creeper/simulated pressure und variablen Frontbildern.

Quellenbasis:

- NFL.com, 2026-02-10: Chip Blocks, condensed formations, motion, heavy personnel und multiple TEs als heutiger NFL-Trend.
- NFL.com, 2026-02-04: Heavy personnel, extra OL und Fullback-/Big-Personnel-Answers als 2025er Gegenreaktion auf schnelle Defenses.
- PFF, 2026-01-04: Base-Personnel-Nutzung steigt wieder; Cover-4 und Cover-6 wachsen weiter.
- X&O Labs, 2025-06-03 und 2026-02-13: Duo, Bunch/Compressed Duo und Duo-RPO/Tracer-Strukturen als stark genutzte College-Answers.
- Football Toolbox, 2025-11-02: Sim/Creeper-Pressure-Strukturen bleiben ein aktiver Coaching-Schwerpunkt.

Aus diesen Quellen leite ich fuer dieses System folgende modern relevante Luecken ab:

Offense:

- Duo-Familie innerhalb `GAP_RUN`
- Outside Zone innerhalb `ZONE_RUN`
- Bunch- und compressed-formation runs
- Empty quick game
- Mesh / Y-Cross / Mills im Dropback-Menue
- Yankee / Max-Protect-Shot / Sprint Sail im Play-Action- und Movement-Bereich
- Zone Read und Slant/Flat RPO
- WR- und TE-Screens statt nur RB-Slip
- Heavy 12/13 Personnel Shot- und Run-Answers

Defense:

- Cover 6
- Palms / Cover 7
- Tampa 2 / Cloud 2
- Cover 3 Match / Sky-Varianten
- mehr Tite-, Bear- und Okie-Fronts
- mehr Creeper- und Sim-Druckbilder
- echte Run-Blitz- und Bear-Plug-Answers
- Dime Two-High als Passing-Down-Struktur

### 2.4 Strukturelle Luecke im Domainmodell

Die Offense hat bereits eine explizite `conceptFamilyId`. Die Defense modelliert Variationen nur indirekt ueber:

- Formation
- Front
- Coverage
- Pressure
- Shell
- Presentation

Das funktioniert heute, fuehrt aber bei 50+ Plays schnell zu Autoring-Reibung. Fuer Phase 1 sollte das Schema trotzdem unveraendert bleiben. Fuer Phase 2 kann optional ein leichtgewichtiger `defensiveConceptTag`- oder `coveragePatternTag`-Layer erwogen werden. Das ist kein Sofortbedarf.

## 3. Erweiterungskonzept

### 3.1 Leitprinzip

Die Expansion sollte in zwei klar getrennten Bahnen erfolgen:

- Bahn A: Engine-neutrale Dichteerhoehung innerhalb bestehender Familien
- Bahn B: gezielte neue Familien, nur wenn ein Call fachlich nicht sauber in eine bestehende Familie passt

Das ist exakt konsistent mit [docs/architecture/gameplay-extension-guide.md](../../architecture/gameplay-extension-guide.md).

### 3.2 Zielstruktur fuer 3x bis 5x mehr Plays

Phase 1, Zielbild 48 Plays:

- 24 Offensive Plays
- 24 Defensive Plays
- Keine neuen Top-Level-Familien notwendig
- Fokus auf Nutzung vorhandener Konzept-, Coverage- und Pressure-Scaffolds

Phase 2, Zielbild 72 Plays:

- 36 Offensive Plays
- 36 Defensive Plays
- Gezielte Einfuehrung weniger neuer Top-Level-Familien
- Nur wenn die neuen Calls deutlich anderes Selection- oder Outcome-Verhalten benoetigen

### 3.3 Empfohlene Ausbauverteilung Phase 1

Offense, Ziel 24:

- `ZONE_RUN`: 3
- `GAP_RUN`: 5
- `OPTION_RPO`: 4
- `QUICK_PASS`: 4
- `DROPBACK`: 3
- `PLAY_ACTION`: 3
- `SCREEN`: 2

Defense, Ziel 24:

- `MATCH_COVERAGE`: 4
- `ZONE_COVERAGE`: 5
- `MAN_COVERAGE`: 3
- `ZERO_PRESSURE`: 3
- `FIRE_ZONE`: 3
- `SIMULATED_PRESSURE`: 4
- `RED_ZONE_PACKAGE`: 2

### 3.4 Priorisierte neue Plays innerhalb bestehender Familien

Offense, Prioritaet A:

- `ZONE_RUN`
- `off-zone-insert-bluff`
- `off-zone-outside-stretch`

- `GAP_RUN`
- `off-gap-duo-bunch`
- `off-gap-power-o-i-right`
- `off-gap-counter-gh-trips`
- `off-gap-trap-wham-tight`

- `OPTION_RPO`
- `off-rpo-zone-read-keep`
- `off-rpo-slant-flat`
- `off-option-triple-pistol`

- `QUICK_PASS`
- `off-quick-slant-flat`
- `off-quick-hitch-out`
- `off-quick-rub-pivot-red-zone`

- `DROPBACK`
- `off-dropback-mesh-rail`
- `off-dropback-y-cross`
- `off-dropback-mills`

- `PLAY_ACTION`
- `off-play-action-yankee-max`
- `off-play-action-sprint-sail`

- `SCREEN`
- `off-screen-wr-tunnel`
- `off-screen-te-delay`

Defense, Prioritaet A:

- `MATCH_COVERAGE`
- `def-match-palms-tite`
- `def-match-cover-3-match`
- `def-match-quarters-poach-okie`

- `ZONE_COVERAGE`
- `def-zone-tampa-2-base`
- `def-zone-cloud-2-nickel`
- `def-zone-cover-3-sky`
- `def-zone-cover-6-dime`

- `MAN_COVERAGE`
- `def-man-cover-1-lurk`
- `def-man-robber-overload`

- `ZERO_PRESSURE`
- `def-zero-overload-nickel`
- `def-zero-mug-dime-two-high`

- `FIRE_ZONE`
- `def-fire-zone-field`
- `def-fire-zone-cross-dog`

- `SIMULATED_PRESSURE`
- `def-sim-boundary-creeper`
- `def-sim-double-mug`
- `def-sim-tite-creeper`

- `RED_ZONE_PACKAGE`
- `def-red-zone-bear-plug`

## 4. Definition neuer Play-Familien

Wichtig:

- Diese Familien sind fachlich sinnvoll.
- Sie sind nicht alle sofort noetig.
- Phase 1 sollte bewusst ohne sie auskommen.
- Phase 2 kann sie einfuehren, sobald mehr Varianz im Selection- oder Outcome-Verhalten gebraucht wird.

### 4.1 Neue Offensive Familien

#### `DESIGNED_QB_RUN`

Warum:

- `QB Draw`, `Power Read Bash` und weitere echte QB-Carry-Konzepte sind heute nur unsauber in `GAP_RUN` oder `OPTION_RPO` unterzubringen.
- Diese Plays brauchen oft anderes Run-Risk-, Fumble- und Explosive-Profil.

Beispielplays:

- QB Draw
- Power Read Bash
- GT Bash Keep
- Counter Bash

Prioritaet:

- Mittel

Engine-Impact:

- Selection Biases
- Outcome-Parameter
- Run/Pass-Pfad bleibt `RUN`
- Default Playbooks

#### `MOVEMENT_PASS`

Warum:

- Sprint Out, Half Roll und Launch sind nicht immer echtes `PLAY_ACTION`.
- Sie haben anderes Protection- und Pressure-Verhalten als Dropback und klassisches Play Action.

Beispielplays:

- Sprint Sail
- Naked Keep Pass
- Half-Roll Flood

Prioritaet:

- Mittel

Engine-Impact:

- Pass-Family-Parameter
- Selection Biases fuer Two-Minute, Pressure und Shot Windows

#### `EMPTY_TEMPO`

Warum:

- Empty Quick und Empty Tempo sind heute zwischen `QUICK_PASS` und `DROPBACK` verteilt.
- Wenn Empty ein echter Offense-Schwerpunkt wird, lohnt eine eigene Family.

Beispielplays:

- Empty Stick
- Empty Choice
- Empty Hitch-Seam

Prioritaet:

- Niedrig bis Mittel

Engine-Impact:

- Selection Biases
- Default Playbooks
- Pass-Family-Parameter

### 4.2 Neue Defensive Familien

#### `DROP_EIGHT`

Warum:

- Aktuell fehlt ein klares Drop-8- oder Rush-3-/Spy-Paket als Antwort auf Spread, Air Raid und mobile QBs.

Beispielplays:

- 3 Rush Drop 8 Match
- 3 Rush Spy Tampa
- 3 High Drop 8

Prioritaet:

- Hoch fuer College-Ausbau

Engine-Impact:

- Selection Biases
- Coverage-Blend
- Defensive Family Bonuses

#### `RUN_BLITZ`

Warum:

- Bear Plug, Cross Dog und aggressive early-down fits sind aktuell ueber `FIRE_ZONE`, `ZERO_PRESSURE` oder `RED_ZONE_PACKAGE` verstreut.
- Diese Calls haben aber ein anderes Run-Fit-Profil als klassische Pass-Druck-Familien.

Beispielplays:

- Bear Plug
- Nickel Run Blitz
- Cross Dog Fit

Prioritaet:

- Hoch

Engine-Impact:

- Selection Erwartungsraum gegen Run
- Run-Fit-Boni in Outcome-Parametern

#### `BRACKET_SPECIALTY`

Warum:

- Red-Zone-Brackets sind modelliert, aber Bracket-/Double-Answers auf Money Downs fehlen.

Beispielplays:

- 1 Double X
- 2 Man Bracket
- Solo/Poach Bracket

Prioritaet:

- Mittel

Engine-Impact:

- Coverage-Blend
- Passing-Down-Biases

#### `THREE_HIGH_PACKAGE`

Warum:

- Besonders fuer College-Spread und QB-Run-Defenses ist ein 3-High-/Mint-orientierter Family-Layer fachlich sinnvoll.

Beispielplays:

- Mint 3-High Match
- Penny 3-High Sim
- 3-High Drop 8

Prioritaet:

- Mittel

Engine-Impact:

- Neue defensive Family-Logik in Selection und Outcome

## 5. Priorisierung

### 5.1 Phase 1, sofort umsetzen

Prioritaet 1:

- Alle bereits vorbereiteten Offensive Concept Families mit mindestens einem Play besetzen
- Ungenutzte Offense Formationen aktivieren: Bunch, Empty, I, Heavy Tight
- Ungenutzte Defense Coverages und Pressures aktivieren
- Motion- und Protection-Diversitaet sichtbar erhoehen

Prioritaet 2:

- Quarters-, Palms-, Cover-6- und Tampa-2-Cluster auf Defense ausbauen
- Duo-, Outside-Zone-, Mesh-, Y-Cross-, Mills- und Yankee-Cluster auf Offense ausbauen

Prioritaet 3:

- Goal-Line-, Bear-, Dime-Two-High- und Tite-Pakete auffuellen

### 5.2 Phase 2, nur mit Engine-Erweiterung

- `DESIGNED_QB_RUN`
- `DROP_EIGHT`
- `RUN_BLITZ`
- `MOVEMENT_PASS`
- `BRACKET_SPECIALTY`
- `THREE_HIGH_PACKAGE`

## 6. Strukturdefinition fuer neue Plays

### 6.1 Einheitliches Schema

Das bestehende Play-Schema reicht aus und sollte fuer Phase 1 unveraendert bleiben.

Pflicht fuer jeden neuen Play:

- `structure`
- `situationTags`
- `triggers`
- `reads`
- `assignments`
- `expectedMetrics`
- `counters`
- `audibles`
- `legalityTemplate`

Zusatzregel:

- Jede neue Variante muss sich mindestens in einem fachlich relevanten Vektor unterscheiden:
  - Formation
  - Personnel
  - Motion
  - Protection
  - Concept
  - Trigger-Profil
  - Shell / Pressure / Front
  - Situation Tagging

Keine Pseudo-Varianten:

- Ein Play mit identischer Struktur, identischen Reads und nur leicht geaenderter Label-Zeile ist keine sinnvolle neue Variante.

### 6.2 Naming-Konventionen

ID-Schema Offense:

- `off-{family-scope}-{concept}-{variant}`

Beispiele:

- `off-zone-outside-stretch`
- `off-gap-duo-bunch`
- `off-rpo-slant-flat`
- `off-dropback-mesh-rail`
- `off-play-action-yankee-max`

ID-Schema Defense:

- `def-{family-scope}-{core-concept}-{variant}`

Beispiele:

- `def-zone-tampa-2-base`
- `def-match-palms-tite`
- `def-sim-double-mug`
- `def-fire-zone-field`
- `def-red-zone-bear-plug`

Label-Regel:

- menschlich lesbar
- zuerst Fachbegriff, dann Variante
- keine Abkuerzungen ohne Playbook-Wert

### 6.3 Variationslogik

Offense-Varianten sollen entlang dieser Achsen gebaut werden:

- Konzept: `duo`, `outside-zone`, `mesh`, `mills`
- Formation: `doubles`, `trips`, `bunch`, `empty`, `tight`, `i-right`
- Motion: `none`, `jet`, `orbit`, `return`, `short`, `bluff`
- Protection: `half-slide`, `six-man-scan`, `max-shot`, `empty-quick`
- Situation: `red-zone`, `backed-up`, `two-minute`, `shot-window`

Defense-Varianten sollen entlang dieser Achsen gebaut werden:

- Front: `over`, `under`, `odd`, `tite`, `okie`, `bear`
- Coverage: `quarters`, `palms`, `cover-3-buzz`, `cover-6`, `tampa-2`
- Pressure: `none`, `creeper`, `double-mug`, `cross-dog`, `bear-plug`
- Personnel: `base`, `nickel`, `dime`, `goal-line`
- Situation: `base`, `passing-down`, `red-zone`, `goal-line`, `run-fit`

Empfohlene Regel:

- Variiere pro neuem Play maximal zwei Primaerachsen.
- So bleibt die Bibliothek lesbar und die Ursache fuer anderes Verhalten erkennbar.

## 7. Engine-Kompatibilitaet

### 7.1 Was sofort kompatibel ist

Sofort kompatibel ohne Engine-Refactor:

- neue Plays innerhalb bestehender Familien
- neue Plays auf vorhandenen Formations-, Coverage-, Pressure- und Concept-Scaffolds
- neue Motion- und Protection-Kombinationen
- neue Trigger, Reads, Assignments und Expected Metrics

Warum:

- Selection arbeitet play- und familienbasiert
- Legality arbeitet template-basiert
- Outcome arbeitet familienbasiert und ignoriert konkrete Play-IDs

### 7.2 Was nicht automatisch kompatibel ist

Nicht automatisch kompatibel:

- neue `OffensivePlayFamily`
- neue `DefensivePlayFamily`

Dann muessen mindestens angepasst werden:

- [src/modules/gameplay/domain/play-library.ts](../../../src/modules/gameplay/domain/play-library.ts)
- [src/modules/gameplay/application/play-selection-engine.ts](../../../src/modules/gameplay/application/play-selection-engine.ts)
- [src/modules/gameplay/application/outcome-model-parameters.ts](../../../src/modules/gameplay/application/outcome-model-parameters.ts)
- [src/modules/gameplay/application/outcome-resolution-engine.ts](../../../src/modules/gameplay/application/outcome-resolution-engine.ts)
- [src/modules/gameplay/infrastructure/default-playbooks.ts](../../../src/modules/gameplay/infrastructure/default-playbooks.ts)
- relevante Tests und Calibration-Szenarien

### 7.3 Empfohlener Kompatibilitaetsrahmen

- Phase 1 bleibt strikt innerhalb bestehender Familien.
- Phase 2 fuehrt nur wenige neue Familien ein.
- Jede neue Familie bekommt zuerst:
  - Selection Bias Map
  - Outcome-Parameter
  - Playbook-Gewichte
  - Regressionstests

## 8. Konkrete Erweiterungsstrategie

### 8.1 Schnellster Mehrwert

Der schnellste und risikoaermste Ausbau ist:

1. Offense von 7 auf 24 Plays bringen
2. Defense von 7 auf 24 Plays bringen
3. dabei nur bestehende Familien nutzen
4. ungenutzte Scaffolds systematisch aktivieren

### 8.2 Authoring-Reihenfolge

Welle 1:

- Duo
- Outside Zone
- Slant/Flat RPO
- Mesh
- Y Cross
- Cover 6
- Palms
- Tampa 2
- Dime Two-High Sim
- Bear Plug Red Zone

Welle 2:

- Power O
- Trap/Wham
- Empty Quick
- Sprint Sail
- WR Tunnel
- Cover 3 Match
- Cover 1 Lurk
- Field Fire
- Boundary Creeper

Welle 3:

- Triple Option
- Max-Protect Yankee
- Heavy 13 Goal-Line Offense
- Drop 8
- Three High Package

## 9. Statuspruefung

### System vollstaendig verstanden?

Ja, fuer die Gameplay-Slice:

- Play Library
- Play Selection
- Outcome Resolution
- Legality Engine
- Default Playbooks
- Katalogvalidierung

### Sinnvolle Erweiterungen definiert?

Ja:

- kurzfristig engine-neutral
- mittelfristig familienerweiternd
- modern NFL- und College-tauglich

### Engine-Kompatibilitaet gewaehrleistet?

Ja, wenn die Umsetzung der Phasenlogik folgt:

- Phase 1 ohne neue Familien
- Phase 2 nur mit expliziten Engine-Anpassungen

## Status

Gruen

PROMPT 2 kann auf dieser Basis gestartet werden.

## Externe Quellen fuer Modernitaets-Priorisierung

- NFL.com, James Reber, 2026-02-10: https://www.nfl.com/news/the-secret-weapon-nfl-offenses-are-using-to-buy-qbs-an-extra-half-second
- NFL.com, James Reber, 2026-02-04: https://www.nfl.com/news/nfl-trend-watch-heavy-personnel-could-shape-super-bowl-lx-showdown-between-patriots-and-seahawks
- PFF, Daire Carragher, 2026-01-04: https://www.pff.com/news/nfl-is-evolving-five-schematic-trends-that-have-shaped-the-2025-season
- X&O Labs, Mike Kuchar, 2025-06-03: https://www.xandolabs.com/the-lab/offense/run-game/duo-run-concepts/trend-line-3-key-adjustments-turning-duo-run-schemes-into-an-explosive-play-generator/
- X&O Labs, Mike Kuchar, 2026-02-13: https://www.xandolabs.com/the-lab/offense/run-game/duo-run-concepts/control-the-cutback-the-bunch-duo-rpo/
- Football Toolbox, Brian Nix, 2025-11-02: https://footballtoolbox.net/defense/create-chaos-advanced-sim-pressure-breakdowns
