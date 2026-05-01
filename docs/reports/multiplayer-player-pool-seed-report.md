# Multiplayer Player Pool Seed Report

Datum: 2026-05-01

## Spieleranzahl

- Gesamt: 504 Spieler
- Zielabdeckung: 8 Teams plus Draft-/Free-Agent-Reserve
- Team-Zuweisungen: keine
- Draft-Ausfuehrung: keine
- Draft-State: `not_started`
- Speicherort: `leagues/afbm-multiplayer-test-league/draft/main/availablePlayers`

## Positionsverteilung

Das bestehende Online-Fantasy-Draft-Modell nutzt vereinfachte Positionen statt
getrennter OL-/DL-/Safety-Subpositionen. Der Pool folgt deshalb dem vorhandenen
Multiplayer-Modell.

| Position | Anzahl |
| --- | ---: |
| QB | 36 |
| RB | 48 |
| WR | 72 |
| TE | 36 |
| OL | 104 |
| DL | 64 |
| LB | 48 |
| CB | 48 |
| S | 32 |
| K | 8 |
| P | 8 |

## Rating-Verteilung

| Tier | OVR | Anzahl |
| --- | --- | ---: |
| Elite | 90-95 | 12 |
| Stars | 85-89 | 32 |
| Starter | 72-84 | 249 |
| Backups | 60-71 | 145 |
| Prospects | 50-65 | 58 |
| Schwache Free Agents | 45-59 | 8 |

## Attribute

`OnlineContractPlayer` wurde um optionale `attributes` erweitert. Die Seed-Spieler
verwenden positionsrelevante Attributsets, zum Beispiel:

- QB: `throwingPower`, `throwingAccuracy`, `awareness`, `mobility`
- RB: `speed`, `strength`, `carrying`, `agility`
- WR/TE: `catching`, `routeRunning`, `speed`, `release`
- OL: `passBlock`, `runBlock`, `strength`, `awareness`
- DL/LB: `tackling`, `strength`, `blockShedding`, `passRush`
- CB/S: `coverage`, `speed`, `tackling`, `awareness`
- K/P: `kickPower`, `kickAccuracy`

## Seed-Command

- `npm run seed:multiplayer:players`

Der Seed ist deterministisch ueber `afbm-multiplayer-player-pool-v1` und nutzt
stabile Firestore-Dokument-IDs. Mehrfaches Ausfuehren schreibt dieselben Dokumente
per Upsert erneut und erzeugt keine Duplikate.

## Tests

- `npx vitest run scripts/seeds/multiplayer-player-pool-firestore-seed.test.ts scripts/seeds/multiplayer-test-league-firestore-seed.test.ts`: gruen, 11 Tests bestanden.
- `npx tsc --noEmit`: gruen.
- `npx eslint scripts/seeds/multiplayer-player-pool-firestore-seed.ts scripts/seeds/multiplayer-player-pool-firestore-seed.test.ts src/lib/online/online-league-types.ts`: gruen.
- `npm run seed:multiplayer:players`: rot in dieser Umgebung, weil kein Firestore-Emulator unter `127.0.0.1:8080` erreichbar war. Das Script brach nach dem 10s-Timeout ab und schrieb nicht gegen Produktion.

## Risiken

- Der echte Firestore-Schreibpfad muss mit laufendem Emulator erneut ausgefuehrt werden.
- Der Online-Draft nutzt aktuell vereinfachte Positionsgruppen. Granulare Positionsrollen wie LT/LG/C/RG/RT oder FS/SS werden im Multiplayer-Draft-Pool noch nicht separat gespeichert.
- Attribute sind im Online-Vertragsplayer optional, damit bestehende Ligen ohne Attribute weiterhin lesbar bleiben.
- Das Script loescht keine nicht mehr vorgesehenen alten Player-Dokumente unter derselben Draft-Subcollection.
