# GUI Functionality Inventory

Stand: 2026-05-01

## Ziel und Scope

Dieser Bericht inventarisiert sichtbare und vorbereitete UI-Elemente des AFBM Managers:
Buttons, Navigationseinträge, Inputs, Selects, Formulare, Cards und vorbereitete Action-Bereiche.

Scope:
- Singleplayer/Offline Hub, Savegames und Franchise Dashboard
- Spielablauf, Roster, Depth Chart, Contracts/Cap, Development, Team Overview, Trade Board, Inbox, Finance, League, Draft
- Online Spielen / Multiplayer Hub und Online-Liga
- Adminmodus und Admin-Ligadetailseite

Nicht durchgeführt:
- keine Game-Logik geändert
- keine Firestore-Daten verändert
- keine große Refactoring-Arbeit

Kleiner sicherer Fix:
- Online-Sidebar verlinkt nicht mehr auf eine nicht vorhandene Development-Route.
- Online-Anker `#week-loop` und `#league` existieren jetzt passend zu den Sidebar-Links.

## Geänderte Dateien

- `docs/reports/gui-functionality-inventory.md`
- `src/components/layout/navigation-model.ts`
- `src/components/online/online-league-dashboard-panels.tsx`
- `src/components/online/online-league-overview-sections.tsx`

## Such- und Prüfbasis

Geprüfte Hauptquellen:
- `src/app/page.tsx`
- `src/app/app/page.tsx`
- `src/app/app/savegames/page.tsx`
- `src/app/app/savegames/[savegameId]/page.tsx`
- `src/app/app/savegames/[savegameId]/team/*`
- `src/app/app/savegames/[savegameId]/finance/*`
- `src/app/app/savegames/[savegameId]/development/*`
- `src/app/app/savegames/[savegameId]/draft/page.tsx`
- `src/app/app/savegames/[savegameId]/inbox/page.tsx`
- `src/app/app/savegames/[savegameId]/seasons/[seasonId]/page.tsx`
- `src/app/online/page.tsx`
- `src/app/online/league/[leagueId]/page.tsx`
- `src/app/online/league/[leagueId]/draft/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/league/[leagueId]/page.tsx`
- `src/components/layout/*`
- `src/components/admin/*`
- `src/components/online/*`

Rough UI marker count:
- `rg "<button|<Link|<a |<input|<select|<textarea|FormSubmitButton|aria-disabled|disabled" src/app src/components`: 557 Treffer.

## Globale Navigation / App Shell

Dateien:
- `src/components/layout/navigation-model.ts`
- `src/components/layout/sidebar-navigation.tsx`
- `src/components/layout/top-bar.tsx`
- `src/components/layout/app-shell.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Sidebar `Dashboard` | funktioniert | Link zum Savegame-Dashboard oder `/app` | OK |
| Sidebar `Spielablauf` | funktioniert | Offline: Game Setup/Match Flow; Online: `#week-loop` | OK nach Fix, Online-Anker existiert |
| Sidebar `Roster` | funktioniert/disabled | Offline: Team-Roster; Online: `#roster` nur bei fertigem Roster | OK |
| Sidebar `Depth Chart` | funktioniert/disabled | Offline: Team-Depth-Chart; Online: `#depth-chart` nur bei fertigem Roster | OK |
| Sidebar `Contracts/Cap` | funktioniert/disabled | Offline aktiv; Online bewusst deaktiviert | OK |
| Sidebar `Development` | funktioniert/disabled | Offline aktiv; Online bewusst deaktiviert | Fix: Online führt nicht mehr auf 404 |
| Sidebar `Team Overview` | funktioniert/disabled | Offline Teamseite; Online `#team` bei fertigem Roster | OK |
| Sidebar `Trade Board` | funktioniert/disabled | Offline Team-Trades; Online bewusst deaktiviert | OK |
| Sidebar `Inbox` | funktioniert | Link zur persistenten Inbox | OK |
| Sidebar `Finance` | funktioniert/disabled | Offline Finance; Online bewusst deaktiviert | OK |
| Sidebar `League` | funktioniert/disabled | Offline League; Online `#league` | OK nach Fix, Online-Anker existiert |
| Sidebar `Draft` | funktioniert | Offline Draftseite; Online `/draft` | OK |
| Sidebar `Savegames` | funktioniert | Link zum Savegame Hub | OK |
| Topbar `AFBM Manager` | funktioniert | Link `/app` | OK |
| Topbar Cards `GM Team`, `Liga` | Anzeige | Kontextstatus | OK |

