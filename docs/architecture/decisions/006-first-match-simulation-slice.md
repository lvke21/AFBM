# ADR 006: Erste vertikale Matchsimulation im Seasons-Modul

## Status

Accepted

## Datum

2026-04-21

## Kontext

Nach dem initialen Savegame-Bootstrap existierten bereits Seasons, Matches, TeamSeasonStats, PlayerSeasonStats, PlayerCareerStats sowie Match-Statistikmodelle im Prisma-Schema. Der groesste funktionale Engpass lag nicht mehr im Datenmodell, sondern darin, dass der Spielstand nach der Erzeugung kaum fortgeschrieben wurde.

Fuer die naechste Ausbaustufe musste ein erster echter Gameplay-Write-Flow entstehen, ohne sofort eine vollstaendige Play-by-Play-Engine, Playbooks, Training oder Finanzprozesse einzufuehren.

## Entscheidung

Die erste Gameplay-Ausbaustufe wird als vertikaler Seasons-Slice umgesetzt:

- Matchsimulation als vereinfachte, drive-basierte Engine
- Depth-Chart- und Starter-Auswahl aus `PlayerRosterProfile`
- Persistenz von Matchergebnissen in `Match`, `TeamMatchStat` und `PlayerMatchStat`
- Fortschreibung von `TeamSeasonStat`, `PlayerSeasonStat` und `PlayerCareerStat`
- saisonaler Wochenfortschritt ueber einen Season-Use-Case

Die Spiellogik liegt dabei in `src/modules/seasons/application/simulation/*` und die Orchestrierung des Write-Flows in `season-simulation.service.ts`.

## Begruendung

- Das vorhandene Datenmodell war fuer einen ersten vertikalen Slice ausreichend tragfaehig.
- Eine funktionierende Saisonfortschreibung validiert mehrere bestehende Modelle gleichzeitig.
- Der Seasons-Kontext ist der natuerliche fachliche Einstiegspunkt fuer week-by-week Fortschritt.
- Ein vereinfachtes Drive-Modell schafft Nutzwert, ohne das Projekt frueh in eine komplexe Engine zu zwingen.

## Alternativen

### Zuerst weiteres Datenmodell bauen

Verworfen, weil:
- Player-, Team-, Match- und Statistikstruktur bereits ausreichend vorbereitet waren
- mehr Modellierung ohne Write-Flow den groessten Projektrisiko-Punkt nicht reduziert haette

### Eigenes separates `simulation`-Top-Level-Modul

Vorlaeufig nicht gewaehlt, weil:
- die erste Simulationsstufe unmittelbar an Season- und Match-Fortschritt haengt
- die Seasons-Grenze aktuell der klarste fachliche Ankerpunkt ist

### Vollstaendige Play-by-Play-Engine als erster Schritt

Verworfen, weil:
- Komplexitaet und Testaufwand frueh stark steigen wuerden
- fuer die erste Validierung des Datenmodells ein kompakteres Drive-Modell ausreicht

## Konsequenzen

- Seasons sind nicht mehr nur read-only, sondern besitzen nun einen produktiven Write-Flow.
- `PlayerMatchStat` und `TeamMatchStat` werden im Laufzeitpfad aktiv beschrieben.
- `PlayerRosterProfile.depthChartSlot` und Sekundaerpositionen wirken jetzt direkt auf die Simulation.
- Die aktuelle Matchsimulation ist bewusst vereinfacht und noch keine finale Football-Engine.
- Naechste Features wie Verletzungen, Training, Playbooks oder Finanzen koennen auf diesen Write-Flow aufsetzen.
