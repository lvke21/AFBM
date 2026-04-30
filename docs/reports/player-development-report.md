# Player Development Paths Report

## Ziel

Der lokale Multiplayer-GM-Modus hat jetzt Development Paths fuer Roster-Spieler. Spieler entwickeln sich nicht mehr identisch, sondern werden durch Archetyp, Alter, Potential und Training unterschiedlich stark beeinflusst.

## Datenmodell

`OnlineContractPlayer` wurde erweitert um:

- `potential`: maximale sportliche Entwicklungsskala im MVP
- `developmentPath`: `"star" | "solid" | "bust"`
- `developmentProgress`: gespeicherter Fortschritt zwischen Rating-Gains

Bestehende lokale Ligen bleiben kompatibel. Beim Laden werden fehlende Werte normalisiert:

- `developmentPath` wird aus Alter, Overall und Potential abgeleitet.
- `potential` wird passend zum Pfad gesetzt, falls es fehlt.
- `developmentProgress` startet bei `0`.

## Development Paths

- `Star`: hoher Entwicklungs-Multiplikator, profitiert stark von gutem Training und hohem Potential.
- `Solid`: stabiler Normalpfad, verlässlicher Fortschritt ohne extreme Ausschlaege.
- `Bust`: langsamer Pfad, besonders kritisch bei geringem Upside oder hoeherem Alter.

## Berechnungslogik

Training-Outcomes erzeugen jetzt Deltas pro echtem Roster-Spieler. Die Formel beruecksichtigt:

- Trainingsintensitaet
- Trainingsfokus, besonders `player_development`
- Coaching-Ausfuehrung
- Alter
- Potential-Gap zwischen `overall` und `potential`
- Development Path
- Young-Player-Priority und Veteran-Maintenance

Der woechentliche Fortschritt wird in `developmentProgress` gespeichert. Sobald genug Fortschritt erreicht ist, steigt `overall`, begrenzt durch `potential`.

## UI

Die Vertragsliste im Online-Liga-Dashboard zeigt jetzt:

- OVR
- POT
- Development Path
- gespeicherten Development-Fortschritt

Damit ist die unterschiedliche Entwicklung fuer den GM sichtbar, ohne einen neuen komplexen Screen einzufuehren.

## Events

Beim Training wird ein neues Audit-Event geschrieben:

- `player_development_updated`

## Tests

Abgedeckt:

- Star/Solid/Bust entwickeln sich sichtbar unterschiedlich.
- Alter und Potential beeinflussen die Entwicklung.
- Development-Fortschritt und Rating-Gains werden im Roster gespeichert.
- Bestehende Trainingstests laufen weiter.

## Offene Punkte

- Noch keine saisonale Regression oder Offseason-Entwicklung.
- Noch keine detaillierte Attributentwicklung pro Skill.
- Noch keine UI fuer manuelles Development-Scouting.
