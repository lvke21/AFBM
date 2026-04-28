# Play-Library Gap-Analyse

Stand: 2026-04-22

## Auftrag

Bewertung der bestehenden Play Library mit Fokus auf:

- vorhandene Offense Plays
- vorhandene Defense Plays
- Vergleich mit modernen NFL- und College-Systemen
- systematische Luecken
- priorisierte Erweiterungsfelder

## Kurzfazit

Die bestehende Play Library ist architektonisch stark, aber inhaltlich noch frueh.

Bewertung:

- Modellqualitaet: hoch
- Engine-Anbindung: hoch
- Erweiterbarkeit: hoch
- Play-Tiefe: niedrig
- Formationsbreite in aktiven Plays: niedrig bis mittel
- moderne Konzeptabdeckung: mittel auf Metaebene, niedrig in realen Plays

Gesamturteil:

- Sehr gutes Fundament
- Zu kleine aktive Play-Auswahl
- Zu wenig Varianten pro Familie
- Deutlich unter dem, was moderne NFL- oder College-Systeme fachlich erwarten lassen

## 1. Bestandsbewertung

### 1.1 Umfang der aktiven Library

Aktuell aktiv:

- 7 Offensive Plays
- 7 Defensive Plays
- 14 Plays gesamt

Verteilung:

- Offense: exakt 1 Play pro Offense-Familie
- Defense: exakt 1 Play pro Defense-Familie

Bewertung:

- Breite auf Familienebene vorhanden
- Tiefe innerhalb der Familien praktisch nicht vorhanden

### 1.2 Bewertungsraster

#### Offense

- Family Breadth: 7/7 vorhanden
- Concept Depth: 1/5
- Formation Diversity in active plays: 2/5
- Situational Coverage: 2/5
- Modern NFL fit: 2/5
- Modern College fit: 2/5

#### Defense

- Family Breadth: 7/7 vorhanden
- Coverage/Pressure Depth: 1/5
- Front Diversity in active plays: 2/5
- Situational Coverage: 2/5
- Modern NFL fit: 3/5
- Modern College fit: 2/5

#### Gesamtsystem

- Domainmodell: 5/5
- Katalogstruktur: 5/5
- aktuelle inhaltliche Library-Tiefe: 2/5

## 2. Analyse vorhandener Offense Plays

### 2.1 Aktive Offense Plays

- `off-zone-inside-split`
- `off-gap-counter-gt`
- `off-rpo-glance-bubble`
- `off-quick-stick-spacing`
- `off-dropback-dagger`
- `off-play-action-boot-flood`
- `off-screen-rb-slip`

### 2.2 Staerken der aktuellen Offense Library

- Jede Top-Level-Familie ist mindestens einmal vertreten.
- Das Menue deckt Run, Pass, Play Action, Screen und RPO grundsaetzlich ab.
- Die Plays sind sauber mit Triggern, Reads, Assignments, Metrics und Legality modelliert.
- Die Library ist anschlussfaehig an die Selection Engine und Outcome Resolution.

### 2.3 Systematische Offense-Luecken

#### Luecke A: Zu wenig Varianten pro Familie

Problem:

- Jede Familie hat nur ein einziges Beispielplay.
- Dadurch kann die Selection Engine faktisch eher Familien als echte Spielzuege auswaehlen.

Konsequenz:

- wenig Call-Diversitaet
- schwaches Self-Scout-Verhalten
- geringe Playbook-Identitaet pro Team

#### Luecke B: Unterrepraesentierte Formationen

Aktiv genutzt:

- `off-gun-doubles-11`
- `off-gun-trips-11`
- `off-singleback-tight-12`
- `off-pistol-twins-20`

Nicht genutzt, obwohl vorhanden:

- `off-gun-bunch-11`
- `off-gun-empty-10`
- `off-pistol-trips-11`
- `off-i-right-21`
- `off-heavy-tight-13`

Konsequenz:

- kein echtes condensed / bunch / empty / heavy identity layer
- moderne NFL- und College-Tendenzen werden nur angedeutet, nicht ausgespielt

#### Luecke C: Unterrepraesentierte Motion- und Protection-Logik

Aktiv:

- fast nur `motion-none`
- nur einzelne Basisschutz-Kombinationen

