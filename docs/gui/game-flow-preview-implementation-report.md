# Game Flow Preview Implementation Report

## Status
Grün

## Route / Screen
- Route: `/app/savegames/[savegameId]/game/setup?matchId=[matchId]`
- Geprüfte E2E-Route: `/app/savegames/e2e-savegame-minimal/game/setup?matchId=e2e-match-week-1`
- Zielscreen: Game Preview mit Einstieg in Match Control
- Einstieg: bestehende Game-Setup-Route, keine neue Route angelegt

## Umgesetzte Komponenten
- `MatchPreviewHeader`
  - Zeigt Heimteam, Auswärtsteam, Week-/Season-Kontext, Venue, Datum, Records und Match-Status.
- `StartMatchActionArea`
  - Zeigt den Match-Control-Zustand mit primärer Aktion.
  - Bei `READY` und `SCHEDULED` wird `Match starten` über die bestehende Server Action angeboten.
  - Bei gesperrtem Zustand zeigt die Area den Grund und einen sichtbaren Rückweg zum Week Loop.
- `TeamComparisonPanel`
  - Vergleicht Heim-/Auswärtsteam mit Record, OVR, Morale und Manager-Team-Kennzeichnung.
- `KeyRatingsComparison`
  - Vergleicht Team OVR, Morale, Offense Scheme und Defense Scheme mit Edge-/Even-Badges.
- `GamePlanSummary`
  - Verdichtet aktuelle Scheme-, Offense- und Defense-Intent-Informationen vor dem Spielstart.
- `ReadinessRiskPanel`
  - Zeigt Startfähigkeit, Week State, Match Status, Depth Chart, Injury-Hinweise, Stärken und Risiken.
- `GamePreviewModel`
  - Bündelt Preview-Daten in einen stabilen UI-Vertrag für die neuen Komponenten.

## Verwendete Datenquellen
- `loadGameFlowData`
  - Lädt Savegame, Season, Match, Manager-Team und Week State für den Game Flow.
- `getSaveGameFlowSnapshot`
  - Savegame- und Week-Flow-Kontext.
- `getSeasonOverviewForUser`
  - Season, Week, Standings und Match-Kontext.
- `getMatchDetailForUser`
  - Matchdaten, Teams, Status, Score, Gameplan-Kontext.
- `getTeamDetailForUser`
  - Manager-Team, Roster, Ratings, Morale und Team Needs.
- `buildLineupReadinessState`
  - Depth-Chart-/Starter-Readiness für den Startstatus.
- `buildGamePreparationView`
  - Bestehende Gameplan-Analyse und Matchup Summary.

## Bestehende Actions
- `startGameAction`
  - Wird im `StartMatchActionArea` weiterverwendet.
- `updateGamePreparationAction`
  - Bleibt im bestehenden Gameplan-Editor aktiv.

## Lokale UI-Fixtures / Empty States
- Wenn keine klaren Stärken aus den Daten ableitbar sind, zeigt die Preview einen markierten `UI-Fixture`-Eintrag `Even`.
- Wenn keine klaren Risiken aus den Daten ableitbar sind, zeigt die Preview einen markierten neutralen Risikozustand.
- Fehlende Team- oder Standings-Daten fallen auf stabile Werte wie `0-0`, `TBD`, `Neutral Match` oder vorhandene Matchdaten zurück.

## Browser-/Screenshot-Review
Setup:
- E2E-Seed: `npm run test:e2e:seed`
- Dev-Server: `http://127.0.0.1:3100`
- Auth: `/api/e2e/dev-login`

Geprüfte Viewports:
- Desktop: `1440x1200`
- Mobile/narrow: `390x1200`

Screenshots:
- Desktop vor Fix: `/tmp/afbm-game-preview-desktop.png`
- Mobile vor Fix: `/tmp/afbm-game-preview-mobile.png`
- Desktop final: `/tmp/afbm-game-preview-desktop-after.png`
- Mobile final: `/tmp/afbm-game-preview-mobile-after.png`

Gefundene UI-Probleme:
- Readiness-Items wurden im Desktop in vier zu schmale Spalten gedrückt.
- Badges konnten in engen Karten optisch kollidieren.
- Das Team-Comparison-Panel wurde durch die höhere Readiness-Spalte unnötig vertikal gestreckt.

Behobene Punkte:
- Readiness-Items nutzen nun maximal zwei Spalten.
- Status-Badges bleiben kompakt und umbrechen nicht.
- Die Preview-Hauptspalte nutzt `items-start`, sodass Panels nicht künstlich gestreckt werden.

Verbleibende visuelle Risiken:
- Die globale App Shell zeigt auf Mobile weiterhin die komplette Sidebar vor dem Screen-Inhalt. Das ist bestehendes Shell-Verhalten und wurde in diesem Slice nicht umgebaut.
- Die E2E-Fixture steht in `PRE_WEEK`; deshalb zeigt der Screenshot den Start als gesperrt und den Rückweg zum Week Loop. Der Start-Button-Vertrag für `READY`/`SCHEDULED` ist im Model und in der Action-Area abgesichert.
- Der bestehende Gameplan-Editor bleibt umfangreich. Die neue Preview priorisiert aber den Startkontext oberhalb dieses Editors.

