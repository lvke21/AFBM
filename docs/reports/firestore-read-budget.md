# Firestore Read Budget

Datum: 2026-05-03  
Status: Required Gate geeignet und in `npm run release:check` als blockierender Schritt aufgenommen.

## Executive Summary

Firestore Reads sind jetzt ueber `scripts/firestore-usage-measure.ts` fuer die relevanten Multiplayer-Flows messbar und ueber `npm run firestore:read-budget` blockierend pruefbar.

Der Messlauf lief lokal gegen den Firestore Emulator `demo-afbm` mit frischer Savegame- und Multiplayer-Fixture. Es wurden keine Staging- oder Production-Daten verwendet.

Aktueller Messlauf vom 2026-05-03 gegen den Firestore Emulator:

- Online Dashboard ist niedrig: `9 Reads`.
- Online League Load ist niedrig: `12 Reads`.
- Online Draft ist reduziert: `121 Reads`.
- Haupttreiber war `leagues/{leagueId}/draft/main/availablePlayers` mit `504 Reads`; normale League Loads laden diesen Pool nicht mehr, Draft initial laedt die ersten `120` Available-Player-Docs.
- Gegenueber der roten Vorher-Messung sinkt Online League Load von ca. `516` auf `12 Reads` und Online Draft von ca. `505` auf `121 Reads`.

Entscheidung: Das Firestore Read Budget ist fuer die drei Online-Core-Flows stabil genug als Required Gate. Das Gate blockiert, wenn einer der gemessenen Flows sein Zielbudget ueberschreitet oder ein Flow fehlt.

## Messkommando

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools emulators:exec --only firestore --project demo-afbm "npm run firebase:usage:measure"
```

Hinweis: In der Codex-Sandbox scheitert der Emulator-Port-Bind erwartbar mit `EPERM`; der Messlauf wurde anschliessend ausserhalb der Sandbox ausgefuehrt.

## Gate-Kommando

```bash
npm run firestore:read-budget
```

Das Gate startet den Firestore Emulator, fuehrt die Usage-Messung aus und prueft diese Zielbudgets:

| Flow | Blockierendes Budget |
| --- | ---: |
| Online Dashboard | <= 25 Reads |
| Online League Load | <= 150 Reads |
| Online Draft | <= 150 Reads |

`npm run release:check` fuehrt dieses Gate jetzt als blockierenden Schritt nach `Bundle Size` und vor `Vitest` aus.

## Baseline

| Flow | Reads | Writes | Deletes | Status |
| --- | ---: | ---: | ---: | --- |
| Online Dashboard | 9 | 0 | 0 | OK |
| Online League Load | 12 | 0 | 0 | OK |
| Online Draft | 121 | 0 | 0 | Beobachten |

## Read Budgets

| Flow | Zielbudget | Warnung | Aktuell | Bewertung |
| --- | ---: | ---: | ---: | --- |
| Online Dashboard | <= 25 | > 25 | 9 | OK |
| Online League Load | <= 150 | > 250 | 12 | OK |
| Online Draft | <= 150 | > 250 | 121 | OK, aber weiter optimierbar |

Die Zielbudgets sind bewusst knapp gehalten, weil ein Core-Loop-Seitenwechsel nicht hunderte Dokumente laden sollte. Draft bleibt wegen des initialen Available-Player-Fensters weiter beobachtungspflichtig.

## Detailmessung

### Online Dashboard

| Query | Collection | Reads |
| --- | --- | ---: |
| `online-dashboard-lobbies` | `leagues` | 1 |
| `online-dashboard-user-mirror-index` | `leagueMembers` | 0 |
| `online-dashboard-public-lobby-teams` | `leagues/{leagueId}/teams` | 8 |

Bewertung: aktuell gut. Risiko entsteht, wenn viele Lobby-Ligen gleichzeitig jeweils ihre komplette Team-Collection laden.

### Online League Load

| Query | Collection | Reads |
| --- | --- | ---: |
| `online-league-load-league-doc` | `leagues` | 1 |
| `online-league-load-memberships` | `leagues/{leagueId}/memberships` | 0 |
| `online-league-load-teams` | `leagues/{leagueId}/teams` | 8 |
| `online-league-load-events-limit-20` | `leagues/{leagueId}/events` | 2 |
| `online-league-load-draft-doc` | `leagues/{leagueId}/draft` | 1 |
| `online-league-load-draft-picks` | `leagues/{leagueId}/draft/main/picks` | 0 |
| `online-league-load-draft-available-players` | `leagues/{leagueId}/draft/main/availablePlayers` | 0 |

Bewertung: OK. Der allgemeine League Load zieht den Draft-Available-Player-Pool nicht mehr mit.

### Online Draft

| Query | Collection | Reads |
| --- | --- | ---: |
| `online-draft-main-doc` | `leagues/{leagueId}/draft` | 1 |
| `online-draft-picks` | `leagues/{leagueId}/draft/main/picks` | 0 |
| `online-draft-available-players` | `leagues/{leagueId}/draft/main/availablePlayers` | 120 |

Bewertung: im Budget, aber weiter optimierbar. Der Draft liest initial ein begrenztes Available-Player-Fenster statt den gesamten Pool.

## Kritische Queries

1. `leagues/{leagueId}/draft/main/availablePlayers`

   Aktuell `0 Reads` im League Load und `120 Reads` im Draft-Initial-Load. Das bleibt der groesste Einzelposten im Draft, ist aber nicht mehr der League-Load-Blocker.

2. Full League Snapshot

   Normale Route-State-Loads lesen Core League, Teams, Events, Draft Doc und Picks, aber keine Available Players mehr. Subscription-Folgeupdates bleiben separat zu beobachten.

3. Dashboard Lobby Team Fanout

   Aktuell harmlos (`8 Reads`), aber skaliert mit `LobbyCount * TeamsPerLobby`. Fuer mehrere offene Ligen sollte ein Lobby-Summary-Doc statt kompletter Team-Collection genutzt werden.

## Offene Performance-Risiken

1. Draft Available Players sind mit `120 Reads` weiterhin der groesste Online-Einzelposten. Naechstes Reduktionspaket: echte Pagination oder Positions-/Suchfenster.
2. Subscription-Read-Kosten sind noch nicht getrennt budgetiert. Naechstes Reduktionspaket: Messung fuer initiale Subscription, Core-Update und Draft-Update.
3. Dashboard-Lobby-Team-Fanout skaliert mit `LobbyCount * TeamsPerLobby`. Naechstes Reduktionspaket: Lobby-Summary-Doc fuer freie Slots und Teamzaehler.
4. Das Required Gate deckt aktuell die drei Online-Core-Flows ab, nicht alle Savegame-/Singleplayer-Flows im Usage-Script.

## Checks

| Check | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| Firestore Usage Messlauf | Gruen |
| `npm run firestore:read-budget` | Gruen |
