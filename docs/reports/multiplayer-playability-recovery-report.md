# Multiplayer Playability Recovery Report

Datum: 2026-05-03  
Staging-Projekt: `afbm-staging`  
Staging-Backend: `https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app`  
Live Build: `1a28d88eaaa99a182612638652d0165705ce6901`  
Revision: `afbm-staging-backend-build-2026-05-03-000`

## Executive Summary

Der minimale Week-1-Multiplayer-Golden-Path ist auf Staging wieder reproduzierbar:

- Auth/Login: grün
- Liga öffnen: grün
- eigenes Team erkennen: grün
- Draft completed: grün
- Ready setzen: grün
- Week-1-Simulation: grün
- Results/Standings Reload: grün
- Reload/Rejoin: grün

Staging wurde abschließend wieder auf einen sauberen Week-1-Testzustand zurückgesetzt:

- `currentWeek=1`
- `weekStatus=pre_week`
- `draftStatus=completed`
- `activeMembershipCount=8`
- `scheduleGames=28`
- `matchResults=[]`
- alte `adminActionLocks` gelöscht

Einschränkung: Der live deployte Staging-Commit enthält die lokalen Lifecycle-Fixes noch nicht. Der wiederholte Week-Loop nach Week 1 braucht den Deploy der Fixes aus diesem Worktree, damit frühere Results nicht die nächste Woche als `resultsAvailable` blockieren.

## Root Causes und Fixes

| Bereich | Root Cause | Fix |
| --- | --- | --- |
| Admin Week Smoke | `setAllReady` und `simulateWeek` wurden ohne `confirmed: true` gesendet. Die Admin-Policy blockierte korrekt mit `ADMIN_ACTION_POLICY_VIOLATION`. | `scripts/staging-admin-week-smoke.ts` sendet für beide mutierenden Actions `confirmed: true`. |
| Expected Week | Der Smoke las `currentWeek`, simulierte ohne CLI-Parameter aber implizit Week 1. Nach Reload/Week-Fortschritt führte das zu `week_already_simulated`. | Smoke nutzt jetzt die live geladene `currentWeek` und `currentSeason` als Expected-Step, falls keine CLI-Werte gesetzt sind. |
| Season-End | `currentWeek` konnte hinter dem letzten geplanten Schedule liegen und trotzdem als spielbare `pre_week` erscheinen. | Lifecycle/Week-Progress kennen jetzt `season_complete`/`seasonComplete`; UI/API behandeln das nicht als spielbare Woche. |
| Staging-State | Die Liga stand auf `currentWeek=8`, Schedule endete bei Week 7, Results/CompletedWeeks waren historisch voll. | Neuer geschützter Playability-Seed setzt die Testliga reproduzierbar auf Week 1 mit completed Draft, 8 aktiven Testmanagern und 28 Schedule-Spielen. |
| Standings Persistenz | Der live deployte Server schreibt bei Teams ohne Spiel `streak: undefined`, was Firestore ablehnt. | Lokal gefixt: `buildOnlineLeagueTeamRecords` lässt optionale Felder weg, statt `undefined` zu persistieren. Seed nutzt zusätzlich 8 aktive Teams, damit der live Stand den Week-1-Smoke schafft. |
| Wiederholter Week-Loop | Frühere Results nach einem Week-Advance wurden als `resultsAvailable` interpretiert und blockierten die nächste Woche. | Lokal gefixt: Previous-week results blockieren die nächste `readyComplete`-Woche nicht mehr. Deploy erforderlich. |

## Geänderte Dateien

- `package.json`
- `scripts/staging-admin-week-smoke.ts`
- `scripts/staging-playability-smoke.ts`
- `scripts/seeds/multiplayer-playability-staging-seed.ts`
- `src/lib/online/online-league-week-simulation.ts`
- `src/lib/online/online-league-week-simulation-lifecycle.ts`
- `src/lib/online/online-league-lifecycle.ts`
- `src/lib/admin/online-week-simulation.ts`
- `src/components/online/online-league-detail-model.ts`
- `src/components/admin/admin-league-detail-model.ts`
- `src/lib/online/online-league-week-simulation.test.ts`
- `src/lib/online/online-league-lifecycle.test.ts`
- `src/lib/admin/online-week-simulation.test.ts`
- `docs/reports/multiplayer-playability-recovery-report.md`

## Neue/aktualisierte Commands

- `npm run seed:multiplayer:playability:staging`
- `npm run staging:smoke:playability`

Beide Staging-Mutationspfade sind explizit gegated:

- Seed: `CONFIRM_STAGING_SEED=true` und `CONFIRM_STAGING_PLAYABILITY_SEED=true`
- Playability Smoke: `CONFIRM_STAGING_SMOKE=true` und `CONFIRM_STAGING_PLAYABILITY_SMOKE=true`

## Ausgeführte Checks

| Command | Ergebnis |
| --- | --- |
| `npx vitest run src/lib/online/online-league-lifecycle.test.ts src/lib/online/online-league-week-simulation.test.ts src/lib/online/online-lifecycle-usage-rules.test.ts src/lib/admin/online-week-simulation.test.ts` | Grün, 84 Tests |
| `npx tsc --noEmit` | Grün |
| `npm run lint` | Grün |
| `curl -s .../api/build-info` | Grün, Commit `1a28d88eaaa99a182612638652d0165705ce6901` |
| `npm run seed:multiplayer:playability:staging` | Grün |
| `npm run staging:smoke:auth -- --league-id afbm-multiplayer-test-league --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | Grün |
| `npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | Grün aus sauberem Week-1-Seed: Week 1 -> Week 2, 4 Games, 8 Standings |
| `npm run staging:smoke:playability -- --league-id afbm-multiplayer-test-league --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | Grün aus sauberem Week-1-Seed |
| Finaler read-only Auth-Smoke nach Reset | Grün, Staging wieder auf `currentWeek=1` |

## Live Staging Build-Info

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

## Finaler Staging-Testzustand

Der finale Seed-Lauf meldete:

```json
{
  "activeMembershipCount": 8,
  "currentWeek": 1,
  "draftStatus": "completed",
  "scheduleGames": 28,
  "teamCount": 8,
  "weekStatus": "pre_week"
}
```

Der finale read-only Smoke bestätigte:

- `currentWeek=1`
- `teams=8`
- `users=8`
- `schedule=28`
- User-Team-Link: `basel-rhinos`, `assignedUserId=matches`

## Verbleibende Risiken

1. Der live deployte Staging-Commit enthält die lokalen Fixes für `streak: undefined`, `seasonComplete` und den repeated-week Lifecycle noch nicht.
2. Der neue Playability-Smoke ist ein authentifizierter API-/Admin-Golden-Path-Smoke, kein echter Browser-Smoke mit UI-Klicks.
3. Seed nutzt sechs zusätzliche Seed-GM-User, damit der aktuell deployte Server alle acht Teams simulieren kann. Das ist explizit Testdaten-State, aber kein echter 2-Spieler-Only-Flow.

## Entscheidung

Multiplayer minimal spielbar: **Ja, für den reproduzierbaren Week-1-Golden-Path auf Staging.**

Staging QA: **Conditional Go** für Playability-Smoke und Admin-Week-Smoke gegen die Testliga.

Blocker vor breiterer QA/Production:

- lokalen Worktree deployen, damit repeated-week Lifecycle und Firestore-`undefined`-Persistenz serverseitig aktiv werden
- echten Browser-Player-Smoke ergänzen oder den neuen Playability-Smoke auf Browser-Ebene erweitern
