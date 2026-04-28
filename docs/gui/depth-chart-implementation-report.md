# Depth Chart / Lineup Management Implementation Report

## Status
Grün

## Route / Screen
- Route: `/app/savegames/[savegameId]/team/depth-chart`
- Einstieg: Roster Screen und Team Section Navigation
- Zielscreen: Depth Chart / Lineup Management

## Umgesetzte Bereiche

### Depth Chart Ansicht
- Der Screen ist als `Lineup Board` mit acht Manager-Gruppen aufgebaut:
  - `QB`
  - `RB`
  - `WR`
  - `OL`
  - `DL`
  - `LB`
  - `DB`
  - `ST`
- Innerhalb dieser Gruppen bleiben die echten Positions-Slots sichtbar, z. B. `OL` mit `LT`, `LG`, `C`, `RG`, `RT`.
- Position Groups bleiben vollständig sichtbar, auch wenn keine Spieler auf der Position vorhanden sind.
- Starter und Backups werden über Slot-Karten getrennt dargestellt.
- Starter und Backup-Lanes sind pro Position visuell getrennt.
- Slot #1 ist als Starter-Bereich hervorgehoben.
- Jede Spielerkarte zeigt Name, Rolle, OVR und Roster-Status.

### Lineup Interaktion
- Spieler können innerhalb einer Positionsgruppe per `Slot hoch` / `Slot runter` bewegt werden.
- Besetzte Nachbar-Slots werden als direkter Slot-Tausch persistiert.
- Leere Nachbar-Slots können direkt belegt werden.
- Die bestehende manuelle Slot-/Status-/Rollen-Zuweisung bleibt erhalten.

### Persistenz
- Neue Server Action `moveDepthChartPlayerAction`.
- Neuer Application-Service `moveDepthChartPlayerForUser`.
- Der Service validiert:
  - Spieler existiert im gemanagten Team.
  - Spieler ist game-day eligible.
  - Source Slot ist aktuell.
  - Move ist auf direkte Nachbar-Slots begrenzt.
  - Zielspieler gehört zur gleichen Position.
  - Target Slot ist aktuell.
- Slot-Tausch erfolgt innerhalb einer Transaktion.
- Es wurde keine Game-Engine-Logik geändert.

### Decision Feedback
- Nach einem Move wird sichtbares Action Feedback erzeugt.
- Promotion in einen höheren Slot liefert positives Value Feedback.
- Move nach unten liefert neutrales Rollenfolge-Feedback.
- Feedback enthält immer Impact, Reason und Context.

### Roster Integration
- Der Roster Screen enthält bereits Einstiege zur Depth Chart.
- Der Nutzer kann aus dem Roster-Kontext in die Lineup-Entscheidung wechseln.

## Verwendete Datenquellen
- `loadCanonicalTeamPageData`
- `TeamDetail.players`
- Bestehende Roster-Profile:
  - `positionCode`
  - `positionOverall`
  - `rosterStatus`
  - `depthChartSlot`
  - `captainFlag`
  - `developmentFocus`
  - `secondaryPositionCode`

## Geänderte Dateien
- `src/app/app/savegames/[savegameId]/team/actions.ts`
- `src/app/app/savegames/[savegameId]/team/actions.test.ts`
- `src/app/app/savegames/[savegameId]/team/depth-chart/page.tsx`
- `src/components/team/depth-chart-model.ts`
- `src/components/team/depth-chart-model.test.ts`
- `src/components/team/depth-chart-view.tsx`
- `src/modules/teams/application/team-management.service.ts`
- `src/modules/teams/application/team-roster.service.ts`
- `src/modules/teams/application/team-roster.service.test.ts`
- `e2e/depth-chart.spec.ts`
- `package.json`

## Testresultate
- `npx vitest run src/components/team/depth-chart-model.test.ts 'src/app/app/savegames/[savegameId]/team/actions.test.ts'`
  - Ergebnis: Grün, 2 Testdateien, 15 Tests
- `npx vitest run src/components/team/depth-chart-model.test.ts src/modules/teams/application/team-roster.service.test.ts 'src/app/app/savegames/[savegameId]/team/actions.test.ts'`
  - Ergebnis: Grün, 3 Testdateien, 30 Tests
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün
- `E2E_PORT=3142 npm run test:e2e:depth-chart`
  - Ergebnis: Grün, 1 Test
  - Geprüfter Flow: Roster → Depth Chart → `Slot runter` → sichtbares Feedback → zurück zum Roster
- `curl -I -b /tmp/afbm-depth-cookies.txt http://127.0.0.1:3101/app/savegames/e2e-savegame-minimal/team/depth-chart`
  - Ergebnis: Grün, authentifiziert via `/api/e2e/dev-login`, HTTP 200

## Abgedeckte Szenarien
- Aufbau der acht Manager-Positionsgruppen in Football-Reihenfolge.
- OL- und ST-Sammelgruppen behalten positionsgenaue Untergruppen.
- Move Target nach oben mit besetztem Nachbar-Slot.
- Move Target nach unten mit besetztem Nachbar-Slot.
- Move in leeren Nachbar-Slot.
- E2E: Starter aus Slot #1 in leeren Backup-Slot #2 verschieben.
- E2E: Nach der Änderung wird `Depth Chart Reihenfolge aktualisiert` sichtbar.
- E2E: Rückweg zum Roster zeigt die geänderte Depth-Reihenfolge (`QB #2`).
- Keine Move-Aktion am oberen/unteren Rand.
- Keine Move-Aktion fuer nicht zugewiesene oder inaktive Spieler.
- Persistierter Slot-Tausch innerhalb gleicher Position.
- Ablehnung von Moves ueber Positionsgrenzen hinweg.
- Ablehnung von nicht benachbarten Slot-Spruengen.
- Action Feedback mit stabilem Value-Feedback-Vertrag.

## Offene Punkte
- Kein Drag & Drop; bewusst einfache Button-Interaktion.
- Keine neue Playtime- oder Rotation-Engine.
- Kein eigener Screenshot-Report fuer diesen Slice; Route wurde per HTTP 200 und per Playwright-Smoke geprueft.
- Konflikt-Auflösung bleibt weiterhin über bestehende Freimachen-/Zuweisen-Aktionen sichtbar.

## Statusprüfung
- Depth Chart pro Manager-Positionsgruppe umgesetzt: Ja
- Positionsgenaue Untergruppen innerhalb `QB`, `RB`, `WR`, `OL`, `DL`, `LB`, `DB`, `ST`: Ja
- Starter und Backups klar sichtbar: Ja
- Spieler innerhalb Positionsgruppe verschiebbar: Ja
- Roster-Einstieg vorhanden: Ja
- Bestehende Team-Daten genutzt: Ja
- Keine Game Engine Änderungen: Ja
- Keine komplexen neuen Systeme: Ja
- Tests grün: Ja

Status: Grün
