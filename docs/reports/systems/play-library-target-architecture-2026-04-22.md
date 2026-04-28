# Play-Library Zielarchitektur

Stand: 2026-04-22

## Ziel

Dieses Dokument definiert die Zielstruktur der erweiterten Play Library fuer eine 3x bis 5x groessere Play-Abdeckung.

Zielbild:

- klare Taxonomie
- konsistente Struktur ueber Offense und Defense
- skalierbar ohne unkontrollierte Kombinatorik
- kompatibel mit Selection, Legality und Outcome Engine

## Executive Summary

Die Zielarchitektur baut auf dem bestehenden Modell auf und fuehrt keine unnoetige neue Komplexitaet ein.

Leitidee:

- Ein Play ist kein isolierter Eintrag, sondern eine kuratierte Komposition aus Family, Personnel, Formation, Konzept und Situation.
- Nicht jede denkbare Kombination wird als Play angelegt.
- Die Library skaliert ueber wiederverwendbare Achsen und bewusst definierte Variantengruppen.

Zielgroessen:

- Phase 1: 48 Plays total, nur innerhalb bestehender Top-Level-Familien
- Phase 2: 72 Plays total, inklusive neuer Top-Level-Familien

Status:

- Gruen

## 1. Designprinzipien

### 1.1 Architekturprinzip

Die Play Library wird entlang fester Ebenen organisiert:

1. Side
2. Top-Level Family
3. Untervariante oder Konzeptcluster
4. Personnel Package
5. Formation Family
6. technische Strukturbausteine
7. Situation Package
8. konkreter Play

### 1.2 Kuratierte statt vollstaendige Matrix

Wichtig:

- Die Zielarchitektur bildet keine Vollmatrix aus allen Personnel-, Formation- und Situationskombinationen.
- Stattdessen werden pro Family bewusst wenige, fachlich starke Play-Zellen definiert.
- Jede Play-Zelle repraesentiert einen realistischen, wiederverwendbaren Coaching-Baustein.

Beispiel:

- `Duo` soll nicht automatisch in jeder Formation, jedem Personnel und jeder Situation existieren.
- Stattdessen bekommt `Duo` einige kanonische Varianten wie `bunch`, `i-right` oder `heavy-tight`.

### 1.3 Engine-Kompatibilitaetsregel

Phase 1 bleibt auf dem bestehenden Schema:

- `family`
- `structure`
- `situationTags`
- `triggers`
- `reads`
- `assignments`
- `expectedMetrics`
- `legalityTemplate`

Phase 2 darf neue Families einfuehren, aber nur mit begleitender Engine-Erweiterung.

## 2. Zielmodell der Library

### 2.1 Kernobjekt

Der konkrete Play bleibt ein `PlayCallDefinition`.

Fachlich soll jeder Play kuenftig ueber diese Achsen lesbar sein:

- `side`
- `family`
- `concept cluster`
- `personnel package`
- `formation family`
- `motion/protection` oder `front/coverage/pressure`
- `situation package`
- `variant`

### 2.2 Canonical Play Cell

Die kleinste sinnvolle Architektureinheit ist eine `Canonical Play Cell`.

Eine Canonical Play Cell ist:

- eine fachlich stabile Kombination aus Konzept, Personnel, Formation und Situation
- nicht nur ein Label
- nicht nur eine Coverage oder nur eine Motion
- eine Einheit, die vom Playbook gezielt aufgerufen werden kann

Formel Offense:

- `Offense Play Cell = family + concept + personnel + formation + motion/protection + situation`

Formel Defense:

- `Defense Play Cell = family + front + coverage + pressure + personnel + situation`

## 3. Taxonomie-Ebenen

### 3.1 Ebene 1: Side

- `OFFENSE`
- `DEFENSE`

### 3.2 Ebene 2: Top-Level Family

Offense, bestehend:

- `ZONE_RUN`
- `GAP_RUN`
- `OPTION_RPO`
- `QUICK_PASS`
- `DROPBACK`
- `PLAY_ACTION`
- `SCREEN`

Offense, neu in Phase 2:

- `DESIGNED_QB_RUN`
- `MOVEMENT_PASS`
- `EMPTY_TEMPO`

Defense, bestehend:

- `MATCH_COVERAGE`
- `ZONE_COVERAGE`
- `MAN_COVERAGE`
- `ZERO_PRESSURE`
- `FIRE_ZONE`
- `SIMULATED_PRESSURE`
- `RED_ZONE_PACKAGE`

