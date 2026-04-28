# Player Development Implementation Report

## Status
Gruen

## Route / Screen
- Route: `/app/savegames/[savegameId]/development`
- Einstieg: App Shell Navigation `Development`
- Einstieg vom Player Profile: `Entwicklung pruefen` in der Player-Profile-Decision-Section.
- Rueckbezug: Player Development Cards verlinken auf das Player Profile und enthalten einen direkten `Depth Chart Bezug`.
- Rueckwege: Roster und Depth Chart Links im Screen-Kopfbereich.

## Umgesetzte Bereiche

### Development Overview
- StatCards zeigen:
  - Focus Spieler
  - Avg Progress
  - Avg Upside
  - Risk Signals
- Spieler-Karten zeigen den aktuellen Entwicklungsstatus:
  - OVR / POT
  - Progress Richtung Potential
  - Trend
  - Development Feedback
  - Entscheidungskontext

### Trend
- Trend wird aus vorhandenen Daten abgeleitet:
  - `Steigend`
  - `Stagnierend`
  - `Fallend`
- Trendlogik:
  - Starter oder Rotation mit Upside und kontrollierter Fatigue → steigend
  - geringe Nutzung oder kaum Potential-Luecke → stagnierend
  - hohe Fatigue oder Injury Status → fallend

### Development Faktoren
- Pro Spieler werden vier Faktoren sichtbar:
  - Spielzeit
  - Alter
  - Potential
  - Belastung
- Alle Faktoren werden als Progress Bars angezeigt.
- Eingesetzte Daten:
  - `rosterStatus`
  - `depthChartSlot`
  - `seasonLine.gamesPlayed`
  - `age`
  - `positionOverall`
  - `potentialRating`
  - `fatigue`
  - `injuryStatus`

### Zusammenhang mit Entscheidungen
- Bestehende Depth-Chart-Entscheidungen werden interpretiert:
  - Starter-Rolle beschleunigt Entwicklung, erhoeht aber Belastung.
  - Backup-Rolle schuetzt Belastung, verlangsamt aber Fortschritt.
  - Hohe Fatigue macht Starter-Snaps kurzfristig riskant.
- Der Screen fuehrt bewusst zurueck in den Depth Chart, wenn die Entwicklungsentscheidung an Spielzeit haengt.

### Development Feedback
- Sichtbare Feedbacktexte:
  - `Entwickelt sich gut durch Spielzeit`
  - `Stagnation durch geringe Nutzung`
  - `Ueberlastung bremst Entwicklung`
  - `Fokus und kontrollierte Snaps treiben Entwicklung`
  - `Nahe am Entwicklungslimit`
  - `Entwicklung stabil, aber ohne klaren Schub`

### Trainingsfokus
- Nutzer kann `Development Focus` direkt im Screen setzen oder entfernen.
- Die Action nutzt bestehende Roster-Persistenz:
  - `updateRosterAssignmentForUser`
  - vorhandenes `developmentFocus` Feld
  - bestehende Player-History-Erzeugung
- Bestehende Roster-Rolle, Depth-Chart-Slot, Captain Flag und Special Role werden beim Fokuswechsel erhalten.

## Verwendete Datenquellen
- `loadCanonicalTeamPageData`
- `getTeamDetailForUser`
- `TeamDetail.players`
- Bestehende Spielerfelder:
  - `positionOverall`
  - `potentialRating`
  - `developmentFocus`
  - `morale`
  - `fatigue`
  - `schemeFitScore`
  - `injuryStatus`
  - `rosterStatus`
  - `depthChartSlot`
  - `seasonLine.gamesPlayed`

## Geaenderte Dateien
- `src/app/app/savegames/[savegameId]/development/page.tsx`
- `src/components/development/player-development-model.ts`
- `src/components/development/player-development-model.test.ts`
- `docs/gui/player-development-implementation-report.md`

## Tests
- `npx vitest run src/components/development/player-development-model.test.ts src/components/player/player-detail-model.test.ts`
  - Ergebnis: Gruen, 2 Testdateien, 15 Tests
- `npx tsc --noEmit`
  - Ergebnis: Gruen
- `npm run lint`
  - Ergebnis: Gruen

## Abgedeckte Szenarien
- Fehlender Teamkontext liefert stabilen Empty-State.
- Nur aktive Spieler werden als Development-Kandidaten angezeigt.
- Focus-Spieler werden in der Sortierung priorisiert.
- High-Upside Profile werden als relevante Trend-Spieler markiert.
- Progress wird aus OVR/POT stabil gekappt.
- Starter mit Upside und kontrollierter Fatigue trendet steigend.
- Backup mit geringer Nutzung stagniert.
- Ueberlasteter Starter trendet fallend.
- Fatigue wird als Belastungsfaktor und Freshness dargestellt.
- Injury, Fatigue und Morale erzeugen klare Form-Labels.

## Offene Punkte
- Kein komplexer Trainingsplan.
- Keine Staff-Effekte.
- Keine neue Entwicklungssimulation.
- Keine Engine-Outcome-Aenderung.
- Progress ist eine aktuelle UI-Sicht auf vorhandene Ratings, kein historischer Zeitreihenverlauf.

## Statuspruefung
- Development Overview sichtbar: Ja
- Trend sichtbar: Ja
- Progress Bars sichtbar: Ja
- Development Faktoren sichtbar: Ja
- Zusammenhang mit Starter/Backup-Entscheidungen sichtbar: Ja
- Feedback sichtbar: Ja
- Einstieg vom Player Profile vorhanden: Ja
- Rueckbezug zu Depth Chart vorhanden: Ja
- Vorhandene Daten genutzt: Ja
- Keine Engine-Aenderungen: Ja
- Tests gruen: Ja

Status: Gruen
