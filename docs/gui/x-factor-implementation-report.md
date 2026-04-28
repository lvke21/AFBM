# X-Factor Implementation Report

## Status
Grün

## Route / Screen
- Route: `/app/savegames/[savegameId]/team/x-factor`
- Geprüfte E2E-Route: `/app/savegames/e2e-savegame-minimal/team/x-factor`
- Integration: Team Section Navigation und Team Overview Card

## Umgesetzte Bereiche

### Spieler mit X-Factor
- Neuer X-Factor Screen mit sichtbaren Star-Spielern.
- X-Factor Profile werden aus vorhandenen Spielerwerten abgeleitet:
  - OVR
  - Spotlight Ratings
  - Morale
  - Scheme Fit
  - Captain Flag
  - Fatigue
- Spieler werden nach X-Factor Score sortiert.
- Unit Summary zeigt Offense, Defense und Special Teams.

### Bedingungen für Aktivierung
- Jede X-Factor Card zeigt Aktivierungsbedingungen:
  - Aktiver Spieler
  - Healthy
  - Load okay
  - Gameday Role
  - Star Trait
  - Fit & Morale
- Aktivierungsstatus:
  - `Ready`
  - `Limited`
  - `Locked`
- Bedingungen sind reine UI-Erklaerung und schreiben keine Daten.

### Effektbeschreibung
- Jeder X-Factor bekommt eine positions- und traitbasierte Effektbeschreibung.
- Beispiele:
  - `Field General`
  - `Route Breaker`
  - `Pocket Anchor`
  - `Pressure Catalyst`
  - `Coverage Lock`
  - `Special Teams Edge`
- Zusaetzlich wird sichtbarer Einfluss auf:
  - Gameplan Fokus
  - Reliability
  - Team Identity
  dargestellt.

## Verwendete Datenquellen
- `loadCanonicalTeamPageData`
- `getTeamDetailForUser`
- `TeamDetail.players`
- vorhandene Spielerfelder:
  - `positionOverall`
  - `potentialRating`
  - `detailRatings`
  - `morale`
  - `schemeFitScore`
  - `captainFlag`
  - `fatigue`
  - `injuryStatus`
  - `rosterStatus`
  - `depthChartSlot`
  - `positionCode`
  - `secondaryPositionCode`

## Geänderte Dateien
- `src/app/app/savegames/[savegameId]/team/x-factor/page.tsx`
- `src/app/app/savegames/[savegameId]/team/page.tsx`
- `src/components/layout/navigation-model.ts`
- `src/components/team/team-section-navigation.tsx`
- `src/components/team/team-x-factor-model.ts`
- `src/components/team/team-x-factor-model.test.ts`
- `docs/gui/x-factor-implementation-report.md`

## Tests
- `npx vitest run src/components/team/team-x-factor-model.test.ts`
  - Ergebnis: Grün, 1 Testdatei, 4 Tests
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün
- `curl -I -b /tmp/afbm-development-cookies.txt http://127.0.0.1:3102/app/savegames/e2e-savegame-minimal/team/x-factor`
  - Ergebnis: Grün, HTTP 200
  - Hinweis: Dev-Server loggt bestehende Next/Auth Dynamic-API-Warnungen im Auth/Layout-Kontext; der X-Factor Screen antwortet stabil.

## Abgedeckte Szenarien
- Fehlender Teamkontext liefert stabilen Empty-State.
- Star-Spieler werden aus OVR, Spotlight Ratings und Captain-Signal abgeleitet.
- Ready X-Factors erfuellen alle Bedingungen.
- Fatigue und Injury machen Aktivierung sichtbar eingeschraenkt.
- Normale Depth-Spieler werden nicht als X-Factor angezeigt.
- Offense, Defense und Special Teams Unit Summary wird aufgebaut.

## Offene Punkte
- Keine neue Engine-Logik.
- Keine echte Aktivierung oder Persistenz.
- Keine Match-spezifischen Gegnerbedingungen.
- Keine historischen X-Factor Trends.
- Keine Multi-Spieler-Kombinationen.

## Statusprüfung
- Spieler mit X-Factor sichtbar: Ja
- Bedingungen fuer Aktivierung sichtbar: Ja
- Effektbeschreibung sichtbar: Ja
- Nur Darstellung vorhandener Daten: Ja
- Keine Engine-Änderung: Ja
- Tests grün: Ja
- Route geprüft: Ja

Status: Grün
