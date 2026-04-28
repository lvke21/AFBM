# Offense Play Library Expansion

Stand: 2026-04-22
Status: GREEN

## Ergebnis

Die Offense Play Library wurde von 7 auf 29 Plays erweitert.

Neu hinzugefuegt:

- 22 neue Offense-Plays
- volle Definition pro Play
- echte konzeptionelle Unterschiede
- realistische Reads, Assignments, Trigger, Counters und Audibles

## Family-Tiefe

Verteilung nach Offense-Familie:

- `ZONE_RUN`: 3
- `GAP_RUN`: 3
- `DESIGNED_QB_RUN`: 2
- `OPTION_RPO`: 3
- `QUICK_PASS`: 4
- `DROPBACK`: 4
- `PLAY_ACTION`: 3
- `MOVEMENT_PASS`: 2
- `SCREEN`: 3
- `EMPTY_TEMPO`: 2

## Neue Plays

### `ZONE_RUN`

- `off-zone-insert-bunch`
- `off-outside-zone-stretch`

### `GAP_RUN`

- `off-gap-duo-tight`
- `off-gap-power-o-i-right`

### `DESIGNED_QB_RUN`

- `off-qb-draw-empty`
- `off-qb-power-read-bash`

### `OPTION_RPO`

- `off-rpo-slant-flat`
- `off-zone-read-slice`

### `QUICK_PASS`

- `off-quick-slant-flat`
- `off-quick-hitch-out`
- `off-quick-rub-pivot`

### `DROPBACK`

- `off-dropback-mesh-rail`
- `off-dropback-y-cross`
- `off-dropback-mills`

### `PLAY_ACTION`

- `off-play-action-yankee-shot`
- `off-play-action-leak-over`

### `MOVEMENT_PASS`

- `off-movement-sprint-sail`
- `off-movement-naked-keep`

### `SCREEN`

- `off-screen-wr-tunnel`
- `off-screen-te-delay`

### `EMPTY_TEMPO`

- `off-empty-stick`
- `off-empty-choice`

## Qualitaetsmerkmale

Die neuen Plays unterscheiden sich nicht nur ueber Labels, sondern ueber:

- Family und Concept Family
- Personnel
- Formation Family
- Motion- und Protection-Struktur
- Trigger-Fenster
- Read-Progressionslogik
- Assignment-Profile
- Expected Metrics
- Counter- und Audible-Beziehungen

## Engine-Nutzbarkeit

Die erweiterte Offense Library ist nutzbar in:

- Play Selection Engine
- Outcome Resolution Engine
- Legality Engine

Explizit abgesichert:

- Family-Tiefe und Katalogvalidierung
- situative Selection-Menues fuer neutral, third down, red zone und two-minute
- Resolution fuer `DESIGNED_QB_RUN`
- Resolution fuer `MOVEMENT_PASS`
- Resolution fuer `EMPTY_TEMPO`

## Verifikation

Getestet:

- `play-library-service.test.ts`
- `play-selection-engine.test.ts`
- `outcome-resolution-engine.test.ts`
- `pre-snap-legality-engine.test.ts`

Ergebnis:

- 4 von 4 Testdateien gruen
- 38 von 38 Tests gruen

## Statuspruefung

- Qualitaet hoch: ja
- Vielfalt gegeben: ja
- Engine nutzbar: ja

Finaler Status: GREEN
