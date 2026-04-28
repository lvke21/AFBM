# Contracts / Salary Cap Implementation Report

## Status
Gruen

## Route / Screen
- Route: `/app/savegames/[savegameId]/team/contracts`
- Einstieg:
  - Team Navigation `Contracts`
  - Roster Quick Info `Vertrag ansehen`
  - Player Profile Contract Summary verweist fachlich auf dieselben Daten
- Rueckwege / Integration:
  - Roster Link
  - Development Link
  - Player Profile Links pro Spieler

## Umgesetzte Bereiche

### Contract Overview
- Contract Table zeigt pro Spieler:
  - Name
  - Position / Rolle / Depth-Chart-Slot
  - Laufzeit
  - Salary
  - Cap Hit
  - Cap-Anteil
  - Decision Impact
- Spieler sind direkt mit dem Player Profile verlinkt.
- Development ist direkt aus jeder Contract-Zeile erreichbar.

### Cap Summary
- Top StatCards zeigen:
  - Contracts
  - Total Cap Hit
  - Cap Used
  - Expiring inkl. Expiring Cap
- `CapOverview` ist direkt auf dem Contracts Screen sichtbar:
  - Cap Limit
  - aktiv gebundener Cap
  - Cap Space
  - Cash
  - auslaufende Verpflichtungen
- `ContractCapRiskPanel` zeigt Top-Cap-Hits, auslaufende Vertrage und fehlende Contract-Daten.

### Risiko-Indikatoren
- Neues Model: `getContractDecisionSignal`.
- Sichtbare Signale:
  - `Teuer fuer Leistung`
  - `Value Contract`
  - `Bald auslaufend`
  - `Kein Vertrag`
  - `Stabil`
- Signale kombinieren vorhandene Daten:
  - Cap Hit
  - Cap Limit
  - OVR
  - POT
  - Alter
  - Rosterstatus
  - Laufzeit

### Decision Impact
- Jede Contract-Zeile beantwortet:
  - Kann ich mir diese Rolle zu diesem Preis leisten?
  - Soll ich ihn behalten, verlaengern oder Ersatz vorbereiten?
  - Ist der Spieler guenstig genug, um Entwicklung und Rolle zu rechtfertigen?
- Die Screen-Einleitung macht den Trade-off explizit:
  - Leistung
  - Entwicklung
  - Kosten

### Bestehende Actions
- Bestehende Contract-Actions bleiben erhalten:
  - Vertrag verlaengern
  - Spieler releasen
- Keine neue Vertragsverwaltung oder Cap-Regel wurde eingefuehrt.

## Verwendete Datenquellen
- `loadCanonicalTeamPageData`
- `TeamDetail.players`
- `TeamDetail.contractOutlook`
- `TeamDetail.salaryCapSpace`
- Bestehende Felder:
  - `currentContract.years`
  - `currentContract.yearlySalary`
  - `currentContract.signingBonus`
  - `currentContract.capHit`
  - `positionOverall`
  - `potentialRating`
  - `age`
  - `rosterStatus`
  - `depthChartSlot`

## Geaenderte Dateien
- `src/app/app/savegames/[savegameId]/team/contracts/page.tsx`
- `src/components/team/contract-table.tsx`
- `src/components/team/team-overview-model.ts`
- `src/components/team/team-overview-model.test.ts`
- `docs/gui/contracts-implementation-report.md`

## Tests
- `npx vitest run src/components/team/team-overview-model.test.ts src/components/team/roster-model.test.ts src/components/player/player-detail-model.test.ts src/components/development/player-development-model.test.ts`
  - Ergebnis: Gruen, 4 Testdateien, 34 Tests
- `npx tsc --noEmit`
  - Ergebnis: Gruen
- `npm run lint`
  - Ergebnis: Gruen

## Grenzen
- Keine neue Engine-Logik.
- Keine neue Contract-/Cap-Persistenz.
- Keine mehrjaehrige Cap-Projektion ueber kommende Seasons.
- Signale sind UI-Interpretationen vorhandener Daten, keine automatischen GM-Empfehlungen.

## Statuspruefung
- Contract Overview sichtbar: Ja
- Salary / Laufzeit / Cap Hit sichtbar: Ja
- teure Spieler hervorgehoben: Ja
- auslaufende Vertraege hervorgehoben: Ja
- Cap Summary sichtbar: Ja
- kommende Verpflichtungen einfach sichtbar: Ja
- Risiko-Indikatoren sichtbar: Ja
- Verknuepfung mit Player Profile: Ja
- Verknuepfung mit Roster: Ja
- Verknuepfung mit Development: Ja
- Decision Impact sichtbar: Ja
- Tests gruen: Ja

Status: Gruen