Defense, neu in Phase 2:

- `DROP_EIGHT`
- `RUN_BLITZ`
- `BRACKET_SPECIALTY`
- `THREE_HIGH_PACKAGE`

### 3.3 Ebene 3: Konzeptcluster oder Untervarianten

Diese Ebene erzeugt fachliche Tiefe innerhalb einer Family.

Beispiele Offense:

- `ZONE_RUN`
  - inside-zone
  - zone-insert
  - outside-zone

- `GAP_RUN`
  - duo
  - power
  - counter
  - trap-wham

- `OPTION_RPO`
  - glance-bubble
  - slant-flat
  - zone-read
  - triple-option

Beispiele Defense:

- `ZONE_COVERAGE`
  - tampa-2
  - cloud-2
  - cover-3-sky
  - cover-6

- `SIMULATED_PRESSURE`
  - field-creeper
  - boundary-creeper
  - sim-double-mug
  - tite-creeper

### 3.4 Ebene 4: Personnel Package

Personnel ist ein Primarfilter, keine Dekoration.

Offense Zielraum:

- `off-10`
- `off-11`
- `off-12`
- `off-13`
- `off-20`
- `off-21`

Defense Zielraum:

- `def-base-43`
- `def-base-34`
- `def-nickel`
- `def-dime`
- `def-goal-line`

Architekturregel:

- Jede Family bekommt definierte Primaer-Personnel-Pakete.
- Nicht jedes Personnel darf jede Family gleich stark tragen.

### 3.5 Ebene 5: Formation Family

Formationen strukturieren die praesentierte Oberflaeche des Calls.

Offense Zielraum:

- `off-gun-doubles-11`
- `off-gun-trips-11`
- `off-gun-bunch-11`
- `off-gun-empty-10`
- `off-singleback-tight-12`
- `off-pistol-twins-20`
- `off-pistol-trips-11`
- `off-i-right-21`
- `off-heavy-tight-13`

Defense Zielraum:

- `def-base-over-43`
- `def-base-okie-34`
- `def-nickel-over`
- `def-nickel-match`
- `def-tite-nickel`
- `def-bear-nickel`
- `def-dime-zero`
- `def-dime-two-high`
- `def-odd-fire-zone`
- `def-goal-line-bracket`

Architekturregel:

- Formation Family bestimmt die darstellende Struktur.
- Family bestimmt die taktische Absicht.
- Dasselbe Konzept darf in mehreren Formationen erscheinen, aber nur in ausgewaehlten Kanon-Zellen.

### 3.6 Ebene 6: Technische Strukturbausteine

Offense:

- `motionFamilyIds`
- `protectionFamilyId`

Defense:

- `frontFamilyId`
- `coverageFamilyId`
- `pressureFamilyId`
- `coverageShell`
- `pressurePresentation`

Architekturregel:

- Diese Ebene erzeugt Variation, aber keine neue Top-Level-Family.
- Neue Top-Level-Familien werden nur dann eingefuehrt, wenn Selection oder Outcome anders modelliert werden muessen.

### 3.7 Ebene 7: Situation Package

Situation wird ueber `situationTags` und `triggers` modelliert.

Kanonische Situation Packages:

- `BASE`
- `EARLY_DOWN`
- `SHORT_YARDAGE`
- `PASSING_DOWN`
- `TWO_MINUTE`
- `FOUR_MINUTE`
- `RED_ZONE`
- `GOAL_LINE`
- `BACKED_UP`
- `SHOT_PLAY`
- `PRESSURE_ANSWER`
- `RUN_FIT`

Architekturregel:

- Situation erzeugt keine neue Family.
- Situation schneidet die Library entlang aufrufbarer Menues.

## 4. Offense-Zielarchitektur

### 4.1 Phase 1 Offense Families

