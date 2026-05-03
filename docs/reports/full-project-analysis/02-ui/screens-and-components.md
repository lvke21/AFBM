# Screens And Components

Stand: 2026-05-02

## Ziel der Analyse

Dokumentation der sichtbaren Screens, Hauptkomponenten, Cards, Tabellen und Zustandsanzeigen. Fokus: Welche UI existiert, welche Daten braucht sie, und wo ist sie funktional oder bewusst begrenzt?

## Screen Matrix

| Screen | Datei | Hauptkomponenten | Datenquelle | Loading | Empty | Error | Bewertung |
|---|---|---|---|---|---|---|---|
| Savegames Hub | `src/app/app/savegames/page.tsx` | `FirebaseEmailAuthPanel`, `CreateSaveGameForm`, `SavegamesOnlineLink`, `SavegamesAdminLink`, `SavegamesListSection` | Auth, Savegame API | Ja | Ja | Ja | OK |
| Savegames Liste | `savegames-list-section.tsx` | Franchise Cards, Details Panel | `/api/savegames` | Ja | Ja | Ja | OK |
| Auth Panel | `firebase-email-auth-panel.tsx` | Login/Register Form, Logout, Debug Panel | Firebase Auth | Ja | n/a | Ja | OK |
| Online Hub | `src/app/online/page.tsx` | `OnlineContinueButton`, `OnlineLeagueSearch`, `OnlineModeStatus`, `OnlineUserStatus` | Online Repository/Firebase | Ja | Ja | Ja | OK |
| Online League Search | `online-league-search.tsx` | League Cards, Team Identity Form | Available Leagues Subscription | Ja | Ja | Ja | OK |
| Online Dashboard | `online-league-placeholder.tsx` | Header, Ready, Rules, Week Flow, Team, Roster, Status | `useOnlineLeagueRouteState` | Ja | Ja | Ja | OK/MVP |
| Online Coming Soon | `online-league-coming-soon-page.tsx` | Coming Soon Card, Dashboard/Week Links | Route State | Ja | n/a | Ja | OK |
| Online Draft | `online-league-draft-page.tsx`, `online-fantasy-draft-room.tsx` | Draft Board, filters | Online League Route State | Ja | Teilweise | Ja | OK |
| Admin Hub | `admin-control-center.tsx` | Overview, Action Buttons, Debug, `AdminLeagueManager` | Admin API/Online Repository | Ja | Ja | Ja | Teilweise |
| Admin League Manager | `admin-league-manager.tsx` | Create Form, League Cards, Debug Tools | Admin API | Ja | Ja | Ja | OK |
| Admin League Detail | `admin-league-detail.tsx` | League Summary, Week Games, Results, GM Rows, Debug/Actions | Admin API | Ja | Ja | Ja | OK/Riskant |
| Offline Dashboard | `src/app/app/savegames/[saveGameId]/page.tsx` | Dashboard Panels, Week Loop, Quick Actions | Server Data | n/a | Ja | Route-level | OK |
| Roster | `roster-table.tsx` | Filters, responsive cards/table, Quick Info | Team Players | n/a | Ja | via page | OK |
| Depth Chart | `depth-chart-view.tsx` | Lineup Board, Slot Cards, Assignment Forms | Team Players | n/a | Ja | via page | OK |
| Contracts | `contract-table.tsx`, `finance-contracts-workspace.tsx` | Contract Forms, Cap Cards | Team Contracts | n/a | Ja | via page | OK/Teilweise |
| Free Agency | `free-agent-board.tsx`, `offer-builder.tsx` | Offer Form, Confirm Dialog | Free Agents | n/a | Ja | via action | OK |
| Trade Board | `trade-board.tsx`, `trade-offer-center.tsx` | Trade Forms, select inputs | Trade Model | n/a | Ja | via action | Teilweise |
| Inbox | `inbox-list.tsx`, `inbox-task-controls.tsx` | Filters, Task Controls | Inbox Model + Actions | n/a | Ja | Ja | OK |
| Match Setup | `game-preparation-panel.tsx`, `start-match-action-area.tsx` | Strategy Selects, Start Form | Match Data | n/a | Ja | via page | OK |
| Live Match | `live-simulation-flow.tsx`, `live-control-panel.tsx` | Playback Controls, Finish Form | Simulation State | n/a | Ja | via page | OK |
| Match Report | `post-game-*`, `match-report-*` | Score, Causality, Next Steps | Match Result | n/a | Ja | via page | OK |
| Draft Offline | `draft-overview-screen.tsx`, `draft-scouting-board.tsx` | Filters, Prospect Cards, Dialog | Draft Data | Route loading | Ja | Route error | MVP begrenzt |

