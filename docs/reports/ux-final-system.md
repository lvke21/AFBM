# UX Final System

Stand: 2026-05-01

## Ziel

Dieses Dokument konsolidiert die bisherigen UX-Verbesserungen zu einem finalen System fuer den aktuellen AFBM-Manager. Es verbindet:

- Savegames UX
- Online UX
- Admin UX
- Navigation UX

Das Ziel ist ein konsistenter, verstaendlicher Spielfluss ohne widerspruechliche Einstiegspunkte, ohne Navigation ins Leere und mit klarer Terminologie.

## UX-Leitprinzipien

1. **Savegames ist das Hauptmenue.**
   `/app/savegames` ist der zentrale Einstieg fuer alle Spieler. Sichtbare Rueckwege fuehren dorthin.

2. **Ein Zustand, eine primaere Aktion.**
   Jeder Screen soll eine naheliegende Hauptaktion haben: fortsetzen, Karriere starten, Liga suchen, Liga oeffnen oder Aktion ausfuehren.

3. **Online ist ein eigener Hub, nicht nur ein Dashboard.**
   Join, Rejoin und Recovery passieren im Online Hub. Das Online-Dashboard zeigt die aktive Liga.

4. **Admin ist Utility, kein Spielmodus.**
   Adminfunktionen sind sichtbar fuer berechtigte Nutzer, aber visuell und sprachlich klar von Spielerflussen getrennt.

5. **Sidebar folgt Kontext.**
   Ohne Savegame oder Online-Liga gibt es keine Fachnavigation. Ohne Team sind teamrelevante Bereiche gesperrt und erklaert.

6. **Fehler fuehren zu Reparatur, nicht zu Schleifen.**
   Missing Membership, Missing Team oder ungueltige Liga-IDs fuehren primaer zu Rejoin, Liga suchen oder Savegames.

7. **Keine Fake-Erfolge.**
   Admin- und Simulationsaktionen zeigen nur Erfolg, wenn serverseitig wirklich geschrieben wurde.

## Konsistente Terminologie

| Begriff | Bedeutung | Nicht verwenden fuer |
| --- | --- | --- |
| `Hauptmenue` | Savegames Hub unter `/app/savegames` | Root `/` als sichtbares Ziel |
| `Fortsetzen` | wahrscheinlichsten vorhandenen Spielstand laden | neue Liga joinen |
| `Neue Karriere starten` | neues Offline-Savegame erstellen | Online-Liga erstellen |
| `Online spielen` | in den Online Hub wechseln | direkt in Draft oder Admin springen |
| `Liga suchen` | verfuegbare Online-Liga finden und Join/Rejoin starten | bestehende lokale Savegames |
| `Beitreten` | neue Membership/Team-Zuordnung erstellen | bereits vorhandene Membership ueberschreiben |
| `Wieder beitreten` | vorhandene Membership laden/reparieren | neues Team erzwingen |
| `Adminmodus` | geschuetzter Utility-Bereich fuer Ligen und Betrieb | normaler Spielmodus |
| `Spielablauf` | Week Loop / naechste spielbare Aktion | Draftboard |
| `Draft` | Draftstatus oder Draftboard, nur explizit geoeffnet | automatischer Redirect |

## Finaler UX Flow

### 1. First-Time User

Startpunkt: `/app/savegames`

Ziel: User loggt sich ein und startet bewusst Offline oder Online.

Flow:

```text
Savegames / Hauptmenue
  -> Accountstatus pruefen
  -> Einloggen oder Account erstellen
  -> Hauptentscheidung:
      - Neue Karriere starten
      - Online spielen
```

UI-Regeln:

- Der Accountbereich ist Status und Einstieg, kein zweiter Spielmodus.
- Wenn keine Franchises vorhanden sind, zeigt der Screen einen Empty State mit `Neue Karriere starten`.
- Wenn Offline-Erstellung deaktiviert ist, bleibt der Button gesperrt und erklaert in Spielersprache, was stattdessen moeglich ist.
- Admin ist nur als sekundarer Utility-Link sichtbar, wenn Adminzugriff plausibel ist.

