# Multiplayer Phase 1.5 Release Decision

Datum: 2026-05-04

## Executive Summary

Phase 1.5 bestanden: **Ja**

Phase 2 freigegeben: **Ja, technisch fuer den naechsten Scope**

Der Build-Info-Commit-Gate-Blocker ist behoben. Staging liefert nach dem neuen App-Hosting-Rollout exakt den deployten Git-Commit aus:

- Commit: `5ef05a89887b3c47688cb2c7879ee3453b01df7c`
- Revision: `afbm-staging-backend-build-2026-05-04-001`
- Build Time: `2026-05-04T05:54:39.800Z`
- Environment: `staging`

Die Phase-1.5-Smokes wurden gegen genau diesen Commit validiert. Auth, Admin Week und Playability sind gruen. Nach den Smokes gibt es keine aktiven `simulating` Locks, keine Woche ohne Spiele, Ready ist zurueckgesetzt, Results und Standings sind konsistent.

## Root Cause

`/api/build-info` lieferte nach einem erfolgreichen App-Hosting-Rollout weiterhin den alten Commit, weil das Staging App-Hosting Backend stale `overrideEnv`-Werte enthielt:

```json
{
  "variable": "AFBM_GIT_COMMIT",
  "value": "1a28d88eaaa99a182612638652d0165705ce6901"
}
```

und:

```json
{
  "variable": "AFBM_BUILD_TIME",
  "value": "2026-05-02T19:42:39Z"
}
```

Der Handler hat `AFBM_GIT_COMMIT` und `AFBM_BUILD_TIME` priorisiert. Dadurch konnte ein neuer Rollout live sein, waehrend `/api/build-info` weiterhin den alten Commit meldete.

## Gewaehlte Strategie

Strategie: **Option A**

- Commit und Build-Time werden beim Next-Build automatisch aus dem Git-Checkout injiziert.
- `AFBM_GIT_COMMIT` und `AFBM_BUILD_TIME` werden nicht mehr als Commit-Wahrheit verwendet.
- Die stale App-Hosting-Overrides wurden aus dem Backend entfernt.
- Wenn kein Build-Commit injiziert wurde, antwortet `/api/build-info` mit klarem Fehler und HTTP 503 statt still falsche Werte zu melden.

## Geaenderte Dateien / Configs

| Bereich | Aenderung |
| --- | --- |
| `next.config.ts` | Liest `git rev-parse HEAD` beim Build und injiziert `NEXT_PUBLIC_AFBM_GIT_COMMIT`; setzt `NEXT_PUBLIC_AFBM_BUILD_TIME` beim Build. |
| `src/app/api/build-info/route.ts` | Nutzt den build-injizierten Commit zuerst; stale `AFBM_GIT_COMMIT`/`AFBM_BUILD_TIME` sind keine Quelle mehr; fehlender Commit ergibt `BUILD_COMMIT_MISSING` und HTTP 503. |
| `src/app/api/build-info/route.test.ts` | Tests fuer erfolgreichen build-injizierten Commit und klare Fehlerantwort ohne Commit. |
| App Hosting Backend `afbm-staging-backend` | `overrideEnv` bereinigt: `AFBM_GIT_COMMIT` und `AFBM_BUILD_TIME` entfernt; `DATA_BACKEND` und `FIREBASE_PROJECT_ID` bleiben. |

## Build-Info Vorher / Nachher

### Vorher

Nach Rollout von `c709e4d585b016dcc296d3ec64a4d9aa9508b978`:

```json
{
  "ok": true,
  "commit": "1a28d88eaaa99a182612638652d0165705ce6901",
  "buildTime": "2026-05-02T19:42:39Z",
  "environment": "staging",
  "revision": "afbm-staging-backend-build-2026-05-03-001"
}
```

Bewertung: **Rot**, Commit war stale.

### Nachher

