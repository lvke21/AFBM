# Production Release Plan - Repo Head 6151fb6

Datum: 2026-05-02
Repo Head: `6151fb6` - `Make staging admin smoke self-authenticating`
Fix Commit: `3a90eec` - `Fix online simulation Firestore warnings payload`
Aktive Staging Revision nach Fix: `afbm-staging-backend-build-2026-05-02-003`
Ziel: kontrollierter Firebase App Hosting Production Rollout

## Entscheidung

Production Rollout: **No-Go bis Production-Projekt/Backend bestaetigt ist**

Begruendung:
- Lokale Build-/Type-/Lint-Gates sind gruen.
- Firebase Parity ist gruen.
- Der authentifizierte Staging-Smoke ist nach dem Fix erneut ohne manuelle Token-Kopie gestartet und erfolgreich durchgelaufen.
- Week-Simulation schreibt keine verschachtelten `undefined`-Werte mehr in `matchResults`.
- Ergebnisse und Standings sind nach Reload sichtbar.
- Die echte Firebase App Hosting Production-Konfiguration ist in der lokalen CLI-Umgebung nicht nachweisbar. `gcloud projects list --filter='projectId~afbm'` zeigt nur `afbm-staging`; `afbm-production` existiert fuer diese Identitaet nicht.

Produktion wurde nicht veraendert.

## Pre-Release Checks

| Check | Ergebnis |
| --- | --- |
| `git status --short --untracked-files=all` | Gruen vor Report-Erstellung; Arbeitsbaum war sauber |
| `git log --oneline -5` | Head `6151fb6`; danach `082d6b4`, `7fab1ea`, `eb812d3`, `a2e37b7` |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run build` | Gruen |
| `npm run test:firebase:parity` | Gruen nach Wiederholung ausserhalb der Sandbox; erster Sandbox-Versuch blockierte lokale Emulator-Ports mit `EPERM` |
| `npx vitest run src/lib/online/online-game-simulation.test.ts src/lib/admin/online-week-simulation.test.ts src/lib/admin/online-admin-actions.test.ts` | Gruen; 22 Tests |
| `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league` | Gruen nach Fix |
| `gcloud projects list --filter='projectId~afbm' --format='table(projectId,name,projectNumber)'` | Nur `afbm-staging` sichtbar |
| `XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:backends:list --project afbm-production --json` | Rot; Projekt `afbm-production` nicht gefunden |

## Staging-Smoke Ergebnis

Ausgefuehrter Command:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league
```

Ergebnis:

```text
[staging-smoke] baseUrl=https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app
[staging-smoke] leagueId=afbm-multiplayer-test-league
[staging-smoke] tokenSource=IAM sign-jwt custom token
[staging-smoke] mode=simulate-week
[staging-smoke] admin auth ok; leagues=2
[staging-smoke] league before simulation; currentWeek=4 users=2 teams=8 schedule=28
[staging-smoke] team assignments=unknown:bern-wolves,unknown:basel-rhinos
[staging-smoke] ready-state ok; ready=2/2
[staging-smoke] failed: Week simulation failed (500): ADMIN_ACTION_FAILED Update() requires either a single JavaScript object or an alternating list of field/value pairs that can be followed by an optional precondition. Value for argument "dataOrField" is not a valid Firestore value. Cannot use "undefined" as a Firestore value (found in field "matchResults.`3`.simulationWarnings"). If you want to ignore undefined values, enable `ignoreUndefinedProperties`.
```

## Root Cause

Der Fehler lag in folgender Datenform:

- `src/lib/online/online-game-simulation.ts` setzt `simulationWarnings: warnings.length > 0 ? warnings : undefined`.
- `src/lib/admin/online-admin-actions.ts` schreibt `matchResults: [...preparedSimulation.results, ...preparedSimulation.existingMatchResults]` direkt per Firestore Transaction.
- Firestore Admin SDK akzeptiert `undefined` nicht in verschachtelten Feldern.

Damit kann jede Simulation ohne Warnings einen nicht serialisierbaren `matchResults.*.simulationWarnings = undefined` Wert erzeugen.

## Fix

Commit: `3a90eec`

Geaendert:
- `src/lib/online/online-game-simulation.ts`
- `src/lib/online/online-game-simulation.test.ts`

