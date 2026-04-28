# Player Profile Implementation Report

## Status
Gruen

## Route / Screen
- Route: `/app/savegames/[savegameId]/players/[playerId]`
- Einstieg aus Roster: `Profil oeffnen` im Roster Quick Info / Action-Kontext.
- Einstieg aus Depth Chart: Spielernamen im Depth Chart verlinken direkt auf das Profil.
- Rueckweg: sichtbare Links zu Team, Roster und Depth Chart im Profilkopfbereich.

## Umgesetzte Bereiche

### Basisdaten
- Name, Position, Alter, Years Pro, Groesse, Gewicht, Status und Teamkontext im Header.
- Top-StatCards:
  - Position
  - OVR / POT
  - Team
  - Status
  - einfache Bewertung

### Ratings
- Core Ratings:
  - OVR
  - POT
  - PHY
  - MENT
  - OFF
  - DEF
  - ST
- Focus Ratings aus vorhandenen Spotlight-Ratings.
- Composite Ratings aus vorhandenen Player-Ratings.
- Attributgruppen werden nur angezeigt, wenn vorhandene Daten existieren.

### Vertrag
- Contract Summary zeigt vorhandene Vertragsdaten:
  - Yearly Salary
  - Laufzeit
  - Cap Hit
  - Signing Bonus
  - Signed Date
- Kein neuer Contract-/Finance-Flow wurde ergaenzt.

### Kontext
- Team / Rolle sichtbar im Header und Decision Profile.
- Rosterstatus und Depth-Chart-Position im Entscheidungskontext.
- Scheme Fit, Morale, Fatigue, Development Focus und Captain-Status werden aus bestehenden Daten angezeigt.

### Einfache Bewertung
- Neues Model: `getPlayerDecisionEvaluation`.
- Moegliche Entscheidungssignale:
  - `Starker Starter`
  - `Solider Backup`
  - `Entwicklungsspieler`
  - `Roster-Tiefe`
- Die Bewertung nutzt nur vorhandene Daten:
  - Alter
  - OVR / POT
  - Rosterstatus
  - Depth-Chart-Slot
  - Scheme-Fit-Score

### Performance
- Positionsabhaengiger Quick Snapshot:
  - QB: Completions, Passing Yards, TD/INT
  - OL: Block Snaps, Allowed, Pancakes
  - Defense: Tackles, Sack/INT, PD
  - Specialists: FG, Punts, Return TD
  - Skill Player: Yards, Receptions, Touchdowns
- Season-/Career-Detailansicht bleibt darunter erhalten.

## Verwendete Datenquellen
- `getPlayerDetailForUser`
- `PlayerDetail`
- Bestehende Felder:
  - `evaluation`
  - `attributeGroups`
  - `currentContract`
  - `roster`
  - `teamSchemes`
  - `schemeFitScore`
  - `latestSeason`
  - `career`
  - `history`

## Geaenderte Dateien
- `src/app/app/savegames/[savegameId]/players/[playerId]/page.tsx`
- `src/components/player/player-detail-model.ts`
- `src/components/player/player-detail-model.test.ts`
- `src/components/team/depth-chart-view.tsx`
- `docs/gui/player-profile-implementation-report.md`

## Tests
- `npx vitest run src/components/player/player-detail-model.test.ts src/components/player/player-role-model.test.ts src/components/player/player-value-model.test.ts src/components/team/depth-chart-model.test.ts src/components/team/roster-model.test.ts`
  - Ergebnis: Gruen, 5 Testdateien, 42 Tests
- `npx tsc --noEmit`
  - Ergebnis: Gruen
- `npm run lint`
  - Ergebnis: Gruen

## Offene Punkte
- Keine Edit-Actions im Player Profile; Entscheidungen laufen weiter ueber Roster, Depth Chart, Contracts und Trades.
- Keine neuen Datenquellen, Persistenzlogik oder Engine-Logik.
- Kein neues Charting; der Screen bleibt als Entscheidungsgrundlage bewusst datenfokussiert.

## Statuspruefung
- Basisdaten sichtbar: Ja
- Ratings sichtbar: Ja
- wichtigste Attribute sichtbar, falls vorhanden: Ja
- Vertrag sichtbar: Ja
- Team / Rolle sichtbar: Ja
- Depth Chart Position sichtbar: Ja
- einfache Bewertung sichtbar: Ja
- Einstieg aus Roster vorhanden: Ja
- Einstieg aus Depth Chart vorhanden: Ja
- Rueckweg klar sichtbar: Ja
- Keine neuen Systeme: Ja

Status: Gruen
