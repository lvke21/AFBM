# Staging Smoke Final Gate

Stand: 2026-05-03T15:36Z

## Entscheidung

**Smoke:** Gruen

**Staging QA:** No-Go

**Grund:** Der live authentifizierte Staging-Smoke ist fuer den Ziel-Commit gruen, aber der lokale `npm run release:check` ist im selben Gate-Lauf rot durch einen Vitest-Timeout in `src/modules/gameplay/application/gameplay-calibration.test.ts`.

## Governance Links

| Artefakt | Link |
|---|---|
| Commit | [1a28d88eaaa99a182612638652d0165705ce6901](#ziel-commit) |
| Revision | [afbm-staging-backend-build-2026-05-02-007](#staging-build-info) |
| Smoke Command | [staging:smoke:admin-week](#smoke-command) |
| Ergebnis | [GREEN](#smoke-ergebnis) |

## Ziel-Commit

```text
1a28d88eaaa99a182612638652d0165705ce6901
```

## Staging Build-Info

```json
{
  "ok": true,
  "commit": "1a28d88eaaa99a182612638652d0165705ce6901",
  "buildTime": "2026-05-02T19:42:39Z",
  "environment": "staging",
  "revision": "afbm-staging-backend-build-2026-05-02-007",
  "version": "0.1.0",
  "deployEnv": "staging",
  "firebaseProjectId": "afbm-staging"
}
```

## Umgebung

| Feld | Wert |
|---|---|
| Staging Base URL | `https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app` |
| League ID | `afbm-multiplayer-test-league` |
| Projekt | `afbm-staging` |
| Smoke Mode | `simulate-week` |
| App Hosting Revision | `afbm-staging-backend-build-2026-05-02-007` |
| Confirmation | `CONFIRM_STAGING_SMOKE=true` |
| Auth | IAM sign-jwt custom token |
| Datenmutation | Ja, Staging-Testliga wurde simuliert |
| Secrets im Report | keine |

## Smoke Command

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901
```

## Ausgefuehrte Checks

| Command | Ergebnis | Hinweis |
|---|---|---|
| `git rev-parse HEAD` | Gruen | `1a28d88eaaa99a182612638652d0165705ce6901` |
| `curl -sS -i https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app/api/build-info` | Gruen | HTTP 200; Commit, Revision und `environment=staging` korrekt |
| `npm run release:check` | Rot | Stoppt bei `Vitest`: `gameplay-calibration.test.ts` Timeout |
| `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | Gruen | Commit-Gate, Auth, Ready, Simulation und Reload gruen |

## Smoke-Ergebnis

```text
[staging-smoke] commit ok; expected=1a28d88eaaa99a182612638652d0165705ce6901 deployed=1a28d88eaaa99a182612638652d0165705ce6901 revision=afbm-staging-backend-build-2026-05-02-007 env=staging project=afbm-staging
[staging-smoke] tokenSource=IAM sign-jwt custom token
[staging-smoke] admin auth ok; leagues=2
[staging-smoke] league before simulation; currentWeek=7 users=2 teams=8 schedule=28
[staging-smoke] ready-state ok; ready=2/2
[staging-smoke] simulated league=afbm-multiplayer-test-league week=7 nextWeek=8 games=4
[staging-smoke] reload ok; currentWeek=8 standings=8 results=28
[staging-smoke] status=GREEN
```

## Datenmutation

Ja. Der Smoke war der mutierende Admin-Week-Flow fuer die Staging-Liga `afbm-multiplayer-test-league`.

- Vorher: `currentWeek=7`; `results=24` abgeleitet aus `results=28` nach dem Smoke minus `games=4`.
- Mutation: Woche `7` wurde simuliert; `games=4`.
- Nachher: `currentWeek=8`, `standings=8`, `results=28`.
- Betroffene Umgebung: nur `afbm-staging`.
- Production-Daten: nicht beruehrt.

## Gepruefte Flow-Punkte

| Flow-Punkt | Ergebnis |
|---|---|
| Build-Info Commit-Gate | Gruen |
| Auth/Login | Gruen |
| User-Team-Link | Gruen |
| Ready-State | Gruen |
| Admin Week Simulation | Gruen |
| Results/Standings Reload | Gruen |

## Blocker

1. **Lokales Required Gate rot:** `npm run release:check` stoppt bei `Vitest` mit Timeout in `src/modules/gameplay/application/gameplay-calibration.test.ts`, Test `keeps four-down menus and tendency-breakers coach-plausible`.
2. **Dirty Worktree:** Der lokale Gate-Lauf prueft den aktuellen Worktree, nicht exakt den Commit-Snapshot `1a28d88eaaa99a182612638652d0165705ce6901`.

## Go/No-Go

| Ziel | Entscheidung | Grund |
|---|---|---|
| Staging Smoke | **Go** | Live gegen Ziel-Commit gruen |
| Staging QA | **No-Go** | Lokaler `release:check` im selben Gate-Lauf rot |
| Production | **No-Go** | Staging-Smoke ist gruen, aber lokales Required Gate ist rot und Production Preflight wurde nicht ausgefuehrt |