## Testresultate
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün
- `npx vitest run src/components/match/game-preview-model.test.ts src/components/match/game-preparation-model.test.ts src/components/match/game-flow-model.test.ts`
  - Ergebnis: Grün, 3 Testdateien, 12 Tests
- `npx vitest run 'src/app/app/savegames/[savegameId]/week-actions.test.ts'`
  - Ergebnis: Grün, 1 Testdatei, 7 Tests
- `npx vitest run src/components/dashboard/dashboard-model.test.ts`
  - Ergebnis: Grün, 1 Testdatei, 27 Tests
- Browser-/Screenshot-Review
  - Ergebnis: Grün nach UI-Polish, Desktop und Mobile manuell per Playwright-Screenshot geprüft

## Stabilization Review
Geprüfte Routen:
- Dashboard: `/app/savegames/e2e-savegame-minimal`
- Game Preview: `/app/savegames/e2e-savegame-minimal/game/setup?matchId=e2e-match-week-1`

Zusätzliche Screenshots:
- Desktop vor Stabilisierung: `/tmp/afbm-game-preview-stabilization-before-desktop.png`
- Mobile vor Stabilisierung: `/tmp/afbm-game-preview-stabilization-before-mobile.png`
- Desktop final: `/tmp/afbm-game-preview-stabilization-final-desktop.png`
- Mobile final: `/tmp/afbm-game-preview-stabilization-final-mobile.png`

Gefundene UI-/UX-Probleme:
- Die primäre Match-Control-Area stand vor dem Teamvergleich. Dadurch war der nächste Schritt sichtbar, bevor die Nutzer den Matchup-Kontext bewertet hatten.
- `Game Center` war im gesperrten Startzustand als Link sichtbar, obwohl der Nutzer noch nicht sinnvoll in den Live-Flow wechseln kann.
- Der Locked-Text zeigte technische Rohzustände wie `PRE_WEEK` zu deutlich.
- Der Header-Badge `0-0` war ohne Label als Record/Score-Kontext missverständlich.
- Der Fallback-Status `UI-Fixture` war für Nutzer zu technisch.

Durchgeführte Verbesserungen:
- Screen-Reihenfolge stabilisiert: Header -> Teamvergleich + Match-Control -> Readiness/Risk + Key Ratings -> Gameplan.
- `Game Center` ist vor dem Start kein Link mehr, sondern ein deaktivierter Zustand `Game Center nach Start`.
- Locked-Copy wurde nutzerorientiert formuliert: zuerst Week Loop vorbereiten, danach wird der Start freigeschaltet.
- Rohzustände werden lesbarer dargestellt, z. B. `PRE WEEK` und `REGULAR SEASON`.
- Header-Badge wurde auf `Record 0-0` präzisiert.
- Technischer Fallback-Badge wurde in der UI zu `Fallback`; abgeleitete Daten werden als `Data` markiert.
- Start-Action-Area bleibt in Seitenspalten einspaltig und kompakt, damit Buttons nicht unruhig umbrechen.

Zusätzliche Browser-Prüfung:
- Dashboard-Link auf die Game Preview wurde per Playwright geprüft.
- Ergebnis: `/app/savegames/e2e-savegame-minimal/game/setup?matchId=e2e-match-week-1`
- Locked-State-Prüfung: `Game Center nach Start` rendert als `SPAN`, nicht als aktiver Link.

Stabilization-Testresultate:
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün
- `npx vitest run src/components/match/game-preview-model.test.ts src/components/match/game-preparation-model.test.ts src/components/match/game-flow-model.test.ts 'src/app/app/savegames/[savegameId]/week-actions.test.ts' src/components/dashboard/dashboard-model.test.ts`
  - Ergebnis: Grün, 5 Testdateien, 46 Tests

Verbleibende Risiken nach Stabilisierung:
- Die globale App Shell zeigt auf Mobile weiterhin die komplette Sidebar vor dem eigentlichen Screen. Das betrifft mehrere Screens und bleibt ausserhalb dieses Game-Flow-Slices.
- Die E2E-Fixture steht in `PRE_WEEK`; ein echter `READY`-Screenshot wurde nicht erzwungen, um keine Flow-Daten im Review künstlich umzubauen.
- Der bestehende Gameplan-Editor bleibt unterhalb der Preview sehr umfangreich. Er ist kein neuer Bestandteil dieses Stabilization-Passes.

## Statusprüfung
- Bestehende Game-/Match-Routen analysiert: Ja
- Game Preview verbessert: Ja
- Match-Control-Einstieg vorbereitet: Ja
- Bestehende Server Actions verwendet: Ja
- Keine Game Engine Änderungen: Ja
- Keine Datenmodell-Änderungen: Ja
- Keine Firebase-/DB-Migration: Ja
- Keine neuen Dependencies: Ja
- Fehlende Daten als Empty States oder markierte UI-Fixtures abgefangen: Ja

Status: Grün
