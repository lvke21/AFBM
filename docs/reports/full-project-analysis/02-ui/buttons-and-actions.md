# Buttons And Actions

Stand: 2026-05-02

## Ziel der Analyse

Statisches Inventar sichtbarer Buttons, Links und Form-Aktionen mit vermuteter Funktion, Handler-Status, Implementierungsgrad, Risiko und Empfehlung.

## Zentrale Aktionsmatrix

| Label | Datei | Vermutete Funktion | Handler vorhanden? | Funktion implementiert? | Risiko | Empfehlung |
|---|---|---|---|---|---|---|
| Fortsetzen | `src/app/app/savegames/page.tsx` | Springt zu Franchises | `href="#franchises"` | Ja | Niedrig | OK |
| Neue Karriere starten | `src/app/app/savegames/page.tsx` | Springt zum Formular | `href="#new-career"` | Ja | Niedrig | OK |
| Online spielen | `savegames-online-link.tsx` | Navigiert zu `/online` oder fordert Login | `Link`/`openSavegamesLogin` | Ja | Niedrig | OK |
| Adminmodus | `savegames-admin-link.tsx` | Navigiert zu `/admin` oder fordert Login/Admin | `Link`/Auth Handler | Ja | Mittel | Admin-Claim UX weiter beobachten |
| Logout | `firebase-email-auth-panel.tsx` | Firebase Logout + lokaler Kontext | `handleLogout` | Ja | Mittel | OK, Recovery bei Fehler sichtbar |
| Registrieren / Zum Login | `firebase-email-auth-panel.tsx` | Auth-Modus toggeln | inline `onClick` | Ja | Niedrig | OK |
| Account erstellen | `firebase-email-auth-panel.tsx` | Firebase Register | `onSubmit={handleSubmit}` | Ja | Mittel | OK |
| Einloggen | `firebase-email-auth-panel.tsx` | Firebase Login | `onSubmit={handleSubmit}` | Ja | Mittel | OK |
| Offline Spielen | `create-savegame-form.tsx` | Savegame erstellen oder Login-Hinweis | Server Action + client validation | Ja/Deaktivierbar | Mittel | Disabled-Text beibehalten |
| Erneut versuchen | `savegames-list-section.tsx` | Reload bei Savegame-Load-Error | inline reload | Ja | Niedrig | OK |
| Fortsetzen | `savegames-list-section.tsx` | Savegame-Kontext setzen/navigieren | `continueSaveGame` | Ja | Mittel | OK |
| Details anzeigen/ausblenden | `savegames-list-section.tsx` | Savegame-Details laden/toggeln | `toggleDetails` | Ja | Niedrig | OK |
| Loeschen | `savegames-list-section.tsx` | Savegame loeschen mit Confirm | `deleteSaveGame` + `window.confirm` | Ja, falls Capability aktiv | Mittel | Custom Confirm spaeter erwaegen |
| Weiterspielen | `online-continue-button.tsx` | `lastLeagueId` laden | `handleContinue` | Ja | Mittel | OK |
| Liga suchen | `online-league-search.tsx` | Verfuegbare Ligen laden | `handleSearch` | Ja | Mittel | OK |
| Erneut suchen | `online-league-search.tsx` | Search wiederholen | `handleSearch` | Ja | Niedrig | OK |
| Team vorschlagen | `online-league-search.tsx` | Teamidentitaet automatisch waehlen | `handleSuggestTeam` | Ja | Niedrig | OK |
| Beitreten / Wieder beitreten | `online-league-search.tsx` | Join/Rejoin mit Teamidentitaet | `handleJoinLeague` | Ja | Hoch | Weiter E2E abdecken |
| Liga oeffnen | `online-league-search.tsx` | Nach Join Dashboard oeffnen | `Link` | Ja | Niedrig | OK |
| Zurueck zum Online Hub | `online-league-overview-sections.tsx` | Hub oeffnen | `Link` | Ja | Niedrig | OK |
| Bereit fuer Week / Ready zuruecknehmen | `online-league-overview-sections.tsx` | Ready-State setzen | `onReadyForWeek` -> `handleReadyForWeek` | Ja | Hoch | Weiter gegen Firebase testen |
| Liga neu suchen | `online-league-placeholder.tsx` | Ungueltige Liga bereinigen und Hub oeffnen | `handleSearchLeagueAgain` | Ja | Mittel | OK |
| Expertenmodus anzeigen/ausblenden | `online-league-placeholder.tsx` | Lokale Advanced Actions toggeln | `handleToggleExpertMode` | Ja | Mittel | In Firebase bewusst verborgen |
| Strategie speichern | `online-league-placeholder.tsx` | Lokale Franchise-Strategie speichern | `handleSaveFranchiseStrategy` | Lokal ja, Firebase blockiert | Mittel | Bei Firebase lieber Coming Soon statt versteckte Guard |
| Preise speichern | `online-league-placeholder.tsx` | Lokale Stadium Pricing speichern | `handleSavePricing` | Lokal ja, Firebase blockiert | Mittel | OK im Expert Local Mode |
| Trainingsplan speichern | `online-league-placeholder.tsx` | Lokalen Trainingsplan speichern | `handleSubmitTrainingPlan` | Lokal ja, Firebase read-only | Mittel | OK |
| +1 Jahr verlaengern | `online-league-placeholder.tsx` | Lokale Contract Extension | `handleExtendContract` + confirm | Lokal ja, Firebase blockiert | Mittel | In Firebase nicht aktiv sichtbar machen |
| Entlassen | `online-league-placeholder.tsx` | Lokaler Release | `handleReleasePlayer` + confirm | Lokal ja, Firebase blockiert | Mittel | OK nur Local Expert |
| Verpflichten | `online-league-placeholder.tsx` | Lokaler Free Agent Sign | `handleSignFreeAgent` + confirm | Lokal ja, Firebase blockiert | Mittel | OK nur Local Expert |
| Beispiel-Trade erstellen | `online-league-placeholder.tsx` | Lokaler Trade Proposal | `handleCreateSuggestedTrade` | Lokal ja, Firebase blockiert | Mittel | OK nur Local Expert |
| Feuern / Einstellen | `online-league-placeholder.tsx` | Lokale Coach Actions | Handler vorhanden | Lokal ja, Firebase blockiert | Mittel | OK nur Local Expert |
| Ligen verwalten | `admin-control-center.tsx` | Scroll/Fokus auf Liga-Liste | `handleManageLeagues` | Ja | Niedrig | OK |
| Liga erstellen | `admin-control-center.tsx` | Scroll/Fokus auf Create Form | `handleCreateLeague` | Ja | Niedrig | OK |
| Simulation & Woche | `admin-control-center.tsx` | Oeffnet ausgewahlte Liga oder Hinweis | `handleSimulationAndWeek` | Ja | Mittel | OK |
| Debug Tools | `admin-control-center.tsx` | Debug Panel anzeigen | `handleDebugTools` | Ja | Niedrig | OK |
| Zurueck zum Hauptmenue | `admin-control-center.tsx` | Navigiert zu Savegames | `Link` | Ja | Niedrig | OK |
| Woche simulieren | `admin-control-center.tsx`, `admin-league-detail.tsx` | Admin Week Simulation | `runSelectedLeagueWeekAction` / `handleSimulateWeek` | Ja | Hoch | Confirm/Result klar halten |
| Woche abschliessen | `admin-control-center.tsx` | Week Completion Action | `runSelectedLeagueWeekAction` | Ja | Hoch | Voraussetzungscheck wichtig |
| Debug-Status anzeigen | `admin-control-center.tsx` | Debug Panel | Handler | Ja | Niedrig | OK |
| Draft-Status pruefen | `admin-control-center.tsx` | Notice mit Draft-Status | Handler | Ja, nur Anzeige | Niedrig | OK |
| Neue Online-Liga: Liga erstellen | `admin-league-manager.tsx` | Admin API createLeague | `handleSubmit` | Ja | Hoch | OK, Server Guard noetig |
| Auswaehlen | `admin-league-manager.tsx` | Liga im Admin Hub aktiv setzen | `onSelectedLeagueChange` | Ja | Niedrig | OK |
| Oeffnen | `admin-league-manager.tsx` | Detailseite oeffnen | `Link` | Ja | Niedrig | OK |
| Details verwalten | `admin-league-manager.tsx` | Detailseite oeffnen | `Link` | Ja | Niedrig | Redundant zu Oeffnen |
| Loeschen | `admin-league-manager.tsx` | Lokale Liga loeschen | `handleDeleteLeague` + confirm | Lokal | Mittel | In Firebase nicht sichtbar |
| Zuruecksetzen | `admin-league-manager.tsx` | Lokale Liga resetten | `handleResetLeague` + confirm | Lokal | Mittel | In Firebase nicht sichtbar |
| Alle Ligen loeschen | `admin-league-manager.tsx` | Lokale Debug-Loeschung | `handleDeleteAllLeagues` + confirm | Lokal | Hoch | Nur Local sichtbar halten |
| Fake User hinzufuegen | `admin-league-manager.tsx` | Lokaler Debug User | Handler | Lokal | Mittel | OK local only |
| Liga mit 16 Spielern fuellen | `admin-league-manager.tsx` | Lokaler Debug Fill | Handler | Lokal | Mittel | OK local only |
| Alle Spieler ready setzen | `admin-league-manager.tsx` | Lokaler Debug Ready | Handler | Lokal | Mittel | OK local only |
| LocalStorage reset | `admin-league-manager.tsx` | Lokaler Online-State reset | Handler + confirm | Lokal | Mittel | OK local only |
| Auto-Draft bis Ende | `admin-league-detail.tsx` | Admin Draft Automation | `handleAutoDraftToEnd` + confirm | Ja | Hoch | Custom Confirm spaeter |
| Fantasy Draft zuruecksetzen | `admin-league-detail.tsx` | Draft Reset | `handleResetFantasyDraft` + confirm | Ja | Hoch | Nur Dev/Test? Im UI klar markieren |
| GM entfernen / vakant setzen | `admin-league-detail.tsx` | Admin Membership Mutation | prompt+confirm | Ja | Hoch | Native prompts ersetzen |
| Roster Quick Info | `roster-table.tsx` | Side Panel Player Details | `setSelectedPlayerId` | Ja | Niedrig | OK |
| Free Agency oeffnen | `roster-table.tsx` | Bei leerem Roster zum Markt | `Link` | Ja | Niedrig | OK |
| Depth Chart Quick Assignment | `depth-chart-view.tsx` | Player Slot setzen/freimachen | Server Action Form | Ja | Mittel | OK |
| Draft Prospect waehlen | `draft-overview-screen.tsx` | Prospect Dialog oeffnen | `setSelectedProspectId` | Ja | Niedrig | OK |
| Draft Pick bestaetigen | `draft-overview-screen.tsx` | Draft Server Action | Form | Ja, MVP begrenzt | Mittel | OK |
| Scout | `draft-scouting-board.tsx` | Scouting Server Action | Form | Teilweise/MVP | Mittel | Max-State sauber pruefen |
| Inbox Status Controls | `inbox-task-controls.tsx` | Task Status/Hide/Undo | Client async action | Ja | Mittel | OK |