| Family | Zielzahl | Primaere Personnel | Primaere Formation Families | Kanonische Untervarianten |
|---|---:|---|---|---|
| `ZONE_RUN` | 3 | `off-11`, `off-12` | doubles, tight | inside-zone-split, zone-insert, outside-zone |
| `GAP_RUN` | 5 | `off-20`, `off-21`, `off-13`, `off-11` | pistol-twins, i-right, heavy-tight, bunch | counter-gt, duo, power-o, counter-gh, trap-wham |
| `OPTION_RPO` | 4 | `off-11`, `off-20` | trips, pistol-trips | glance-bubble, slant-flat, zone-read, triple-option |
| `QUICK_PASS` | 4 | `off-10`, `off-11`, `off-12` | doubles, bunch, empty | stick-spacing, slant-flat, hitch-out, rub-pivot |
| `DROPBACK` | 3 | `off-10`, `off-11` | doubles, trips, empty | dagger, mesh, y-cross or mills |
| `PLAY_ACTION` | 3 | `off-12`, `off-21`, `off-13` | tight, i-right, heavy-tight | boot-flood, yankee, sprint-sail |
| `SCREEN` | 2 | `off-11`, `off-12` | doubles, bunch, tight | rb-slip, wr-tunnel or te-delay |

Phase-1-Ziel:

- 24 Offensive Plays
- keine neuen Top-Level-Familien
- hohe Vielfalt ueber Konzeptcluster, Personnel und Formation

### 4.2 Phase 2 Offense Families

| Family | Zielzahl | Primaere Personnel | Primaere Formation Families | Rolle im System |
|---|---:|---|---|---|
| `ZONE_RUN` | 4 | `off-11`, `off-12` | doubles, tight | baseline run menu |
| `GAP_RUN` | 5 | `off-20`, `off-21`, `off-13` | pistol, i-right, heavy | downhill menu |
| `OPTION_RPO` | 5 | `off-11`, `off-20` | trips, pistol-trips | conflict menu |
| `QUICK_PASS` | 4 | `off-10`, `off-11`, `off-12` | doubles, bunch, empty | tempo- und pressure-answer-menu |
| `DROPBACK` | 4 | `off-10`, `off-11` | doubles, trips, empty | intermediate/deep menu |
| `PLAY_ACTION` | 4 | `off-12`, `off-21`, `off-13` | tight, i-right, heavy | run-tie shot menu |
| `SCREEN` | 2 | `off-11`, `off-12` | doubles, bunch | constraint menu |
| `DESIGNED_QB_RUN` | 3 | `off-11`, `off-20` | pistol, trips | QB carry menu |
| `MOVEMENT_PASS` | 3 | `off-11`, `off-12`, `off-21` | tight, bunch, launch looks | moved-pocket menu |
| `EMPTY_TEMPO` | 2 | `off-10`, `off-11` | empty | spread tempo menu |

Phase-2-Ziel:

- 36 Offensive Plays
- Family-Breite erhoeht
- echter Unterschied zwischen classic dropback, play action, movement pass und QB-run menus

### 4.3 Offense Family-Definitionen

#### `ZONE_RUN`

Rolle:

- horizontaler Run-Stress
- light-box punish
- basisnaher frueher Down-Call

Untervarianten:

- inside-zone-split
- zone-insert-bluff
- outside-zone-stretch
- wide-zone-cutback

Primaere Structure-Achsen:

- `off-11`, `off-12`
- doubles, tight
- none or bluff motion

Primaere Situationen:

- `BASE`
- `EARLY_DOWN`
- `BACKED_UP`
- `RUN_FIT`

#### `GAP_RUN`

Rolle:

- downhill identity
- short-yardage answer
- heavy-personnel anchor

Untervarianten:

- counter-gt
- duo-bunch
- power-o
- counter-gh
- trap-wham

Primaere Structure-Achsen:

- `off-20`, `off-21`, `off-13`, `off-11`
- pistol, i-right, heavy-tight, bunch

Primaere Situationen:

- `BASE`
- `SHORT_YARDAGE`
- `RED_ZONE`
- `GOAL_LINE`
- `FOUR_MINUTE`

#### `OPTION_RPO`

Rolle:

- conflict-defender menu
- anti-overfit answer
- spread-compatible stress family

Untervarianten:

- glance-bubble
- slant-flat
- zone-read
- triple-option
- glance-stick

Primaere Structure-Achsen:

- `off-11`, `off-20`
- trips, pistol-trips
- jet, orbit, short motion

Primaere Situationen:

- `EARLY_DOWN`
- `PRESSURE_ANSWER`
- `RPO`

#### `QUICK_PASS`

Rolle:

- rhythm menu
- pressure answer
- two-minute stabilizer

Untervarianten:

- stick-spacing
- slant-flat
- hitch-out
- rub-pivot
- bunch-now

Primaere Structure-Achsen:

