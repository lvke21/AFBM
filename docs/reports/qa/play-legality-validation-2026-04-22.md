# Legality Engine Validierung - 2026-04-22

## Auftrag

Validierung der gesamten Play Library gegen die Legality Engine mit Fokus auf:

- fehlerfreie Verarbeitung aller Plays
- keine ungueltigen Kombinationen aus Formation und Personnel
- keine Presnap-Regelverstoesse aus Alignment, Motion oder Shift
- Edge Cases fuer ungewoehnliche Packages und seltene Strukturen

## Umfang

- 55 Plays gesamt
- 29 Offense-Plays
- 26 Defense-Plays
- 110 Play-zu-Ruleset-Pruefungen

## Durchgefuehrte Pruefungen

### 1. Vollscan aller Plays

Jeder Play wurde fuer jedes unterstuetzte Ruleset als `PreSnapStructureSnapshot` aufgebaut und durch `validatePreSnapStructure()` geschickt.

Geprueft wurden dabei:

- Spieleranzahl
- Line-of-scrimmage- und Backfield-Verteilung
- Eligible-Receiver-Logik
- Motion- und Shift-Regeln
- Personnel-Package-Kompatibilitaet der real ausgerichteten Spieler

### 2. Edge Cases

Gezielt abgesichert wurden seltene oder ungewoehnliche Strukturen:

- Empty 10 personnel
- I-form / heavier offensive structure
- Tite / three-high shell
- goal-line / bear front

Repraesentative Plays:

- `off-empty-choice`
- `off-play-action-leak-over`
- `def-three-high-middle-poach`
- `def-red-zone-bear-cage`

### 3. Negativtests

Neu abgesichert:

- Offense-Snapshot mit Personnel-Package-Mismatch wird abgelehnt
- Defense-Snapshot mit Personnel-Package-Mismatch wird abgelehnt

## Gefundene Probleme

Die Legality Engine selbst lief stabil, hat nach Verstaerkung der Personnel-Pruefung aber echte Katalogfehler sichtbar gemacht.

### A. Trips-Offense war faktisch 10P statt 11P

Der Builder fuer `off-gun-trips-11` stellte vier Wide Receiver plus Running Back auf.

Auswirkung:

- `off-rpo-glance-bubble`
- `off-quick-slant-flat`
- `off-screen-wr-tunnel`
- mehrere Defense-Legality-Templates mit `buildGunTripsOffensePlayers()`

Ursache:

- Detached Trips-Y war als `WR` statt `TE` modelliert.

Korrektur:

- Trips-Builder auf echte 11 personnel korrigiert
- der detached Y wird jetzt als `TE` gefuehrt

### B. Tite / Odd Nickel waren in Wahrheit 3-3-5

Mehrere Defensive-Templates nutzten 3 DL / 3 LB / 5 DB, referenzierten aber `def-nickel` mit 4-2-5.

Betroffene Families / Plays:

- `def-odd-fire-zone`
- `def-tite-nickel`
- `def-fire-zone-boundary`
- `def-match-palms-read`
- `def-zone-cover-6-boundary-cloud`
- `def-sim-double-mug-robber`
- `def-drop8-tampa-fence`
- `def-bracket-palms-cut`
- `def-three-high-middle-poach`

Korrektur:

- neues Personnel-Package `def-nickel-335`
- Formation-Familien und Play-Templates darauf umgestellt

### C. Bear Nickel war in Wahrheit 5-1-5

Zwei Defensive-Templates nutzten 5 DL / 1 LB / 5 DB, referenzierten aber ebenfalls `def-nickel` mit 4-2-5.

Betroffene Plays:

- `def-zero-nickel-overload`
- `def-run-blitz-bear-plug`

Korrektur:

- neues Personnel-Package `def-bear-515`
- Bear-Nickel-Templates darauf umgestellt

## Engine-Anpassungen

Die Legality Engine wurde fachlich verschaerft:

- neue Presnap-Issues:
  - `OFFENSE_PERSONNEL_PACKAGE_MISMATCH`
  - `DEFENSE_PERSONNEL_PACKAGE_MISMATCH`
- neue Pruefung:
  - reales Spieler-Alignment muss zum deklarierten Personnel-Package passen
  - gilt fuer Offense und Defense

Damit erkennt die Engine jetzt nicht nur illegale Snap-Strukturen, sondern auch falsch modellierte Package-Zuordnungen.

## Geaenderte Dateien

- `src/modules/gameplay/domain/pre-snap-legality.ts`
- `src/modules/gameplay/application/pre-snap-legality-engine.ts`
- `src/modules/gameplay/application/pre-snap-legality-engine.test.ts`
- `src/modules/gameplay/infrastructure/play-library.ts`

## Testergebnisse

### Direkter Legality-Vollscan

- 55 Plays
- 110 Play-zu-Ruleset-Pruefungen
- Ergebnis: 0 Legality-Fehler

### Legality-Testdatei

- `src/modules/gameplay/application/pre-snap-legality-engine.test.ts`
- Ergebnis: `11/11` Tests gruen

### Gameplay-Kerntests

- `src/modules/gameplay/application/play-library-service.test.ts`
- `src/modules/gameplay/application/play-selection-engine.test.ts`
- `src/modules/gameplay/application/outcome-resolution-engine.test.ts`
- `src/modules/gameplay/application/pre-snap-legality-engine.test.ts`
- `src/modules/gameplay/application/gameplay-calibration.test.ts`
- Ergebnis: `49/49` Tests gruen

## Abschlussbewertung

- Alle Plays von der Legality Engine gueltig verarbeitet: Ja
- Keine Regelverstoesse mehr im aktiven Katalog: Ja
- Formation-vs-Personnel jetzt hart abgesichert: Ja
- Edge Cases fuer seltene Strukturen abgesichert: Ja

## Status

Gruen

PROMPT 10.3 kann gestartet werden.
