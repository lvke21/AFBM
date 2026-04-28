# Offense Play Families Implementierung

Stand: 2026-04-22
Status: GREEN

## Ziel

Implementierung neuer Offense Play Families als strukturelle Scaffolds ohne konkrete Detail-Playvarianten.

## Implementierte Familien

Neue Top-Level-Familien:

- `DESIGNED_QB_RUN`
- `MOVEMENT_PASS`
- `EMPTY_TEMPO`

Strukturierung der gesamten Offense-Familien:

- Run Families
  - `ZONE_RUN`
  - `GAP_RUN`
  - `DESIGNED_QB_RUN`
- Pass Families
  - `QUICK_PASS`
  - `DROPBACK`
  - `PLAY_ACTION`
  - `MOVEMENT_PASS`
  - `SCREEN`
  - `EMPTY_TEMPO`
- RPO Families
  - `OPTION_RPO`

## Umsetzung

Domainmodell:

- `OffensivePlayFamily` um drei neue Families erweitert
- gruppierte Family-Struktur ueber `OFFENSIVE_PLAY_FAMILY_GROUPS` eingefuehrt

Katalog:

- generische Konzept-Scaffolds fuer jede neue Family angelegt
- noch keine konkreten neuen Offense-Plays dieser Familien angelegt

Playbooks:

- Default-Offense-Policies referenzieren die neuen Families bereits als zukuenftige Menue-Slots

Engines:

- Selection-Heuristiken erkennen die neuen Families
- Outcome-Modell kennt Run-/Pass-Zuordnung und Default-Parameter

## Abgrenzung

Bewusst nicht enthalten in PROMPT 6:

- keine konkreten neuen Play-Datensaetze
- keine Untervarianten wie `qb-draw`, `sprint-sail` oder `empty-choice`
- keine Family-Tiefe innerhalb der neuen Families

Diese Tiefe ist fuer die naechsten Prompts reserviert.

## Statuspruefung

- Alle Familien vorhanden: ja
- Struktur korrekt: ja
- Ohne Detailtiefe umgesetzt: ja

Finaler Status: GREEN