Nicht aktiv:

- `motion-orbit`
- `motion-return`
- `motion-short`
- `motion-bluff`
- `protection-six-man-scan`
- `protection-max-shot`
- `protection-sprint-launch`
- `protection-empty-quick`

Konsequenz:

- kaum Variation in Pre-Snap-Stress
- kaum moderne condensed-/motion-/attach-Answers
- Passschutz-Profile fuer Shot, Empty und Movement fehlen im Play-Katalog

#### Luecke D: Fehlende Kernkonzepte im Run Game

Fehlend:

- Outside Zone
- Zone Insert
- Duo
- Power O
- Counter GH
- Trap / Wham
- QB Draw
- Power Read Bash

Bewertung:

- Das aktuelle Run-Menue ist fuer moderne Offense zu schmal.
- Vor allem College- und Shanahan/McVay-inspirierte Bausteine fehlen in der aktiven Library.

#### Luecke E: Fehlende Kernkonzepte im Pass Game

Fehlend:

- Slant / Flat
- Hitch / Out
- Mesh
- Y Cross
- Mills
- Yankee
- Sprint Sail
- WR Tunnel Screen
- TE Delay Screen
- Red-Zone Rub / Pivot
- Empty Quick Game

Bewertung:

- Die Pass-Familien sind vorhanden, aber nicht als echtes System ausgebaut.
- Es fehlen sowohl Quick-Game-Volume-Plays als auch klassische Intermediate / Shot / Movement Answers.

#### Luecke F: Schwache Situationsabdeckung

Nur schwach aktiv vertreten:

- Backed Up
- Goal Line
- Four Minute
- echte Empty-/Two-Minute-Tempo-Strukturen
- schwere Red-Zone-Menues aus 12/13 Personnel

Konsequenz:

- Offense-Menu wirkt eher generisch als situativ spezialisiert

## 3. Analyse vorhandener Defense Plays

### 3.1 Aktive Defense Plays

- `def-match-quarters-poach`
- `def-zone-cover-3-buzz`
- `def-man-cover-1-robber`
- `def-zero-double-a-pressure`
- `def-fire-zone-boundary`
- `def-sim-pressure-creeper`
- `def-red-zone-bracket-goal-line`

### 3.2 Staerken der aktuellen Defense Library

- Alle Top-Level-Familien sind vorhanden.
- Der Katalog bildet moderne defensive Grundideen bereits gut ab:
  - quarters/match
  - spot-drop zone
  - robber man
  - zero pressure
  - fire zone
  - simulated pressure
  - red-zone specialty

- Die Defense ist im Startpunkt moderner als die Offense, weil Quarters, Sim Pressure und Fire Zone bereits aktiv sind.

### 3.3 Systematische Defense-Luecken

#### Luecke A: Zu wenig Tiefe pro Family

Problem:

- Auch auf Defense existiert pro Familie nur ein Play.

Konsequenz:

- keine echte Coverage-Familienrotation
- kaum Druckvielfalt
- zu geringe disguise-/changeup-Tiefe

#### Luecke B: Unterrepraesentierte Front-Welten

Aktiv:

- `front-over`
- `front-under`
- `front-odd`
- `front-goal-line`

Nicht aktiv:

- `front-bear`
- `front-tite`
- `front-okie`
- `front-hybrid-bear`

Bewertung:

- Gerade fuer moderne College- und anti-spread/run-fit-orientierte Defense ist das eine zentrale Luecke.

#### Luecke C: Fehlende Coverage-Varianten

Aktiv:

- Quarters Match
- Cover 3 Buzz
- Cover 1 Robber
- Cover 0
- Fire Zone 3 Deep
- Sim Two High
- Red Zone Bracket

Nicht aktiv:

- Tampa 2
- Cover 2 Cloud
- Cover 3 Sky
- Cover 3 Match
- Palms / Cover 7
- Cover 6
- Cover 1 Lurk

Bewertung:

- Die Coverage-Bibliothek ist auf Metadatenebene gut vorbereitet, aber in realen Plays klar unterentwickelt.
- Besonders Cover 6, Palms und Cover 3 Match fehlen als moderne Kernbausteine.

#### Luecke D: Fehlende Pressure-Varianten

Aktiv:

