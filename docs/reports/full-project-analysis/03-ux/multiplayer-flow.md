# Multiplayer Flow

Stand: 2026-05-02

## Ziel des Users

Ein eingeloggter GM will eine Online-Liga finden oder erneut laden, sein Team sehen, sich fuer die Woche bereit setzen und nach der Simulation Ergebnisse/Standings sehen.

## Flow-Diagramm

```text
Savegames
  -> Online spielen
    -> OnlineAuthGate
      -> nicht eingeloggt: Login/Register
      -> eingeloggt: Online Hub
        -> Weiterspielen
          -> lastLeagueId lesen
          -> Liga + Membership pruefen
          -> /online/league/[leagueId]
        -> Liga suchen
          -> Ligen laden
          -> Team-Identitaet waehlen oder Rejoin erkennen
          -> Beitreten / Wieder beitreten
          -> /online/league/[leagueId]
            -> Route-State laedt User + Liga
            -> Membership + Team validieren
            -> Dashboard
```

## Notwendige Schritte

1. Firebase Login.
2. Online Hub oeffnen.
3. Entweder `Weiterspielen` mit gueltiger `lastLeagueId` oder `Liga suchen`.
4. Bei neuem Join Team-Identitaet waehlen.
5. Join/Rejoin ausfuehren.
6. Liga-Dashboard laden.
7. Team-Verbindung bestaetigt sehen.

## Tatsaechliche Implementierung

| Schritt | Implementierung | Bewertung |
|---|---|---|
| Online Entry | `SavegamesOnlineLink` -> `/online` | OK |
| Auth Guard | `OnlineAuthGate` | OK |
| Continue | `OnlineContinueButton`, `buildOnlineContinueState`, Repository `getLastLeagueId` | Funktional, datenabhaengig |
| Liga suchen | `OnlineLeagueSearch`, `getAvailableLeagues`, `subscribeToAvailableLeagues` | Funktional |
| Join/Rejoin | `repository.joinLeague`, Team Identity Selection | Funktional, aber UX-lastig |
| Liga laden | `useOnlineLeagueRouteState` | Zentral und defensiv |
| Team/Membership | Firebase Repository liest Membership/Mirror/assignedUserId | Technisch verbessert |
| Dashboard | `OnlineLeaguePlaceholder` und Panels | MVP-funktional |

## Team-Verbindung User ↔ Team

```text
Firebase UID
  -> league membership / global leagueMembers mirror
  -> teamId
  -> team.assignedUserId / managerUserId
  -> currentLeagueUser
  -> Online Dashboard freigegeben
```

Validierungsziel:

- `uid` existiert.
- Membership fuer `leagueId + uid` existiert.
- `teamId` ist gueltig.
- Team verweist auf dieselbe UID oder Membership/Mirror ist konsistent rekonstruierbar.

## Bruchstellen

| Bruchstelle | UX-Auswirkung | Schwere |
|---|---|---|
| `lastLeagueId` fehlt/ungueltig | `Weiterspielen` scheitert, User muss Liga suchen | Mittel |
| Membership fehlt, Mirror existiert nicht | User landet in Recovery statt Spiel | Hoch |
| TeamId fehlt/vacant | Dashboard blockt mit Fehlerzustand | Hoch |
| Aktive Liga nicht joinbar fuer neue User | Suche zeigt ggf. keine Liga | Mittel |
| Team-Identitaet vor Join | Neuer User muss mehr konfigurieren als erwartet | Mittel |
| Dashboard als langer Single-Screen | User sieht viele Statusbereiche auf einmal | Mittel |

## Unklare States

- "Ich bin eingeloggt, aber nicht verbunden" ist weiterhin ein moeglicher mentaler Zustand.
- "Wieder beitreten" bedeutet technisch Rejoin, nicht neues Team.
- "Team-Identitaet" ist wichtig bei neuem Join, aber fuer Testliga-Rejoin kann es wie Zusatzarbeit wirken.
- Online Sidebar zeigt mehr Spielbereiche als im MVP wirklich aktiv sind.

## Blockierende Bugs

Statisch aktuell kein sicherer blockierender Bug im Join-/Load-Code sichtbar. Offene Live-Risiken:

- Staging-Daten koennen inkonsistente Membership/Mirror/Team-Zuordnung enthalten.
- Firestore Rules koennen Join/Rejoin anders blockieren als lokale Tests.
- Auth Token/Session Refresh kann Admin/GM-Zustand verzoegern.

## Verbesserungsvorschlaege

1. `Weiterspielen` bei fehlender Membership direkt mit CTA `Liga suchen / Rejoin` statt nur Recovery.
2. Im Online Hub zuerst Ligen anzeigen, Team-Identitaet erst nach Auswahl einer joinbaren Liga.
3. Dashboard oben mit einer einzigen Spielerfrage starten: "Bist du fuer Week X bereit?"
4. Rejoin-Status explizit anzeigen: "Du bist bereits GM von Team X."
5. Fehler "kein Team" mit Diagnose darstellen: Membership vorhanden, Team fehlt, Admin muss zuweisen.

## Minimale Version fuer spielbaren MVP

```text
Online Hub
  -> Liga suchen
  -> wenn Membership existiert: Wieder beitreten ohne Formular
  -> wenn neue Lobby-Liga: Team waehlen + Beitreten
  -> Dashboard zeigt:
      Team
      aktuelle Woche
      naechste Partie
      Ready Button
      Results
      Standings
      klare Sperren fuer Nicht-MVP Features
```
