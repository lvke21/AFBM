# Features To Remove Or Hide

## Ziel

Empfehlung, welche sichtbaren UI-Bereiche entfernt, versteckt, gruppiert oder klarer als Coming Soon markiert werden sollten, damit das Produkt nicht unfertiger wirkt als noetig.

## Grundsatz

Ein sichtbares Feature ist ein Produktversprechen. Wenn es nicht zum Multiplayer-MVP gehoert und keine echte Funktion hat, sollte es nicht gleichrangig mit Core-Funktionen erscheinen.

## Sofort verstecken oder tiefer gruppieren

| Bereich | Aktueller Status | Problem | Empfehlung |
| --- | --- | --- | --- |
| Contracts/Cap | Coming Soon | Wirkt wie Core-Managerbereich. | Aus Hauptgruppe entfernen oder in "Spaeter" gruppieren. |
| Development | Coming Soon | Erzeugt Erwartung an Progression. | Aus Hauptgruppe entfernen oder in "Spaeter" gruppieren. |
| Trade Board | Coming Soon | Sehr starkes Manager-Versprechen ohne Funktion. | Verstecken bis echte Trade-Pipeline existiert. |
| Inbox | Coming Soon | Kann als fehlende Benachrichtigung gelesen werden. | Verstecken oder nur im Dashboard Statushinweise zeigen. |
| Finance | Coming Soon | Hohe Franchise-Erwartung, kein MVP-Nutzen. | Verstecken oder "Spaeter" gruppieren. |

## Nicht entfernen, aber visuell reduzieren

| Bereich | Warum behalten | Reduktion |
| --- | --- | --- |
| Adminmodus | Noetig fuer Admins/Staging. | Nur fuer Admins zeigen, nicht als normaler Spielmodus. |
| Draft | Phasenabhaengig wichtig. | Wenn Draft completed: als Status/History statt dominanter aktiver Aktion. |
| Team Overview | Hilft Identitaet. | Kurz halten, keine Expert-Optionen im Firebase-MVP. |
| Savegames | Hauptmenue. | Weniger konkurrierende CTAs. |

## Redundante oder irrefuehrende Aktionen

### Admin `Oeffnen` vs `Details verwalten`

Problem:
- Beide wirken gleich oder sehr aehnlich.

Empfehlung:
- Nur eine Aktion anzeigen: `Oeffnen`.
- `Details verwalten` nur nutzen, wenn es auf eine andere Unteransicht fuehrt.

### Admin `Woche simulieren` vs `Woche abschliessen`

Problem:
- Wenn beide denselben Simulationspfad nutzen oder keine klare fachliche Trennung haben, ist das irrefuehrend.

Empfehlung:
- Fuer MVP nur `Woche simulieren`.
- `Woche abschliessen` erst anzeigen, wenn es eine echte andere Semantik hat.

### Technische Auth/Admin Copy fuer normale Spieler

Problem:
- Begriffe wie Claim, Token Refresh oder UID-Allowlist sind fuer normale Spieler nicht relevant.

Empfehlung:
- Nur Admins sehen technische Details.
- Spieler sehen: "Du hast keinen Adminzugriff."

## Navigationsempfehlung fuer Multiplayer-MVP

### Aktive Hauptnavigation

- Dashboard
- Spielablauf
- Roster
- Depth Chart
- Team Overview
- League
- Draft
- Savegames

### Sekundaer oder spaeter

- Contracts/Cap
- Development
- Trade Board
- Inbox
- Finance

### Moegliche UI-Struktur

```text
Core
  Dashboard
  Spielablauf
  Roster
  Depth Chart
  League
  Draft

Team
  Team Overview

Spaeter
  Contracts/Cap
  Development
  Trade Board
  Inbox
  Finance

System
  Savegames
```

Alternativ fuer maximale MVP-Klarheit:

- Nicht-MVP-Bereiche komplett ausblenden und nur im Dashboard einen kleinen "Weitere Management-Bereiche kommen spaeter" Hinweis zeigen.

## Features, die nicht geloescht werden sollten

Nicht loeschen:

- Existing services/models fuer spaetere Features.
- Tests fuer kommende Features.
- Coming-Soon Model, solange Navigation darauf zeigt.
- Admin Debug Tools fuer Staging.

Grund:
- Der Auftrag ist Scope-Reduktion im Produkt, nicht Code-Vernichtung.

## Harte Remove/Hide Empfehlung

1. Trade Board aus aktiver Multiplayer-Hauptnavigation entfernen.
2. Finance aus aktiver Multiplayer-Hauptnavigation entfernen.
3. Contracts/Cap aus aktiver Multiplayer-Hauptnavigation entfernen.
4. Development aus aktiver Multiplayer-Hauptnavigation entfernen.
5. Inbox aus aktiver Multiplayer-Hauptnavigation entfernen.
6. Admin `Woche abschliessen` verstecken, bis es echte eigene Semantik hat.
7. Redundante Admin-Liga-Action entfernen.
8. Online Expert-/Local-only Actions im Firebase-Kontext versteckt lassen.

## Produktwirkung

Erwarteter Nutzen:

- Weniger "das ist kaputt"-Gefuehl.
- Spieler sieht schneller, was er wirklich tun kann.
- QA-Flaeche wird kleiner.
- Entwicklerteam kann den Core Loop fertigstellen statt unfertige Nebenbereiche zu pflegen.

## Risiko

- Einige Nutzer koennten weniger "Manager-Tiefe" wahrnehmen.

Gegenmassnahme:

- Coming-Soon optional als klarer Roadmap-Hinweis, aber nicht als gleichrangige Navigation.