- Four-Man Rush
- Double A Mug
- Boundary Fire
- Field Creeper
- Red Zone Mug

Nicht aktiv:

- Field Fire
- Nickel Overload
- Boundary Creeper
- Sim Double Mug
- Cross Dog
- Bear Plug

Bewertung:

- Das System kennt moderne Pressure-Formen, nutzt sie aber kaum.
- Vor allem Run-Blitz- und Variationstiefe bei Sim/Five-Man-Pressure fehlen.

#### Luecke E: Schwache Personnel-/Package-Tiefe

Aktiv genutzt:

- Nickel Over
- Nickel Match
- Dime Zero
- Odd Fire Zone
- Goal Line Bracket

Nicht aktiv:

- Base Over 4-3
- Okie 3-4
- Tite Nickel
- Bear Nickel
- Dime Two High

Konsequenz:

- Early-down base looks fehlen
- moderne anti-spread tite/bear answers fehlen
- passing-down dime split-safety looks fehlen

#### Luecke F: Situative Defensivluecken

Nur schwach aktiv vertreten:

- run-heavy early-down packages
- anti-QB-run / anti-RPO structures
- dime two-high passing-down packages
- drop-8 / rush-3 changeups
- bracket calls ausserhalb Goal-Line / Red Zone

## 4. Vergleich mit modernen Football-Systemen

### 4.1 Moderne NFL-Offense

Typische Trends:

- condensed formations
- bunch / nub / compressed surfaces
- multiple TEs
- heavy personnel
- chip / attach / release helps
- play-action shots aus schweren Looks
- movement und launch-point variation

Abgleich mit der Library:

- teilweise vorbereitet
- in aktiven Plays aber klar unterrepraesentiert

Fehlende NFL-nahe Ausbauschwerpunkte:

- heavy 12/13 personnel packages
- duo und outside zone
- yankee / max protect shot
- bunch quick game
- sprint / launch concepts

### 4.2 Moderne College-Offense

Typische Trends:

- RPO depth
- zone read
- QB run packages
- compressed duo
- bunch / tracer / insert mechanics
- tempo / empty spacing menus
- wide distribution plus formation stress

Abgleich mit der Library:

- RPO vorhanden, aber nur als ein Beispielplay
- Zone Read, Triple Option, QB Draw und Slant/Flat RPO fehlen
- Duo und compressed run stress fehlen

Fehlende College-nahe Ausbauschwerpunkte:

- zone read family depth
- duo + bunch duo
- QB-run answers
- empty quick game
- triple-option / bash-artige Varianten

### 4.3 Moderne NFL-Defense

Typische Trends:

- split-safety coverage families
- quarters / cover 6 growth
- disguise without pure all-out blitz frequency
- simulated pressure
- base-front re-balance in bestimmten Situationen

Abgleich mit der Library:

- quarters und simulated pressure sind gut angelegt
- cover 6, palms, cloud/tampa rotations fehlen als aktive Plays

Fehlende NFL-nahe Ausbauschwerpunkte:

- cover 6
- palms / cover 7
- cover 3 match
- dime two-high
- more disguise families from same shell

### 4.4 Moderne College-Defense

Typische Trends:

- tite / mint / okie worlds
- simulated pressures / creepers
- anti-RPO fit structures
- three-high and drop-eight changeups
- run-blitz answers against spread run

Abgleich mit der Library:

- creeper/sim grundsaetzlich vorhanden
- tite, okie, bear und drop-8 nicht aktiv genug

Fehlende College-nahe Ausbauschwerpunkte:

- tite nickel
- okie base / simulated pressure
- bear plug / run blitz
- drop 8
- three-high package

## 5. Strukturierte Gap-Liste

### 5.1 Fehlende Play-Familien

Sofort fachlich erkennbar fehlend:

- `DESIGNED_QB_RUN`
- `DROP_EIGHT`
- `RUN_BLITZ`

Mittelfristig sinnvoll:

- `MOVEMENT_PASS`
- `BRACKET_SPECIALTY`
- `THREE_HIGH_PACKAGE`
- optional `EMPTY_TEMPO`

Bewertung:

- Fuer Phase 1 nicht zwingend erforderlich
- Fuer Phase 2 fachlich sehr sinnvoll

### 5.2 Fehlende Konzepte

