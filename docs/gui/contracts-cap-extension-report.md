# Contracts / Salary Cap Extension Report

## Status
Grün

## Route / Screen
- Erweiterte Route: `/app/savegames/[savegameId]/team/roster`
- Geprüfte E2E-Route: `/app/savegames/e2e-savegame-minimal/team/roster`
- Integration: Roster Screen, Roster Table, Mobile Player Cards, Player Quick Info und rechte Cap-Spalte

## Umgesetzte Bereiche

### Vertragsübersicht pro Spieler
- Roster Table zeigt pro Spieler:
  - Cap Hit prominent
  - Vertragslaufzeit
  - Salary
  - Cap-Anteil am Cap Limit
  - Risiko-Badge
- Mobile Player Cards zeigen dieselben Contract-Signale kompakt.
- Player Quick Info wurde um Contract Risk, Cap Share und Risikobeschreibung erweitert.

### Cap Hit sichtbar
- Cap Hit ist in der Contract-Spalte nicht mehr nur sekundärer Text, sondern der primäre Contract-Wert.
- Top-Cap-Hits werden zusätzlich im neuen Sidebar-Panel angezeigt.
- Cap-Anteil wird aus bestehendem `activeCapCommitted + salaryCapSpace` abgeleitet.

### Auslaufende Verträge
- Auslaufende Verträge werden visuell hervorgehoben:
  - Table Row erhält Amber-Hintergrund
  - Contract Badge `Auslaufend` oder `High Risk`
  - Sidebar-Sektion `Auslaufende Vertraege`
- Die Sidebar nutzt vorhandene Daten aus `team.contractOutlook`.

### Risikoindikatoren
- Neue einfache UI-Indikatoren:
  - `Stabil`
  - `Hoher Cap`
  - `Auslaufend`
  - `High Risk`
  - `Kein Vertrag`
- Die Indikatoren nutzen nur vorhandene Felder:
  - `currentContract.years`
  - `currentContract.capHit`
  - `contractOutlook.activeCapCommitted`
  - `salaryCapSpace`
  - `contractOutlook.expiringPlayers`
  - `contractOutlook.expiringCap`
- Keine Engine-, Vertrags- oder Persistenzlogik wurde geändert.

## Verwendete Datenquellen
- `TeamDetail.players`
- `TeamPlayerSummary.currentContract`
- `TeamDetail.contractOutlook`
- `TeamDetail.salaryCapSpace`
- Bestehende Roster-Daten aus `loadCanonicalTeamPageData`

## Geänderte Dateien
- `src/app/app/savegames/[savegameId]/team/roster/page.tsx`
- `src/components/team/contract-cap-risk-panel.tsx`
- `src/components/team/player-card.tsx`
- `src/components/team/roster-table.tsx`
- `src/components/team/roster-model.ts`
- `src/components/team/roster-model.test.ts`
- `docs/gui/contracts-cap-extension-report.md`

## Tests
- `npx vitest run src/components/team/roster-model.test.ts`
  - Ergebnis: Grün, 11 Tests
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün
- `curl -I -b /tmp/afbm-development-cookies.txt http://127.0.0.1:3102/app/savegames/e2e-savegame-minimal/team/roster`
  - Ergebnis: Grün, HTTP 200
  - Hinweis: Dev-Server loggt bestehende Next/Auth Dynamic-API-Warnungen im Auth/Layout-Kontext; der Roster Screen antwortet stabil.

## Abgedeckte Szenarien
- Spieler ohne Vertrag erhalten stabilen `Kein Vertrag`-Indikator.
- Auslaufende Verträge werden als Risiko markiert.
- Auslaufender Vertrag mit hohem Cap-Anteil wird als `High Risk` markiert.
- Hoher Cap Hit ohne auslaufenden Vertrag wird als `Hoher Cap` markiert.
- Contract Snapshot zählt Verträge, auslaufende Verträge, Spieler ohne Vertrag und Top-Cap-Hits.
- Sortierung und bestehende Roster-Filter bleiben unverändert.

## Offene Punkte
- Keine neuen Vertragsaktionen im Roster Screen.
- Keine neue Cap-Projektion über mehrere Jahre.
- Keine neue Vertragsberechnung oder Salary-Cap-Regel.
- Die Risikoindikatoren sind bewusst einfache UI-Signale, keine Finanzsimulation.

## Statusprüfung
- Vertragsübersicht pro Spieler sichtbar: Ja
- Cap Hit sichtbar: Ja
- Auslaufende Verträge hervorgehoben: Ja
- Einfache Risikoindikatoren sichtbar: Ja
- Roster Screen erweitert: Ja
- Nur vorhandene Daten genutzt: Ja
- Keine neue Logik/Persistenz: Ja
- Tests grün: Ja

Status: Grün
