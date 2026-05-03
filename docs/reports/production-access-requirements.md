# Production Access Requirements

Datum: 2026-05-02
Scope: Production-Zugriff vorbereiten, ohne Deployment und ohne Production-Datenzugriff.

## Aktueller Blocker

Production Deployment bleibt blockiert, weil die echte Firebase/GCP Production-Zielumgebung nicht verifizierbar ist:

- Keine `.firebaserc` im Repository.
- `firebase.json` enthaelt keine Production-Projekt-ID und keine App-Hosting-Backend-ID.
- `apphosting.yaml` ist explizit staging-orientiert.
- `package.json` enthaelt keine Production-Rollout-Scripts.
- Die aktuelle Identitaet sieht kein Firebase-Production-Projekt.

Explizite No-Go-Regel:

```text
Keine geratenen Production-IDs verwenden.
```

Ein Rollout darf erst vorbereitet oder ausgefuehrt werden, wenn Production-Projekt-ID und Production-App-Hosting-Backend-ID durch CLI/Firebase Console verifiziert sind.

## Verwendete Identitaet

```text
lukas.haenzi@gmail.com
```

## Sichtbare Projekte

GCP, sichtbar via `gcloud projects list`:

```text
afbm-staging                    afbm-staging      101239771229
project-0d1a7d29-57e9-454a-9e2  My First Project  919803016792
```

Firebase, sichtbar via `firebase projects:list`:

```text
afbm-staging
```

Sichtbares App Hosting Backend:

```text
projects/afbm-staging/locations/europe-west4/backends/afbm-staging-backend
```

## Fehlende Production-ID

Production-Projekt-ID:

```text
Nicht verifiziert
```

Production-App-Hosting-Backend-ID:

```text
Nicht verifiziert
```

Gepruefter, aber nicht verifizierter Kandidat:

```text
afbm-production
```

Ergebnis:

```text
Project 'projects/afbm-production' not found or deleted.
```

Der zweite sichtbare GCP-Kandidat `project-0d1a7d29-57e9-454a-9e2` besitzt keine sichtbaren App-Hosting-Backends.

## Benotigte Rollen Zur Verifikation

Fuer `lukas.haenzi@gmail.com` auf dem echten Production-Projekt:

- `roles/browser` oder `roles/viewer`, damit das Projekt in `gcloud projects list` sichtbar ist.
- `roles/firebase.viewer`, damit das Projekt in `firebase projects:list` sichtbar ist.
- `roles/firebaseapphosting.viewer`, damit App Hosting Backends lesbar sind.
- Falls Service Usage den Zugriff blockiert: eine Rolle mit `serviceusage.services.get` und `serviceusage.services.list`.

Minimaler Verifikationscheck nach Rollenvergabe:

```bash
gcloud projects list --filter='projectId=<production-project-id>' --format='table(projectId,name,projectNumber)'
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools projects:list --json
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:backends:list --project <production-project-id> --json
```

## Benotigte Rollen Zum Deployment

Erst nach separater Freigabe:

- `roles/firebaseapphosting.admin` oder aequivalente App-Hosting-Rollout-Berechtigungen.
- Zugriff auf die Firebase App Hosting GitHub Repository-Verknuepfung.
- Ggf. Cloud Build/Artifact Registry/Cloud Run Rechte, falls das Projekt diese nicht ueber App Hosting Managed Service Accounts kapselt.
- Leserechte auf benoetigte Secrets/Runtime-Konfiguration, falls Production App Hosting Secret-Referenzen nutzt.

Nicht fuer Rollout verwenden:

- Owner-Rolle als Standardloesung.
- Projektweite Token-Creator-Rechte, wenn service-account-spezifische Rollen reichen.
- Lokale Service-Account-Key-Dateien im Repository.

## Sicherer Rollout-Prozess

1. Production-Projekt-ID durch Firebase Console oder GCP Console bestaetigen.
2. `lukas.haenzi@gmail.com` mindestens lesend fuer Verifikation berechtigen.
3. Preflight ausfuehren:

   ```bash
   npm run production:preflight:apphosting -- --project <production-project-id> --backend <production-backend-id> --git-commit <release-commit>
   ```

4. Preflight muss Projekt und Backend sichtbar bestaetigen.
5. Release-Commit muss bereits auf `origin/main` liegen.
6. Vor Rollout erneut ausfuehren:
   - `git status --short --untracked-files=all`
   - `git log --oneline -5`
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run build`
   - `npm run test:firebase:parity`
   - Staging-Smoke, falls Staging-Testliga in einem simulierbaren Zustand ist.
7. Production-Rollout-Command nur nach expliziter Freigabe ausfuehren.
8. Nach Rollout nur nicht-destruktiven Smoke:
   - App laedt.
   - Login laedt.
   - Admin API ohne Token liefert 401.
   - Logs zeigen keine `severity>=ERROR`.
9. Mutierende Production-Smokes nur mit separater Freigabe und einer dafuer markierten Testliga.

## Preflight-Checkliste

- [ ] Production-Projekt-ID ist kein Platzhalter.
- [ ] Production-Backend-ID ist kein Platzhalter.
- [ ] `.firebaserc` oder dokumentierte CLI-Ausgabe bestaetigt die Zielumgebung.
- [ ] `apphosting.yaml` oder Production-spezifische App-Hosting-Konfiguration nutzt Production-ENV:
  - `AFBM_DEPLOY_ENV=production`
  - `NEXT_PUBLIC_AFBM_DEPLOY_ENV=production`
  - Production Firebase Web App Config
- [ ] Keine Emulator-Variablen in Production.
- [ ] Keine Staging-Projekt-ID in Production.
- [ ] Keine Seed-/Reset-Flags in Production.
- [ ] Keine Secrets im Repository.
- [ ] Release-Commit ist eindeutig.
- [ ] Staging ist gruen.
- [ ] Rollback-Revision ist bekannt.

## Dry-Run / Preflight Tool

Neu:

```bash
npm run production:preflight:apphosting -- --project <production-project-id> --backend <production-backend-id> --git-commit <release-commit>
```

Eigenschaften:

- Nur read-only CLI-Aufrufe.
- Kein Rollout.
- Keine Firestore- oder Auth-Datenzugriffe.
- Bricht bei fehlenden oder platzhalterhaften IDs ab.
- Druckt einen Rollout-Command-Entwurf erst, wenn Projekt und Backend sichtbar sind.

## Rollout Command Entwurf

Nur Form, nicht ausfuehren:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:rollouts:create <production-backend-id> --project <production-project-id> --git-commit <release-commit> --force --json
```

## Finale Regel

Production Deployment bleibt **No-Go**, bis alle folgenden Werte verifiziert sind:

- echte Production-Projekt-ID
- echte Production-App-Hosting-Backend-ID
- sichtbarer App-Hosting-Backend-Eintrag fuer die aktuelle Release-Identitaet

Keine geratenen Production-IDs verwenden.
