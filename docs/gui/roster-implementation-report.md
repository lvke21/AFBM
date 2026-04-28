# Roster / Team Management Implementation Report

## Status
Grün

## Route / Screen
- Route: `/app/savegames/[savegameId]/team/roster`
- Geprüfte E2E-Route: `/app/savegames/e2e-savegame-minimal/team/roster`
- Zielscreen: Roster / Team Management Workspace

## Umgesetzte Bereiche

### Roster Table
- Bestehende Roster-Tabelle wurde zum `Roster Command` ausgebaut.
- Spieler werden weiterhin mit Name, Status, Rolle, Rating, Evaluation, Vertrag, Saisonwerten und Aktionen angezeigt.
- Desktop nutzt eine scannbare Tabelle, kleinere Viewports nutzen bestehende Player Cards.

### Filter
- Position-Filter vorhanden.
- Status-Filter vorhanden.
- Neuer Rating-Filter:
  - `Alle Ratings`
  - `80+ OVR`
  - `70-79 OVR`
  - `unter 70 OVR`
- Rollenfilter bleibt erhalten, weil er bereits als vorhandenes Decision-Signal im Roster genutzt wird.
- Sortierung erweitert:
  - Position
  - OVR
  - Status
  - Cap Hit

### Player Quick Info
- Neues Quick-Info-Panel im Roster-Kontext.
- Zeigt:
  - Spielername, Position, Status
  - Role / Value Badges
  - OVR / POT
  - Salary / Cap
  - Decision Signal
  - Saison-Kurzwerte
- Desktop-Tabelle kann per `Quick Info` den fokussierten Spieler wechseln.
- Wenn kein Spieler sichtbar ist, erscheint ein stabiler Empty-State.

### Salary / Cap Übersicht
- Roster-Seite zeigt nun direkte Cap-StatCards:
  - Cap Space
  - Cap Used
- Bestehende `CapOverview` ist direkt im Roster-Screen eingebunden:
  - Cap gebunden
  - Cap Limit
  - Aktiv gebunden
  - Cap Space
  - Cash
  - auslaufende Vertragsrisiken

### Einfache Actions
- Neue UI-Einstiege ohne neue Business-Logik:
  - Depth Chart prüfen
  - Contracts und Cap Hits ansehen
  - Trade Board öffnen
  - Spielerprofil öffnen
- Es wurden keine neuen Server Actions eingeführt.
- Bestehende Release-Action bleibt unverändert vorhanden.

## Verwendete Datenquellen
- `loadCanonicalTeamPageData`
- `getTeamDetailForUser`
- `TeamDetail.players`
- `TeamDetail.contractOutlook`
- `TeamDetail.salaryCapSpace`
- Bestehende Modelle:
  - `getRosterSummary`
  - `getCapSummary`
  - `buildPlayerRole`
  - `buildPlayerValue`

## Geänderte Dateien
- `src/app/app/savegames/[savegameId]/team/roster/page.tsx`
- `src/components/team/roster-table.tsx`
- `src/components/team/roster-model.ts`
- `src/components/team/roster-model.test.ts`

## Browser-Review
Setup:
- E2E-Seed: `npm run test:e2e:seed`
- Dev-Server: `http://127.0.0.1:3101`
- Auth: `/api/e2e/dev-login`

Geprüfter Screenshot:
- `/tmp/afbm-roster-slice-desktop.png`

Ergebnis:
- Roster Command sichtbar.
- Filter rendern stabil.
- Player Quick Info sichtbar.
- Salary / Cap Bereich sichtbar.
- Keine neuen Daten- oder Engine-Abhängigkeiten.

## Testresultate
- `npx vitest run src/components/team/roster-model.test.ts src/components/team/team-overview-model.test.ts`
  - Ergebnis: Grün, 2 Testdateien, 16 Tests
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün

## Offene Punkte
- Filterzustand wird nicht in der URL persistiert.
- Quick Info nutzt lokale Client-Auswahl und schreibt keine Daten.
- Mobile nutzt weiterhin die bestehenden Player Cards; das Quick-Info-Panel ergänzt diese Ansicht, ersetzt sie aber nicht.
- Neue echte Roster-Aktionen wie Role Change, Trade-Erstellung oder Contract-Edit wurden bewusst nicht implementiert.

## Statusprüfung
- Roster Table umgesetzt: Ja
- Filter Position / Rating / Status umgesetzt: Ja
- Player Quick Info umgesetzt: Ja
- Salary / Cap Übersicht umgesetzt: Ja
- Einfache Actions als UI-Einstiege umgesetzt: Ja
- Keine Engine Änderungen: Ja
- Keine komplexen neuen Systeme: Ja
- Nur Darstellung und vorhandene Daten: Ja

Status: Grün
