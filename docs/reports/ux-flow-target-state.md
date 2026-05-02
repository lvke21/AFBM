# UX Flow Target State

Stand: 2026-05-01

Ziel dieses Dokuments ist ein ideales, reduziertes UX-Zielbild auf Basis des aktuellen Systems. Es definiert, wie Spieler ohne Verwirrung starten, fortsetzen, Online spielen und Adminfunktionen verstehen sollen.

## Leitprinzipien

- Ein primaerer CTA pro Zustand.
- Login ist ein klarer Account-Schritt, nicht mehrfach verteilt.
- Offline, Online und Admin sind getrennte Entry Points mit sichtbaren Voraussetzungen.
- Disabled States erklaeren immer: warum gesperrt, was als Naechstes zu tun ist.
- Fehlerzustaende fuehren zu einer reparierenden Aktion, nicht nur zu Retry.
- Rueckwege nutzen konsistent `Savegames / Hauptmenue` und `Online Hub`.

## Entry Points

| Entry Point | Zielgruppe | Primaerer Zweck |
| --- | --- | --- |
| `/app/savegames` | Alle Spieler | Accountstatus, Karriere fortsetzen, neue Karriere starten, Online/Admin erreichen |
| `/online` | Eingeloggte GMs | Multiplayer fortsetzen oder Liga suchen/joinen |
| `/online/league/[leagueId]` | Liga-Mitglieder | Online-Dashboard der aktiven Liga |
| `/admin` | Admins | Ligen verwalten, Debug, Week/Simulation |
| `/admin/league/[leagueId]` | Admins | Einzelne Liga pruefen und Aktionen ausfuehren |

## Flow 1: First-Time User Flow

### Startpunkt

`/app/savegames`

### Voraussetzungen

- Kein Firebase Login vorhanden.
- Keine lokale/remote Franchise geladen.

### Ziel

User ist eingeloggt und trifft eine klare Entscheidung: Offline Karriere starten oder Online Liga suchen.

### Minimaler Klickpfad

```text
Savegames
  -> Einloggen / Account erstellen
  -> Erfolgszustand: "Du bist eingeloggt als ..."
  -> Primärer CTA: "Neue Karriere starten"
  -> Sekundärer CTA: "Online Liga suchen"
```

### UI-States

- **Loading:** "Account wird geprüft..."
- **Logged out:** ein Login-Panel, keine zweite Auth-Anzeige.
- **Logged in, no saves:** Empty State mit zwei klaren CTAs:
  - `Neue Offline-Karriere`
  - `Online Liga suchen`
- **Admin allowed:** Admin-Link als sekundärer Utility-Link, nicht als gleichrangiger Startmodus.

### Fehlerbehandlung

- Login-Fehler: konkrete Firebase Message plus "Erneut versuchen".
- Netzwerkfehler: "Verbindung prüfen" plus Retry.
- Offline-Erstellung nicht erlaubt: CTA wird disabled mit Grund und naechstem Schritt.

### Zielzustand

User landet entweder im Offline-Dashboard oder im Online Hub Join Flow.

### Reduzierter Klickpfad

Best case: 2 Klicks nach Login.

```text
Login -> Neue Karriere starten
```

## Flow 2: Returning Player Flow

### Startpunkt

`/app/savegames` oder `/`

### Voraussetzungen

- Firebase Login vorhanden oder Session wiederherstellbar.
- Mindestens ein Savegame oder eine Online-Membership existiert.

### Ziel

User setzt den wahrscheinlichsten aktiven Spielstand fort.

### Minimaler Klickpfad

```text
Savegames
  -> "Fortsetzen" im Resume-Panel
```

### UI-States

- **Loading:** Account und letzte Aktivitaet werden geprueft.
- **Resume available:** oberstes Panel "Zuletzt gespielt" mit:
  - Modus: Offline/Online
  - Team/Liga
  - letzter Stand: Woche, Record, Draft/Season Status
  - CTA `Fortsetzen`
- **Multiple choices:** Liste darunter mit Offline-Franchises und Online-Ligen.
- **No valid last activity:** Empty State mit "Franchise waehlen" und "Online Liga suchen".

### Fehlerbehandlung

- Ungueltige `lastLeagueId`: automatisch bereinigen und Meldung "Letzte Online-Liga nicht mehr verfuegbar."
- Savegame nicht zugreifbar: zur Liste zurueck, nicht in 404 fallen lassen.
- Membership fehlt: direkt CTA `Liga neu suchen / Rejoin`.

### Zielzustand

User ist im Dashboard des letzten Spielstands oder bewusst in der Auswahl.

### Reduzierter Klickpfad

Best case: 1 Klick.

```text
Fortsetzen
```

## Flow 3: Offline Career Flow

### Startpunkt

`/app/savegames`

### Voraussetzungen