## Hauptkomponenten nach Verantwortlichkeit

### Shell und Navigation

| Komponente | Datei | Aufgabe | Risiko |
|---|---|---|---|
| `AppShell` | `src/components/layout/app-shell.tsx` | Hauptlayout mit Sidebar | Niedrig |
| `SidebarNavigation` | `src/components/layout/sidebar-navigation.tsx` | Kontextabhaengige Navigation | Mittel wegen Hash/Disabled-State |
| `buildNavigationItems` | `src/components/layout/navigation-model.ts` | Link-/Disabled-Logik | Mittel |
| `TopBar`, `Breadcrumbs` | `src/components/layout/*` | Orientierung | Niedrig |

### Savegames/Auth

| Komponente | Aufgabe | Bewertung |
|---|---|---|
| `CreateSaveGameForm` | Offline Savegame erstellen, clientseitige Validierung | OK, Offline kann bewusst deaktiviert sein |
| `SavegamesListSection` | Savegames laden/anzeigen/fortsetzen/details/loeschen | OK |
| `SavegamesOnlineLink` | Online CTA mit Auth-Gate | OK |
| `SavegamesAdminLink` | Admin CTA mit Admin-Gate | OK |
| `FirebaseEmailAuthPanel` | Login/Register/Logout/Auth Status | OK |

### Online/Multiplayer

| Komponente | Aufgabe | Bewertung |
|---|---|---|
| `OnlineContinueButton` | Last League laden und validieren | OK |
| `OnlineLeagueSearch` | Ligen suchen, Teamidentitaet waehlen, Join/Rejoin | OK, komplex |
| `OnlineLeaguePlaceholder` | Hauptdashboard | OK fuer MVP, zu gross |
| `OnlineLeagueOverviewSections` | Header/Ready/Rules/Week Flow | OK |
| `OnlineLeagueDashboardPanels` | Team/Status/Player Panels | OK |
| `OnlineLeagueComingSoonPage` | Nicht-MVP Features erklaeren | OK |
| `OnlineFantasyDraftRoom` | Draft UI | OK, memoization-/state-sensibel |

### Admin

| Komponente | Aufgabe | Bewertung |
|---|---|---|
| `AdminAuthGate` | Admin Zugriff ueber Claim/Allowlist | OK |
| `AdminControlCenter` | Admin Dashboard und Top Actions | OK/Teilweise |
| `AdminLeagueManager` | Create/List/Select/Open/Debug | OK |
| `AdminLeagueDetail` | Kernaktionen pro Liga | Funktional, riskant wegen Breite |
| `AdminFeedbackBanner` | Feedback | OK |

### Tabellen und Cards

| Element | Datei | Zustand |
|---|---|---|
| Roster Tabelle/Card Switch | `roster-table.tsx` | Desktop Tabelle, Mobile Cards; OK |
| Depth Chart Cards | `depth-chart-view.tsx` | Viele Forms, aber funktional |
| Standings Tabelle | `standings-table.tsx` | OK |
| Schedule Liste | `schedule-list.tsx` | OK |
| Admin League Cards | `admin-league-manager.tsx` | OK |
| Online League Cards | `online-league-search.tsx` | OK |
| Dashboard Stat Cards | `stat-card.tsx`, Dashboard Panels | OK |

## Responsive Verhalten

Statische Indizien:

- Viele Bereiche nutzen `grid`, `sm:`, `md:`, `lg:`, `xl:` Breakpoints.
- Roster wechselt explizit von Karten (`xl:hidden`) zu Tabelle (`hidden xl:block`).
- Admin Action Grids nutzen `sm:grid-cols-*` und `lg:min-w`.
- Online Search nutzt mobile-first Grid-Layouts.

Risiko:

- Sehr breite Admin-Aktionsbereiche (`lg:min-w-[420px]`) koennen auf mittleren Viewports eng wirken.
- Roster/Depth Chart sind trotz responsiver Struktur informationsdicht.
- Native Browser Dialoge sind responsive, aber nicht gestalterisch konsistent.

## Ergebnis

Die UI ist fuer die Kernflows weitgehend verdrahtet. Die groessten Probleme sind nicht 404s oder tote Buttons, sondern Breite, viele gemischte Verantwortlichkeiten und die Abgrenzung von MVP vs. nicht-MVP.
