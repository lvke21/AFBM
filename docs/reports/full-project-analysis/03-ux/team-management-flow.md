# Team Management Flow

Stand: 2026-05-02

## Ziel des Users

Ein GM will sein Team verstehen: Roster, Depth Chart, Team-Uebersicht, naechste Partie, Ergebnisse und Standings. Fuer den MVP muss er mindestens pruefen koennen, ob sein Team spielfaehig ist.

## Flow-Diagramm Online MVP

```text
Online Dashboard
  -> Team Overview (#team)
      Teamname, Status, Manager-Kontext
  -> Roster (#roster)
      aktive Spieler / Starter-Schnitt / Spielerstatus
  -> Depth Chart (#depth-chart)
      Starter/Backups lesen
  -> League (#league)
      Standings / Results / naechste Partie
  -> Ready setzen
```

## Flow-Diagramm Offline Karriere

```text
Savegame Dashboard
  -> Sidebar Roster
      Filter, Tabelle/Karten, Quick Info
  -> Depth Chart
      Lineup Board, Starter, Backups, Quick Assign
  -> Contracts/Cap
      Contract Forms, Release/Extend
  -> Team Overview
      Team Snapshot, Needs, Chemistry, Schemes
  -> Spielablauf
```

## Notwendige Schritte

Online MVP:

1. User ist Team zugewiesen.
2. Roster ist vorhanden.
3. Depth Chart existiert oder zeigt klare Diagnose.
4. Ready-State kann erst sinnvoll gesetzt werden, wenn Teamkontext da ist.

Offline:

1. Savegame geladen.
2. Manager-Team geladen.
3. Teamseiten erhalten Serverdaten.
4. Mutationen laufen ueber Server Actions.

## Tatsaechliche Implementierung

| Bereich | Online | Offline | Bewertung |
|---|---|---|---|
| Team Overview | Dashboard-Anchor `#team`, `TeamOverviewCard` | eigene Route `/team` | Online MVP, Offline OK |
| Roster | Dashboard-Anchor `#roster`, zusammengefasste Player Actions | eigene Route mit `RosterTable` | Online begrenzt, Offline OK |
| Depth Chart | Dashboard-Anchor `#depth-chart`, erste Eintraege/Read-View | eigene Route mit `DepthChartView` und Forms | Online begrenzt, Offline OK |
| Contracts/Cap | Coming Soon im Multiplayer | eigene Offline UI | MVP bewusst deaktiviert |
| Development | Coming Soon/Training read-only im Multiplayer | teilweise funktional, Staff/Training Coming Soon | Teilweise |
| Trade Board | Coming Soon im Multiplayer | Offline UI vorhanden | Teilweise |
| Inbox | Coming Soon im Multiplayer | Offline Task Controls | Teilweise |
| Finance | Coming Soon im Multiplayer | Offline Finance Workspace | Teilweise |

## Bruchstellen

| Bruchstelle | UX-Auswirkung | Schwere |
|---|---|---|
| Online Roster ist keine volle Rosterliste | GM kann MVP-Team sehen, aber nicht tief managen | Mittel |
| Online Depth Chart ist eher Anzeige als Editor | GM kann nicht wirklich aufstellen | Mittel |
| Team-Menues sind Hash-Anker | Wirkt weniger wie echte Bereiche | Niedrig/Mittel |
| Contracts/Development/Trades sichtbar als Coming Soon | Erwartungsmanagement noetig | Mittel |
| Fehlendes Team | Team Management komplett blockiert | Hoch |
| Unvollstaendiger Roster | Sidebar sperrt Teamnavigation | Mittel/Hoch |

## Unklare States

- "Roster Ready" bedeutet technisch genuegend Spieler plus Depth Chart, nicht zwingend "vom User geprueft".
- Online Team Overview zeigt nicht dieselbe Tiefe wie Offline Team Overview.
- Training ist im Online Firebase-MVP automatisch/read-only, wird aber semantisch nah an Development gefuehrt.

## Blockierende Bugs

Keine statisch bestaetigten blockierenden Bugs. UX-Luecke:

- Online Team Management ist fuer MVP lesbar, aber noch kein vollstaendiges Management.

## Verbesserungsvorschlaege

1. Online Roster mindestens als komplette einfache Liste anzeigen.
2. Online Depth Chart vollstaendig anzeigen, auch wenn Editieren spaeter kommt.
3. Team Overview um Record, Standing Rank und naechstes eigenes Spiel erweitern.
4. Nicht-MVP Punkte in Sidebar visuell niedriger priorisieren.
5. Bei fehlendem/inkomplettem Roster Diagnose anzeigen: aktive Spieler, Depth Chart vorhanden, was fehlt.

## Minimale Version fuer spielbaren MVP

```text
Team Management MVP:
  Teamkarte
  + kompletter Roster lesbar
  + Depth Chart lesbar
  + naechstes Spiel
  + Record / Standing
  + Ready Button
  + Nicht-MVP sauber Coming Soon
```