## Forms

| Form | Datei | Felder | Validierung | Risiko |
|---|---|---|---|---|
| Firebase Login/Register | `firebase-email-auth-panel.tsx` | Anzeigename, Email, Passwort | Button disabled bei fehlenden Credentials, Firebase Errors | Mittel |
| Neues Offline Savegame | `create-savegame-form.tsx` | Dynasty-Name, User-Team | Client-Laenge/Team + Server Action | Mittel |
| Admin Liga erstellen | `admin-league-manager.tsx` | Liga Name, Max Spieler, Start Woche lokal | Client validation + Admin API | Hoch |
| Online Team-Identitaet | `online-league-search.tsx` | Stadt, Kategorie, Teamname | Join disabled bis Auswahl | Mittel |
| Depth Chart Assignment | `depth-chart-view.tsx` | Status, Slot, Rolle, Flags | Server Action | Mittel |
| Contracts | `contract-table.tsx`, `online-league-placeholder.tsx` | Zahlen/Contract Inputs | Teilweise client/server | Mittel |
| Trade Offer | `trade-offer-center.tsx` | Team/Spieler/Picks | Server Action | Mittel/Hoch |
| Match Preparation | `game-preparation-panel.tsx` | Scheme/Plan Selects | Server Action | Mittel |

## Modals und Dialoge

