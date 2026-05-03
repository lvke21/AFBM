# Production Target Inventory

Datum: 2026-05-03

## Entscheidung

**Production Preflight:** No-Go

**Grund:** Die echten Production-Zielparameter sind nicht eindeutig bekannt oder verifiziert. Es gibt keine repo-seitige `.firebaserc`, keine Production-Projekt-ID, keine Production-App-Hosting-Backend-ID und keine Production-spezifische `apphosting.yaml`-Konfiguration. Der Preflight darf deshalb nicht gegen Production gestartet werden.

Keine geratenen IDs verwenden.

## Gepruefte Quellen

| Quelle | Ergebnis |
| --- | --- |
| `.firebaserc` | Nicht vorhanden. Keine Firebase-Aliase fuer Production oder Staging im Repo. |
| `firebase.json` | Enthaelt Emulator-Ports sowie Firestore Rules/Indexes; keine Project ID, keine App-Hosting-Backend-ID. |
| `apphosting.yaml` | Explizit staging-orientiert: `AFBM_DEPLOY_ENV=staging`, `FIREBASE_PROJECT_ID=afbm-staging`, Staging Web-App-Konfiguration. |
| `docs/reports/production-access-requirements.md` | Bestaetigt: Production-Projekt-ID und Backend-ID sind nicht verifiziert; aktuelle Identitaet sieht nur `afbm-staging` als Firebase-Projekt. |
| `docs/reports/production-preflight-final.md` | Preflight-Script verlangt konkrete `--project`, `--backend`, `--git-commit` und blockiert fehlende, Platzhalter- oder nicht-produktive Targets. |
| `package.json` | Enthält `production:preflight:apphosting`; kein Production-Rollout-Script. |
| `scripts/production-apphosting-preflight.mjs` | Read-only Preflight; druckt Rollout-Command erst nach sichtbarem Projekt, sichtbarem Backend und konkretem Commit. |

## Bekannte Werte

| Wert | Status | Beleg | Bewertung |
| --- | --- | --- | --- |
| Staging Project ID | `afbm-staging` | `apphosting.yaml`, Staging Reports | Bekannt, aber nicht Production. Darf nicht fuer Production-Preflight genutzt werden. |
| Staging Backend ID | `afbm-staging-backend` | `production-access-requirements.md` | Bekannt, aber nicht Production. Darf nicht fuer Production-Preflight genutzt werden. |
| Staging App Hosting Revision | `afbm-staging-backend-build-2026-05-02-007` | `staging-smoke-final-gate.md` | Nur Staging-Evidenz. |
| Aktueller lokaler HEAD | `1a28d88eaaa99a182612638652d0165705ce6901` | `git rev-parse HEAD` | Technisch bekannt, aber nicht als Production-Release-Commit freigegeben. |
| Production Project ID | Nicht bekannt / nicht verifiziert | `.firebaserc` fehlt; Access-Report meldet nicht verifiziert | Blocker. |
| Production Backend ID | Nicht bekannt / nicht verifiziert | Keine App-Hosting-Production-Konfiguration; Access-Report meldet nicht verifiziert | Blocker. |
| Production App Hosting Region | Nicht bekannt / nicht verifiziert | Keine Production-Backend-Sichtbarkeit | Blocker. |
| Production Firebase Web App Config | Nicht bekannt / nicht verifiziert | `apphosting.yaml` enthält Staging-Web-App-Werte | Blocker. |
| Expected Production Release Commit | Nicht festgelegt | Kein freigegebener Production-Release-Commit in den geprueften Quellen | Blocker. |

## Fehlende Zielparameter

Diese Werte muessen vor jedem Production-Preflight explizit geliefert und read-only verifiziert werden:

| Fehlender Wert | Muss belegt werden durch | Blockiert |
| --- | --- | --- |
| Echte Production Project ID | Firebase Console, GCP Console oder sichtbare CLI-Ausgabe fuer die Release-Identitaet | Ja |
| Echte Production App Hosting Backend ID | `firebase apphosting:backends:list --project <production-project-id>` oder Console | Ja |
| Production App Hosting Region/Backend Name | Sichtbarer Backend-Eintrag | Ja |
| Production Runtime ENV | Production-spezifische App-Hosting-Konfiguration oder dokumentierte Console-Konfiguration mit `AFBM_DEPLOY_ENV=production` und Production Firebase Web-App-Werten | Ja |
| Freigegebener Release Commit | Release-Entscheidung plus Commit SHA, der auf dem Remote verfuegbar ist | Ja |
| Rollback-Revision | Aktuelle Production-Revision aus App Hosting | Ja fuer Rollout, nicht fuer reinen Target-Preflight |

