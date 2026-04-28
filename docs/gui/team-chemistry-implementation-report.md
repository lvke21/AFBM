# Team Chemistry Implementation Report

## Status
Grün

## Route / Screen
- Route: `/app/savegames/[savegameId]/team/chemistry`
- Geprüfte E2E-Route: `/app/savegames/e2e-savegame-minimal/team/chemistry`
- Integration: Team Section Navigation und Team Overview Card

## Umgesetzte Bereiche

### Einfache Chemistry-Anzeige
- Neuer Team Chemistry Screen mit Top-StatCards:
  - Chemistry
  - Team Morale
  - Offense
  - Defense
- Chemistry ist ein UI-Score aus vorhandenen Read-Model-Daten:
  - Team Morale
  - Unit Morale
  - Scheme Fit
  - Availability aus Fatigue/Injury-Signalen
- Der Score verändert keine Simulation und keine Game Engine.

### Gruppen
- Unit-Gruppen:
  - Offense
  - Defense
  - Special Teams
- Offense und Defense werden prominent als eigene StatCards und Unit Cards dargestellt.
- Jede Unit zeigt:
  - Chemistry
  - Morale
  - Scheme Fit
  - Availability
  - aktive Spieleranzahl

### Einfluss sichtbar machen
- Pro Unit werden positive und negative Signale getrennt angezeigt:
  - Positive Einfluesse: Captains, High Morale, starke Starter
  - Risiko-Signale: Injury Status oder hohe Fatigue
- Globaler Einflussbereich `Einfluss auf Performance` zeigt:
  - Team Morale
  - Leadership
  - Risk Signals
  - Low Fit Units
- Spieler-Signale verlinken direkt ins Player Profile.

## Verwendete Datenquellen
- `loadCanonicalTeamPageData`
- `getTeamDetailForUser`
- `TeamDetail.morale`
- `TeamDetail.players`
- vorhandene Spielerfelder:
  - `morale`
  - `schemeFitScore`
  - `fatigue`
  - `injuryStatus`
  - `captainFlag`
  - `rosterStatus`
  - `positionCode`
  - `secondaryPositionCode`
  - `positionOverall`

## Geänderte Dateien
- `src/app/app/savegames/[savegameId]/team/chemistry/page.tsx`
- `src/app/app/savegames/[savegameId]/team/page.tsx`
- `src/components/layout/navigation-model.ts`
- `src/components/team/team-section-navigation.tsx`
- `src/components/team/team-chemistry-model.ts`
- `src/components/team/team-chemistry-model.test.ts`
- `docs/gui/team-chemistry-implementation-report.md`

## Tests
- `npx vitest run src/components/team/team-chemistry-model.test.ts`
  - Ergebnis: Grün, 1 Testdatei, 4 Tests
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün
- `curl -I -b /tmp/afbm-development-cookies.txt http://127.0.0.1:3102/app/savegames/e2e-savegame-minimal/team/chemistry`
  - Ergebnis: Grün, HTTP 200
  - Hinweis: Dev-Server loggt bestehende Next/Auth Dynamic-API-Warnungen im Auth/Layout-Kontext; der Chemistry Screen antwortet stabil.

## Abgedeckte Szenarien
- Fehlender Teamkontext liefert stabilen Empty-State.
- Offense, Defense und Special Teams werden anhand vorhandener Positionen gruppiert.
- Captains und High-Morale-Spieler erscheinen als positive Einfluesse.
- Fatigue und Injury erscheinen als Risiko-Signale.
- Missing Scheme Fit faellt stabil auf neutralen Fallback zurueck.
- Tone-Klassifikation fuer Chemistry Scores ist getestet.

## Offene Punkte
- Keine echte Relationship-/Network-Ansicht.
- Keine historischen Chemistry-Trends.
- Kein Einfluss auf Match Engine oder Player Development.
- Keine Persistenz und keine neuen Chemistry-Felder.

## Statusprüfung
- Einfache Chemistry-Anzeige sichtbar: Ja
- Offense / Defense Gruppen sichtbar: Ja
- Einflussfaktoren sichtbar: Ja
- Nur vorhandene/einfache Daten genutzt: Ja
- Keine Engine-Änderung: Ja
- Tests grün: Ja
- Route geprüft: Ja

Status: Grün
