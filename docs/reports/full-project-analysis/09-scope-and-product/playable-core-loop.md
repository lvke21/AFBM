# Playable Core Loop

## Ziel

Definition des minimalen Wegs zu einem wirklich spielbaren Multiplayer-Erlebnis.

## Core Loop in einem Satz

Ein GM tritt einer Liga bei, versteht sein Team und die aktuelle Woche, setzt Ready, erlebt eine simulierte Woche, sieht Ergebnisse/Standings und kann mit der naechsten Woche weitermachen.

## Minimaler Weg zu spielbarem Multiplayer

```text
1. Savegames / Hauptmenue
2. Online spielen
3. Online Hub
4. Liga suchen oder Wieder beitreten
5. Team wird bestaetigt
6. Dashboard zeigt:
   - Liga
   - Team
   - Rolle GM
   - aktuelle Woche
   - naechste Partie
   - Ready-Status
7. GM prueft:
   - Roster
   - Depth Chart
   - League / Standings
8. GM setzt Ready
9. Admin sieht alle Ready-States
10. Admin simuliert Woche
11. GM sieht:
    - Ergebnisse
    - Standings
    - naechste Woche
12. Reload bestaetigt denselben Zustand
```

## Was der Spieler jederzeit wissen muss

| Frage | Muss sichtbar beantwortet sein |
| --- | --- |
| Bin ich online verbunden? | Ja, mit Account/UID nicht technisch ueberladen. |
| Welche Liga spiele ich? | Liga Name und ID/Status fuer Debug optional. |
| Welches Team gehoert mir? | Teamname, GM/Rolle, Teamstatus. |
| Welche Woche ist aktiv? | Current Week + Season. |
| Was ist meine naechste Aktion? | Genau ein primaerer CTA. |
| Bin ich bereit? | Ready-State klar, Buttonzustand eindeutig. |
| Was ist zuletzt passiert? | Results und Standings. |
| Was ist blockiert? | Kurz erklaert und mit naechstem Schritt. |

## Must-have Screens

### Online Hub

Zweck:
- Fortsetzen/Rejoin oder Liga suchen.

Minimal:
- Auth-Status.
- Weiterspielen, wenn valide.
- Liga suchen.
- Klare Fehler bei fehlender Membership/lastLeagueId.

### Online Dashboard

Zweck:
- Zentrale Spieleraktion fuer Woche.

Minimal:
- Team.
- Current Week.
- Next Game.
- Ready CTA.
- Results/Standings Summary.
- Links zu Roster, Depth Chart, League, Draft.

### Roster

Zweck:
- Spieler versteht Team-Personal.

Minimal:
- Liste der Spieler.
- Position, Overall, Status.
- Empty State bei fehlendem Roster.

### Depth Chart

Zweck:
- Spieler sieht/veraendert Starterstruktur.

Minimal:
- Positionsgruppen.
- Starter/Backup.
- Konflikt-/Missing-Starter-Hinweise.

### League

Zweck:
- Liga-Kontext und Standings.

Minimal:
- Teams.
- Records.
- Results.
- Schedule/aktuelle Woche.

### Draft

Zweck:
- Nur relevant, wenn Draft aktiv oder als Historie.

Minimal:
- Draft Status.
- Board nur bei expliziter Route.
- Kein Auto-Redirect.
- Completed Draft als abgeschlossen anzeigen.

### Admin League Detail

Zweck:
- Betrieb, nicht Spielerflow.

Minimal:
- Ready-Status.
- Week Simulation.
- Results/Standings nach Simulation.
- klare Blocker.

## Der kleinste erfolgreiche Multiplayer-Test

```text
Given: Staging-Testliga mit Teams, Rostern, Schedule
And: User ist Firebase-eingeloggt
When: User klickt Online spielen -> Liga suchen -> Beitreten
Then: User landet im Dashboard und sieht sein Team

When: User setzt Ready
Then: Membership ready=true und Dashboard zeigt bereit

When: Admin simuliert Woche
Then: Results und Standings werden gespeichert

When: User reloadet Dashboard
Then: Results, Standings und neue Woche bleiben sichtbar
```

## Was nicht in den Loop gehoert

- Contracts/Cap.
- Development.
- Trades.
- Inbox.
- Finance.
- Advanced scouting.
- Media/Owner/Job-Security Deep Systems.
- Vollautomatische Liga-Administration.
- Playoffs.

## Harte Produktprioritaeten

### P1: Verlaesslicher Rejoin

Warum:
- Ohne Rejoin ist Multiplayer kein dauerhaftes Spiel.

Akzeptanz:
- User kann nach Logout/Login und LocalStorage-Verlust wieder in sein Team.

### P2: Ready -> Sim -> Results

Warum:
- Das ist der Fortschrittsmotor.

Akzeptanz:
- Keine doppelte Simulation.
- Results/Standings nach Reload.

### P3: Dashboard als naechste Aktion

Warum:
- Spieler braucht Orientierung, nicht eine Funktionsliste.

Akzeptanz:
- Oben steht genau, was als naechstes zu tun ist.

### P4: Nicht-MVP leise machen

Warum:
- Unfertige Features lassen den fertigen Kern schlechter wirken.

Akzeptanz:
- Keine klickbaren halben Features.

### P5: Admin nur als Betrieb

Warum:
- Admin ist nicht Teil der Spielerfantasie.

Akzeptanz:
- Admin sieht klare Betriebsschritte; normale Spieler sehen Admin nicht als Spielmodus.

## MVP Go-Kriterien

Gruen erst, wenn:

- Authenticated Staging GM Flow gruen.
- Authenticated Staging Admin Week Flow gruen.
- Dashboard/Ready/Results Reload gruen.
- Nicht-MVP Navigation erzeugt keine falschen Erwartungen.
- E2E oder manueller Smoke dokumentiert den kompletten Loop.

Aktueller Stand:

- Intern/Staging: Gelb, spielbar.
- Breiter Spieler-MVP: noch nicht gruen.
