# UI Inventory

Stand: 2026-05-02

## Ziel der Analyse

Vollstaendige statische Bestandsaufnahme der sichtbaren UI des Projekts: Screens, Menues, Buttons, Forms, Tabellen, Karten, Loading-/Empty-/Error-States und bekannte unfertige Bereiche.

## Methode

Untersuchte Bereiche:

- `src/app/**/*.tsx`
- `src/components/**/*.tsx`
- Fokus-Dateien: Savegames, Online Hub, Multiplayer Dashboard, Sidebar, Admin Control Center, Admin League Detail, Roster, Depth Chart, Draft, Match/Week Flow.

Ausgefuehrte statische Suchen:

```bash
find src/app -type f -name 'page.tsx'
find src/components -type f -name '*.tsx'
rg -n "<button|<Button|<Link|<a\\s|<form|<input|<select|<textarea|role=\"dialog\"|window\\.confirm|window\\.prompt" src/app src/components --glob '*.tsx'
rg -n "Coming Soon|Nicht Teil|MVP|noch nicht|nicht verfügbar|deaktiviert|Placeholder|TODO|Dummy" src/app src/components --glob '*.tsx' --glob '*.ts'
```

Hinweis: Dies ist ein statischer UI-Audit. Console Errors, Reload-Verhalten und echte Browserzustande wurden aus Codepfaden abgeleitet, nicht live per Playwright verifiziert.

## Quantitatives Inventar

| Metrik | Wert |
|---|---:|
| `page.tsx` Screens | 50 |
| TSX-Komponenten unter `src/components` | 139 |
| Dateien mit interaktiven UI-Elementen | 76 |
| Dateien mit Forms/Inputs/Selects/Textareas | 31 |
| Native/Browser Confirm/Prompt Stellen | 18 |
| Custom Dialogs mit `role="dialog"` | 2 |

## Hauptbereiche

| Bereich | Primaere Dateien | UI-Status | Bewertung |
|---|---|---|---|
| Savegames Einstieg | `src/app/app/savegames/page.tsx`, `src/components/savegames/*`, `src/components/ui/create-savegame-form.tsx` | Funktional mit Auth-/Empty-/Loading-/Error-States | OK |
| Auth Panel | `src/components/auth/firebase-email-auth-panel.tsx`, `firebase-auth-provider.tsx` | Login, Register, Logout, Loading, Debug bei Fehler | OK, Debug sichtbar bei Fehler |
| Online Hub | `src/app/online/page.tsx`, `online-continue-button.tsx`, `online-league-search.tsx` | Weiterspielen, Liga suchen, Team-Identitaet, Join/Rejoin | OK, mit Risiko bei komplexem Join-State |
| Multiplayer Dashboard | `online-league-placeholder.tsx`, `online-league-dashboard-panels.tsx`, `online-league-overview-sections.tsx` | Dashboard, Ready, Results, Standings, Roster/Team Anchors | OK fuer MVP, grosse Komponente |
| Multiplayer Coming Soon | `online-league-coming-soon-page.tsx`, `online-league-coming-soon-model.ts` | Nicht-MVP Punkte sauber erklaert | OK |
| Multiplayer Draft | `online-league-draft-page.tsx`, `online-fantasy-draft-room.tsx` | Draft-Seite separat, Load/Error-Handling | OK, fachlich komplex |
| Sidebar | `sidebar-navigation.tsx`, `navigation-model.ts` | Kontextabhaengige Links/Disabled States | OK, Hash-Aktivzustand riskant |
| Admin Hub | `admin-control-center.tsx`, `admin-league-manager.tsx` | Liga verwalten, erstellen, Debug, Week Actions | Teilweise OK, viele kritische Browser-Confirms |
| Admin League Detail | `admin-league-detail.tsx`, `admin-league-detail-display.tsx` | Detaildaten, Week Simulation, Draft/Admin Actions | Funktional, aber hohes Sicherheits-/UX-Risiko |
| Offline Dashboard | `src/app/app/savegames/[savegameId]/page.tsx`, Dashboard-Komponenten | Week Loop, Quick Actions, Panels | OK, viele Server Action Forms |
| Roster | `roster-table.tsx`, `player-card.tsx`, `roster-action-menu.tsx` | Filter, Tabelle/Karten, Quick Info, Aktionen | OK |
| Depth Chart | `depth-chart-view.tsx`, `depth-chart-model.ts` | Lineup Board, Quick Assignment, Move Forms | OK, sehr viele Inline-Forms |
| Finance/Contracts | `finance-*`, `contract-table.tsx` | Offline teilweise funktional, Multiplayer Coming Soon | Teilweise |
| Development | `development/page.tsx`, `development/*`, `player-development-*` | Offline teilweise funktional, einzelne Coming-Soon-Unterseiten | Teilweise |
| Trade Board | `trade-board.tsx`, `trade-offer-center.tsx` | Offline UI vorhanden, Multiplayer Coming Soon | Teilweise |
| Inbox | `inbox-*` | Offline Task Controls, Multiplayer Coming Soon | Teilweise |
| Match/Week Flow | `match/*`, `season/*`, dashboard week panels | Setup, Live, Report, Simulation Progress | OK, komplex |