- `off-10`, `off-11`, `off-12`
- doubles, bunch, empty
- half-slide, empty-quick

Primaere Situationen:

- `PASSING_DOWN`
- `TWO_MINUTE`
- `PRESSURE_ANSWER`
- `RED_ZONE`

#### `DROPBACK`

Rolle:

- intermediate/deep progression menu
- non-play-action passing core

Untervarianten:

- dagger
- mesh-rail
- y-cross
- mills

Primaere Structure-Achsen:

- `off-10`, `off-11`
- doubles, trips, empty
- full-slide, six-man-scan

Primaere Situationen:

- `PASSING_DOWN`
- `SHOT_PLAY`
- `TWO_MINUTE`

#### `PLAY_ACTION`

Rolle:

- run-tied explosive menu
- heavy- und condensed-formation-attacke

Untervarianten:

- boot-flood
- yankee-shot
- sprint-sail
- heavy-cross-shot

Primaere Structure-Achsen:

- `off-12`, `off-21`, `off-13`
- tight, i-right, heavy-tight
- boot, max-shot, sprint-launch

Primaere Situationen:

- `BASE`
- `SHOT_PLAY`
- `RED_ZONE`

#### `SCREEN`

Rolle:

- constraint menu
- anti-pressure release valve

Untervarianten:

- rb-slip
- wr-tunnel
- te-delay

Primaere Structure-Achsen:

- `off-11`, `off-12`
- doubles, bunch, tight
- screen-invite

Primaere Situationen:

- `PRESSURE_ANSWER`
- `PASSING_DOWN`
- `SCREEN_GAME`

#### `DESIGNED_QB_RUN`

Rolle:

- adds quarterback run math
- forces plus-one box accounting

Untervarianten:

- qb-draw
- power-read-bash
- counter-bash

Primaere Structure-Achsen:

- `off-11`, `off-20`
- pistol, trips

Primaere Situationen:

- `SHORT_YARDAGE`
- `RED_ZONE`
- `PASSING_DOWN`

#### `MOVEMENT_PASS`

Rolle:

- moved launch point
- pressure mitigation through pocket relocation

Untervarianten:

- sprint-sail
- half-roll-flood
- naked-keep-pass

Primaere Structure-Achsen:

- `off-11`, `off-12`, `off-21`
- tight, bunch, condensed
- sprint-launch

Primaere Situationen:

- `PRESSURE_ANSWER`
- `PASSING_DOWN`
- `SHOT_PLAY`

#### `EMPTY_TEMPO`

Rolle:

- high-volume-spacing- und tempo-menu
- schnelle leverage- und matchup-evaluation

Untervarianten:

- empty-stick
- empty-choice
- empty-hitch-seam

Primaere Structure-Achsen:

- `off-10`, `off-11`
- empty
- empty-quick

Primaere Situationen:

- `TWO_MINUTE`
- `PASSING_DOWN`
- `PRESSURE_ANSWER`

## 5. Defense-Zielarchitektur

### 5.1 Phase 1 Defense Families

| Family | Zielzahl | Primaere Personnel | Primaere Formation Families | Kanonische Untervarianten |
|---|---:|---|---|---|
| `MATCH_COVERAGE` | 4 | `def-nickel`, `def-base-34` | nickel-match, tite-nickel, okie | quarters-poach, palms, cover-3-match, poach-okie |
| `ZONE_COVERAGE` | 5 | `def-base-43`, `def-nickel`, `def-dime` | base-over, nickel-over, dime-two-high | cover-3-buzz, tampa-2, cloud-2, cover-3-sky, cover-6 |
| `MAN_COVERAGE` | 3 | `def-nickel`, `def-dime` | nickel-over, dime-two-high | cover-1-robber, cover-1-lurk, 2-man-bracket-lite |
| `ZERO_PRESSURE` | 3 | `def-dime`, `def-nickel` | dime-zero, nickel-over | double-a-zero, overload-zero, mug-zero |
| `FIRE_ZONE` | 3 | `def-nickel`, `def-base-34` | odd-fire-zone, okie | boundary-fire, field-fire, cross-dog-fire |
| `SIMULATED_PRESSURE` | 4 | `def-nickel`, `def-base-34`, `def-dime` | nickel-match, tite-nickel, dime-two-high | field-creeper, boundary-creeper, sim-double-mug, tite-creeper |
| `RED_ZONE_PACKAGE` | 2 | `def-goal-line`, `def-nickel` | goal-line, bear-nickel | goal-line-bracket, bear-plug-red-zone |

