# UX Flow Overview

Stand: 2026-05-02

## Ziel der Analyse

Ende-zu-Ende-Analyse der aktuellen Nutzerflows: Einstieg, Auth, Offline/Online, Team-Verbindung, Draft, Ready-State, Week-Simulation, Ergebnisse, Team Management und Admin.

## Bewertungsbasis

Untersuchte Dateien/Bereiche:

- `src/app/app/savegames/page.tsx`
- `src/components/savegames/*`
- `src/components/auth/*`
- `src/app/online/page.tsx`
- `src/components/online/*`
- `src/components/layout/navigation-model.ts`
- `src/components/layout/sidebar-navigation.tsx`
- `src/app/admin/page.tsx`
- `src/components/admin/*`
- bestehende Reports: `ux-flow-current-state.md`, `ux-flow-target-state.md`, `ux-sollzustand-verifikation.md`, `multiplayer-mvp-acceptance.md`, `online-hub-functionality-report.md`, `admin-hub-functionality-report.md`

Hinweis: Dies ist eine UX-/Codepfad-Analyse, kein neuer Browser-Smoke. Live Console Errors, Staging Auth und echte Admin-UI-Simulation wurden nicht erneut ausgefuehrt.

## Gesamturteil

**Status: Gelb, spielbarer interner Multiplayer-MVP mit offenen UX-Risiken.**

Der minimale Multiplayer-Spielkreis ist erkennbar und weitgehend verdrahtet:

```text
Login
  -> Online Hub
  -> Liga suchen / Weiterspielen
  -> Team verbunden
  -> Dashboard
  -> Draft abgeschlossen oder Draft explizit oeffnen
  -> Roster / Depth Chart pruefen
  -> Ready setzen
  -> Admin simuliert Woche
  -> Ergebnisse + Standings sehen
  -> naechste Woche
```

Der Flow ist aber noch nicht so glatt, dass ein neuer Spieler ohne Erklaerung sicher versteht, was er tun soll. Die groessten UX-Risiken liegen bei Resume/Rejoin, vielen sichtbaren Nebenfunktionen, Admin-Simulation und der mentalen Trennung von Spieler-Flow vs. Admin-Flow.

## Minimaler stabiler Game Loop

### MVP-Loop fuer GM

```text
Savegames Hub
  -> Firebase Login
  -> Online spielen
  -> Liga suchen
  -> Team-Identitaet waehlen oder Wieder beitreten
  -> Online Liga Dashboard
  -> Draft nur bei explizitem Klick oeffnen
  -> Roster ansehen
  -> Depth Chart ansehen
  -> Bereit fuer Woche setzen
  -> warten auf Admin / andere GMs
  -> Ergebnisse und Standings nach Simulation ansehen
  -> naechste Woche erneut bereit setzen
```

### MVP-Loop fuer Admin

```text
Savegames Hub
  -> Adminmodus
  -> Admin Control Center
  -> Liga auswaehlen
  -> Ready / Schedule / Draft-State pruefen
  -> Woche simulieren
  -> Ergebnisse + Standings pruefen
  -> Reload pruefen
```

## Flow-Status Matrix

| Flow | Status | Kernbewertung |
|---|---|---|
| Einstieg ins Spiel | Gelb | Hub ist klarer, aber zeigt viele Optionen gleichzeitig |
| Login/Auth | Gruen/Gelb | Funktional, aber technische Debug-/Rollenbegriffe sichtbar |
| Online Hub | Gelb | Weiterspielen und Liga suchen existieren; Rejoin bleibt datenabhaengig |
| Team-Verbindung User ↔ Team | Gelb | Technisch abgesichert, UX bei kaputten Daten weiter fehlerraumartig |
| Multiplayer Dashboard | Gelb/Gruen | Kernstatus sichtbar; sehr lang und technisch |
| Draft | Gruen/Gelb | Explizite Route, kein Auto-Redirect; komplexer Turn-State |
| Ready-State | Gruen/Gelb | Button und Status vorhanden; Admin-/Wartezustand muss klar bleiben |
| Week-Simulation | Gelb | API/Service stark; echter Admin-UI-Live-Smoke bleibt Risikopunkt |
| Ergebnisse/Standings | Gruen/Gelb | Persistierte Standings werden bevorzugt; UI zeigt oft nur Ausschnitt |
| Team Management | Gelb | Roster/Depth Chart MVP vorhanden, Editierbarkeit online begrenzt |
| Admin-Funktionen | Gelb | Nutzbar, aber viele kritische Aktionen und native Dialoge |
| Fehler-/Leerzustände | Gelb | Meist vorhanden, aber nicht immer reparierend genug |

## Wichtigste Flow-Brueche

1. **Continue/Rejoin ist nicht narrensicher.** `lastLeagueId`, Membership, Mirror, TeamId und `assignedUserId` muessen zusammenpassen.
2. **Savegames Hub zeigt zu viele gleichrangige Optionen.** First-Time User sieht Fortsetzen, Neue Karriere, Online und Admin gleichzeitig.
3. **Online Join ist schwerer als "Liga suchen".** Neue User muessen Stadt, Kategorie und Teamnamen waehlen, bevor sie beitreten.
4. **Admin Week-Aktionen sind fachlich dicht.** `Woche simulieren` und `Woche abschliessen` wirken getrennt, obwohl Simulation den Week Advance schon erledigt.
5. **Nicht-MVP Features bleiben sichtbar.** Coming Soon ist sauberer als kaputt, aber die Sidebar wirkt dadurch groesser als der MVP.
6. **Spieler versteht nicht immer, ob er selbst handeln kann.** Bei Ready, Draft, Week-Status und Admin-Warten braucht die UI noch klarere "du bist fertig / warte auf X"-Sprache.
7. **Admin-Dialoge sind unpoliert.** Native `confirm`/`prompt` fuer kritische Aktionen sind funktional, aber nicht produktsicher.
8. **Online Dashboard ist ein langer Single-Screen.** Hash-Anker ersetzen echte Unterseiten fuer Roster, Depth Chart, League und Week.
9. **Fehlerstates fuehren oft zu Retry.** Bei fehlender Membership/Team-Verbindung ist Retry allein selten die echte Reparatur.
10. **Live-Produktabnahme ist nicht vollstaendig.** Admin-UI Browser-Smoke mit echtem Admin-Token war zuletzt offen.

## Minimalversion fuer spielbaren MVP

Ein stabiler MVP sollte genau diese aktiven Spielerbereiche garantieren:

- Savegames Hub mit eindeutigem Login-Status
- Online Hub mit `Weiterspielen` und `Liga suchen`
- Rejoin fuer bestehende Membership ohne Team-Verlust
- Online Dashboard mit Team, Week, Ready, Results, Standings
- Draft nur ueber explizite Route
- Roster und Depth Chart mindestens lesbar
- Nicht-MVP-Menues als Coming Soon
- Admin kann Woche sicher simulieren
- Reload funktioniert auf Dashboard, Draft und Admin Detail

Nicht zwingend fuer MVP:

- Online Contracts/Cap
- Online Development
- Online Trade Board
- Online Inbox
- Online Finance
- Vollstaendige Admin-Produktpolitur

## Empfehlung

1. Den Returning-/Continue-Flow als naechstes priorisieren.
2. Online Join fuer Testliga vereinfachen oder klarer staffeln.
3. Admin `Woche abschliessen` sprachlich/fachlich entschlacken.
4. Spieler-Dashboard noch staerker auf "naechste Aktion" reduzieren.
5. Admin-UI-Live-Smoke als Release-Gate behandeln.
