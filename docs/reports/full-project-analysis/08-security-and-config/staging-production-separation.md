# Staging Production Separation

## Ziel der Analyse

Bewertung, wie sauber Staging und Production getrennt sind und wo versehentliche Production-Risiken bestehen.

## Untersuchte Dateien/Bereiche

- `apphosting.yaml`
- `firebase.json`
- `package.json`
- `src/lib/env/runtime-env.ts`
- `src/lib/firebase/previewGuard.ts`
- `scripts/seeds/multiplayer-firestore-env.ts`
- `scripts/seeds/*staging*.ts`
- `scripts/production-apphosting-preflight.mjs`
- `docs/reports/production-access-requirements.md`
- `docs/guides/environment-matrix.md`
- `docs/guides/firebase-production-setup.md`

## Staging Zustand

Staging ist konkret im Repo und in Scripts sichtbar:

- App Hosting Config ist staging-orientiert.
- Staging-Projekt ist in Guard- und Seed-Scripts explizit.
- Staging Seeds/Repairs verlangen:
  - `USE_FIRESTORE_EMULATOR=false`
  - `GOOGLE_CLOUD_PROJECT` fuer Staging
  - `CONFIRM_STAGING_SEED=true`
- Staging Smoke verlangt:
  - `CONFIRM_STAGING_SMOKE=true`
  - Staging App Hosting URL
  - Test Login oder ID Token/IAM Custom Token

Bewertung:

- Staging ist gut operationalisiert.
- Die Menge der Staging-Schreibtools ist hoch und braucht klare Runbooks.

## Production Zustand

Production ist bewusst nicht operationalisiert:

- Keine verifizierte Production-Projekt-ID.
- Keine verifizierte Production-App-Hosting-Backend-ID.
- Keine Production-App-Hosting-Config.
- Kein direkter Production-Rollout npm Script.
- `production:preflight:apphosting` ist read-only und verlangt konkrete Werte.

Bewertung:

- Gut als Schutz gegen versehentliches Deployment.
- Blockierend fuer Production-Go.

## Trennungs-Guards

### Runtime Env Guard

`src/lib/env/runtime-env.ts` blockiert:

- Emulator-Hosts in Staging/Production.
- Preview-/Seed-Flags in Staging/Production.
- lokale Online Backends ausserhalb local.
- Demo-Projekte in Production.
- Firestore Production ohne explizites Freigabeflag.

### Firestore Preview Guard

`src/lib/firebase/previewGuard.ts` blockiert:

- Emulator-Zugriff ohne `demo-*` Projekt.
- Non-emulator Firestore ohne Preview Dry-Run und Allowlist, ausser App Hosting Staging Runtime.
- Production-like Project IDs.
- Preview in `NODE_ENV=production`.

### Multiplayer Seed Guard

`scripts/seeds/multiplayer-firestore-env.ts` unterscheidet:

- Emulator Mode: explizit `USE_FIRESTORE_EMULATOR=true`.
- Staging Mode: explizit `USE_FIRESTORE_EMULATOR=false`, Staging Project, kein Emulator Host.
- Production/unknown Projects werden blockiert.

Bewertung:

- Guard-Layer sind gut.
- Sie sind aber auf mehrere Dateien verteilt; neue Scripts muessen diese Utilities wiederverwenden.

## Kritische Trennungsrisiken

| Risiko | Ursache | Bewertung | Empfehlung |
| --- | --- | --- | --- |
| Staging Config in Production | `apphosting.yaml` ist staging-only. | Hoch | Separate Production Config erstellen. |
| Production ID geraten | Production nicht sichtbar/verifiziert. | Hoch | No-Go-Regel beibehalten. |
| Staging Seed gegen falsches Projekt | Copy/Paste oder Env-Reste. | Mittel-Hoch | Guards + Shell-Preflight + deutliche Scriptnamen. |
| Emulator Env in Staging | Alte `FIRESTORE_EMULATOR_HOST` Werte. | Mittel | Guards blockieren; Logs beim Scriptstart beibehalten. |
| Firestore Production versehentlich aktiv | `DATA_BACKEND=firestore`. | Hoch | Guard blockiert ohne `AFBM_ENABLE_PRODUCTION_FIRESTORE=true`; Flag nie standardmaessig setzen. |
| Admin UID-Allowlist in Production | Hardcoded UID wirkt ueberall. | Mittel-Hoch | Vor Production bewusst entscheiden oder auf Claims-only wechseln. |

## Empfohlene Zieltrennung

### Local

- `AFBM_DEPLOY_ENV=local`
- Emulator erlaubt.
- Demo-Projekte erlaubt.
- Seeds/Resets erlaubt nur gegen Emulator.

### Staging

- `AFBM_DEPLOY_ENV=staging`
- Firebase Staging Projekt.
- Firestore Runtime erlaubt.
- Seeds/Repairs nur mit Confirm Flags.
- Smoke mit dediziertem Testuser.

### Production

- `AFBM_DEPLOY_ENV=production`
- Echte Production Project ID.
- Eigene App Hosting Config.
- Kein Emulator.
- Keine Preview-/Seed-/Reset-Flags.
- Keine Staging Public Config.
- Kein Firestore Backend ohne explizites Go.
- Keine mutierenden Smoke-Tests ohne markierte Production-Testdaten und explizite Freigabe.

## No-Go-Regeln

1. Keine geratenen Production IDs.
2. Kein Production-Rollout mit staging-orientierter `apphosting.yaml`.
3. Keine Production-Seeds oder Resets.
4. Keine Production-Firestore-Aktivierung ohne Datenmigration, Backups und Rules-Review.
5. Keine Admin-Rechte allein durch lokalen Client-State.
6. Keine echten Tokens oder Passwoerter in Reports.

## Gesamtbewertung

Status: Gelb.

Staging ist klar und nutzbar. Production ist aus guten Gruenden noch blockiert. Die Trennung ist technisch defensiv, aber Production braucht vor jedem Go eine eigene verifizierte Konfiguration und eine Entscheidung zur Admin-UID-Allowlist.