Phase-1-Ziel:

- 24 Defensive Plays
- moderne split-safety- und pressure-tiefe ohne neue Top-Level-Familien

### 5.2 Phase 2 Defense Families

| Family | Zielzahl | Primaere Personnel | Primaere Formation Families | Rolle im System |
|---|---:|---|---|---|
| `MATCH_COVERAGE` | 4 | nickel, base-34 | nickel-match, tite-nickel, okie | split-safety match core |
| `ZONE_COVERAGE` | 5 | base-43, nickel, dime | base-over, nickel-over, dime-two-high | spot-drop- und split-zone-core |
| `MAN_COVERAGE` | 4 | nickel, dime | nickel-over, dime-two-high | leverage- und robber-core |
| `ZERO_PRESSURE` | 3 | dime, nickel | dime-zero, nickel-over | all-out pressure core |
| `FIRE_ZONE` | 3 | nickel, base-34 | odd-fire-zone, okie | five-man zone pressure core |
| `SIMULATED_PRESSURE` | 4 | nickel, dime, base-34 | nickel-match, tite-nickel, dime-two-high | disguise pressure core |
| `RED_ZONE_PACKAGE` | 2 | goal-line, nickel | goal-line, bear-nickel | compressed field menu |
| `DROP_EIGHT` | 3 | dime, base-34 | dime-two-high, okie | anti-spread changeup menu |
| `RUN_BLITZ` | 3 | nickel, bear-nickel, goal-line | bear, tite, over | aggressive run-fit menu |
| `BRACKET_SPECIALTY` | 2 | nickel, dime | dime-two-high, nickel-match | money-down matchup menu |
| `THREE_HIGH_PACKAGE` | 3 | nickel, base-34 | tite, okie, three-high shells | college anti-RPO / QB-run menu |

Phase-2-Ziel:

- 36 Defensive Plays
- echte Erweiterung fuer college-nahe und matchup-specialty-structures

### 5.3 Defense Family-Definitionen

#### `MATCH_COVERAGE`

Rolle:

- split-safety match control
- explosives minimization
- run-fit with pattern integrity

Untervarianten:

- quarters-poach
- palms
- cover-3-match
- poach-okie

Primaere Structure-Achsen:

- nickel, base-34
- over, tite, okie
- quarters-match, palms-c7, cover-3-match

Primaere Situationen:

- `BASE`
- `RUN_FIT`
- `PASSING_DOWN`

#### `ZONE_COVERAGE`

Rolle:

- field-vision- und spacing-menu
- flexible shell diversity

Untervarianten:

- cover-3-buzz
- tampa-2
- cloud-2
- cover-3-sky
- cover-6

Primaere Structure-Achsen:

- base-43, nickel, dime
- over, under
- one-high- und two-high-shells

Primaere Situationen:

- `BASE`
- `EARLY_DOWN`
- `TWO_MINUTE`
- `BACKED_UP`

#### `MAN_COVERAGE`

Rolle:

- leverage menu versus known pass pictures
- underneath-compression und robber-looks

Untervarianten:

- cover-1-robber
- cover-1-lurk
- bracket-lite
- 2-man-matchup

Primaere Structure-Achsen:

- nickel, dime
- one-high- und two-high-man-shells

Primaere Situationen:

- `PASSING_DOWN`
- `RED_ZONE`
- `PRESSURE`

#### `ZERO_PRESSURE`

Rolle:

- max pressure menu
- immediate clock disruption

Untervarianten:

- double-a-zero
- overload-zero
- mug-zero

Primaere Structure-Achsen:

- dime, nickel
- zero shell
- five- or six-man presentation

Primaere Situationen:

- `PASSING_DOWN`
- `SHORT_YARDAGE`
- `PRESSURE`

#### `FIRE_ZONE`

Rolle:

- five-man pressure with zone behind it
- controlled aggression

Untervarianten:

- boundary-fire
- field-fire
- cross-dog-fire

Primaere Structure-Achsen:

- nickel, base-34
- odd, okie
- one-high five-man pressure

Primaere Situationen:

- `PASSING_DOWN`
- `PRESSURE`
- `RUN_FIT`

#### `SIMULATED_PRESSURE`

Rolle:

- disguise pressure without full commitment
- waste-blocker- und protection-math-menu