| Typ | Datei | Zweck | Bewertung |
|---|---|---|---|
| Custom `role="dialog"` | `free-agency/offer-builder.tsx` | Offer Confirm | OK |
| Custom `role="dialog"` | `draft/draft-overview-screen.tsx` | Draft Prospect Confirm/Detail | OK |
| Native `window.confirm` | Admin, Savegames, Online Local Actions | Loeschen/Reset/Simulation/Release | Funktional, aber UX-/Safety-Risiko |
| Native `window.prompt` | `admin-league-detail.tsx` | Admin Warnung/Reason/Deadline | Funktional, aber unpoliert und fehleranfaellig |

## Handler ohne sichtbaren Effekt

Keine eindeutig toten Buttons gefunden. Auffaellig sind aber:

- `Details verwalten` und `Oeffnen` im Admin League Manager fuehren beide zur gleichen Route.
- `Draft-Status pruefen` erzeugt nur eine Notice, keine Detailnavigation.
- Einige lokale Expert-Mode-Actions im Online Dashboard zeigen in Firebase nur Guard-Feedback, wenn sie sichtbar waeren; im aktuellen Firebase-MVP sind sie weitgehend versteckt oder read-only.

## Empfehlung

1. Admin native prompts/confirms durch projektinterne Confirm-Komponenten ersetzen.
2. Redundanz `Oeffnen` vs. `Details verwalten` klaeren.
3. Online Join/Ready/Week Simulation weiter mit E2E absichern.
4. Nicht-MVP-Aktionen in Firebase konsequent gar nicht rendern oder als Coming Soon zeigen.