## IAM- und Account-Anforderungen

Fuer reine Verifikation der Production-Zielumgebung braucht die verwendete Release-Identitaet mindestens:

| Zweck | Benoetigte Rolle/Berechtigung |
| --- | --- |
| Projekt sichtbar machen | `roles/browser` oder `roles/viewer` auf dem echten Production-Projekt |
| Firebase-Projekt sichtbar machen | `roles/firebase.viewer` |
| App Hosting Backends lesen | `roles/firebaseapphosting.viewer` |
| Service Usage lesen, falls API-Sichtbarkeit blockiert | Rolle mit `serviceusage.services.get` und `serviceusage.services.list` |

Fuer einen spaeteren Rollout, erst nach separater Freigabe:

| Zweck | Benoetigte Rolle/Berechtigung |
| --- | --- |
| App Hosting Rollout erstellen | `roles/firebaseapphosting.admin` oder aequivalente App-Hosting-Rollout-Berechtigung |
| Build-/Runtime-Zugriff | Projektabhaengig Cloud Build, Artifact Registry, Cloud Run oder verwaltete App-Hosting-Service-Account-Rechte |
| Runtime Secrets lesen | Zugriff auf die Production-Secret-Verwaltung, keine Secret-Dateien im Repo |

Nicht als Standard verwenden:

- Owner als pauschale Loesung.
- Projektweite Token-Creator-Rechte, wenn service-account-spezifische Rollen reichen.
- Lokale Service-Account-Key-Dateien im Repository.

## Erlaubter Preflight Erst Nach Target-Verifikation

Der folgende Command ist nur eine Formvorgabe. Er darf erst ausgefuehrt werden, wenn alle Platzhalter durch echte, verifizierte Production-Werte ersetzt sind:

```bash
npm run production:preflight:apphosting -- \
  --project <production-project-id> \
  --backend <production-backend-id> \
  --git-commit <release-commit-sha>
```

Das Script muss dann Projekt- und Backend-Sichtbarkeit bestaetigen und darf erst danach einen Rollout-Command ausgeben. Der ausgegebene Status ist `GO_FOR_EXPLICIT_APPROVAL`, nicht automatisches Production-Go.

## Blocker

1. Keine `.firebaserc` im Repository.
2. Keine verifizierte Production Project ID.
3. Keine verifizierte Production App Hosting Backend ID.
4. `apphosting.yaml` ist staging-orientiert und darf nicht als Production-Konfiguration verwendet werden.
5. Production Firebase Web-App-Konfiguration ist nicht bekannt.
6. Expected Production Release Commit ist nicht explizit freigegeben.
7. Production-Rollback-Revision ist nicht bekannt.

## Go/No-Go Fuer Preflight

| Ziel | Entscheidung | Grund |
| --- | --- | --- |
| Production Target Inventory | Go | Bekannte und fehlende Werte sind dokumentiert. |
| Production Preflight mit echten Parametern | **No-Go** | Project ID, Backend ID und freigegebener Release Commit fehlen. |
| Production Rollout | **No-Go** | Kein erfolgreicher Production Preflight, keine verifizierte Zielumgebung, keine Rollout-Freigabe. |

## Naechste Sichere Schritte

1. Echte Production Project ID aus Firebase/GCP Console bereitstellen.
2. Release-Identitaet mindestens lesend auf dieses Projekt berechtigen.
3. App Hosting Backend ID ueber Console oder read-only CLI bestaetigen.
4. Production-spezifische Runtime-Konfiguration dokumentieren, ohne Secrets ins Repo zu schreiben.
5. Freigegebenen Release Commit benennen.
6. Erst danach `npm run production:preflight:apphosting` mit echten Parametern ausfuehren.