Hinweis: Disabled Sidebar Items sind als `<span>` mit `title={disabledReason}` umgesetzt. Sichtbar ist der Grund primär per Hover/Browser-Tooltip, nicht als Inline-Text.

## Savegames / Start Hub

Dateien:
- `src/app/app/savegames/page.tsx`
- `src/components/ui/create-savegame-form.tsx`
- `src/components/savegames/savegames-list-section.tsx`
- `src/components/savegames/savegames-online-link.tsx`
- `src/components/auth/firebase-email-auth-panel.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| `Dynasty-Name` Input | funktioniert/disabled | Pflichtfeld, 3-60 Zeichen, Savegame-Erstellung | OK |
| `User-Team` Dropdown | funktioniert/disabled | Teamtemplate wählen | OK |
| `Offline Spielen` Button | funktioniert/disabled | Auth-Gate oder Server Action `createSaveGameAction` | OK |
| Offline Disabled Reason | funktioniert | Firebase/Login oder Backend-Availability erklären | OK |
| Firebase Login `Email` Input | funktioniert | Login/Register | OK |
| Firebase Login `Passwort` Input | funktioniert | Login/Register | OK |
| Firebase Register `Anzeigename` Input | funktioniert | Nur im Register-Modus | OK |
| `Registrieren` / `Zum Login` | funktioniert | Auth-Modus wechseln | OK |
| `Einloggen` / `Account erstellen` | funktioniert/disabled | Firebase Auth Action | OK |
| `Logout` | funktioniert | Firebase Sign-out | OK |
| `Online Spielen` Card | funktioniert/disabled | Authenticated: Link `/online`; anonymous: Login scroll/focus | OK |
| `Adminmodus` Card | funktioniert | Link `/admin` | OK |
| Savegame Cards | funktioniert | Link `/app/savegames/[id]` | OK |
| Empty/Loading/Error States | funktioniert | Savegame-Liste erklärt Zustand | OK |

## Franchise Dashboard

Dateien:
- `src/app/app/savegames/[savegameId]/page.tsx`
- `src/components/dashboard/*`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Next Best Action Primary | funktioniert | Link, Anchor oder Server Action je Week-State | OK |
| `Woche vorbereiten` | funktioniert | `prepareWeekAction` mit Balanced Defaults | OK |
| `Naechste Woche` | funktioniert | `advanceWeekAction` | OK |
| Quick Action `Week Flow` | funktioniert | Anchor `#week-loop` | OK |
| Quick Action `Game Preview` | funktioniert/disabled | Match Flow, erst nach Vorbereitung | OK |
| Quick Action `Roster` | funktioniert/disabled | Team öffnen | OK |
| Quick Action `League` | funktioniert/disabled | Saison/Liga öffnen | OK |
| Quick Action `Roster Value` | funktioniert/disabled | Free Agency | OK |
| Week Loop Radio `Recovery/Balanced/Intense` | funktioniert | Wochenplan-Intensity | OK |
| Week Loop Radio `Opponent Balanced/Offense/Defense` | funktioniert | Gegnerfokus | OK |
| Development Focus Checkboxes | funktioniert | Spielerfokus für Wochenvorbereitung | OK |
| Match Card | funktioniert/disabled by data | Link zu Match Flow, falls Match vorhanden | OK |
| Team Snapshot / Team Needs Links | funktioniert | Team, Spieler, Free Agency | OK |

## Spielablauf / Match Flow

Dateien:
- `src/app/app/savegames/[savegameId]/game/*`
- `src/app/app/savegames/[savegameId]/matches/[matchId]/*`
- `src/components/match/*`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Game Flow Navigation | funktioniert/disabled | Setup, Live, Report je Match-Phase | OK |
| `Match starten` / Start Action | funktioniert/disabled | Start nur bei gültigem Week-/Lineup-State | OK |
| `Depth Chart oeffnen` | funktioniert | Lineup-Konflikt führt zur Depth Chart | OK |
| Live Control / Simulation UI | funktioniert | vorhandene Simulation-Routes nutzen | OK laut vorhandener Implementierung |
| Report Links / Dashboard Rücksprung | funktioniert | Auswertung und Rücknavigation | OK |

## Team Overview

Dateien:
- `src/app/app/savegames/[savegameId]/team/page.tsx`
- `src/components/team/team-section-navigation.tsx`
- `src/components/team/team-card.tsx`
- `src/components/team/team-needs-panel.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Team Section Navigation | funktioniert | Overview, Roster, Depth Chart, Contracts, Trade Board, Chemistry, X-Factor, Schemes, Gameplan | OK |
| Cards `Kader verwalten`, `Depth Chart steuern`, `Finanzen steuern`, `Vertraege pruefen`, `Trade Board vorbereiten`, `Chemistry`, `X-Factor`, `Identity setzen`, `Strategie planen` | funktioniert | Links in bestehende Team-/Finance-Routen | OK |
| Team Needs Free Agency Link | funktioniert/disabled | Managerteam kann Free Agency öffnen | OK |

## Roster

Dateien:
- `src/app/app/savegames/[savegameId]/team/roster/page.tsx`
- `src/components/team/roster-table.tsx`
- `src/components/team/roster-action-menu.tsx`
- `src/components/team/player-card.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Filter `Position` | funktioniert | Clientseitig filtern | OK |
| Filter `Rating` | funktioniert | Clientseitig filtern | OK |
| Filter `Rolle` | funktioniert | Clientseitig filtern | OK |
| Filter `Status` | funktioniert | Clientseitig filtern | OK |
| Select `Sortierung` | funktioniert | Clientseitig sortieren | OK |
| `Quick Info` | funktioniert | Auswahl im Sidepanel | OK |
| `Profil` / `Profil oeffnen` | funktioniert | Spielerprofil | OK |
| `Release` | funktioniert/disabled | Server Action nur wenn erlaubt | OK |
| Disabled Release Reason | bewusst disabled | Nicht-Managerteam, nicht releasable etc. | OK |
| Prepared Actions `Depth Chart pruefen`, `Vertrag ansehen`, `Trade Board oeffnen` | funktioniert/disabled | Links in passende Routen | OK |
| Empty Roster `Free Agency oeffnen` | funktioniert | Link zu Free Agents | OK |

## Depth Chart

Dateien:
- `src/app/app/savegames/[savegameId]/team/depth-chart/page.tsx`
- `src/components/team/depth-chart-view.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Slot Select | funktioniert | Depth-Chart-Slot setzen | OK |
| Roster Status Select | funktioniert | Status setzen, ungültige Optionen disabled | OK |
| Special Role Select | funktioniert | KR/PR/andere Rollen | OK |
| Captain Checkbox | funktioniert | Captain Flag setzen | OK |
| Development Focus Checkbox | funktioniert | Development Focus setzen | OK |
| Assignment Submit | funktioniert | `updateRosterAssignmentAction` | OK |
| Move Up/Down Buttons | funktioniert/disabled | `moveDepthChartPlayerAction`, keine ungültigen Moves | OK |
| Status Quick Buttons | funktioniert/disabled | Rosterstatus schnell setzen | OK |
| Readonly Badges | bewusst disabled | Nicht-Managerteam | OK |

## Contracts / Cap

Dateien:
- `src/app/app/savegames/[savegameId]/team/contracts/page.tsx`
- `src/app/app/savegames/[savegameId]/finance/contracts/page.tsx`
- `src/components/team/contract-table.tsx`
- `src/components/team/cap-overview.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Team Contracts Navigation | funktioniert | Rosterbezogene Vertragssicht | OK |
| Finance Contracts Navigation | funktioniert | Finance Workspace Contracts | OK |
| Contract Cards/Tables | Anzeige | Vertrag, Cap Hit, Risiko | OK |
| Direkte Vertragsmutation Offline | nicht sichtbar in Team Contracts | Analysefokus; Mutationen aktuell über Free Agency/Online local expert | TODO für echtes Contract Extension UI |

## Finance

Dateien:
- `src/app/app/savegames/[savegameId]/finance/page.tsx`
- `src/components/finance/finance-section-navigation.tsx`
- `src/components/finance/finance-workspace.tsx`
- `src/components/finance/finance-decision-panel.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Finance Nav `Overview` | funktioniert | Finance Start | OK |
| Finance Nav `Contracts/Cap` | funktioniert | Contracts-Sicht | OK |
| Finance Nav `Events` | funktioniert | Events-Sicht | OK |
| Finance Nav `Free Agency` | funktioniert | Free Agency | OK |
| Finance Nav `Trade Planning` | teilweise | Route existiert, zeigt Coming Soon | bewusst TODO |
| Finance Decision Cards | Anzeige | Prioritäten aus Cap/Cash/Risiko | OK |
| Projection Panel | Anzeige | Finanzprojektion | OK |

## Free Agency

Dateien:
- `src/app/app/savegames/[savegameId]/free-agents/page.tsx`
- `src/components/free-agency/free-agent-board.tsx`
- `src/components/free-agency/offer-builder.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Sortierung Select | funktioniert | Need/Value/Fit/OVR | OK |
| Offer Input `Jahre` | funktioniert | 1-5 Jahre | OK |
| Offer Input `Jahresgehalt` | funktioniert | Gehalt mit Step | OK |
| `Angebot vorbereiten` | funktioniert/disabled | Nur wenn Cap/Cash passen | OK |
| Disabled `Cap pruefen` | bewusst disabled | Finanzierbarkeit fehlt | OK |
| Confirm Dialog `Abbrechen` | funktioniert | Dialog schließen | OK |
| Confirm Dialog `Signing bestaetigen` / `Trotzdem senden` | funktioniert | `signFreeAgentAction` | OK |
| Empty `Roster oeffnen` | funktioniert | Link zurück zum Roster | OK |

## Trade Board

Dateien:
- `src/app/app/savegames/[savegameId]/team/trades/page.tsx`
- `src/components/trades/trade-board.tsx`
- `src/components/trades/trade-offer-center.tsx`
- `src/app/app/savegames/[savegameId]/finance/trades/page.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Team Trade Board Player Cards | teilweise | Lokale Auswahl/Skizze, keine Persistenz | bewusst MVP/TODO |
| Target Team Select | funktioniert | Clientseitige Target-Filterung | OK |
| `Entfernen` | funktioniert | Lokale Auswahl entfernen | OK |
| `Profil` | funktioniert | Spielerprofil | OK |
| `Roster oeffnen`, `Cap Hits pruefen` | funktioniert | Navigation | OK |
| Empty `Roster pruefen`, `Contracts ansehen` | funktioniert | Navigation | OK |
| `TradeOfferCenter` | vorbereitet, nicht gerendert | Hat echtes `executeTradeOfferAction`, ist aber in aktueller Route nicht eingebunden | TODO: entscheiden ob aktivieren oder entfernen |
| Finance `Trade Planning` | TODO | Zeigt Coming Soon ohne Fake-Funktion | OK als bewusst dokumentierter Platzhalter |

## Development

Dateien:
- `src/app/app/savegames/[savegameId]/development/page.tsx`
- `src/app/app/savegames/[savegameId]/development/training/page.tsx`
- `src/app/app/savegames/[savegameId]/development/scouting/page.tsx`
- `src/app/app/savegames/[savegameId]/development/staff/page.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| `Fokus setzen` / `Fokus entfernen` | funktioniert/readonly | Server Action `setDevelopmentFocusAction` | OK |
| Spielername Link | funktioniert | Spielerprofil | OK |
| `Depth Chart Bezug` | funktioniert | Link zur Depth Chart | OK |
| Header Actions `Roster`, `Depth Chart` | funktioniert | Navigation | OK |
| Training Page | TODO | Coming Soon, klar ausgewiesen | OK |
| Staff Page | TODO | Coming Soon, klar ausgewiesen | OK |
| Scouting Page | funktioniert/teilweise | Scouting Board mit Server Action | OK mit Hinweis unten |
| Scouting `Scout` Button bei FOCUSED | teilweise | Text sagt max. Scouting erreicht, Button bleibt sichtbar | TODO: Button bei FOCUSED disabled oder Label präzisieren |

## Draft

Dateien:
- `src/app/app/savegames/[savegameId]/draft/page.tsx`
- `src/components/draft/draft-overview-screen.tsx`
- `src/components/draft/draft-scouting-board.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Positionsfilter Select | funktioniert | Prospects filtern | OK |
| `Pick pruefen` | funktioniert/disabled | Dialog nur bei aktiver Draft Class und available Prospect | OK |
| Dialog `Abbrechen` | funktioniert | Dialog schließen | OK |
| Dialog `Pick bestaetigen` | funktioniert | `pickDraftPlayerAction` | OK |
| Draft MVP Notice | bewusst begrenzt | CPU-Picks/Multi-Round/Order nicht komplett aktiv | OK als Einschränkung dokumentiert |
| Scouting `Scout` | funktioniert/teilweise | Scouting-Level erhöhen | TODO bei max. Scouting siehe Development |

## League / Season

Dateien:
- `src/app/app/savegames/[savegameId]/league/page.tsx`
- `src/app/app/savegames/[savegameId]/seasons/[seasonId]/page.tsx`
- `src/components/season/simulation-progress-panel.tsx`
- `src/components/season/schedule-list.tsx`
- `src/components/season/standings-table.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| `Woche simulieren` | funktioniert/disabled | Simuliert offene aktuelle Woche | OK |
| Disabled `Simulation gesperrt` | bewusst disabled | Keine offenen Matches/In Progress/etc. | OK |
| `Naechste Saison starten` | funktioniert | Offseason Advance | OK |
| Schedule Match Cards | funktioniert | Link zum Match Flow/Report | OK |
| Standings Team Links | funktioniert | Link zur Teamseite | OK |
| Empty Schedule/Standings | Anzeige | Zustand erklären | OK |

## Inbox

Dateien:
- `src/app/app/savegames/[savegameId]/inbox/page.tsx`
- `src/components/inbox/inbox-list.tsx`
- `src/components/inbox/inbox-task-controls.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| Filter `Offen/Gelesen/Erledigt/Ausgeblendet/Alle` | funktioniert | Query-Navigation | OK |
| Task Action Link | funktioniert | Direkt zur passenden Route | OK |
| Status Buttons `Offen/Gelesen/Erledigt` | funktioniert/disabled | Optimistic Update + Server Action | OK |
| `Ausblenden` / `Einblenden` | funktioniert | Task Status ändern | OK |
| Priority Select | funktioniert/disabled | Persistente Priorität ändern | OK |
| `Prioritaet zuruecksetzen` | funktioniert | Override entfernen | OK |
| Empty State | Anzeige | Keine passenden Tasks | OK |

## Online Spielen / Multiplayer Hub

Dateien:
- `src/app/online/page.tsx`
- `src/components/online/online-continue-button.tsx`
- `src/components/online/online-league-search.tsx`
- `src/components/auth/online-auth-gate.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| `Weiterspielen` | funktioniert | Letzte Liga laden, ungültige IDs bereinigen | OK |
| `Liga suchen` | funktioniert | Available Leagues laden | OK |
| Error `Erneut suchen` | funktioniert | Retry | OK |
| Team-Identität `Team vorschlagen` | funktioniert/disabled | Freie Identität vorschlagen | OK |
| Select `Stadt` | funktioniert | Join-Identität | OK |
| Kategorie Buttons | funktioniert | Teamname-Kategorie wählen | OK |
| Select `Teamname` | funktioniert | Join-Identität | OK |
| Liga Card `Beitreten` | funktioniert/disabled | Join mit Teamzuweisung | OK |
| Success `Liga öffnen` | funktioniert | Link zur Liga | OK |
| `Zurück zum Hauptmenü` | funktioniert | Link `/app/savegames` | OK |

## Online Liga / Multiplayer Dashboard

Dateien:
- `src/app/online/league/[leagueId]/page.tsx`
- `src/app/online/league/[leagueId]/draft/page.tsx`
- `src/components/online/online-league-app-shell.tsx`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-dashboard-panels.tsx`
- `src/components/online/online-league-overview-sections.tsx`
- `src/components/online/online-fantasy-draft-room.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| `Zurück zum Online Hub` | funktioniert | Link `/online` | OK |
| Ready-State Button(s) | funktioniert | `setUserReady` / lokale Ready Action | OK |
| Recovery `Liga erneut laden` | funktioniert | Retry | OK |
| Recovery `Liga neu suchen` | funktioniert | Clear lastLeagueId + Hub | OK |
| Team `Vakantes Team übernehmen` | local-only | In Firebase-MVP nicht synchronisiert und mit Feedback geblockt | bewusst begrenzt |
| Media Goals `Rebuild/Playoffs/Championship` | local-only | In Firebase-MVP geblockt | bewusst begrenzt |
| Expert Mode Toggle | local-only sichtbar | Expertenbereiche ein-/ausblenden | OK |
| Franchise Strategy Select + `Strategie speichern` | local-only | In Firebase-MVP geblockt | bewusst begrenzt |
| Pricing Range Inputs + `Preise speichern` | local-only | In Firebase-MVP geblockt | bewusst begrenzt |
| Training Selects/Ranges/Textarea + `Trainingsplan speichern` | local-only bzw. Firebase readonly | Firebase-MVP zeigt erklärten Readonly-State | OK |
| Coach `Feuern/Einstellen` | local-only | Firebase-MVP geblockt | bewusst begrenzt |
| Contracts `+1 Jahr verlängern`, `Entlassen`, Free Agent `Verpflichten` | local-only | Firebase-MVP geblockt | bewusst begrenzt |
| Trades `Beispiel-Trade erstellen`, `Annehmen`, `Ablehnen` | local-only | Firebase-MVP geblockt | bewusst begrenzt |
| Draft/Scouting local expert Buttons | local-only | Firebase-MVP geblockt | bewusst begrenzt |
| Online Draft Route | funktioniert | Explizite `/draft` Route zeigt Draftboard | OK |
| Online Draft `Position` / `Overall` Selects | funktioniert | Clientseitige Filter/Sortierung | OK |
| Online Draft Row Select | funktioniert | Spieler auswählen | OK |
| Online Draft `Pick bestaetigen` | funktioniert/disabled | Nur eigenes Team am Zug | OK |
| Online Completed Draft State | Anzeige | Kein Auto-Draftboard, Status abgeschlossen | OK |

Behobene Punkte:
- `Spielablauf`-Link in Online-Sidebar zeigt auf existierenden `#week-loop`.
- `League`-Link in Online-Sidebar zeigt auf existierenden `#league`.
- `Development` in Online-Sidebar ist bewusst disabled statt 404.

## Adminmodus

Dateien:
- `src/app/admin/page.tsx`
- `src/app/admin/league/[leagueId]/page.tsx`
- `src/components/admin/admin-auth-gate.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/admin/admin-league-manager.tsx`
- `src/components/admin/admin-league-detail.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| AdminAuthGate | funktioniert | Firebase Auth + admin Claim oder UID-Allowlist | OK |
| `Ligen verwalten` | funktioniert | Scroll/Fokus zu Firebase Ligen | OK |
| `Liga erstellen` | funktioniert | Scroll/Fokus zum Formular | OK |
| `Simulation & Woche` | funktioniert/mit Hinweis | Ohne Auswahl Hinweis, mit Auswahl Detailroute | OK |
| `Debug Tools` | funktioniert | Debug Snapshot anzeigen | OK |
| `Zurück zum Hauptmenü` | funktioniert | Link `/` | OK |
| Admin Form `Liga Name` | funktioniert | Validiert Name | OK |
| Admin Form `Max Spieler` | funktioniert | 2-32 | OK |
| Admin Form `Start Woche` | local-only | In Firebase ausgeblendet | OK |
| Admin Form `Liga erstellen` | funktioniert/disabled | Admin API mit Bearer Token | OK |
| Liga-Liste `Auswählen` | funktioniert | Auswahl für Simulation & Woche | OK |
| Liga-Liste `Öffnen` | funktioniert | Detailroute | OK |
| Liga-Liste `Details verwalten` | funktioniert | Detailroute | OK |
| Local-only `Löschen/Zurücksetzen` | local-only mit Confirm | In Firebase ausgeblendet | OK |
| Empty `Liga erstellen` | funktioniert | Fokus Formular | OK |
| Local Debug `Alle Ligen löschen`, `Fake User hinzufügen`, `Liga mit 16 Spielern füllen`, `Alle Spieler ready setzen`, `LocalStorage reset` | local-only | Nur Browser-State | OK |

## Admin Ligadetail

Datei:
- `src/components/admin/admin-league-detail.tsx`

| Element | Status | Zielverhalten | Bewertung |
| --- | --- | --- | --- |
| `Zurück zum Admin Control Center` | funktioniert | Link `/admin` | OK |
| `Alle Spieler auf Ready setzen` | funktioniert/disabled | Admin API/local Action | OK |
| `Liga starten` | funktioniert/disabled | Admin API/local Action | OK |
| `Woche simulieren` | funktioniert/disabled | Admin API `simulateWeek`, Confirmation, Reload | OK |
| `Daten neu laden` | funktioniert | Admin API getLeague/local read | OK |
| `Debug-Informationen anzeigen/ausblenden` | funktioniert | UI Toggle | OK |
| `Spieleransicht öffnen` | funktioniert | Link Online-Liga | OK |
| Local-only `Revenue Sharing anwenden` | local-only | Firebase ausgeblendet | OK |
| Draft `Initialisieren`, `Starten`, `Auto-Pick nächstes Team`, `Auto-Draft bis Ende`, `Abschluss prüfen` | funktioniert/disabled | Admin API Draft Actions | OK |
| Draft `Reset Dev/Test` | local-only/dev-only | Nur wenn local und non-production | OK |
| Finance Sort Buttons | funktioniert | Clientseitige Sortierung | OK |
| Training `Plan zurücksetzen` | local-only | Firebase zeigt Readonly-Hinweis | OK |
| GM Filter Buttons | funktioniert | Clientseitige Filterung | OK |
| GM Actions `Verpasste Woche +1`, `Verwarnen`, `Entlassung ermächtigen`, `GM entfernen`, `Team vakant setzen`, `Legacy entfernen` | local-only | Firebase ausgeblendet | OK |
| Missing League `Erneut laden`, `Zurück` | funktioniert | Recovery | OK |

## Cards / Read-only Elemente

Wiederkehrende Cards:
- `StatCard`: reine Anzeige, OK.
- `SectionPanel`: Anzeige-Container mit optionalen Actions, OK.
- Savegame Cards: funktionale Links, OK.
- Team Area Cards: funktionale Links, OK.
- Roster/Player Cards: Link/Form abhängig vom Kontext, OK.
- Admin League Cards: echte Actions, OK.
- Online League Cards: Join/Status, OK.

Bewertung:
- Cards sind überwiegend funktional, wenn sie wie Buttons aussehen.
- Reine Status-Cards haben keinen Button-Stil und sind als Anzeige verständlich.

## Fehlende Funktionalität / TODOs

| TODO | Bereich | Empfehlung |
| --- | --- | --- |
| T1 | Finance `Trade Planning` | Entweder echten TradeOfferCenter einbinden oder klar als dauerhaftes MVP-Placeholder behalten. |
| T2 | `TradeOfferCenter` vorbereitet, aber ungerendert | Entscheiden: aktivieren auf Team Trade Board oder löschen, damit keine tote UI-Logik bleibt. |
| T3 | Development `Training` | Echte Trainingsplanung offline anbinden oder aus Sidebar/Navigation nur bei Implementierung zeigen. |
| T4 | Development `Staff` | Coach-/Staff-System mit bestehenden Online-Local-Konzepten harmonisieren. |
| T5 | Draft Scouting `Scout` bei FOCUSED | Button disabled schalten oder Label `Maximal gescoutet` statt aktiver Form. |
| T6 | Online Firebase MVP local-only Aktionen | Für Verträge, Trades, Training, Coaches, Finance entweder serverseitig implementieren oder im Firebase-Modus weiter ausgeblendet/read-only halten. |
| T7 | Disabled Sidebar Reasons | Gründe optional inline/visuell anzeigen, weil `title` auf Touch-Geräten schwach ist. |
| T8 | Online Team/Roster Anchors | Aktuell dashboardinterne Hash-Abschnitte; spätere echte Unterrouten nur einführen, wenn Online-Datenmodell vollständig ist. |

## Empfohlene nächste Arbeitspakete

AP-GUI-1: Navigation & Disabled Reasons polieren
- Touch-sichere Disabled-Hinweise in Sidebar anzeigen.
- Onboarding-Key für `Spielablauf` korrigieren, falls Onboarding wieder aktiv genutzt wird.

AP-GUI-2: Trade Board Entscheidung
- `TradeOfferCenter` entweder in `/team/trades` integrieren oder entfernen.
- Finance `Trade Planning` danach auf denselben funktionalen Flow verlinken.

AP-GUI-3: Development Placeholder abbauen
- Training und Staff entweder echte MVP-Aktionen geben oder klarer als Roadmap-Bereiche markieren.

AP-GUI-4: Draft Scouting Micro-Fix
- Focused Prospects nicht mehr mit aktiv wirkendem `Scout`-Submit darstellen.

AP-GUI-5: Online Firebase MVP Abgrenzung
- Readonly/local-only Bereiche auditieren und einheitlich kennzeichnen.

AP-GUI-6: E2E Smoke Matrix
- Hauptflows automatisieren: Savegame erstellen, Dashboard, Week vorbereiten, Match öffnen, Roster/Depth Chart, Free Agency, Inbox, Admin Week Simulation.

## Fazit

Der Großteil der sichtbaren UI ist funktional oder bewusst mit fachlichem Grund deaktiviert.
Die auffälligsten echten GUI-Risiken waren Online-Sidebar-Links auf fehlende Anker bzw. eine nicht vorhandene Online-Development-Route; diese wurden minimal korrigiert.

Status dieses Audits: Grün, sofern Lint/Typecheck/Build nach den Änderungen grün laufen.
