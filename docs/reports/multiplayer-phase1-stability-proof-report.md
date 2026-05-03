# Multiplayer Phase 1 Stability Proof Report

Datum: 2026-05-03

## Executive Summary

Phase 1 stabil: **Nein**

Der Golden Path ist nach einem expliziten Reset einmal gruen durchgelaufen: Auth, Admin Week Simulation und Playability Smoke haben Ergebnisse erzeugt, Standings geschrieben, `currentWeek` erhoeht, Ready zurueckgesetzt und keine aktiven `simulating` Locks hinterlassen.

Der geforderte Beweis "Run 1, Run 2, Run 3 ohne Zwischen-Reset reproduzierbar gruen" ist aber **nicht erfuellt**. Run 2 und Run 3 stoppen bei den mutierenden Smokes erwartbar rot im Preflight, weil die Smoke-Scripts nur den frisch geseedeten Zustand `currentWeek=1` und `resultsCount=0` als Startzustand akzeptieren. Wichtig: Dabei wurde keine Mutation ausgefuehrt, es entstanden keine stale Locks und keine Woche ohne Spiele.

Zusaetzlicher harter Befund: lokaler HEAD ist `39746332031b6bf544971835e9a9b65891ad1ad8`, Staging liefert aber `1a28d88eaaa99a182612638652d0165705ce6901`. Damit ist der aktuelle lokale Stand nicht als Staging-deployed bewiesen.

Phase 2 freigegeben: **Nein**

## Commit / Revision

| Feld | Wert |
| --- | --- |
| Lokaler HEAD | `39746332031b6bf544971835e9a9b65891ad1ad8` |
| Staging Commit | `1a28d88eaaa99a182612638652d0165705ce6901` |
| Revision | `afbm-staging-backend-build-2026-05-03-000` |
| Build Time | `2026-05-02T19:42:39Z` |
| Environment | `staging` |
| Firebase Project | `afbm-staging` |

Build-Info Payload:

```json
{
  "ok": true,
  "commit": "1a28d88eaaa99a182612638652d0165705ce6901",
  "buildTime": "2026-05-02T19:42:39Z",
  "environment": "staging",
  "revision": "afbm-staging-backend-build-2026-05-03-000",
  "version": "0.1.0",
  "deployEnv": "staging",
  "firebaseProjectId": "afbm-staging"
}
```

## Commands

Build-Info:

```bash
curl -sS https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app/api/build-info
```

Run 1:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:auth -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_SEED=true CONFIRM_STAGING_PLAYABILITY_SEED=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --reset-before-run --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_PLAYABILITY_SMOKE=true CONFIRM_STAGING_SEED=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:playability -- --reset-before-run --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
```

Run 2:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:auth -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_PLAYABILITY_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:playability -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
```

