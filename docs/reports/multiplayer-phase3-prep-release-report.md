# Multiplayer Phase 3 Prep Release Report

Datum: 2026-05-04

## Executive Summary

Phase-3-Vorbereitung: **Bestanden**

Phase 3 darf starten: **Ja**

Der finale App-Hosting-Rollout liefert den lokalen HEAD `1dab315e567d1a0627b37689407d7fd22e870cf6` aus. Dieser Stand enthaelt die Phase-2-App-Haertung fuer identitaetsbasierte Teamwahl im Join-Flow und die korrigierten Phase-2-Smokes. Die Phase-2-Live-Flows bleiben gegen Staging gruen.

## Release Commit

| Feld | Wert |
| --- | --- |
| Finaler HEAD | `1dab315e567d1a0627b37689407d7fd22e870cf6` |
| App Hosting Revision | `afbm-staging-backend-build-2026-05-04-003` |
| Environment | `staging` |
| Build Time | `2026-05-04T09:17:41.932Z` |
| Vorheriger App-Code-Stand | `5ef05a89887b3c47688cb2c7879ee3453b01df7c` |

Build-Info Payload:

```json
{
  "ok": true,
  "commit": "1dab315e567d1a0627b37689407d7fd22e870cf6",
  "buildTime": "2026-05-04T09:17:41.932Z",
  "environment": "staging",
  "revision": "afbm-staging-backend-build-2026-05-04-003",
  "version": "0.1.0",
  "deployEnv": "staging",
  "firebaseProjectId": "afbm-staging"
}
```

## Geaenderte Bereiche

- `firebase-online-league-mappers.ts`: `chooseAvailableFirestoreTeamForIdentity(...)` waehlt ein freies Team passend zur gewuenschten Identitaet, bevor auf das erste freie Team zurueckgefallen wird.
- `firebase-online-league-commands.ts`: `joinFirebaseLeague(...)` nutzt die identitaetsbasierte Auswahl in der atomaren Join-Transaktion.
- `firebase-online-league-repository.ts`: Helper fuer Repository-Tests exportiert.
- `online-league-repository.test.ts`: Race-/Retry- und Identitaetsauswahl-Abdeckung erweitert.
- Phase-2-Smokes und Fixtures: echte Player-Login-, Join-, Draft- und Playability-Smokes ergaenzt.
- `browser-player-login-rejoin.spec.ts`: Test loescht nur den app-eigenen Continue-Speicher, nicht die Firebase-Auth-Persistenz.

## Checks

| Check | Ergebnis | Evidenz |
| --- | --- | --- |
| `npm run test:firebase:rules` | GREEN | 24/24 Rules-Tests |
| `npx vitest run src/lib/online/repositories/online-league-repository.test.ts` | GREEN | 45/45 Tests |
| `npx tsc --noEmit` | GREEN | Exit 0 |
| `npm run lint` | GREEN | Exit 0 |
| `npm run test:e2e:browser:login-rejoin` | GREEN | 1/1 Chromium-Test |
| `npm run staging:smoke:join` | GREEN | Primary Join, Reload, Double-Join-Guard, Full-League-Block und Parallel-Join gruen |
| `npm run staging:smoke:draft` | GREEN | Wrong-player blocked, valid pick gespeichert, available player entfernt |
| `npm run staging:smoke:player-playability -- --league-id afbm-playability-test` | GREEN | Player ready + reload gruen; Commit-Gate prueft `1dab315e567d` |

## Staging Smoke Details

Fixtures wurden vor den finalen Live-Smokes mit `CONFIRM_STAGING_PHASE2_FIXTURES=true CONFIRM_STAGING_SEED=true npm run staging:setup:phase2-fixtures -- --reset` kontrolliert auf Staging zurueckgesetzt. Es wurden nur Staging-Testligen verwendet.

Join-Smoke:

- `afbm-join-test`: neuer Player joined `bos-guardians`; Reload bleibt konsistent.
- Double Join erzeugt keine zweite Membership.
- `afbm-join-test-race`: paralleler Join erzeugt unterschiedliche Teams:
  - Primary: `bos-guardians`
  - Second: `nyt-titans`
- `afbm-join-test-full`: Liga voll wird sauber blockiert.
- Keine Permission-Regression fuer echte nicht-admin Player.

Player-Playability:

- Liga `afbm-playability-test`
- Team `basel-rhinos`
- `ready=true` nach Klick
- Reload haelt `week=1`, `teamId=basel-rhinos`, `ready=true`

Read-only State Check nach den Smokes:

```text
leagueId=afbm-playability-test exists=true currentWeek=1 currentSeason=1 lastScheduledWeek=3 currentWeekGames=2 readyCount=1/4 resultsCount=0 standingsCount=0 activeLocks=none
```

## Bewertung

| Kriterium | Status | Beleg |
| --- | --- | --- |
| Join bleibt gruen | GREEN | `staging:smoke:join` Exit 0 |
| Paralleler Join bekommt verschiedene Teams | GREEN | `bos-guardians` und `nyt-titans` |
| Kein Permission-Regression | GREEN | echte nicht-admin Player koennen joinen; Full-League bleibt blockiert |
| Keine aktiven `simulating` Locks | GREEN | `activeLocks=none` |
| Ready/Reload bleibt gruen | GREEN | Player-Smoke und Browser Login/Rejoin gruen |

## Entscheidung

Phase-3-Vorbereitung bestanden: **Ja**

Phase 3 darf starten: **Ja**

Restrisiko: Die Smokes mutieren Staging-Testligen bewusst. Fuer wiederholte Laeufe muss vorab der dokumentierte Fixture-Reset verwendet werden, damit Draft-/Join-Testdaten erneut im erwarteten Startzustand sind.