- Firebase Login vorhanden, falls Savegames serverseitig/accountgebunden bleiben.
- Offline-Erstellung in aktueller Umgebung erlaubt.

### Ziel

Spieler erstellt oder laedt eine Karriere und macht Fortschritt im Week Loop.

### Minimaler Klickpfad Neue Karriere

```text
Savegames
  -> Neue Offline-Karriere
  -> Dynasty Name + Team waehlen
  -> Karriere erstellen
  -> Dashboard
  -> Spielablauf / naechste Aktion
```

### Minimaler Klickpfad Fortsetzen

```text
Savegames
  -> Franchise Fortsetzen
  -> Dashboard
  -> Spielablauf
```

### UI-States

- **Pre-create:** Form mit Dynasty Name, Team, klarer "Karriere erstellen" CTA.
- **Creating:** Button disabled, "Karriere wird erstellt..."
- **Dashboard ready:** Sidebar aktiv, Quick Actions zeigen naechste sinnvolle Aktion.
- **No manager team:** Dashboard/Sidebar zeigt "Kein Manager-Team" plus CTA "Zur Savegame-Auswahl".
- **No season/week:** "Saisonstatus fehlt" plus CTA "Savegame prüfen" oder "Support/Admin Debug" je Umgebung.

### Fehlerbehandlung

- Ungueltiger Dynasty Name: Inline-Fehler am Feld.
- Team ungueltig: Select-Fehler und Fokus.
- API 401: Auth-Panel anzeigen, Eingaben erhalten.
- API/DB-Fehler: Retry ohne Seitenreload.

### Zielzustand

Spieler ist im Franchise Hub und hat eine klare naechste Aktion.

### Reduzierter Klickpfad

Neue Karriere: 3 Interaktionen nach Login.

```text
Name setzen -> Team waehlen -> Erstellen
```

Fortsetzen: 1 Klick.

```text
Fortsetzen
```

## Flow 4: Online Multiplayer Flow

### Startpunkt

`/online` oder `Savegames -> Online Liga`

### Voraussetzungen

- Firebase Login vorhanden.
- User kann GM sein.
- Mindestens eine joinbare Liga oder bestehende Membership.

### Ziel

User landet in seiner Online-Liga mit Team-Kontext.

### Minimaler Klickpfad Rejoin

```text
Online Hub
  -> Fortsetzen
  -> Online Liga Dashboard
```

### Minimaler Klickpfad Neue Liga suchen

```text
Online Hub
  -> Liga suchen
  -> Liga auswählen
  -> Team bestätigen
  -> Beitreten
  -> Online Liga Dashboard
```

### UI-States

- **Auth loading:** "Firebase Login wird geprüft..."
- **No auth:** Login-Panel mit Rueckweg Savegames.
- **Has membership:** Resume Card mit Liga, Team, Rolle, Status, CTA `Fortsetzen`.
- **No membership:** CTA `Liga suchen`.
- **Search loading:** "Ligen werden gesucht..."
- **No leagues:** "Keine Liga verfuegbar" plus optionaler Hinweis fuer Admin/Testumgebung.
- **League found:** Liga-Karte mit Status, freien Teams, aktueller Phase.
- **Already member:** Button `Wieder beitreten`, keine Team-Identity-Abfrage.
- **New member:** Team-Identity wird in einem kurzen Schritt bestaetigt oder automatisch vorgeschlagen.
- **Joined:** lastLeagueId speichern, League Dashboard laden.

### Fehlerbehandlung

- Ungueltige lastLeagueId: loeschen, direkt `Liga suchen` als primaere Aktion zeigen.
- Fehlende Membership beim Direktaufruf: primaerer CTA `Liga neu suchen / Rejoin`, nicht nur Retry.
- Fehlendes Team: primaerer CTA `Teamzuordnung reparieren` oder `Liga neu suchen`, sekundär Retry.
- Liga voll: klare Meldung plus Zurueck zu Liga-Liste.
- Permission denied: erklaeren, welche Membership/Team-Zuordnung fehlt.

### Zielzustand

User sieht Online Dashboard mit:

- Liga
- eigenes Team
- Rolle GM
- aktuelle Woche/Phase
- naechste Aktion

### Reduzierter Klickpfad

Rejoin: 1 Klick.

```text
Fortsetzen
```

Neue Liga: 3-4 Klicks.

```text
Liga suchen -> Liga waehlen -> Team bestaetigen -> Beitreten
```

## Flow 5: Admin Flow

### Startpunkt

`/admin` oder `Savegames -> Adminmodus`

### Voraussetzungen

- Firebase Login vorhanden.
- `admin: true` Custom Claim oder UID-Allowlist.

### Ziel

Admin versteht Systemstatus und kann gezielt Liga-Aktionen ausfuehren.

### Minimaler Klickpfad Liga verwalten

```text
Savegames
  -> Adminmodus
  -> Liga aus Liste oeffnen
  -> Ligadetail
```

