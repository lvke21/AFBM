# Multiplayer Auto-Draft Report

## Ziel

Auto-Draft/Backfill fuer die bestehende Staging-Testliga `afbm-multiplayer-test-league`.

Der Workflow ergaenzt fehlende Teams auf 8 Teams und verteilt den vorhandenen Spielerpool positionslogisch auf alle Teams, ohne bestehende Manager-Zuordnungen, Memberships oder Auth-Daten zu loeschen.

## Geaenderte Dateien

- `scripts/seeds/multiplayer-auto-draft-staging.ts`
- `package.json`
- `docs/reports/multiplayer-auto-draft-report.md`

## Vorheriger Zustand

Beim ausgefuehrten Staging-Lauf:

- Liga: `afbm-multiplayer-test-league`
- Teams vor Backfill: 8
- Memberships vor Backfill: 2
- Manager-Teams vor Backfill: 2
- Verfuegbare Spieler vor Backfill: 504
- Bestehende Picks vor Backfill: 0

Hinweis: Die Aufgabenbeschreibung ging von 3 bestehenden Manager-Teams aus. Staging enthielt beim Lauf tatsaechlich 2 Memberships/Manager-Team-Zuordnungen. Das Script hat keine Memberships erzeugt oder geloescht und beide vorhandenen Manager-Teams erhalten.

## Erhaltene Manager-Teams

Das Script liest vor dem Write:

- `leagues/{leagueId}/teams/{teamId}.assignedUserId`
- `leagues/{leagueId}/memberships/{uid}.teamId`

Diese Zuordnungen werden validiert und beim Team-Write beibehalten. Team-IDs, Teamnamen und Membership-Dokumente werden nicht geloescht oder umgeschrieben.

Beim Staging-Lauf erhalten:

| Team-ID | assignedUserId | Membership |
| --- | --- | --- |
| `basel-rhinos` | `KFy5PrqAzzP7vRbfP4wIDamzbh43` | `KFy5PrqAzzP7vRbfP4wIDamzbh43` |
| `bern-wolves` | `8P1NZzM8h0Y5URwrNAw99a4ukxo2` | `8P1NZzM8h0Y5URwrNAw99a4ukxo2` |

## Neu ergaenzte Teams

Wenn weniger als 8 Teams vorhanden sind, werden fehlende Teams aus dem bestehenden Fantasy-Teamkatalog ergaenzt:

- Zurich Guardians / ZUR
- Basel Rhinos / BAS
- Geneva Falcons / GEN
- Bern Wolves / BER
- Lausanne Lions / LAU
- Winterthur Titans / WIN
- St. Gallen Bears / STG
- Lucerne Hawks / LUC

Neue Teams werden ohne `assignedUserId` angelegt und als `ai` markiert.

Beim Staging-Lauf waren bereits 8 Teams vorhanden. Es wurden keine Teams neu angelegt.

## Roster-Verteilung

Roster-Ziel pro Team: 53 Spieler.

Positionsziel pro Team:

| Position | Anzahl |
| --- | ---: |
| QB | 3 |
| RB | 4 |
| WR | 7 |
| TE | 3 |
| OL | 10 |
| DL | 8 |
| LB | 6 |
| CB | 6 |
| S | 4 |
| K | 1 |
| P | 1 |

Die Verteilung nutzt einen deterministischen Snake-Verteiler pro Positionsgruppe. Spieler werden je Position nach `overall`, `potential` und `playerId` sortiert, damit Topspieler gleichmaessig verteilt werden und Re-Runs reproduzierbar bleiben.

## Spieleranzahl und Staerkevergleich

