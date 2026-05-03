# Production Deployment Blocker Verification

Datum: 2026-05-02
Scope: Nur lesen/listen, kein Production-Rollout, keine Production-Datenänderung.

## Ergebnis

Production Deployment bleibt **No-Go**.

Grund:
- Die echte Production Firebase/GCP Projekt-ID ist mit der aktuellen Identität nicht sichtbar.
- Eine echte Production App Hosting Backend-ID ist nicht verifizierbar.
- Das Repo enthält keine `.firebaserc` und keine Production-App-Hosting-Konfiguration.
- `apphosting.yaml` ist ausdrücklich staging-orientiert.

## Verwendete Identität

Aktive gcloud Identität:

```text
lukas.haenzi@gmail.com
```

Firebase CLI:
- `XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools projects:list --json` ist authentifiziert und listet Firebase-Projekte.
- `login:list --json` lieferte nur Status ohne Account-Detail; die effektive Projektliste bestätigt aber denselben Zugriffskontext.

## Repo-Prüfung

### `.firebaserc`

Nicht vorhanden.

Auswirkung:
- Kein Firebase-Projektalias fuer `production`.
- Kein Alias fuer eine Production Backend-/Projekt-ID.

### `firebase.json`

Enthält nur Emulator- und Firestore-Rules/Indexes-Konfiguration.

Keine Production-Projekt-ID.
Keine App Hosting Backend-ID.

### `apphosting.yaml`

Staging-orientiert:

```text
AFBM_DEPLOY_ENV=staging
FIREBASE_PROJECT_ID=afbm-staging
NEXT_PUBLIC_FIREBASE_PROJECT_ID=afbm-staging
```

Keine Production-Konfiguration.

### `package.json`

Relevante Scripts sind staging- oder emulator-orientiert:
- `firebase:staging:*`
- `seed:multiplayer:*:staging`
- `staging:smoke:admin-week`

Kein Production-Rollout-Script gefunden.

### Dokumentation

Relevante Dokumente:
- `docs/guides/environment-matrix.md`
- `docs/guides/firebase-app-hosting-setup.md`
- `docs/guides/firebase-production-setup.md`
- `docs/reports/production-release-plan-6151fb6.md`

Dokumentierter Stand:
- Production braucht eigene App-Hosting-Konfiguration oder eigenen Backend-Branch.
- Production Firestore ist separat freigabepflichtig.
- Production-Projekt-ID ist in den Guides nur als Platzhalter beschrieben, nicht real benannt.

## CLI-Prüfung

### Sichtbare GCP-Projekte

Command:

```bash
gcloud projects list --format='table(projectId,name,projectNumber)'
```

Sichtbar:

```text
afbm-staging                    afbm-staging      101239771229
project-0d1a7d29-57e9-454a-9e2  My First Project  919803016792
```

### Sichtbare Firebase-Projekte

Command:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools projects:list --json
```

Sichtbar:

```text
afbm-staging
```

### Staging App Hosting Backends

Command:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:backends:list --project afbm-staging --json
```

Gefunden:

```text
projects/afbm-staging/locations/europe-west4/backends/afbm-staging-backend
```

Backend-ID:

```text
afbm-staging-backend
```

### Production-Kandidat `afbm-production`

Command:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:backends:list --project afbm-production --json
```

Ergebnis:

```text
Project 'projects/afbm-production' not found or deleted.
```

### Zweiter sichtbarer GCP-Kandidat

Command:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:backends:list --project project-0d1a7d29-57e9-454a-9e2 --json
```

Ergebnis:

```text
[]
```

Keine App Hosting Backends.

## Verifizierte IDs

Production-Projekt-ID:

```text
Nicht verifizierbar
```

Production-App-Hosting-Backend-ID:

```text
Nicht verifizierbar
```

Staging-Projekt-ID:

```text
afbm-staging
```

Staging-App-Hosting-Backend-ID:

```text
afbm-staging-backend
```

## Benötigte Berechtigungen

Für reine Verifikation der Production-Zielumgebung braucht die verwendete Identität Zugriff auf das echte Production-Projekt.

Mindestens sinnvoll:
- Firebase Console Projektzugriff als Viewer oder Owner/Editor über Firebase IAM.
- GCP `roles/browser` oder `roles/viewer`, damit das Projekt in `gcloud projects list` sichtbar ist.
- `roles/firebase.viewer`, damit `firebase projects:list` das Projekt zeigt.
- `roles/firebaseapphosting.viewer`, damit `firebase apphosting:backends:list --project <production-project>` Backends lesen kann.
- Falls Service Usage blockiert: `serviceusage.services.get/list` über Viewer-Rollen.

Für einen späteren Rollout zusätzlich, erst nach Freigabe:
- `roles/firebaseapphosting.admin` oder äquivalente App-Hosting-Rollout-Berechtigungen.
- Zugriff auf die verbundene GitHub/App-Hosting-Repository-Verknüpfung.
- Ggf. Service-Account-/Cloud-Build-bezogene Rollen, falls das Backend beim Rollout Images/Builds auslöst.

## Production-Rollout-Command Entwurf

Nicht ausführen, nur Form:

```bash
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:rollouts:create <production-backend-id> --project <production-project-id> --git-commit 3a90eec --force --json
```

Kein finaler Command mit echten IDs kann seriös ausgegeben werden, solange `<production-project-id>` und `<production-backend-id>` nicht verifiziert sind.

## Finale Entscheidung

Production Deploy: **weiterhin No-Go**

Code-/Staging-Stand: **Go-Kandidat**

Deployment-Blocker:
- Echte Production-Projekt-ID fehlt.
- Echte Production-App-Hosting-Backend-ID fehlt.
- Aktuelle Identität sieht kein Production-Firebase-Projekt.

Nächster Schritt:
- Echte Production-Projekt-ID bereitstellen oder `lukas.haenzi@gmail.com` mindestens lesend auf das Production-Projekt berechtigen.
- Danach `firebase projects:list` und `firebase apphosting:backends:list --project <production-project-id>` erneut ausführen.