## Vollstaendiges Screen-Inventar nach Route-Gruppe

### Einstieg und App Shell

| Screen | Datei | Zustand | Bemerkung |
|---|---|---|---|
| Root Landing | `src/app/page.tsx` | OK | Link in App/Saves |
| App Home | `src/app/app/page.tsx` | OK | Einstieg zu Savegames |
| Savegames | `src/app/app/savegames/page.tsx` | OK | Zentraler Hub |
| App Layout | `src/app/app/layout.tsx` | OK | Shell Provider |

### Admin

| Screen | Datei | Zustand | Bemerkung |
|---|---|---|---|
| Admin Control Center | `src/app/admin/page.tsx` | OK/Teilweise | Schaltet auf `AdminControlCenter` hinter Auth Gate |
| Admin League Detail | `src/app/admin/league/[leagueId]/page.tsx` | OK/Teilweise | Viele mutierende Actions |

### Online / Multiplayer

| Screen | Datei | Zustand | Bemerkung |
|---|---|---|---|
| Online Hub | `src/app/online/page.tsx` | OK | Auth Gate, Continue, Search |
| Online League Dashboard | `src/app/online/league/[leagueId]/page.tsx` | OK | Dashboard/Anchors |
| Online League Draft | `src/app/online/league/[leagueId]/draft/page.tsx` | OK | Explizite Draft Route |
| Online Coming Soon | `src/app/online/league/[leagueId]/coming-soon/[feature]/page.tsx` | OK | Bewusst deaktivierte Features |
| Online Fallback Section | `src/app/online/league/[leagueId]/[...section]/page.tsx` | OK | Lenkt unbekannte/alte Sektionen sauber |

### Offline Savegame

| Gruppe | Dateien | Zustand |
|---|---|---|
| Dashboard | `src/app/app/savegames/[saveGameId]/page.tsx` | OK |
| Team | `team/page.tsx`, `team/roster/page.tsx`, `team/depth-chart/page.tsx`, `team/contracts/page.tsx`, `team/gameplan/page.tsx`, `team/schemes/page.tsx`, `team/trades/page.tsx`, `team/chemistry/page.tsx`, `team/x-factor/page.tsx` | OK/Teilweise |
| League | `league/page.tsx`, `league/schedule/page.tsx`, `league/teams/page.tsx`, `league/history/page.tsx`, `seasons/[seasonId]/page.tsx` | OK |
| Match | `game/setup/page.tsx`, `game/live/page.tsx`, `game/report/page.tsx`, `matches/[matchId]/page.tsx`, `matches/[matchId]/center/page.tsx` | OK |
| Draft | `draft/page.tsx`, `draft/loading.tsx`, `draft/error.tsx` | OK/MVP begrenzt |
| Finance | `finance/page.tsx`, `finance/contracts/page.tsx`, `finance/events/page.tsx`, `finance/free-agency/page.tsx`, `finance/trades/page.tsx` | Teilweise, Trade Center Coming Soon |
| Development | `development/page.tsx`, `development/scouting/page.tsx`, `development/staff/page.tsx`, `development/training/page.tsx` | Teilweise, Staff/Training Coming Soon |
| Inbox | `inbox/page.tsx` | OK |
| Players/Teams | `players/[playerId]/page.tsx`, `teams/[teamId]/*` | OK |
| Not Found | `not-found.tsx` | OK |

## Top 10 UI-Risiken

1. `online-league-placeholder.tsx` bleibt mit 1.766 Zeilen eine grosse Client-Komponente mit vielen States und Action-Pfaden.
2. `admin-league-detail.tsx` hat sehr viele mutierende Actions plus `window.confirm`/`window.prompt`; Bedienfehler sind moeglich.
3. Admin Hub und Admin Detail nutzen teils native Browser-Dialogs statt klarer, kontextreicher Modals.
4. Multiplayer Dashboard nutzt Hash-Anker (`#team`, `#roster`, `#depth-chart`, `#league`, `#week-loop`) als Navigation; Reload/Active-State ist empfindlicher als echte Routen.
5. Einige Offline-Unterseiten sind bewusst Coming Soon, aber koennen neben funktionalen Nachbarseiten unfertig wirken.
6. Online Advanced Local Actions existieren in Code, werden in Firebase-MVP aber blockiert; im falschen Modus kann die UI viel mehr anzeigen als wirklich synchronisiert ist.
7. Roster und Depth Chart enthalten grosse Tabellen/Inline-Forms; mobile Bedienbarkeit ist vorhanden, aber visuell dicht.
8. Savegame "Offline Spielen" ist bei deaktivierter Offline-Erstellung sichtbar, aber der Button wirkt trotz Erklaerung wie eine primaere Aktion.
9. Auth Debug Panel zeigt technische Fehlerdetails im UI; hilfreich fuer Staging, aber Produkt-UX hart.
10. Viele UI-Aktionen sind server-action- oder Firebase-abhaengig; bei Auth/Permission-Fehlern gibt es meist Feedback, aber nicht immer denselben Recovery-Pfad.

## Status

Vollstaendig fuer statische UI-Analyse. Nicht vollstaendig fuer live Browser-/Console-/Responsive-Verifikation.
