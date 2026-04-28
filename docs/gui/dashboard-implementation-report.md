# Dashboard Implementation Report

## Status
Grün

## Route / Screen
- Route: `/app/savegames/[savegameId]`
- Zielscreen: Dashboard / Manager Command Center
- Einstieg: bestehende Savegame-Dashboard-Route, keine neue Route angelegt

## Umgesetzte Komponenten
- `ManagerCommandHeader`
  - Franchise-/Team-Kontext, Savegame, Liga, Week State und Record als erster Screen-Anker.
- `NextActionPanel`
  - Dominante naechste Manager-Aktion mit sichtbarem Zustand und Server-Action-Slot fuer `POST_GAME`.
- `DashboardQuickActionsPanel`
  - Week Flow, Game Preview, Roster, League und Roster Value als Shortcuts.
  - Nicht verfuegbare Aktionen zeigen `Locked` und einen Grund statt toter Buttons.
- `TeamSnapshotPanel`
  - Team OVR, Record, Cap Space, groesster Need und Roster-Fokus.
- `LeagueSnapshotPanel`
  - Liga, Phase, Week, offene/abgeschlossene Matches und Top-Standings.
- `DecisionFeedbackArea`
  - Aktuelle Empfehlung und Value-Signale als Impact-/Feedback-Bereich.
  - Enthält einen klar markierten `UI-Fixture`-Platzhalter fuer noch nicht persistierte Decision-Historie.
- `StatusBadge`
  - Wiederverwendbare Statusanzeige fuer `neutral`, `success`, `warning`, `danger`, `active`.
- `StatCard`
  - Erweitert um `description`, `meta`, `size` und weitere Tones.

## Verwendete Datenquellen
- `getSaveGameFlowSnapshot`
  - Savegame, Week State, Liga, Team- und Saisonreferenzen.
- `getTeamDetailForUser`
  - Manager-Team, Roster, Ratings, Salary Cap, Needs, Spielerfokus.
- `getSeasonOverviewForUser`
  - Season, Week, Matches, Standings.
- Bestehende Dashboard Builder:
  - `buildDashboardAction`
  - `buildWeekLoopDashboardAction`
  - `buildTeamProfileState`
  - `buildTeamContextState`
  - `buildTeamDevelopmentState`
  - `buildRebuildProgressState`
- Neue Dashboard Builder:
  - `buildDashboardQuickActions`
  - `buildDashboardDecisionFeedbackItems`
  - `getDashboardWeekStateTone`

## Lokale UI-Fixtures
- Decision Feedback Area nutzt einen explizit markierten `UI-Fixture`-Eintrag:
  - Grund: Es gibt aktuell keine persistierte Decision-Historie fuer Dashboard-Ereignisse.
  - Verhalten: Der Platzhalter ist sichtbar markiert und nicht als echte Nutzer- oder Engine-Daten getarnt.

## Bekannte Lücken
- Keine persistierte Historie fuer letzte Trade-/Signing-/Roster-Feedbacks im Dashboard.
- Kein echtes Charting fuer League Trends; Standings werden tabellarisch dargestellt.
- X-Factor- und Team-Chemistry-Signale sind noch nicht Teil dieses ersten Dashboard-Slices.

## Browser-/Screenshot-Review
Geprüfte Route:
- `/app/savegames/e2e-savegame-minimal`

Setup:
- E2E-Seed: `npm run test:e2e:seed`
- Dev-Server: `http://127.0.0.1:3100`
- Auth: `/api/e2e/dev-login`
- Screenshots:
  - Desktop: `/tmp/afbm-dashboard-desktop-reviewed.png`
  - Mobile: `/tmp/afbm-dashboard-mobile-reviewed.png`

Geprüfte Viewports:
- Desktop: `1440x1200`
- Mobile/narrow: `390x1200`

Gefundene UI-Probleme:
- Quick Actions waren auf Desktop in fünf Spalten zu dicht und wurden dadurch schwerer scannbar.
- Team Development Cards wurden in einer halbbreiten Dashboard-Spalte zu schmal; Labels und Texte brachen unsauber.
- Rebuild Progress Metriken wurden in halbbreiten Layouts zu stark verdichtet.
- Roster Decision Inbox wurde neben einem höheren Panel vertikal gestreckt und erzeugte unnötige Leerfläche.
- Der globale Onboarding-Coach kann beim ersten Laden Dashboard-Inhalte verdecken; fuer den finalen Review wurde er per UI geschlossen.

Behobene Punkte:
- Quick Actions nutzen nun `xl:grid-cols-3` und erst ab `2xl` fünf Spalten.
- Team Profile und Team Development stehen bis `2xl` untereinander statt in zwei zu engen Spalten.
- Team Development Indicators wechseln erst ab `2xl` in drei Spalten.
- Rebuild Progress Metriken nutzen breitere Karten: `sm:grid-cols-2`, `xl:grid-cols-3`, `2xl:grid-cols-5`.
- Untere Dashboard-Sektion nutzt `items-start` und erst ab `2xl` zwei Spalten, damit die Inbox nicht unnötig in die Höhe gezogen wird.

Verbleibende visuelle Risiken:
- Die globale App Shell zeigt auf Mobile weiterhin die komplette Sidebar vor dem Dashboard-Inhalt; das ist bestehendes Shell-Verhalten und wurde in diesem Dashboard-Polish nicht geändert.
- Der Route Page Header `GM Office` steht zusätzlich zum neuen Manager Command Header. Es ist lesbar, aber in einem späteren Shell-Polish sollte geprüft werden, ob Dashboard-Screens einen kompakteren Header brauchen.
- Der Onboarding-Coach bleibt ein globales Overlay und kann initial Inhalt verdecken. Das wurde dokumentiert, aber nicht in diesem Dashboard-Slice umgebaut.

## Testresultate
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün
- `npx vitest run src/components/dashboard/dashboard-model.test.ts`
  - Ergebnis: Grün, 27 Tests
- `npx vitest run src/components/dashboard/dashboard-model.test.ts src/components/layout/navigation-model.test.ts 'src/app/app/savegames/[savegameId]/week-actions.test.ts'`
  - Ergebnis: Grün, 3 Testdateien, 39 Tests
- Browser-/Screenshot-Review
  - Ergebnis: Grün nach UI-Polish, Desktop und Mobile manuell per Playwright-Screenshot geprüft

## Statusprüfung
- Komponenten klar definiert: Ja
- Dashboard-Route identifiziert und genutzt: Ja
- Bestehende Datenquellen verwendet: Ja
- Fehlende Daten stabil abgefangen: Ja
- Keine Game Engine Änderungen: Ja
- Keine Datenmodell-Änderungen: Ja
- Keine neuen Dependencies: Ja
- Keine direkten Image-Imports: Ja

Status: Grün