Entscheidung:
- `simulationWarnings` wird fuer normale Spiele als leeres Array geschrieben.
- Bestehende Warnings bleiben als Array erhalten.
- Keine Abhaengigkeit auf pauschales `ignoreUndefinedProperties`.
- Firestore-Payload bleibt typisiert und explizit serialisierbar.

## Staging-Smoke Nach Fix

Deployment:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:rollouts:create afbm-staging-backend --project afbm-staging --git-commit 3a90eec --force --json
```

Revision:
- `afbm-staging-backend-build-2026-05-02-003`
- Traffic: 100%

Command:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league
```

Ergebnis:

```text
[staging-smoke] baseUrl=https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app
[staging-smoke] leagueId=afbm-multiplayer-test-league
[staging-smoke] tokenSource=IAM sign-jwt custom token
[staging-smoke] mode=simulate-week
[staging-smoke] admin auth ok; leagues=2
[staging-smoke] league before simulation; currentWeek=4 users=2 teams=8 schedule=28
[staging-smoke] team assignments=unknown:bern-wolves,unknown:basel-rhinos
[staging-smoke] ready-state ok; ready=2/2
[staging-smoke] simulated league=afbm-multiplayer-test-league week=4 nextWeek=5 games=4
[staging-smoke] reload ok; currentWeek=5 standings=8 results=16
```

## Risiken

1. **Staging-Testliga wurde weiter mutiert.**
   - Der erfolgreiche Smoke hat Woche 4 simuliert.
   - Die Testliga steht danach auf Woche 5.

2. **Schedule-Testdaten bleiben 8-Team-spezifisch.**
   - Der aktuelle produktive Schedule-Generator ist auf 16 Teams ausgelegt.
   - Die Staging-Testliga nutzt einen manuell gesetzten 8-Team-Schedule.

3. **IAM-basierter Smoke braucht gezielte Berechtigung.**
   - Funktioniert lokal jetzt, aber CI braucht ebenfalls `roles/iam.serviceAccountTokenCreator` auf dem Staging-Service-Account oder einen dedizierten Staging-Testlogin.

4. **Production nicht mit Staging-Smoke gleichsetzen.**
   - Staging ist ein gutes Signal, aber Production braucht nach einem spaeteren Rollout weiterhin nicht-destruktive Smoke-Checks.

## Production Rollout Plan

Voraussetzungen:
- Explizite Freigabe fuer Production Deployment.
- Kein gleichzeitiger Seed/Reset gegen Produktion.
- Production-Smoke nur nicht-destruktiv oder mit vorher festgelegter Testliga.

Schritte:
1. Production Rollout von Commit `3a90eec` nach expliziter Bestaetigung ausfuehren.
2. Revision notieren.
3. Nicht-destruktiven Production-Smoke ausfuehren:
   - App laedt.
   - Login laedt.
   - Admin API ohne Token liefert 401.
   - Keine `severity>=ERROR` Logs.
4. Falls eine sichere Production-Testliga existiert: Admin-Flow nur nach separater Freigabe testen.

## Firebase App Hosting Production Command

Nicht ausgefuehrt.

Kein finaler exakter Production-Rollout-Command, weil die Production-Projekt-/Backend-ID nicht verifiziert werden konnte.

Gepruefter, aber nicht gueltiger Kandidat:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:rollouts:create afbm-production-backend --project afbm-production --git-commit 3a90eec --force --json
```

Ergebnis der Verifikation:
- `afbm-production` ist fuer die aktuelle gcloud/firebase-Identitaet nicht vorhanden oder nicht sichtbar.
- Es waere unsicher, einen Production-Rollout-Command mit geratenem Projekt/Backend als final auszugeben.

Sobald echte Werte bestaetigt sind, lautet die Command-Form:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:rollouts:create <production-backend-id> --project <production-project-id> --git-commit 3a90eec --force --json
```

## Finaler Vorschlag

Status: **Code Go-Kandidat, Deployment No-Go**

Naechster Schritt:
- Echte Production-Projekt-ID und App-Hosting-Backend-ID bestaetigen.
- Danach den exakten Rollout-Command mit diesen Werten ausgeben.
- Production erst nach expliziter Bestaetigung deployen.
