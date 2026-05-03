# Multiplayer Phase 1 Audit Report

Datum: 2026-05-03  
Rolle: Principal QA Engineer + Multiplayer Systems Auditor  
Ziel: Harte Entscheidung, ob der Multiplayer-Core-Loop minimal spielbar ist.

## 1. Executive Summary

Spielbar: Ja, fuer den aktuellen Staging-Golden-Path nach reproduzierbarem Seed.

Phase 1 ist funktional bestanden, weil der komplette Minimal-Loop live auf Staging gruen reproduziert wurde:

1. Liga laden: OK
2. Eigenes Team sehen: OK
3. Ready setzen: OK
4. Simulation ausfuehren: OK
5. Ergebnisse sehen: OK
6. Woche erhoeht sich: OK
7. Reload ausfuehren: OK
8. Zustand bleibt korrekt: OK

Harte Einschraenkung: Vor dem Reset waren beide Staging-Testligen durch fehlgeschlagene Smoke-Laeufe verschmutzt. Es gab `simulating` Locks fuer `s1-w2`, obwohl die Ligen in `pre_week` standen. Das blockierte den Core-Loop. Dieser Testzustand wurde mit den vorhandenen Staging-Seed-Skripten repariert. Zusaetzlich wurde lokal ein Minimalfix umgesetzt, damit eigene fehlgeschlagene Simulationsversuche nicht mehr als dauerhafte `simulating` Locks stehen bleiben. Dieser Fix ist noch nicht auf Staging deployed.

Finale Entscheidung:

- Phase 1 bestanden: Ja
- Phase 2 freigegeben: Nein, erst nach Deployment des Lock-Cleanup-Fixes und erneut gruenem Smoke ohne vorherigen manuellen Seed.

## 2. Ergebnisse

Deploy-Ziel:

- Staging URL: `https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app`
- Commit: `1a28d88eaaa99a182612638652d0165705ce6901`
- Revision: `afbm-staging-backend-build-2026-05-03-000`
- Environment: `staging`

### Lokale Checks

| Command | Ergebnis | Notiz |
| --- | --- | --- |
| `npm run lint` | GREEN | ESLint ohne Fehler |
| `npx tsc --noEmit` | GREEN | TypeScript ohne Fehler |
| `npx vitest run src/lib/admin/online-week-simulation.test.ts src/lib/admin/online-admin-actions.test.ts src/lib/online/online-league-week-simulation.test.ts src/lib/online/online-league-lifecycle.test.ts` | GREEN | 4 Files, 90 Tests |

### Initiale Staging-Smokes

| Command | Ergebnis | Konkrete Ausgabe |
| --- | --- | --- |
| `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:auth -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | GREEN | League load OK, `currentWeek=2`, Team `basel-rhinos` erkannt |
| `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | RED | `Week simulation failed (400): week_already_simulated Die Woche wurde bereits weitergeschaltet.` |
| `CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_PLAYABILITY_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:playability -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | RED | `simulateWeek failed (400): week_already_simulated Die Woche wurde bereits weitergeschaltet.` |

### Staging-State-Recovery

| Command | Ergebnis | Notiz |
| --- | --- | --- |
| `npm run seed:multiplayer:playability:staging` | GREEN | `afbm-multiplayer-test-league` auf Week 1 zurueckgesetzt, Draft completed, 28 Schedule-Games, Locks geloescht |
| `npm run seed:playability:staging` | GREEN | `afbm-playability-test` auf Week 1 zurueckgesetzt, Draft completed, 6 Schedule-Games, Results leer |

### Finale Staging-Regression

| Command | Ergebnis | Konkrete Ausgabe |
| --- | --- | --- |
| `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:auth -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | GREEN | `currentWeek=1`, Team `basel-rhinos`, `readyForWeek=false` |
| `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | GREEN | Week 1 simuliert, `nextWeek=2`, `games=4`, Reload `standings=8`, `results=4` |
| `CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_PLAYABILITY_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:playability -- --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | GREEN | Team erkannt, `ready=4/4`, Week 1 simuliert, `nextWeek=2`, Reload stabil mit `results=2`, `standings=4`, `gamesPlayed=4` |

## 3. Game Loop Status

| Schritt | Status | Beleg |
| --- | --- | --- |
| Liga laden | OK | Playability-Smoke: `load ok week=1 season=1 teamId=basel-rhinos teams=4 users=4` |
| Eigenes Team sehen | OK | Playability-Smoke: `teamId=basel-rhinos`; Auth-Smoke: `assignedUserId=matches` |
| Ready setzen | OK | Playability-Smoke: `setAllReady ok ready=4/4`; Admin-Smoke: `ready=8/8` |
| Simulation wird ausgefuehrt | OK | Playability-Smoke: `simulateWeek ok games=2`; Admin-Smoke: `games=4` |
| Ergebnis sehen | OK | Playability-Smoke Reload: `results=2`; Admin-Smoke Reload: `results=4` |
| Woche erhoeht sich | OK | Playability-Smoke: `simulatedWeek=1 nextWeek=2`; finaler Firestore-State `currentWeek=2` |
| Reload durchfuehren | OK | Playability-Smoke fuehrt neuen `getLeague` nach Simulation aus |
| Zustand bleibt korrekt | OK | Reload: `week=2`, `teamId=basel-rhinos`, `results=2`, `standings=4`, `gamesPlayed=4` |

## 4. State-Probleme

### Initialer roter Zustand

Vor dem Reset waren beide Staging-Testligen nicht sauber:

`afbm-multiplayer-test-league`:

- `currentWeek=2`
- `lastScheduledWeek=7`
- `currentWeekGames=4`
- `weekStatus=pre_week`
- `completedWeeks=[s1-w1]`
- `results=4`
- `standings=8`
- alle `ready=true` nach fehlgeschlagenem Smoke
- Lock `afbm-multiplayer-test-league-simulate-s1-w2` stand auf `simulating`

`afbm-playability-test`:

- `currentWeek=2`
- `lastScheduledWeek=3`
- `currentWeekGames=2`
- `weekStatus=pre_week`
- `completedWeeks=[s1-w1]`
- `results=2`
- `standings=4`
- alle `ready=true` nach fehlgeschlagenem Smoke
- Lock `afbm-playability-test-simulate-s1-w2` stand auf `simulating`

Bewertung: P1/P0-nah fuer QA-Reproduzierbarkeit. Der Spieler-Golden-Path war nicht reproduzierbar, bis der Staging-Testzustand repariert wurde.

### Finaler gruener Zustand nach Regression

`afbm-multiplayer-test-league`:

- `status=active`
- `weekStatus=pre_week`
- `currentSeason=1`
- `currentWeek=2`
- `lastScheduledWeek=7`
- `currentWeekGames=4`
- `completedWeeks=[s1-w1 -> nextWeek 2, resultMatchIds=4]`
- `lastSimulatedWeekKey=s1-w1`
- `results=4`
- `standings=8`
- `gamesPlayed=8`
- alle aktiven Memberships `ready=false`
- Locks: nur `s1-w1` mit `status=simulated`

`afbm-playability-test`:

- `status=active`
- `weekStatus=pre_week`
- `currentSeason=1`
- `currentWeek=2`
- `lastScheduledWeek=3`
- `currentWeekGames=2`
- `completedWeeks=[s1-w1 -> nextWeek 2, resultMatchIds=2]`
- `lastSimulatedWeekKey=s1-w1`
- `results=2`
- `standings=4`
- `gamesPlayed=4`
- alle aktiven Memberships `ready=false`
- Locks: nur `s1-w1` mit `status=simulated`

Validierung:

- `currentWeek <= lastScheduledWeek`: OK fuer beide Ligen
- Keine Woche ohne Spiele: OK, Week 2 hat 4 bzw. 2 Spiele
- Ready reset nach Simulation: OK, alle `ready=false`
- Standings konsistent mit Results: OK, Games played entspricht Teams x gespielte Spiele

## 5. Edge Case Tests

| Edge Case | Status | Beleg |
| --- | --- | --- |
| Simulation ohne Ready blockiert | OK | `online-week-simulation.test.ts` und `online-admin-actions.test.ts`, relevante Suite GREEN |
| Simulation in leerer Woche blockiert | OK | `online-league-week-simulation.test.ts` prueft fehlenden Schedule; `online-week-simulation.test.ts` blockt `kein gueltiger Schedule` |
| Ready/Simulation in `season_complete` blockiert | OK | `online-league-lifecycle.test.ts` und `online-week-simulation.test.ts` decken `seasonComplete` / `season_complete` ab |
| Doppelte Simulation nicht moeglich | OK | `online-week-simulation.test.ts` blockt duplicate week simulation; `online-admin-actions.test.ts` deckt wiederholte erwartete Week ab |

## 6. Fixes

Geaenderte Datei:

- `src/lib/admin/online-admin-actions.ts`

Fix:

- In der `simulateWeek`-Catch-Policy werden eigene fehlgeschlagene Simulation-Attempts nun auch bei `week_already_simulated` als `failed` markiert.
- Vorher wurde nur fuer Fehler ungleich `simulation_in_progress` und ungleich `week_already_simulated` auf `failed` gesetzt.
- Dadurch konnte ein Attempt, der nach Lock-Erstellung an Week-State-Validierung scheitert, als `simulating` stehen bleiben.
- Bestehende `simulated` Locks werden durch `markFirestoreWeekSimulationFailed` weiterhin nicht ueberschrieben.

Warum:

- Der Live-Audit hat genau solche stale `simulating` Locks fuer `s1-w2` gefunden.
- Diese Locks blockierten die Staging-Smokes bis zum Seed-Reset.

Nicht geaendert:

- Keine Firestore-Pfade.
- Keine neue Funktion.
- Kein Refactor.
- Kein Policy-Bypass.

## 7. Offene Risiken

1. Der Lock-Cleanup-Fix ist lokal, aber noch nicht auf Staging deployed. Bis zum Deployment kann ein neuer fehlgeschlagener Validierungspfad erneut einen `simulating` Lock hinterlassen.
2. Die Staging-Smokes sind gruen, nachdem die Testligen gezielt re-seeded wurden. Ohne reproduzierbaren Seed/Reset vor mutierenden Smokes kann der gleiche Test durch vorherige Smoke-Laeufe wieder rot werden.
3. `staging:smoke:admin-week` prueft weiterhin eine Admin-gesteuerte Simulation. Der echte Player-Browser-Flow ist durch `staging:smoke:playability` API-seitig bewiesen, aber nicht als voller Browser-E2E gegen Staging.

## 8. Finale Entscheidung

Phase 1 bestanden: Ja.

Begruendung: Der definierte Minimal-Loop wurde nach reproduzierbarem Staging-Testzustand live vollstaendig gruen ausgefuehrt. Der finale Staging-State zeigt korrekte Team-Zuordnung, Week-Increment, gespeicherte Results, aktualisierte Standings, Ready-Reset und stabilen Reload.

Phase 2 freigegeben: Nein.

Begruendung: Der lokal behobene Lock-Cleanup-Fix muss zuerst deployed werden. Danach muessen `staging:smoke:admin-week` und `staging:smoke:playability` erneut ohne manuelle Zwischenreparatur gruen laufen.