| Team | Spieler | Avg Overall | Positionsprofil |
| --- | ---: | ---: | --- |
| Basel Rhinos / `basel-rhinos` | 53 | 74.8 | QB3 RB4 WR7 TE3 OL10 DL8 LB6 CB6 S4 K1 P1 |
| Bern Wolves / `bern-wolves` | 53 | 74.7 | QB3 RB4 WR7 TE3 OL10 DL8 LB6 CB6 S4 K1 P1 |
| Geneva Falcons / `geneva-falcons` | 53 | 74.7 | QB3 RB4 WR7 TE3 OL10 DL8 LB6 CB6 S4 K1 P1 |
| Lausanne Lions / `lausanne-lions` | 53 | 74.7 | QB3 RB4 WR7 TE3 OL10 DL8 LB6 CB6 S4 K1 P1 |
| Lucerne Hawks / `lucerne-hawks` | 53 | 74.8 | QB3 RB4 WR7 TE3 OL10 DL8 LB6 CB6 S4 K1 P1 |
| St. Gallen Bears / `st-gallen-bears` | 53 | 74.5 | QB3 RB4 WR7 TE3 OL10 DL8 LB6 CB6 S4 K1 P1 |
| Winterthur Titans / `winterthur-titans` | 53 | 74.5 | QB3 RB4 WR7 TE3 OL10 DL8 LB6 CB6 S4 K1 P1 |
| Zurich Guardians / `zurich-guardians` | 53 | 75.0 | QB3 RB4 WR7 TE3 OL10 DL8 LB6 CB6 S4 K1 P1 |

Staerke-Spread: 74.5 bis 75.0 Average Overall.

Verbleibende Free Agents: 80.

## Draft-State

Nach erfolgreichem Backfill:

- `draft/main.status = completed`
- `draft/main.currentTeamId = ""`
- Picks werden in `draft/main/picks` gespeichert.
- Nicht gedraftete Spieler bleiben in `draft/main/availablePlayers` als Free Agents.
- `league.status = active`
- `league.settings.foundationStatus = roster_ready`
- `league.settings.draftExecuted = true`

## Command

```bash
npm run seed:multiplayer:auto-draft:staging
```

Der Command setzt intern:

```bash
CONFIRM_STAGING_SEED=true USE_FIRESTORE_EMULATOR=false GOOGLE_CLOUD_PROJECT=afbm-staging
```

## Sicherheitsregeln

- Laeuft nur mit `USE_FIRESTORE_EMULATOR=false`.
- Laeuft nur mit `GOOGLE_CLOUD_PROJECT=afbm-staging`.
- Laeuft nur mit `CONFIRM_STAGING_SEED=true`.
- Bearbeitet nur `afbm-multiplayer-test-league`.
- Loescht keine Auth-User.
- Loescht keine Memberships.
- Ueberschreibt keine bestehenden `assignedUserId`.

## Validierung

Das Script validiert vor dem Write:

- genau 8 Teams
- keine doppelten Team-IDs
- bestehende Manager-Team-Zuordnungen bleiben erhalten
- jede Membership fuer ein geschuetztes Manager-Team bleibt auf derselben Team-ID
- 53 Spieler pro Team
- Positionsziele pro Team erfuellt
- keine doppelten gedrafteten Spieler
- Draft-State `completed`

## Testergebnisse

Lokal ausgefuehrt:

- `npx tsc --noEmit` - Gruen
- `npx eslint scripts/seeds/multiplayer-auto-draft-staging.ts scripts/seeds/multiplayer-firestore-env.ts scripts/seeds/multiplayer-test-league-firestore-seed.ts scripts/seeds/multiplayer-player-pool-firestore-seed.ts` - Gruen
- `npx vitest run scripts/seeds/multiplayer-test-league-firestore-seed.test.ts scripts/seeds/multiplayer-player-pool-firestore-seed.test.ts scripts/seeds/multiplayer-firestore-env.test.ts src/lib/online/multiplayer-draft-logic.test.ts src/lib/online/fantasy-draft-service.test.ts` - Gruen, 26 Tests
- `npm run seed:multiplayer:auto-draft:staging` - Gruen, Staging-Backfill ausgefuehrt

## Offene Risiken

- Falls der Staging-Spielerpool kuenftig weniger als die benoetigten Positionsmengen enthaelt, bricht das Script vor dem Write ab.
- Bestehende Team-Roster werden im Testdaten-Backfill deterministisch neu aus dem Spielerpool gesetzt.
- Die Aufgabenbeschreibung nannte 3 bestehende Manager-Teams; Staging enthielt beim Lauf 2. Das Script hat den tatsaechlichen Zustand erhalten und im Output sichtbar gemacht.
