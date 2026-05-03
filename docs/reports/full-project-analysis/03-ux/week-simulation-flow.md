# Week Simulation Flow

Stand: 2026-05-02

## Ziel des Users

GM-Ziel: Woche vorbereiten, Ready setzen, danach Ergebnisse und Standings sehen.  
Admin-Ziel: Ready-/Schedule-State pruefen, eine Woche serverseitig simulieren, konsistente Ergebnisse speichern.

## Flow-Diagramm GM

```text
Online Dashboard
  -> Week Flow ansehen
  -> Roster / Depth Chart pruefen
  -> Bereit fuer Week X setzen
  -> Status: Du bist bereit
  -> warten auf andere aktive GMs / Admin
  -> Admin simuliert Woche
  -> Reload / Live Subscription
  -> Results + Standings + Week X+1 sehen
```

## Flow-Diagramm Admin

```text
Admin Control Center
  -> Liga auswaehlen
  -> Safety Check:
       status active?
       draft completed?
       currentWeek games vorhanden?
       aktive GMs ready?
       keine Simulation laeuft?
  -> Woche simulieren
  -> Confirm
  -> Admin API simulateWeek
  -> serverseitige Simulation + Writes
  -> Results, Standings, currentWeek update
  -> UI neu laden / Ergebnis anzeigen
```

## Notwendige Schritte

1. Draft abgeschlossen oder nicht aktiv blockierend.
2. Liga aktiv.
3. Schedule/Games fuer aktuelle Woche vorhanden.
4. Teams und Roster vorhanden.
5. Aktive GMs ready.
6. Admin startet Simulation.
7. Simulation schreibt Ergebnisse und Records.
8. `currentWeek` steigt nur nach Erfolg.

## Tatsaechliche Implementierung

| Element | Implementierung | Bewertung |
|---|---|---|
| Ready Button | `OnlineLeagueFirstSteps`, `handleReadyForWeek`, Repository `setUserReady` | OK |
| Ready Disabled | blockt fehlendes Team, Draft active, simulating, completed | OK |
| Ready Progress | `getOnlineLeagueWeekReadyState`, Label "aktive GMs" | OK |
| Week Flow Panel | `OnlineLeagueWeekFlowSection` | OK, als Spielerstatus |
| Admin Safety Check | `AdminHubOverview` | OK |
| Admin API | `/admin/api/online/actions`, `simulateWeek` | OK |
| Simulation Lock | Week-Simulation Services | Technisch abgesichert laut Tests |
| Results | `matchResults`, `recentResults` sortiert | OK |
| Standings | bevorzugt persistierte `league.standings`, Fallback aus Results | OK |
| Reload | Route-State Subscription/Reload konzeptionell vorhanden | OK, live weiter pruefen |

## Bruchstellen

| Bruchstelle | UX-Auswirkung | Schwere |
|---|---|---|
| Admin-UI Live-Smoke offen | Release-Vertrauen bleibt Gelb | Hoch |
| `Woche simulieren` vs. `Woche abschliessen` | Admin kann Semantik falsch verstehen | Hoch |
| Spieler sieht Admin-Warten | Unklar, ob User noch etwas tun kann | Mittel |
| Keine Schedule/Games | Admin Button disabled/Fehler; Spieler braucht klare Erklaerung | Mittel |
| Week already simulated | Retry darf nicht doppelt zaehlen | Hoch, technisch getestet |
| Results nur Top/Ausschnitt | Spieler kann volle Liga-Historie vermissen | Niedrig/Mittel |

## Unklare States

- `ready`, `simulating`, `completed`, `pre_week` brauchen fuer Spieler andere Texte als fuer Admins.
- "Alle aktiven GMs ready" bedeutet nicht "alle 8 Teams", sondern menschliche/aktive Memberships.
- Nach Simulation ist der User nicht automatisch ready fuer die neue Woche; das muss klar bleiben.

## Blockierende Bugs

Statisch aktuell kein blockierender Week-Flow-Bug sichtbar. Nicht abgeschlossen:

- Echte Admin-UI-Bedienung mit Staging Admin Token.
- Voller Week-2-Live-Loop nach Reload.

## Verbesserungsvorschlaege

1. Admin Button `Woche abschliessen` entfernen oder als "Simulation startet und schliesst die Woche ab" zusammenfassen.
2. Spielerstatus mit klarer naechster Aktion:
   - "Du bist nicht bereit: Button klicken"
   - "Du bist bereit: warte auf Admin"
   - "Simulation laeuft: keine Aktion moeglich"
   - "Woche abgeschlossen: Ergebnisse ansehen"
3. Results/Standings um volle Ansichten erweitern oder "Top 4" explizit labeln.
4. Admin Detail nach Simulation automatisch auf Results/Standings scrollen.

## Minimale Version fuer spielbaren MVP

```text
GM:
  Ready setzen
  -> Status zeigt "Du bist fertig fuer Week X"
  -> Nach Admin Simulation Results + Standings sehen

Admin:
  Safety Check gruen
  -> "Woche simulieren und abschliessen"
  -> Ergebnisliste + Standings
  -> Reload bestaetigt Daten
```
