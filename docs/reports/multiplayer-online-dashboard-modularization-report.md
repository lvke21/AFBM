# Multiplayer Online Dashboard Modularization Report

## Summary

Das Online-Dashboard wurde risikoarm in kleinere, überwiegend stateless View-Komponenten zerlegt. Der MVP-Flow bleibt unverändert: Firebase-MVP zeigt weiterhin nur synchronisierte Kernaktionen, lokale/Legacy-Aktionen bleiben hinter dem bestehenden Local-/Expert-Mode-Gate.

## Neue Komponenten

| Komponente | Datei | Verantwortung |
| --- | --- | --- |
| `LeagueHeader` | `src/components/online/online-league-dashboard-panels.tsx` | Liga-Titel, Status-Badges, Zurück-Link, User-Ready-Badge |
| `LeagueStatusPanel` | `src/components/online/online-league-dashboard-panels.tsx` | nächste Partie, Waiting- und Ready-Fortschritt |
| `TeamOverviewCard` | `src/components/online/online-league-dashboard-panels.tsx` | eigenes Team, Coach, lokale Owner-/Media-Details im Expert Mode |
| `DraftStatusPanel` | `src/components/online/online-league-dashboard-panels.tsx` | Gate zum bestehenden Fantasy-Draft-Room, nur bei aktivem/nicht abgeschlossenem Draft |
| `ReadyStatePanel` | `src/components/online/online-league-dashboard-panels.tsx` | Action-Feedback, All-Ready-Hinweis, Ready-CTA |
| `WeekResultPanel` | `src/components/online/online-league-dashboard-panels.tsx` | gespeicherte letzte Ergebnisse |
| `AdminControlsPanel` | `src/components/online/online-league-dashboard-panels.tsx` | im Player-Dashboard bewusst leer, Admin bleibt im Adminbereich |
| `PlayerActionsPanel` | `src/components/online/online-league-dashboard-panels.tsx` | Command Center, Kader, Standings, Depth Chart, letzte Ergebnisse |
| `ErrorState` | `src/components/online/online-league-dashboard-panels.tsx` | Recovery-/Retry-State |
| `LoadingState` | `src/components/online/online-league-dashboard-panels.tsx` | Ladezustand |

## Button-/Sync-Matrix

| Aktion | Screen | Sichtbarkeit | Synchronisiert | Entscheidung |
| --- | --- | --- | --- | --- |
| Ready setzen/zurücknehmen | Online-Dashboard | sichtbar | Firebase: ja, Local: ja | behalten |
| Fantasy-Draft-Pick | Draft Room | sichtbar bei aktivem Draft | Firebase/Repository: ja | behalten |
| Liga erneut laden | Error/Recovery | sichtbar im Fehlerfall | lädt Repository-State neu | behalten |
| Vakantes Team übernehmen | TeamOverview | nur Local, nicht Firebase | nur lokal | in Firebase ausgeblendet |
| Media-Ziel setzen | TeamOverview Expert | nur Local Expert | nur lokal | in Firebase ausgeblendet |
| Training speichern | Training Expert/Local | Firebase nur lesbar | Local-only Mutation | Firebase deaktiviert/ersetzt durch Lesestatus |
| Franchise/Preise/Contracts/Trades/Legacy-Draft/Coaches | Expert Sections | nur Local Expert | nur lokal | in Firebase ausgeblendet |
| Admin-Steuerung | Adminbereich | nicht im Player-Dashboard | serverseitig im Adminbereich | Player-Dashboard blendet aus |

## Tests

- Rendering vorhandener Zustände: `online-league-dashboard-panels.test.tsx`
- Draft aktiv: `DraftStatusPanel` rendert Draft Room
- Draft abgeschlossen: `DraftStatusPanel` rendert nichts und lässt Dashboard weiterlaufen
- Week Ready: `ReadyStatePanel` rendert Ready-Feedback
- Week simuliert: `WeekResultPanel` rendert gespeicherte Ergebnisse
- Admin vs. Spieler: `AdminControlsPanel` bleibt im Player-Dashboard leer
- Reload-State: `LoadingState` und `ErrorState` sind separat renderbar

## Risiko

Niedrig. Die Business-Logik bleibt in `online-league-placeholder.tsx`, bestehenden Model-Dateien und Services. Verschoben wurde nur Markup für MVP-nahe View-Sektionen. Die großen Local-Expert-Sektionen sind bewusst nicht weiter zerlegt worden, um den Firebase-MVP nicht unnötig zu berühren.

## Status

Grün.