Run 3:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:auth -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_PLAYABILITY_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:playability -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
```

State Reads:

```bash
GOOGLE_CLOUD_PROJECT=afbm-staging npx tsx -e "<read-only Firestore state dump using scripts/staging-smoke-state.ts>"
```

## Ergebnisse je Run

| Run | Smoke | Ergebnis | Diagnose |
| --- | --- | --- | --- |
| 1 | `staging:smoke:auth` | GREEN | Login/Auth, Admin API, League Load und User-Team-Link ok. Vor Reset war die Admin-Testliga bereits auf Woche 2. |
| 1 | `staging:smoke:admin-week --reset-before-run` | GREEN | Reset genutzt; `setAllReady` und `simulateWeek` ok; `week=1`, `nextWeek=2`, `games=4`; Reload ok mit `standings=8`, `results=4`. |
| 1 | `staging:smoke:playability --reset-before-run` | GREEN | Reset genutzt; eigenes Team erkannt; `setAllReady` ok; `simulateWeek` ok mit `games=2`, `nextWeek=2`; Reload ok mit `standings=4`, `results=2`. |
| 2 | `staging:smoke:auth` | GREEN | Read-only Flow ok auf Woche 2. |
| 2 | `staging:smoke:admin-week` | EXPECTED RED | Preflight stoppt vor Mutation: `expected-currentWeek=1 got=2; expected-resultsCount=0 got=4`. |
| 2 | `staging:smoke:playability` | EXPECTED RED | Preflight stoppt vor Mutation: `expected-currentWeek=1 got=2; expected-resultsCount=0 got=2`. |
| 3 | `staging:smoke:auth` | GREEN | Read-only Flow ok auf Woche 2. |
| 3 | `staging:smoke:admin-week` | EXPECTED RED | Gleiche saubere Diagnose wie Run 2; keine Mutation. |
| 3 | `staging:smoke:playability` | EXPECTED RED | Gleiche saubere Diagnose wie Run 2; keine Mutation. |

## State nach jedem Run

### Run 1

| League | currentWeek | lastScheduledWeek | currentWeekGames | weekStatus | completedWeeks | resultsCount | standingsCount | readyCount | simulation locks |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| `afbm-multiplayer-test-league` | 2 | 7 | 4 | `pre_week` | 1 | 4 | 8 | 0/8 | none |
| `afbm-playability-test` | 2 | 3 | 2 | `pre_week` | 1 | 2 | 4 | 0/4 | none |

### Run 2

| League | currentWeek | lastScheduledWeek | currentWeekGames | weekStatus | completedWeeks | resultsCount | standingsCount | readyCount | simulation locks |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| `afbm-multiplayer-test-league` | 2 | 7 | 4 | `pre_week` | 1 | 4 | 8 | 0/8 | none |
| `afbm-playability-test` | 2 | 3 | 2 | `pre_week` | 1 | 2 | 4 | 0/4 | none |

Run 2 hat den State gegenueber Run 1 nicht veraendert. Die mutierenden Smokes brachen im Preflight vor `setAllReady` und `simulateWeek` ab.

### Run 3

| League | currentWeek | lastScheduledWeek | currentWeekGames | weekStatus | completedWeeks | resultsCount | standingsCount | readyCount | simulation locks |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| `afbm-multiplayer-test-league` | 2 | 7 | 4 | `pre_week` | 1 | 4 | 8 | 0/8 | none |
| `afbm-playability-test` | 2 | 3 | 2 | `pre_week` | 1 | 2 | 4 | 0/4 | none |

Run 3 hat den State gegenueber Run 2 nicht veraendert. Es entstanden keine aktiven `simulating` Locks.

## Lock-Status

| Check | Ergebnis |
| --- | --- |
| Stale `simulating` Locks nach Run 1 | Keine |
| Stale `simulating` Locks nach Run 2 | Keine |
| Stale `simulating` Locks nach Run 3 | Keine |
| Bestehende `simulated` Locks versehentlich auf `failed` gesetzt | Nicht durch diese Smoke-Runs nachgewiesen |
| Fehlerpfad nach Lock-Erstellung live getestet | Nein |

Die drei Smoke-Runs beweisen, dass der normale erfolgreiche Pfad und die Preflight-Abbruchpfade keine aktiven `simulating` Locks hinterlassen. Sie beweisen nicht vollstaendig den Fehlerpfad "Lock wurde erstellt, danach tritt ein unerwarteter Simulationsfehler auf", weil dieser Pfad in den Runs nicht ausgelöst wurde.

## Woche ohne Spiele

| League | currentWeek | lastScheduledWeek | currentWeekGames | Bewertung |
| --- | ---: | ---: | ---: | --- |
| `afbm-multiplayer-test-league` | 2 | 7 | 4 | OK |
| `afbm-playability-test` | 2 | 3 | 2 | OK |

Es gibt nach den Runs keine Liga mit `currentWeek > lastScheduledWeek` und keine `pre_week`-Woche ohne Spiele.

## Entscheidung

Phase 1 stabil: **Nein**

Begruendung:

- Der Core Golden Path laeuft nach Reset gruen.
- Der State nach Simulation ist konsistent: Woche erhoeht, Ergebnisse vorhanden, Standings vorhanden, Ready zurueckgesetzt, keine aktiven Locks.
- Run 2 und Run 3 laufen fuer die mutierenden Smokes aber nicht gruen, sondern erwartbar rot, weil die Scripts nur einen frisch geseedeten Woche-1-Zustand als Startzustand akzeptieren.
- Der aktuelle lokale HEAD ist nicht der live deployte Staging-Commit. Damit ist "nach Lock-Fix" auf Staging nur fuer den deployten Commit `1a28d88eaaa99a182612638652d0165705ce6901` belegbar, nicht fuer `39746332031b6bf544971835e9a9b65891ad1ad8`.

Phase 2 freigegeben: **Nein**

No-Go-Kriterien:

- Kein dreimal gruener mutierender Smoke ohne Reset.
- Kein Staging-Beweis fuer den aktuellen lokalen HEAD.
- Kein Live-Beweis fuer Fehlerpfade nach Lock-Erstellung.

## Naechste minimale Schritte

1. Den Commit mit dem Lock-Cleanup-Fix nach Staging deployen und `/api/build-info` auf diesen Commit pruefen.
2. Entscheiden, ob mutierende Smokes idempotent weiter zur naechsten spielbaren Woche simulieren sollen oder ob "expected red after first run" als akzeptiertes QA-Verhalten gilt.
3. Falls dreimal GREEN Pflicht bleibt: Smoke-Startzustand von "nur Woche 1 ohne Ergebnisse" auf "naechste spielbare Woche mit konsistentem Vorzustand" erweitern.
4. Einen gezielten Staging- oder Emulator-Test fuer "Lock erstellt, Fehler danach" ausfuehren, um den Lock-Cleanup-Fix direkt zu beweisen.
