# Product Scope Overview

## Ziel der Analyse

Diese Analyse bewertet den aktuellen Produktumfang von AFBM aus Game-Producer-Sicht: Was ist der eigentliche Core Game Loop, welche Features sind fuer Spielbarkeit zwingend, welche Bereiche erhoehen Komplexitaet ohne aktuellen Nutzen, und welche UI sollte fuer ein klares Multiplayer-MVP versteckt oder eingefroren werden.

Es wurden keine Codeaenderungen vorgenommen.

## Untersuchte Dateien/Bereiche

- `docs/reports/multiplayer-mvp-acceptance.md`
- `docs/reports/ux-sollzustand-verifikation.md`
- `docs/reports/ux-final-system.md`
- `docs/reports/ux-gap-analysis.md`
- `docs/reports/full-project-analysis/02-ui/incomplete-ui-elements.md`
- `docs/reports/full-project-analysis/03-ux/multiplayer-flow.md`
- `src/components/layout/navigation-model.ts`
- `src/components/online/online-league-coming-soon-model.ts`
- `src/components/online/*`
- `src/components/admin/*`
- `src/app/online/*`
- `src/app/admin/*`
- Savegames-, Roster-, Depth-Chart-, Draft-, Week- und Admin-Flows

## Executive Summary

AFBM hat zu viele sichtbare Produktversprechen fuer den aktuell stabilen Multiplayer-Kern. Der Kern ist nicht Contracts, Finance, Development, Trades oder eine vollstaendige Dynasty-Simulation. Der aktuell sinnvolle Kern ist:

```text
GM tritt Liga bei
  -> bekommt Team
  -> sieht Roster/Depth Chart/Schedule
  -> setzt Ready
  -> Admin simuliert Woche
  -> Results/Standings werden gespeichert
  -> naechste Woche beginnt
```

Dieser Kern ist intern/Staging spielbar, aber noch nicht als fertiges Endkundenprodukt gruen. Der sichtbare Umfang sollte aktiv reduziert werden, damit das Spiel nicht groesser wirkt als es ist.

## Aktueller Produktumfang

### Sichtbare Hauptbereiche

- Savegames / Hauptmenue
- Offline Spielen / Karriere
- Online Spielen / Online Hub
- Multiplayer Dashboard
- Roster
- Depth Chart
- League / Standings / Results
- Draft
- Spielablauf / Week Loop
- Adminmodus
- Contracts/Cap
- Development
- Team Overview
- Trade Board
- Inbox
- Finance

### Tatsachlich stabiler Multiplayer-MVP

- Login/Auth-Gate
- Liga suchen / Join / Rejoin
- Team-Zuweisung
- Dashboard mit Team, Week, Ready, Results, Standings
- Roster-Anzeige
- Depth-Chart-Anzeige und begrenzte Verwaltung
- Draft-Anzeige bzw. Draft Room, wenn explizit geoeffnet
- Admin Week Simulation serverseitig
- Reload der wichtigsten Online-Seiten
- Coming-Soon fuer nicht-MVP Bereiche

### Noch nicht als Produktversprechen tragfaehig

- Multiplayer Contracts/Cap
- Multiplayer Development
- Multiplayer Trade Board
- Multiplayer Inbox
- Multiplayer Finance
- Vollstaendig automatisierter Admin-Betrieb ohne Test-/Tooling-Gefuehl
- Ein echter Resume-First Flow ueber Offline und Online hinweg
- Production-tauglicher Live-Multiplayer ohne Staging-/Admin-Abhaengigkeiten

## Core Game Loop

Der eigentliche Core Game Loop fuer das aktuelle AFBM-Multiplayer-MVP:

```text
1. Liga beitreten oder wieder beitreten
2. Team bestaetigen
3. Roster und Depth Chart verstehen
4. Naechste Partie / Week-Kontext sehen
5. Ready setzen
6. Warten bis alle Teams bereit sind
7. Admin simuliert Woche
8. Ergebnisse und Standings ansehen
9. Naechste Woche starten
10. Wiederholen
```

Alles, was diesen Loop nicht direkt verbessert, sollte fuer das Multiplayer-MVP eingefroren oder verborgen werden.

## Scope-Probleme

### 1. Zu viele Menuepunkte fuer zu wenig stabile Multiplayer-Features

Die Sidebar zeigt viele klassische Franchise-Manager-Bereiche. Das erzeugt Erwartung an ein vollstaendiges Management-Spiel, obwohl mehrere Bereiche bewusst Coming Soon sind.

Produktwirkung:

- Spieler glaubt, das Spiel sei kaputt oder unfertig.
- MVP-Kern wird von Sekundaerfeatures ueberdeckt.

Empfehlung:

- Nicht-MVP-Bereiche sichtbar kleiner gruppieren oder unter "Spaeter" auslagern.
- Im aktiven Core-Menue nur Dashboard, Spielablauf, Roster, Depth Chart, League, Draft, Savegames.

### 2. Admin wirkt teilweise wie ein Spielmodus

Admin ist notwendig fuer Staging und Liga-Betrieb, aber kein Spielerflow.

Produktwirkung:

- Normale User koennen Admin als Teil des Spiels lesen.
- Producer-Fokus verschiebt sich auf Tools statt Game Loop.

Empfehlung:

- Admin als Utility behandeln.
- Admin im Hauptmenue nur fuer Admins sichtbar/sekundaer.
- Admin-Aktionen nicht als Ersatz fuer Spielerfortschritt verkaufen.

### 3. Online Join bleibt zu technisch

Team-Identitaet, Membership, Rejoin und Recovery sind funktional, aber noch nah am Datenmodell.

Produktwirkung:

- Neuer Spieler versteht nicht sofort, ob er "eine Liga sucht" oder "ein Team konfiguriert".

Empfehlung:

- Erst Liga, dann Team.
- Rejoin ohne Formular.
- Fehler mit genau einer primaeren Reparaturaktion.

### 4. Continue Flow ist noch kein echtes Produktversprechen

Vorhandene Franchises und Online-Last-League sind getrennt. Der Nutzer muss oft wissen, ob er offline oder online weiterspielen will.

Empfehlung:

- "Zuletzt gespielt" als oberstes Produktversprechen erst bauen, wenn es wirklich offline/online robust funktioniert.
- Bis dahin lieber "Vorhandene Karrieren" und "Online Hub" klar getrennt lassen.

## Harte Scope-Empfehlungen

1. Multiplayer MVP strikt auf Join -> Team -> Roster/Depth -> Ready -> Sim -> Results/Standings begrenzen.
2. Contracts/Cap, Development, Trade Board, Inbox und Finance nicht weiter ausbauen, bis der Core Loop productionreif ist.
3. Nicht-MVP-Menuepunkte entweder in eine sichtbare "Spaeter"-Gruppe verschieben oder aus der Hauptnavigation entfernen.
4. Admin nicht als Spielmodus behandeln; Admin ist Betrieb.
5. Kein neues Feature bauen, bevor Rejoin, Ready, Week Simulation und Reload in Staging komplett gruen sind.
6. Production-Release erst nach echter Staging-Verifikation, nicht nach lokaler Unit-Test-Gruenheit.

## Gesamtbewertung

Status: Gelb.

AFBM hat einen spielbaren Multiplayer-Kern, aber der Produktumfang ist breiter als der stabile Nutzen. Die naechste Produktarbeit sollte Scope reduzieren, nicht Feature-Flaeche vergroessern.
