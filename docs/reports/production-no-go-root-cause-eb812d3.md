# Production No-Go Root Cause - eb812d3

Datum: 2026-05-02
Initialer Staging Commit: `eb812d3`
Fix Commit: `7fab1ea`
Aktive Staging Revision: `afbm-staging-backend-build-2026-05-02-002`
Staging URL: `https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app`

## Kurzdiagnose

Der urspruengliche Grund fuer Production No-Go war:

> Produktion ist No-Go, weil der authentifizierte Live-Flow auf Staging noch nicht vollständig verifiziert wurde. Konkret fehlen bestätigte Checks für Login, Team-Zuweisung, Ready-State, Admin-Week-Simulation sowie Ergebnisse/Standings nach Reload.

Dieser konkrete Blocker ist jetzt behoben.

## Root Cause

Es gab drei Ursachen:

1. Es gab lokal kein `E2E_FIREBASE_ADMIN_ID_TOKEN` und keinen gesetzten Staging-Testlogin.
2. Der sichere IAM-Weg zum Erzeugen eines kurzlebigen Firebase Custom Tokens war blockiert, weil `lukas.haenzi@gmail.com` auf dem Staging-Service-Account keine `iam.serviceAccounts.signJwt` Berechtigung hatte.
3. Nach erfolgreicher Simulation wurden Standings zwar in Firestore geschrieben, aber nicht aus dem Firestore-Snapshot in das geladene `OnlineLeague`-Objekt gemappt.

Zusaetzlicher Staging-Datenbefund:
- Die Testliga `afbm-multiplayer-test-league` hatte keinen Schedule.
- Week-Simulation konnte daher erst nach einem Staging-only Test-Schedule laufen.

## Fixes

### IAM

Gesetzt auf Staging-Service-Account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  firebase-app-hosting-compute@afbm-staging.iam.gserviceaccount.com \
  --project=afbm-staging \
  --member=user:lukas.haenzi@gmail.com \
  --role=roles/iam.serviceAccountTokenCreator
```

Scope:
- Nur `afbm-staging`.
- Nur Service Account `firebase-app-hosting-compute@afbm-staging.iam.gserviceaccount.com`.
- Keine Production-IAM-Aenderung.

### Smoke Script

Neu:
- `scripts/staging-admin-week-smoke.ts`
- `npm run staging:smoke:admin-week`

Eigenschaften:
- `CONFIRM_STAGING_SMOKE=true` erforderlich.
- Verweigert nicht-Staging App-Hosting-URLs.
- Akzeptiert `E2E_FIREBASE_ADMIN_ID_TOKEN`.
- Alternativ REST Login ueber `STAGING_FIREBASE_TEST_EMAIL` und `STAGING_FIREBASE_TEST_PASSWORD`.
- Loggt keine Tokens oder Passwoerter.

### Code Fix

Commit:
- `7fab1ea` - `Fix staging admin smoke standings reload`

Geaendert:
- `src/lib/online/online-league-types.ts`
- `src/lib/online/types.ts`

Fix:
- `OnlineLeague` enthaelt jetzt `standings?: OnlineLeagueStandingRecord[]`.
- `mapFirestoreSnapshotToOnlineLeague` mappt `snapshot.league.standings`.

## Live-Verifikation

Authentifizierter Smoke:

```bash
CONFIRM_STAGING_SMOKE=true \
E2E_FIREBASE_ADMIN_ID_TOKEN=<kurzlebiges-firebase-id-token> \
npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league
```

Ergebnis:

```text
[staging-smoke] login/admin token ok; before currentWeek=2 users=2 teams=8 schedule=28
[staging-smoke] ready-state ok; ready=2/2
[staging-smoke] admin auth ok; leagues=2
[staging-smoke] simulated league=afbm-multiplayer-test-league week=2 nextWeek=3 games=4
[staging-smoke] reload ok; currentWeek=3 standings=8 results=8
```

Membership-/Team-Verifikation:

```text
memberships=8P1NZzM8h0Y5URwrNAw99a4ukxo2:bern-wolves:gm:active,KFy5PrqAzzP7vRbfP4wIDamzbh43:basel-rhinos:gm:active
assigned-teams=basel-rhinos:KFy5PrqAzzP7vRbfP4wIDamzbh43,bern-wolves:8P1NZzM8h0Y5URwrNAw99a4ukxo2
```

Logs:
- `gcloud logging read ... severity>=ERROR ... --freshness=30m` fand keine Treffer.

## Checks

| Command | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run build` | Gruen |
| `npm run test:firebase:parity` | Gruen nach Wiederholung ausserhalb der Sandbox |

## Verbleibende Risiken

1. Die Testliga ist eine 8-Team-Staging-Liga, waehrend der regulare Schedule-Generator fuer neue Online-Ligen aktuell 16 Teams erwartet.
2. Der Smoke hat echte Staging-Daten mutiert: Woche 2 ist simuliert, aktuelle Woche ist danach 3.
3. Fuer dauerhafte CI sollte ein dedizierter Staging-Test-Admin-User mit Secret-Management bevorzugt werden, damit kein lokales `signJwt` noetig ist.

## Finale Entscheidung

Staging: **Go**

Produktion: **Go-Kandidat**

Begruendung:
- Der konkrete Production-No-Go-Blocker ist behoben.
- Der authentifizierte Staging-Live-Flow ist vollstaendig verifiziert.
- Produktion wurde nicht deployed.
- Vor Production-Rollout bleibt ein kontrollierter, nicht-destruktiver Production-Smoke erforderlich.
