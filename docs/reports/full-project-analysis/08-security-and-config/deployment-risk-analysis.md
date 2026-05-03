# Deployment Risk Analysis

## Ziel der Analyse

Bewertung der Deployment-Risiken fuer Firebase App Hosting, Staging/Production, Release-Preflight, Rollback und operative Commands.

## Untersuchte Dateien/Bereiche

- `apphosting.yaml`
- `firebase.json`
- `package.json`
- `scripts/production-apphosting-preflight.mjs`
- `docs/reports/production-access-requirements.md`
- `docs/guides/firebase-production-setup.md`
- `docs/guides/environment-matrix.md`
- `docs/runbooks/firebase-rollback-runbook.md`
- `src/lib/env/runtime-env.ts`

## Aktueller Deployment-Zustand

Staging:

- `apphosting.yaml` ist staging-orientiert.
- Staging-Projekt ist in den Dokumenten als verifiziert beschrieben.
- Staging-App-Hosting-Backend ist dokumentiert.
- Staging-Smoke-Script existiert.

Production:

- Keine `.firebaserc` im Repository sichtbar.
- `firebase.json` enthaelt keine Projektaliases.
- `apphosting.yaml` ist nicht production-ready, sondern staging.
- Production-Projekt-ID und App-Hosting-Backend-ID sind laut vorhandenem Report nicht verifiziert.
- Production-Rollout-Script existiert nicht als direkter npm Deployment-Befehl; es gibt nur einen read-only Preflight.

## Top Deployment-Risiken

| Rang | Risiko | Bewertung | Schutz |
| --- | --- | --- | --- |
| 1 | Production-Ziel nicht verifiziert. | Hoch | Keine geratenen IDs; Preflight verlangt konkrete Werte. |
| 2 | Staging App Hosting Config koennte fuer Production wiederverwendet werden. | Hoch | Separate Production Config/Backend-Env erforderlich. |
| 3 | App Hosting Public Firebase Config ist projektgebunden. | Hoch | Production muss eigene Public Config bekommen. |
| 4 | `DATA_BACKEND=firestore` in Production ist riskant. | Hoch | Runtime Guard blockiert ohne explizites Flag. |
| 5 | Staging Seed-/Repair-Scripts schreiben echte Staging-Daten. | Mittel-Hoch | `CONFIRM_STAGING_SEED`, Projekt- und Emulator-Guards. |
| 6 | Admin Week Smoke braucht externe Credentials/IAM. | Mittel | CI Secret Store oder dedizierter Testuser. |
| 7 | Firestore Rules/Indexes Deployment hat Staging-Scripts, aber Production-Rules-Rollout ist nicht operationalisiert. | Mittel | Production Rules Deploy erst nach Projektverifikation. |
| 8 | Rollback fuer App Hosting Revisionen ist dokumentiert, aber nicht als getestetes Script automatisiert. | Mittel | Rollback-Runbook mit konkreter letzter Revision fuellen. |

## Package Script Bewertung

Sichere Muster:

- Emulator-Tests nutzen `demo-afbm`.
- Multiplayer Staging Seeds verlangen `CONFIRM_STAGING_SEED=true`.
- Staging Seeds verlangen `USE_FIRESTORE_EMULATOR=false` und `GOOGLE_CLOUD_PROJECT=afbm-staging`.
- Production Preflight ist read-only.

Riskante Muster:

- Viele operative Scripts liegen in `package.json` nah beieinander.
- Copy/Paste von Staging Commands in falsche Shell-Kontexte bleibt Risiko.
- `firebase:staging:deploy:rules` und `firebase:staging:deploy:indexes` sind echte Deployments nach Staging.

Empfehlung:

- Destruktive oder schreibende Commands im Namen noch klarer markieren:
  - `:staging:write`
  - `:emulator`
  - `:dry-run`
- Production Commands nur als Preflight halten, bis Zielumgebung verifiziert ist.

## Runtime Deployment Guards

Positiv:

- `next.config.ts` fuehrt `assertRuntimeEnvironment()` aus.
- Production blockiert Emulator-Hosts.
- Production blockiert Preview-/Seed-Flags.
- Production blockiert `demo-*` Firebase-Projekte.
- Production blockiert Firestore Backend ohne explizite Freigabe.

Risiko:

- Guards wirken nur, wenn Build/Start tatsaechlich ueber diese Next-Konfiguration laeuft.
- Standalone Scripts haben eigene Guards und muessen separat aktuell gehalten werden.

Empfehlung:

- Gemeinsame Guard-Utilities weiterverwenden.
- Neue Scripts muessen Tests fuer Production-Block haben.

## Rollback

Dokumentiert:

- `docs/runbooks/firebase-rollback-runbook.md`
- Firestore-Rollback auf Prisma durch `DATA_BACKEND=prisma`.
- Stoppen von Firestore-Write-Prozessen.
- Logs und Backfill/Compare pruefen.

Luecke:

- App Hosting Revision Rollback-Command ist nicht in diesem Runbook konkretisiert.
- Letzte stabile Production-Revision ist nicht bekannt, weil Production-Ziel nicht verifiziert ist.

Empfehlung:

- Nach Production-Verifikation Rollback-Abschnitt mit Backend-ID und letzter stabiler Revision ergaenzen.

## Go/No-Go

Staging:

- Go-kandidat fuer nicht-destruktive Deployments, wenn lokale Gates und Staging-Smoke gruen sind.

Production:

- No-Go, solange Production-Projekt-ID und Backend-ID nicht verifiziert sind.
- No-Go, solange keine Production-spezifische App Hosting Env-Konfiguration vorliegt.

## Empfohlene Schutzmassnahmen

1. Separate Production-App-Hosting-Konfiguration erstellen.
2. Production Preflight vor jedem Rollout verpflichtend.
3. Keine Production IDs raten.
4. Staging Smoke mit Testuser/Secret Store automatisieren.
5. Rules/Indexes Production-Deploy erst nach Security Review.
6. Release-Check muss `git status`, `tsc`, `lint`, `build`, Firebase Parity und Staging-Smoke enthalten.
