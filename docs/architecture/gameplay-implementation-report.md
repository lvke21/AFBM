# Gameplay Implementation Report

## Zweck

Dieses Dokument fasst den aktuellen Abschlussstand der neuen Playbook- und Simulation-Implementation zusammen.

## Umgesetzt

### Regeln und Pre-Snap

- `CompetitionRuleProfile` fuer `NFL_PRO` und `COLLEGE`
- normalisierte Pre-Snap-Struktur fuer Personnel, Formation, Alignment, Motion und Shift
- Legality-Engine mit strukturierten Fehlercodes und Empfehlungen
- ineligible downfield als ruleset-abhaengiger Check

### Playbook- und Play-Library-Fundament

- typisierte Playbook-Policies fuer Offense und Defense
- erste offensive und defensive Play-Library
- valide Plays mit `reads`, `assignments`, `counters`, `audibles` und `expectedMetrics`
- Default-Playbooks und serialisierbare Library-Utilities

### Selection und Resolution

- situative Play Selection mit nachvollziehbarem Decision Trace
- controllierte Randomness ueber Seeds
- probabilistische Run- und Pass-Resolution
- Value-Layer mit EPA-/WP-nahem `PlayValueAssessment`

### Quality und Calibration

- Unit-Tests fuer Legality, Library, Selection und Resolution
- Calibration-Harness fuer Batch-Simulationen
- Regression-Tests fuer Makrobaender und situative Plausibilitaet

## Bewusst noch nicht umgesetzt

- produktive Einbindung in `season-simulation.service.ts`
- vollstaendiger Drive- oder Game-State-Loop auf Play-by-Play-Basis
- Special Teams
- breiter Penalty-Katalog
- roster- oder datenbankgetriebene Coach-Profile
- persistierte Team-Playbooks

## Bekannte Grenzen

- Die Calibration basiert aktuell auf Default-Szenarien und neutralen Matchups.
- Der Value-Layer ist absichtlich einfach und noch kein voll kalibriertes EPA-/WP-Modell.
- Die Gameplay-Engine ist noch ein paralleler Kern neben dem produktiven Seasons-Slice.
- Die aktuelle Play-Library ist repraesentativ, aber noch nicht breit genug fuer echte Franchise-Tiefe.

## Empfehlung fuer die naechsten Ausbaustufen

1. Adapter zwischen Seasons-Matchkontext und Gameplay-Kern bauen
2. ersten produktiven Play-by-Play-Loop fuer Standard-Offense- und Standard-Defense-Pakete einfuehren
3. Team- und Coach-Profile aus persistierten Daten speisen
4. Calibration auf ligaweite Zielwerte und mehrere Matchup-Klassen erweitern
5. Special Teams und erweiterten Penalty-Katalog modular ergaenzen