Zielzustand:

- Offline: User landet im Franchise Hub/Dashboard.
- Online: User landet im Online Hub.

### 2. Returning Player

Startpunkt: `/app/savegames`

Ziel: User setzt mit minimaler Reibung fort.

Flow:

```text
Savegames / Hauptmenue
  -> Zuletzt gespielt / vorhandene Franchises
  -> Fortsetzen
  -> passendes Dashboard
```

UI-Regeln:

- `Fortsetzen` ist der primaere CTA, wenn ein valider Spielstand vorhanden ist.
- Offline-Franchises bleiben als Liste sichtbar.
- Online-Memberships werden langfristig als Resume-Quelle genutzt, nicht nur localStorage.
- Wenn ein gespeicherter Online-Kontext kaputt ist, wird er bereinigt und `Liga suchen / Rejoin` angeboten.

Zielzustand:

- User landet nicht in einem technischen Fehler, sondern entweder im passenden Dashboard oder in einer reparierenden Auswahl.

### 3. Offline Career

Startpunkt: `/app/savegames`

Ziel: User erstellt oder laedt eine Karriere und erreicht den Week Loop.

Neue Karriere:

```text
Savegames
  -> Neue Karriere starten
  -> Dynasty Name eingeben
  -> User-Team waehlen
  -> Karriere erstellen
  -> Dashboard
```

Fortsetzen:

```text
Savegames
  -> Franchise Fortsetzen
  -> Dashboard
  -> Spielablauf
```

UI-Regeln:

- Dynasty Name und User-Team haben Inline-Validierung.
- Ohne aktives Team bleiben Team-, Roster-, Finance- und Trade-Bereiche gesperrt.
- Sidebar zeigt aktive Bereiche und erklaert gesperrte Punkte.
- `Savegames` bleibt immer als Rueckweg sichtbar.

Zielzustand:

- Spieler sieht Team, Saison/Woche, naechste Aktion und kann sinnvoll fortschreiten.

### 4. Online Multiplayer

Startpunkt: `/online` oder `Savegames -> Online spielen`

Ziel: User ist als GM mit einer Online-Liga und einem Team verbunden.

Rejoin:

```text
Online Hub
  -> Fortsetzen / Wieder beitreten
  -> Online Liga Dashboard
```

Neue Liga suchen:

```text
Online Hub
  -> Liga suchen
  -> Liga pruefen
  -> Team bestaetigen oder automatisch zuweisen
  -> Beitreten
  -> Online Liga Dashboard
```

UI-Regeln:

- `lastLeagueId` wird erst nach erfolgreichem Join/Rejoin als vertrauenswuerdig behandelt.
- Vorhandene Memberships werden nicht ueberschrieben.
- Bei fehlender Membership ist `Liga neu suchen / Rejoin` die primaere Aktion.
- Bei fehlendem Team ist `Teamzuordnung reparieren / Rejoin` die primaere Aktion.
- Ein aktiver Draft oeffnet nie automatisch das Draftboard.
- Draftboard erscheint nur ueber explizite Draft-Route oder Klick auf `Draft`.
- Bei aktivem Draft ist `Spielablauf` gesperrt, `Draft` bleibt erreichbar.

Zielzustand:

- User sieht Liga, Team, Rolle GM, Phase, Week State und naechste Aktion.

### 5. Admin Flow

Startpunkt: `/admin` oder `Savegames -> Adminmodus`

Ziel: Admin versteht Systemstatus und fuehrt sichere Aktionen aus.

Flow:

```text
Savegames
  -> Adminmodus
  -> Adminrechte pruefen
  -> Admin Hub
  -> Liga oeffnen
  -> Status / Safety Check
  -> Aktion ausfuehren
```

UI-Regeln:

