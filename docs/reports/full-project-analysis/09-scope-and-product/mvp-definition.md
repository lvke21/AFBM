# MVP Definition

## Ziel

Klare Definition, wann AFBM Multiplayer als MVP gilt und was bewusst nicht Bestandteil dieses MVP ist.

## MVP-Leitsatz

Das Multiplayer-MVP ist fertig, wenn ein eingeloggter GM ohne Hilfe einer Liga beitreten oder wieder beitreten kann, sein Team versteht, Ready setzen kann, eine simulierte Woche erlebt und nach Reload Ergebnisse, Standings und naechste Woche konsistent sieht.

## Spieler-MVP

### Voraussetzungen

- User kann sich einloggen.
- Mindestens eine joinbare Online-Liga existiert.
- User kann Membership und Team-Zuordnung erhalten.
- Liga hat Teams, Roster, Schedule und Week-State.
- Admin oder Serverprozess kann Woche simulieren.

### Minimaler Spielerflow

```text
Savegames / Hauptmenue
  -> Online spielen
  -> Liga suchen oder Wieder beitreten
  -> Online Dashboard
  -> Team ansehen
  -> Roster ansehen
  -> Depth Chart ansehen
  -> naechste Partie / Woche verstehen
  -> Bereit setzen
  -> nach Simulation Results/Standings sehen
  -> Reload funktioniert
```

## Admin-MVP

### Notwendige Admin-Funktionen

- Admin Login ueber Firebase Auth + serverseitige Berechtigung.
- Liga in Admin Hub finden.
- League Detail oeffnen.
- Ready-State sehen.
- Simulation nur ausloesen, wenn Voraussetzungen stimmen.
- Ergebnis/Fehler klar sehen.
- Keine Fake-Erfolge.
- Audit/Logs fuer Admin Actions.

### Nicht notwendig fuer MVP

- Vollautomatischer Commissioner.
- Vollstaendige GM-Verwaltung.
- Komplexe Repair-Konsole.
- Finanz-/Trade-/Development-Administration.

## Daten-MVP

Must-have Daten:

- `leagueId`
- League Name
- Season/Week
- League Status
- Teams
- Memberships
- User-Team-Link
- Roster
- Depth Chart oder zumindest positionslogische Spielerzuordnung
- Schedule/Games
- Ready-State
- Match Results
- Standings
- Draft Status, falls Draft relevant ist

Nicht must-have:

- Contracts
- Salary Cap
- Player Development XP
- Trade Offers
- Inbox Messages
- Finance Events
- Staff/Facilities
- Media/Owner-Systems

## UI-MVP

Aktive Spielerbereiche:

- Dashboard
- Spielablauf
- Roster
- Depth Chart
- Team Overview
- League
- Draft
- Savegames

Bewusst nicht aktiv:

- Contracts/Cap
- Development
- Trade Board
- Inbox
- Finance

Diese nicht aktiven Bereiche duerfen maximal als Coming Soon erscheinen. Sie duerfen nicht wie halb nutzbare Features wirken.

## Akzeptanzkriterien

### Spieler

- Neuer eingeloggter User kann einer Testliga beitreten.
- Bereits verbundener User kann wieder beitreten.
- User sieht sein Team eindeutig.
- User sieht aktuelle Woche.
- User sieht naechste Partie oder eine klare Erklaerung, warum noch keine Partie sichtbar ist.
- User kann Ready setzen und erkennt danach, dass er bereit ist.
- Nach Simulation sieht User Ergebnisse.
- Nach Simulation sieht User aktualisierte Standings.
- Reload auf Dashboard, Draft, League, Roster und Depth Chart funktioniert.
- Nicht-MVP-Menuepunkte fuehren nicht ins Leere.

### Admin

- Admin sieht Liga.
- Admin sieht Ready-State.
- Admin kann Woche simulieren oder bekommt einen klaren Blocker.
- Doppelte Simulation wird verhindert.
- Nach Reload bleiben Ergebnisse und Standings sichtbar.

### Qualitaet

- `npx tsc --noEmit` gruen.
- `npm run lint` gruen.
- relevante Multiplayer/Week/Admin Vitest Tests gruen.
- Firebase Rules/Parity gruen.
- Staging-Smoke fuer Auth/Admin/Week gruen.

## Was explizit nicht zum MVP gehoert

- Realistische Contract/Cap Engine im Multiplayer.
- Vollstaendige Player Development Saisonlogik.
- Multiplayer Trades.
- Ligaweite Inbox/Notifications.
- Finance/Owner Budgetsteuerung.
- Automatische Production-Liga-Betreuung.
- Vollstaendige mobile Politur.
- Playoffs.
- Mehrere parallel produktive Ligen ohne manuelle Admin-Ops.

## Harte Definition von "spielbar"

Spielbar heisst nicht "alle Manager-Features existieren". Spielbar heisst:

1. Der Spieler weiss, welches Team ihm gehoert.
2. Der Spieler weiss, welche Woche aktiv ist.
3. Der Spieler weiss, was er als naechstes tun kann.
4. Der Spieler kann genau diese Aktion ausfuehren.
5. Das System speichert Fortschritt.
6. Nach Reload ist derselbe Fortschritt sichtbar.
7. Die Liga kann mindestens eine weitere Woche erreichen.

## MVP-Status heute

Status: Gelb.

Der technische Kern ist fuer internes Staging spielbar. Fuer ein klares Spieler-MVP fehlen noch:

1. echter Staging Admin UI/Week Smoke als Go-Signal.
2. weniger sichtbare Nicht-MVP-Flaeche.
3. einfacherer Rejoin/Recovery Flow.
4. klareres Resume/Continue-Versprechen.