### Minimaler Klickpfad Woche simulieren

```text
Admin Hub
  -> Liga auswaehlen
  -> Simulation & Woche
  -> Voraussetzungen pruefen
  -> Woche simulieren
  -> Ergebnis sehen
```

### UI-States

- **Checking admin:** "Adminrechte werden geprüft..."
- **Denied:** "Kein Adminzugriff" plus Zurueck zu Savegames.
- **Allowed:** Admin Hub mit Systemstatus.
- **No league selected:** Adminaktionen disabled, primaerer CTA `Liga auswählen`.
- **League selected:** Admin Hub zeigt Teams, Memberships, Week-State, Draft-State.
- **Action blocked:** Button disabled mit konkretem Grund, z. B. "Kein Schedule", "Nicht alle Teams ready".
- **Action running:** Pending State, Button disabled.
- **Action success:** Ergebnisbox mit simulierten Games/Standings.
- **Action error:** Fehlerbox mit API-Fehlercode und Retry/Debug.

### Fehlerbehandlung

- Kein Admin: kein Passwortfallback, nur Login/Adminrechte.
- API 401/403: "Token fehlt/keine Adminrechte" plus neu einloggen.
- Liga nicht gefunden: zur Admin-Liste zurueck.
- Simulation blockiert: Voraussetzungen anzeigen, keine Fake-Erfolgsmeldung.
- Doppelklick/parallele Action: Pending/Lock-Meldung.

### Zielzustand

Admin hat eine Liga erfolgreich geoeffnet, geprüft oder eine Week-Aktion nachvollziehbar ausgefuehrt.

### Reduzierter Klickpfad

Ligadetail: 2 Klicks.

```text
Adminmodus -> Liga oeffnen
```

Simulation: 3 Klicks nach Admin Hub.

```text
Liga auswaehlen -> Simulation & Woche -> Woche simulieren
```

## Ziel-Navigationsmodell

### Savegames als Home

`/app/savegames` ist der eindeutige Home-/Hub-Punkt. `/` darf dorthin redirecten oder re-exporten, aber sichtbare Rueckwege sollten einheitlich "Zum Hauptmenue" -> `/app/savegames` nutzen.

### Online als eigener Hub

Online-Dashboard ist nicht der Ort zum Joinen. Join/Rejoin bleibt im Online Hub. Direct League Load darf bei Fehlern direkt zum reparierenden Online-Hub-Schritt fuehren.

### Admin als Utility

Admin ist kein Spielmodus. Er erscheint fuer Admins als Utility-Bereich und fuer Nicht-Admins als erklaert gesperrt.

## Ziel-Fehlerzustaende

| Zustand | Primaere Aktion | Sekundaere Aktion |
| --- | --- | --- |
| Nicht eingeloggt | Einloggen | Zurueck zu Savegames |
| Kein Savegame | Neue Karriere starten | Online Liga suchen |
| Savegame nicht gefunden | Savegame-Auswahl | Online Hub |
| Kein Manager-Team | Savegame-Auswahl | Support/Admin Debug Hinweis |
| Keine Online-Liga | Liga suchen | Zurueck zu Savegames |
| Ungueltige lastLeagueId | Liga suchen | Meldung schliessen |
| Keine Membership | Liga neu suchen / Rejoin | Online Hub |
| Kein Team in Online-Liga | Teamzuordnung reparieren / Rejoin | Online Hub |
| Kein Adminrecht | Zurueck zu Savegames | Neu einloggen |
| Adminaktion blockiert | Voraussetzungen anzeigen | Daten neu laden |

## Reduzierte Klickpfade Zusammenfassung

```text
First-Time:
Savegames -> Login -> Neue Karriere starten

Returning Offline:
Savegames -> Fortsetzen

Returning Online:
Online Hub -> Fortsetzen

New Online:
Online Hub -> Liga suchen -> Liga waehlen -> Beitreten

Admin:
Savegames -> Adminmodus -> Liga oeffnen

Admin Simulation:
Admin Hub -> Liga auswaehlen -> Simulation & Woche -> Woche simulieren
```

## Priorisierte UX-Arbeitspakete

1. Auth konsolidieren: ein Account-Panel, Login als Modal/Inline-Step statt doppelter Darstellung.
2. Copy korrigieren: "Offline sofort spielbar" zu "Offline-Karriere mit deinem Account".
3. Online Recovery umbauen: Missing Membership/Team primaer zu `Liga neu suchen / Rejoin`.
4. Resume Panel bauen: Zuletzt gespielte Offline/Online-Aktivitaet als oberster CTA.
5. Rueckwege vereinheitlichen: sichtbares Hauptmenue immer `/app/savegames`.
6. Admin-Hinweise entwirren: UID-Allowlist und Custom Claim gleichwertig, ohne Token-Refresh-Dominanz.