- Kein Admin-Passwort, nur Firebase Login plus serverseitige Adminberechtigung.
- Nicht-Admins sehen Zugriff verweigert und Rueckweg zu Savegames.
- Admin Hub ist in Status, Ligen, Betrieb und Debug gegliedert.
- Simulation und Week-Aktionen haben Confirm Dialoge und zeigen Auswirkungen.
- Debug ist Diagnose, nicht primaerer Spielpfad.
- Destruktive oder mutierende Aktionen laufen nur ueber Admin API mit Bearer Token.

Zielzustand:

- Admin kann Liga oeffnen, Week State pruefen, Simulation starten oder Blocker verstehen.

## State-basierte Navigation

| Zustand | Sichtbare Hauptaktion | Sidebar / Navigation | Fallback |
| --- | --- | --- | --- |
| Nicht eingeloggt | Einloggen | nur Hauptmenue/Account-Kontext | `/app/savegames` |
| Kein Savegame und keine Online-Liga | Neue Karriere starten / Online spielen | nur Dashboard-Fallback | `/app/savegames` |
| Offline Savegame mit Team | Fortsetzen / Spielablauf | volle Offline-Navigation | Savegames |
| Offline Savegame ohne Team | Savegame pruefen | Team-relevante Bereiche gesperrt | Savegames |
| Online ohne Membership | Liga suchen / Rejoin | Online Hub statt League-Dashboard | Online Hub |
| Online Membership ohne Team | Teamzuordnung reparieren / Rejoin | Team-Bereiche gesperrt | Online Hub |
| Online Draft aktiv | Draft oeffnen | Draft aktiv, Spielablauf gesperrt | Online Hub / Savegames |
| Online Roster bereit | Spielablauf / Team pruefen | Online-Dashboard-Bereiche aktiv | Online Hub / Savegames |
| Admin ohne Rechte | Zurueck zum Hauptmenue | keine Admin-Aktionen | Savegames |
| Admin mit Rechte | Liga oeffnen / Simulation & Woche | Admin Hub + Detailseiten | Savegames |

## Klare Nutzerreise

### Spielerreise: Offline

```text
Hauptmenue
  -> Fortsetzen oder Neue Karriere starten
  -> Franchise Hub
  -> naechste Aktion im Spielablauf
  -> Ergebnis / Fortschritt
  -> zurueck zum Hub
```

Erfolgskriterium:

- Der Spieler weiss jederzeit, welches Team er verwaltet, welche Woche aktiv ist und was als Naechstes sinnvoll ist.

### Spielerreise: Online

```text
Hauptmenue
  -> Online spielen
  -> Online Hub
  -> Fortsetzen, Wieder beitreten oder Liga suchen
  -> Online Liga Dashboard
  -> Draft / Roster / Week Loop je nach Phase
```

Erfolgskriterium:

- Der Spieler ist eindeutig als GM mit genau einer Liga- und Teamzuordnung verbunden.

### Adminreise

```text
Hauptmenue
  -> Adminmodus
  -> Admin Hub
  -> Liga auswaehlen
  -> Safety Check lesen
  -> Simulation, Woche oder Debug ausfuehren
```

Erfolgskriterium:

- Der Admin sieht vor jeder mutierenden Aktion, welche Liga betroffen ist, welche Voraussetzungen gelten und welche Daten geschrieben werden.

## Definition "spielbar"

Eine Version gilt fuer den aktuellen MVP als **spielbar**, wenn folgende Bedingungen erfuellt sind:

### Einstieg

- `/app/savegames` ist erreichbar und erklaert Account, Offline, Online und Admin eindeutig.
- Ein eingeloggter User kann einen vorhandenen Spielstand fortsetzen oder einen erlaubten neuen Flow starten.
- Kein sichtbarer Hauptbutton endet ohne Rueckweg in einer kaputten Seite.

### Offline