Untervarianten:

- field-creeper
- boundary-creeper
- sim-double-mug
- tite-creeper

Primaere Structure-Achsen:

- nickel, base-34, dime
- tite, okie, two-high dime
- simulated presentation

Primaere Situationen:

- `PASSING_DOWN`
- `PRESSURE`
- `SHOT_PLAY`

#### `RED_ZONE_PACKAGE`

Rolle:

- compressed-field defense
- bracket- und heavy-front-control

Untervarianten:

- goal-line-bracket
- bear-plug-red-zone

Primaere Structure-Achsen:

- goal-line, nickel
- goal-line, bear

Primaere Situationen:

- `RED_ZONE`
- `GOAL_LINE`
- `SHORT_YARDAGE`

#### `DROP_EIGHT`

Rolle:

- anti-air-raid- und anti-mobile-qb-changeup
- erzwingt underneath-completions und geduldige drives

Untervarianten:

- drop-8-match
- drop-8-spy
- drop-8-tampa

Primaere Structure-Achsen:

- dime, base-34
- two-high, three-high, okie

Primaere Situationen:

- `PASSING_DOWN`
- `TWO_MINUTE`
- `SHOT_PLAY`

#### `RUN_BLITZ`

Rolle:

- aggressive fit menu
- kill spread run before mesh resolves

Untervarianten:

- bear-plug
- nickel-run-blitz
- cross-dog-fit

Primaere Structure-Achsen:

- nickel, bear, goal-line
- bear, tite, over

Primaere Situationen:

- `EARLY_DOWN`
- `RUN_FIT`
- `SHORT_YARDAGE`

#### `BRACKET_SPECIALTY`

Rolle:

- isolate opponent alpha receiver or best route family
- matchup-specific answer

Untervarianten:

- 1-double-x
- 2-man-bracket
- solo-poach-bracket

Primaere Structure-Achsen:

- nickel, dime
- two-high- und one-high-bracket-structures

Primaere Situationen:

- `PASSING_DOWN`
- `RED_ZONE`
- `SHOT_PLAY`

#### `THREE_HIGH_PACKAGE`

Rolle:

- anti-RPO- und anti-QB-run-family
- college-spread control menu

Untervarianten:

- mint-3-high-match
- penny-3-high-sim
- 3-high-drop

Primaere Structure-Achsen:

- nickel, base-34
- tite, okie, three-high shells

Primaere Situationen:

- `EARLY_DOWN`
- `RUN_FIT`
- `RPO`

## 6. Architektur nach Formation, Situation und Personnel

### 6.1 Formation-Layer

Formation strukturiert die Library in Oberflaechenfamilien.

Offense Formation Buckets:

- balanced shotgun
- trips shotgun
- bunch/condensed shotgun
- empty shotgun
- tight under-center
- pistol split-back
- i-form under-center
- heavy goal-line

Defense Formation Buckets:

- base over
- base okie
- nickel over
- nickel match
- tite nickel
- bear nickel
- dime zero
- dime two-high
- odd fire
- goal-line

Architekturregel:

- Jede Family soll in mindestens zwei Formation Buckets leben, aber nicht in allen.

### 6.2 Situation-Layer

Situation erzeugt Playbook-Menues.

Kanonische Menues Offense:

- base menu
- early-down menu
- short-yardage menu
- passing-down menu
- red-zone menu
- goal-line menu
- backed-up menu
- two-minute menu
- four-minute menu
- shot-play menu
- pressure-answer menu

Kanonische Menues Defense:

- base menu
- run-fit menu
- passing-down menu
- pressure menu
- red-zone menu
- goal-line menu
- short-yardage menu
- shot-protection menu
- two-minute menu
- anti-RPO menu

Architekturregel:

- Ein Play gehoert in 1 bis 3 primaere Menues.
- Ein Play soll nicht in 5 oder 6 Menues gestreut werden.

### 6.3 Personnel-Layer

Personnel erzeugt physische Identitaet.

Offense Personnel Buckets:

- spread
- balanced
- tight end heavy
- backfield heavy
- goal-line heavy

Defense Personnel Buckets:

- base
- nickel
- dime
- goal-line

Architekturregel:

- Personnel ist ein primaerer Kurator der Play-Zellen.
- Plays sollen zuerst ueber Personnel plausibel sein und erst dann ueber Formation erweitert werden.