Nach Rollout von `5ef05a89887b3c47688cb2c7879ee3453b01df7c`:

```json
{
  "ok": true,
  "commit": "5ef05a89887b3c47688cb2c7879ee3453b01df7c",
  "buildTime": "2026-05-04T05:54:39.800Z",
  "environment": "staging",
  "revision": "afbm-staging-backend-build-2026-05-04-001",
  "version": "0.1.0",
  "deployEnv": "staging",
  "firebaseProjectId": "afbm-staging"
}
```

Bewertung: **Gruen**, Commit entspricht dem deployten Git-Commit.

## Deploy-Nachweis

| Schritt | Ergebnis |
| --- | --- |
| App-Hosting-Backend per REST API gelesen | Gruen |
| `overrideEnv` per App-Hosting-REST-Patch bereinigt | Gruen |
| Fix-Commit erstellt | `5ef05a89887b3c47688cb2c7879ee3453b01df7c` |
| Fix-Commit nach `origin/main` gepusht | Gruen |
| App Hosting Rollout fuer exakt diesen Commit gestartet | Gruen |
| `/api/build-info` Commit-Gate nach Rollout | Gruen |

## Checks

| Command | Ergebnis |
| --- | --- |
| `npm run lint` | Gruen |
| `npx tsc --noEmit` | Gruen nach Build; ein paralleler Lauf waehrend `next build` scheiterte erwartbar an transient geloeschten `.next/types`. |
| `npx vitest run src/app/api/build-info/route.test.ts` | Gruen, 2 Tests |
| `npm run build` | Gruen |

## Smoke-Ergebnisse

| Smoke | Command | Ergebnis |
| --- | --- | --- |
| Auth | `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:auth -- --expected-commit 5ef05a89887b3c47688cb2c7879ee3453b01df7c` | Gruen |
| Admin Week | `CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_SEED=true CONFIRM_STAGING_PLAYABILITY_SEED=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --reset-before-run --expected-commit 5ef05a89887b3c47688cb2c7879ee3453b01df7c` | Gruen |
| Playability | `CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_PLAYABILITY_SMOKE=true CONFIRM_STAGING_SEED=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:playability -- --reset-before-run --expected-commit 5ef05a89887b3c47688cb2c7879ee3453b01df7c` | Gruen |

## State nach Smokes

| League | currentWeek | lastScheduledWeek | currentWeekGames | weekStatus | completedWeeks | resultsCount | standingsCount | readyCount | activeLocks |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| `afbm-multiplayer-test-league` | 2 | 7 | 4 | `pre_week` | 1 | 4 | 8 | 0/8 | none |
| `afbm-playability-test` | 2 | 3 | 2 | `pre_week` | 1 | 2 | 4 | 0/4 | none |

Validierung:

- Keine aktiven `simulating` Locks: **OK**
- Keine Woche ohne Spiele: **OK**
- Ready reset: **OK**
- Results/Standings konsistent: **OK**
- `completedWeeks` enthaelt `s1-w1` mit passender Result-Anzahl: **OK**

## Entscheidung

Phase 1.5 bestanden: **Ja**

Begruendung:

- Staging liefert den Commit mit Build-Info-Fix und Lock-Cleanup-Fix korrekt aus.
- Das Commit-Gate ist nicht mehr von stale Runtime-Overrides abhaengig.
- Alle geforderten Smokes sind gegen exakt diesen Commit gruen.
- Der Live-State nach den Smokes ist konsistent und ohne aktive Simulationslocks.

Phase 2 freigegeben: **Ja**

Grenze der Freigabe:

- Diese Freigabe gilt fuer den Start von Phase-2-Arbeit auf Basis des verifizierten Staging-Commits.
- Sie ist kein Production-Go.
- Weitere Phase-2-Aenderungen brauchen wieder ein eigenes Build-Info-Commit-Gate und Smoke-Ergebnis.

Deployment verlaesslich: **Ja**