- Eine vorhandene Franchise kann geladen werden.
- Dashboard, Spielablauf und Teamkontext sind konsistent.
- Ohne Manager-Team wird nicht blind weiternavigiert, sondern ein reparierender Zustand gezeigt.

### Online

- Ein eingeloggter Firebase-User kann eine vorhandene Liga suchen, joinen oder wieder beitreten.
- Membership, TeamId und GM-Rolle sind konsistent.
- Draft, Roster und Week Loop sind phasenabhaengig erreichbar oder erklaert gesperrt.
- Ein aktiver Draft loest keinen automatischen Fullscreen-Redirect aus.

### Admin

- Adminzugriff basiert auf Firebase Auth plus serverseitiger Adminpruefung.
- Ligen sind sichtbar, oeffenbar und mit Statusdaten pruefbar.
- Week-Simulation wird nur serverseitig ausgelost und zeigt echte Ergebnisse oder klare Blocker.
- Kritische Aktionen haben Confirm Dialoge.

### Navigation

- Sidebar und Rueckwege passen zum aktuellen Kontext.
- Aktiver Zustand ist sichtbar.
- Disabled States nennen Grund und naechsten Schritt.
- Hauptmenue bedeutet immer `/app/savegames`.

### Fehlerverhalten

- Fehlende Auth fuehrt zu Login.
- Fehlendes Savegame fuehrt zu Savegames.
- Fehlende Membership oder Teamzuordnung fuehrt zu Rejoin/Reparatur.
- Fehlender Adminzugriff fuehrt zu Savegames.
- Fehler werden nicht durch wiederholten gleichen Retry versteckt.

## Nicht-Ziele im finalen UX-System

- Admin soll kein regulaerer Spielmodus werden.
- Online Join soll keine bestehenden Manager-Zuordnungen ueberschreiben.
- Draftstatus soll keine automatische Navigation erzwingen.
- Sidebar soll keine Funktionen zeigen, fuer die der aktuelle Kontext fehlt.
- Debug-Informationen sollen keine Secrets oder API Keys anzeigen.

## Offene Systemgrenzen

- Ein vollstaendiges Resume-Panel fuer Offline und Online als gemeinsame letzte Aktivitaet ist Zielbild, aber kann weiter ausgebaut werden.
- Online-Unterbereiche nutzen aktuell teils Hash-Anker; langfristig waeren echte Tabs oder Routen klarer.
- Disabled Sidebar-Eintraege sollten spaeter tastaturfokussierbar mit `aria-disabled` werden.
- Admin-Detailseiten koennen weiter in Tabs fuer Week, Draft, GMs und Debug gegliedert werden.

## Konsolidierte Arbeitspakete

1. **AP-FINAL-1: Resume-First Hauptmenue finalisieren**
   Offline- und Online-Resume in einem oberen Bereich zusammenfuehren.

2. **AP-FINAL-2: Online Recovery voll entlooppen**
   Missing Membership und Missing Team primaer zu Rejoin/Reparatur fuehren.

3. **AP-FINAL-3: Accountbereich konsolidieren**
   Login, Rolle, Online-Verfuegbarkeit und Admin-Verfuegbarkeit in einem Account-Panel abbilden.

4. **AP-FINAL-4: Sidebar Accessibility nachziehen**
   Disabled Items tastaturfreundlich machen und Sperrgruende konsistent anzeigen.

5. **AP-FINAL-5: Admin Detail UX staffeln**
   Ligadetailseite in Status, Week, Draft, Memberships und Debug gliedern.

## Finale Empfehlung

Das finale UX-System soll nicht mehr aus getrennten Modulen gedacht werden, sondern aus einer klaren Hierarchie:

```text
Hauptmenue
  -> Offline Karriere
  -> Online Hub
  -> Admin Utility
```

Alles andere ist kontextabhaengige Fachnavigation innerhalb eines aktiven Spielzustands. Damit wird die App fuer Spieler verstaendlicher, fuer Admins sicherer und fuer kuenftige Features stabiler erweiterbar.