## 7. Zielgroessen fuer 3x bis 5x mehr Plays

### 7.1 3x Zielmodell

Ausgang:

- 14 Plays

3x Ziel:

- 42 bis 48 Plays

Empfohlen:

- 48 Plays total
- 24 Offense
- 24 Defense

Architekturziel:

- jede bestehende Family mehrfach besetzt
- alle vorhandenen Formation Families mindestens einmal aktiv
- alle vorhandenen Motion/Protection/Coverage/Pressure-Bausteine mindestens sinnvoll genutzt

### 7.2 5x Zielmodell

5x Ziel:

- 70 bis 72 Plays

Empfohlen:

- 72 Plays total
- 36 Offense
- 36 Defense

Architekturziel:

- neue Top-Level-Familien nur dort, wo Outcome oder Selection wirklich differenziert werden muessen
- college- und nfl-nahe Spezialisierung sichtbar

## 8. Skalierungsregeln

### 8.1 Family Budget

Jede Family bekommt ein bewusstes Zielbudget.

Regel:

- Kernfamilien: 4 bis 5 Plays
- Spezialfamilien: 2 bis 3 Plays

### 8.2 Variationsbudget

Jede neue Variante muss mindestens zwei dieser Achsen fachlich veraendern:

- Konzept
- Personnel
- Formation
- Motion or Protection
- Front or Coverage or Pressure
- Situation

### 8.3 Anti-Bloat-Regel

Nicht anlegen:

- fast identische Plays mit nur kosmetischem Label-Unterschied
- gleiche Struktur ohne neues Situationsprofil
- gleiche Struktur ohne neue Matchup-Funktion

Anlegen:

- Plays mit eigenem Triggerprofil
- Plays mit anderer Family-Funktion
- Plays mit anderer Personnel-/Formation-Aussage
- Plays mit anderer Counter-/Audible-Rolle

## 9. Engine-Kompatibilitaet

### 9.1 Voll kompatibel in Phase 1

Voll kompatibel mit der heutigen Engine:

- mehr Plays in bestehenden Families
- mehr Formations-, Motion-, Protection-, Front-, Coverage- und Pressure-Kombinationen
- mehr situative Spezialmenues

Grund:

- Selection arbeitet bereits family- und metrikenbasiert
- Legality arbeitet template-basiert
- Outcome arbeitet familienbasiert

### 9.2 Kontrolliert kompatibel in Phase 2

Kompatibel mit gezielter Erweiterung:

- `DESIGNED_QB_RUN`
- `MOVEMENT_PASS`
- `EMPTY_TEMPO`
- `DROP_EIGHT`
- `RUN_BLITZ`
- `BRACKET_SPECIALTY`
- `THREE_HIGH_PACKAGE`

Notwendige Begleitarbeit:

- Family Types erweitern
- Selection Biases erweitern
- Outcome Parameters erweitern
- Default Playbooks erweitern
- Tests und Calibration erweitern

### 9.3 Empfohlene Nicht-Aenderungen

Nicht noetig fuer Phase 1:

- neues Kernschema
- neue Persistenzstruktur
- defensive `conceptFamilyId`

Optional spaeter:

- `defensiveConceptTag`
- `packageTags`
- `variantGroupId`

Diese Erweiterungen koennen hilfreich sein, sind aber nicht Voraussetzung fuer die Zielarchitektur.

## 10. Architekturentscheidung

Empfohlene Zielarchitektur:

- Phase 1 nutzt das bestehende Schema voll aus.
- Phase 2 fuehrt nur wenige neue Top-Level-Familien ein.
- Formation, Situation und Personnel bleiben kuratierende Achsen.
- Die Library skaliert ueber Canonical Play Cells statt ueber eine Vollmatrix.

## Statuspruefung

### Struktur konsistent?

Ja.

Die Taxonomie trennt sauber:

- Family
- Untervariante
- Personnel
- Formation
- technische Struktur
- Situation

### Skalierbar?

Ja.

Die Architektur ermoeglicht:

- 48 Plays ohne Schemawechsel
- 72 Plays mit kontrollierter Family-Erweiterung
- weitere Expansion ohne Library-Bloat

### Engine-kompatibel?

Ja.

- Phase 1 ist direkt engine-kompatibel.
- Phase 2 ist mit klar begrenzter Family-Erweiterung engine-kompatibel.

## Status

Gruen

PROMPT 4 kann gestartet werden.
