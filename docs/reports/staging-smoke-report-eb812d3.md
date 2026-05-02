# Staging Smoke Report - eb812d3 plus Auth Smoke Fix

Datum: 2026-05-02
Projekt: `afbm-staging`
Backend: `afbm-staging-backend`
Staging URL: `https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app`

## Deployment

Initialer Staging-Commit:
- `eb812d3` - `Prepare refactored multiplayer staging release`
- Revision: `afbm-staging-backend-build-2026-05-02-001`

Follow-up fuer den Auth/Admin-Smoke auf Staging:
- `7fab1ea` - `Fix staging admin smoke standings reload`
- Revision: `afbm-staging-backend-build-2026-05-02-002`
- Traffic: 100%

Follow-up fuer reproduzierbare lokale Smoke-Ausfuehrung:
- `scripts/staging-admin-week-smoke.ts` kann bei fehlendem Testlogin/Token selbst ein kurzlebiges Firebase ID Token ueber `gcloud iam service-accounts sign-jwt` fuer `afbm-staging` erzeugen.
- Dieser Tooling-Stand ist lokal validiert und dokumentiert; die aktive Staging-App-Revision bleibt `afbm-staging-backend-build-2026-05-02-002`.

Deployment Commands:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:rollouts:create afbm-staging-backend --project afbm-staging --git-commit eb812d3 --force --json
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:rollouts:create afbm-staging-backend --project afbm-staging --git-commit 7fab1ea --force --json
```

## Nicht Authentifizierter Smoke

| Check | Ergebnis |
| --- | --- |
| `/` | 200 |
| `/app/savegames` | 200 |
| `/online` | 200 |
| `/admin` | 200 |
| `/online/league/afbm-multiplayer-test-league` | 200 |
| `/online/league/afbm-multiplayer-test-league/draft` | 200 |
| `POST /api/admin/online/actions` ohne Token | 401, `ADMIN_UNAUTHORIZED` |

Ergebnis: Gruen.

## Blocker Und Fix

Der urspruengliche Produktionsblocker war:

> Produktion ist No-Go, weil der authentifizierte Live-Flow auf Staging noch nicht vollständig verifiziert wurde. Konkret fehlen bestätigte Checks für Login, Team-Zuweisung, Ready-State, Admin-Week-Simulation sowie Ergebnisse/Standings nach Reload.

Behebung:
- `roles/iam.serviceAccountTokenCreator` wurde nur auf dem Staging-Service-Account `firebase-app-hosting-compute@afbm-staging.iam.gserviceaccount.com` fuer `lukas.haenzi@gmail.com` gesetzt.
- Das Staging-Smoke-Script `scripts/staging-admin-week-smoke.ts` erzeugt selbst keine Secrets, kann aber ein lokal erzeugtes kurzlebiges Firebase ID Token verwenden oder per Staging-Testlogin ein Token holen.
- Die Staging-Testliga hatte keinen Schedule fuer die aktuelle Woche. Fuer `afbm-multiplayer-test-league` wurde ein 8-Team-Test-Schedule mit 7 Wochen und 28 Games gesetzt.
- Nach der ersten erfolgreichen Simulation zeigte Firestore `standings=8`, aber die Admin-API lud `standings=0`. Ursache war ein fehlendes Mapping in `mapFirestoreSnapshotToOnlineLeague`.
- Commit `7fab1ea` fuegt das `standings`-Feld zum Online-League-Typ und Snapshot-Mapping hinzu.

## Authentifizierter Admin-Smoke

Ausgefuehrter Live-Flow:

```bash
CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league
```

Token-Erzeugung:
- Kurzlebiges Custom Token via `gcloud iam service-accounts sign-jwt`.
- Exchange zu Firebase ID Token via Identity Toolkit REST.
- Token wurde nicht ausgegeben und nicht gespeichert.

Ergebnis:

```text
[staging-smoke] tokenSource=IAM sign-jwt custom token
[staging-smoke] admin auth ok; leagues=2
[staging-smoke] league before simulation; currentWeek=3 users=2 teams=8 schedule=28
[staging-smoke] team assignments=unknown:bern-wolves,unknown:basel-rhinos
[staging-smoke] ready-state ok; ready=2/2
[staging-smoke] simulated league=afbm-multiplayer-test-league week=3 nextWeek=4 games=4
[staging-smoke] reload ok; currentWeek=4 standings=8 results=12
```

Direkte Firestore-Verifikation:

```text
[staging-smoke] memberships=8P1NZzM8h0Y5URwrNAw99a4ukxo2:bern-wolves:gm:active,KFy5PrqAzzP7vRbfP4wIDamzbh43:basel-rhinos:gm:active
[staging-smoke] assigned-teams=basel-rhinos:KFy5PrqAzzP7vRbfP4wIDamzbh43,bern-wolves:8P1NZzM8h0Y5URwrNAw99a4ukxo2
```

Bewertung:
- Login/Admin-Token: Gruen.
- Admin API Authorization: Gruen.
- Team-Zuweisung/Membership: Gruen.
- Ready-State: Gruen.
- Admin Week Simulation: Gruen.
- Results/Standings nach Reload: Gruen.

## Logs

Ausgefuehrt:

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="afbm-staging-backend" AND severity>=ERROR' --project afbm-staging --freshness=30m --limit=20
```

Ergebnis:
- Keine `severity>=ERROR` Treffer im geprueften Zeitfenster.

## Lokale Checks

| Command | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run build` | Gruen |
| `npm run test:firebase:parity` | Gruen; erster Sandbox-Versuch scheiterte an Emulator-Port `EPERM`, Wiederholung ausserhalb der Sandbox bestanden |
| `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league` | Gruen; ohne manuelle Token-Kopie |

## Secret Check

Es wurden keine Tokens, Passwoerter oder Secret-Dateien committed.

Verwendete Secret-/Credential-Werte:
- Firebase ID Token nur als Prozess-Environment.
- Custom Token nur in temporaerem Verzeichnis, danach geloescht.
- Keine `.env`-Datei erstellt oder committed.

## Risiken

1. Der erfolgreiche Smoke nutzt einen IAM-basierten kurzlebigen Token-Weg. Fuer CI kann dieser Weg genutzt werden, wenn die CI-Identitaet gezielt `roles/iam.serviceAccountTokenCreator` auf dem Staging-Service-Account besitzt. Alternativ bleibt ein dedizierter Staging-Test-Admin-User mit Secret-Manager-/CI-Secrets sinnvoll.
2. Die 8-Team-Testliga brauchte einen manuellen Staging-Schedule, weil der produktive Schedule-Generator aktuell auf 16 Teams ausgelegt ist.
3. Der Smoke hat Woche 3 simuliert und die Liga steht danach auf Woche 4. Weitere Smokes muessen entweder Woche 4 vorbereiten oder eine frische Testliga verwenden.

## Go / No-Go

Staging: **Go**

Begruendung:
- Commit `7fab1ea` ist auf Staging aktiv.
- Authentifizierter Live-Smoke ist vollstaendig gruen.
- Results und Standings sind nach Reload sichtbar.
- Keine kritischen Staging-Logs im geprueften Fenster.

Produktion: **Go-Kandidat**

Begruendung:
- Der bisherige Release-Blocker ist behoben.
- Produktion wurde nicht deployed.
- Vor Produktion bleibt ein kontrollierter Produktions-Smoke mit nicht-destruktiven Checks erforderlich.