Offense:

- Outside Zone
- Zone Insert
- Duo
- Power O
- Counter GH
- Trap / Wham
- QB Draw
- Power Read Bash
- Zone Read
- Triple Option
- Slant / Flat RPO
- Quick Slant / Flat
- Quick Hitch / Out
- Mesh
- Y Cross
- Mills
- Yankee
- Sprint Sail
- WR Tunnel Screen
- TE Delay Screen
- Red-Zone Rub / Pivot

Defense:

- Tampa 2
- Cover 2 Cloud
- Cover 3 Sky
- Cover 3 Match
- Palms / Cover 7
- Cover 6
- Cover 1 Lurk
- Field Fire
- Nickel Overload
- Boundary Creeper
- Sim Double Mug
- Cross Dog
- Bear Plug
- Drop 8

### 5.3 Fehlende Variationen

Offense:

- Bunch-Varianten
- Empty-Varianten
- Heavy 12/13 Variationen
- I-Form-Varianten
- Orbit / return / bluff motion
- six-man / max-protect / empty-quick protections
- backed-up und goal-line Varianten

Defense:

- Tite-, Bear- und Okie-Frontvariationen
- Nickel vs Dime split-safety Varianten
- same-shell disguise families
- run-fit vs pass-rush variations
- red-zone vs field-space bracket variations

## 6. Priorisierte Erweiterungsfelder

### Prioritaet 1: Bestehende Familien vertiefen

Warum:

- hoechster Nutzen
- geringstes Risiko
- sofort engine-kompatibel

Felder:

- Duo / Outside Zone / Slant-Flat / Mesh / Y Cross / Cover 6 / Palms / Tampa 2 / Sim Double Mug / Bear Plug

### Prioritaet 2: Ungenutzte Scaffolds aktivieren

Warum:

- Domainmodell ist dafuer bereits vorbereitet

Felder:

- Offense Formationen: Bunch, Empty, I Right, Heavy Tight
- Defense Formationen: Base Over, Okie, Tite Nickel, Bear Nickel, Dime Two High
- Motion / Protection / Front / Coverage / Pressure Families mit 0 aktiven Plays

### Prioritaet 3: Situative Spezialmenues ausbauen

Warum:

- macht Playbooks glaubwuerdiger
- verbessert Teamidentitaet und Self-Scout-Wert

Felder:

- backed-up offense
- goal-line offense
- red-zone rub / heavy shot plays
- passing-down dime split-safety
- run-blitz / anti-RPO packages

### Prioritaet 4: Neue Top-Level-Familien

Warum:

- sinnvoll, aber erst nach Family-Tiefenausbau

Felder:

- `DESIGNED_QB_RUN`
- `DROP_EIGHT`
- `RUN_BLITZ`

## 7. Empfehlung

Empfohlener naechster Ausbau:

1. zuerst 10 bis 14 neue Plays innerhalb bestehender Familien
2. danach 10 weitere Defense- und Offense-Varianten auf ungenutzten Scaffolds
3. erst dann neue Top-Level-Familien einfuehren

Empfohlene erste Umsetzungswelle:

- `off-gap-duo-bunch`
- `off-zone-outside-stretch`
- `off-rpo-slant-flat`
- `off-dropback-mesh-rail`
- `off-dropback-y-cross`
- `off-play-action-yankee-max`
- `off-screen-wr-tunnel`
- `def-zone-cover-6-dime`
- `def-match-palms-tite`
- `def-zone-tampa-2-base`
- `def-sim-double-mug`
- `def-red-zone-bear-plug`

## Statuspruefung

### Alle relevanten Luecken identifiziert?

Ja.

Abgedeckt wurden:

- fehlende Top-Level-Familien
- fehlende Konzepte
- fehlende Variationen
- fehlende Situationsmenues
- fehlende moderne NFL- und College-Bausteine
- strukturelle Aktivierungsdefizite im bereits vorhandenen Katalog

### Priorisierung sinnvoll?

Ja.

Die Priorisierung folgt:

- zuerst maximaler Nutzen bei minimalem Risiko
- dann Nutzung bereits vorhandener Domain-Scaffolds
- erst spaeter neue Engine-Familien

## Status

Gruen

PROMPT 3 kann gestartet werden.
