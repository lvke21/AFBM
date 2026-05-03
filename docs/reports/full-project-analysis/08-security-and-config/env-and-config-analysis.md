# Env And Config Analysis

## Ziel der Analyse

Bewertung des Environment- und Config-Handlings, ohne lokale Secret-Werte auszugeben.

## Untersuchte Dateien/Bereiche

- `.gitignore`
- `.env`
- `.env.local`
- `.env.example`
- `next.config.ts`
- `src/lib/env/runtime-env.ts`
- `src/lib/env/runtime-env.test.ts`
- `src/lib/firebase/client.ts`
- `src/lib/firebase/admin.ts`
- `apphosting.yaml`
- `firebase.json`
- `docs/guides/environment-matrix.md`
- `docs/guides/firebase-production-setup.md`

## Lokale Env-Dateien

Feststellung:

- `.env` existiert lokal.
- `.env.local` existiert lokal.
- Beide Dateien sind durch `.gitignore` ausgeschlossen.
- `git status` fuer diese Dateien zeigt keine tracked/untracked Ausgabe.

Bewertung:

- Gut: lokale Secrets sind nicht im Git-Index sichtbar.
- Risiko: Debug- oder Report-Commands duerfen diese Dateien niemals mit Inhalt ausgeben.

## `.gitignore`

Relevante Eintraege:

- `.env`
- `.env.*`
- `.local/`
- `.next/`
- `coverage/`
- `firebase-emulator-data/`
- `reports-output/`
- `test-results/`
- `playwright-report/`
- `*.log`

Bewertung:

- Gut fuer Secret- und Artefakt-Schutz.
- `.env.example` ist explizit erlaubt.

## Runtime Guards

Datei: `src/lib/env/runtime-env.ts`

Staerken:

- Definiert `local`, `staging`, `production`.
- Blockiert Emulator-Variablen ausserhalb lokaler Entwicklung.
- Blockiert Preview-/Seed-/Cloud-Seed-Flags ausserhalb lokaler Entwicklung.
- Blockiert `NEXT_PUBLIC_AFBM_ONLINE_BACKEND=local` ausserhalb lokaler Entwicklung.
- Verlangt Production Public Firebase Config.
- Blockiert `demo-*` Firebase-Projekte in Production.
- Blockiert `DATA_BACKEND=firestore` in Production ohne explizites Freigabeflag.
- Validiert paarweise Firebase Admin Credentials.
- `next.config.ts` ruft den Guard beim Next-Startup auf.

Risiken:

- `readDeployEnvironment()` faellt bei `NODE_ENV=production` ohne explizites Deploy-Env auf `production`. Das ist sicher, kann aber lokale Production-Builds blockieren, wenn Env unvollstaendig ist.
- Staging erlaubt Firestore als Runtime-Datenpfad, was korrekt ist, aber Staging-Smokes und Seeds muessen streng getrennt bleiben.

Empfehlung:

- Vor jedem Deployment `AFBM_DEPLOY_ENV` explizit setzen.
- Production nie nur ueber `NODE_ENV=production` implizit ableiten lassen.

## Firebase Client Config

Datei: `src/lib/firebase/client.ts`

Bewertung:

- Liest nur `NEXT_PUBLIC_FIREBASE_*` und Public Backend Flags.
- Emulator-Hosts werden nur genutzt, wenn nicht Production und Backend Mode Firebase ist.
- Firebase Web-App API Key ist public client config, kein Server-Secret.

Risiko:

- Public Firebase Config ist projektgebunden. Wenn Staging-Werte in Production geraten, spricht Production gegen Staging.

Empfehlung:

- Staging- und Production-Web-App-Config strikt pro App-Hosting-Backend trennen.
- Production-Build muss `NEXT_PUBLIC_AFBM_DEPLOY_ENV=production` und Production Project ID tragen.

## Firebase Admin Config

Datei: `src/lib/firebase/admin.ts`

Staerken:

- Server-only Kommentar vorhanden.
- Projekt-ID wird aus Server Env gelesen.
- `USE_FIRESTORE_EMULATOR=false` verhindert Emulator-Host-Verwendung.
- Explicit Admin Credentials muessen paarweise gesetzt werden.
- Falls keine explicit Credentials vorhanden sind, wird Application Default Credentials/App Hosting Runtime verwendet.

Risiken:

- Server-only ist aktuell Konvention, kein technischer Compile-Time-Guard.
- Client-Import von Firebase Admin war historisch bereits ein Build-Problem.

Empfehlung:

- `import "server-only"` in Server-only Modulen pruefen.
- CI-Grep beibehalten: keine `firebase-admin` Imports unter `src/components` oder Client Components.

## `apphosting.yaml`

Feststellung:

- Die Datei ist explizit staging-orientiert.
- Sie setzt Staging Deploy Env, Firestore Backend und Firebase-Projektkonfiguration.
- Sie enthaelt Public Firebase Web-App-Konfiguration.

Bewertung:

- Fuer Staging nachvollziehbar.
- Fuer Production gefaehrlich, wenn wiederverwendet.

Empfehlung:

- Eine separate Production-App-Hosting-Konfiguration oder Backend-spezifische Secret/Env-Verwaltung verwenden.
- Datei im Namen oder Kommentar noch deutlicher als staging-only markieren.

## `firebase.json`

Feststellung:

- Definiert Firestore/Auth Emulatoren auf Localhost.
- Verweist auf `firestore.rules` und `firestore.indexes.json`.
- Keine Projekt-ID und keine Production-Zuordnung.

Bewertung:

- Gut fuer lokale Entwicklung.
- Kein Deployment-Ziel ohne CLI-Projektkontext.

## Dokumentationsrisiken

Gefunden:

- `docs/guides/environment-matrix.md` beschreibt den aktuellen Firebase Admin Claim Flow besser.
- `docs/guides/firebase-production-setup.md` enthaelt noch alte bzw. widerspruechliche Hinweise zum Admin-Login.

Risiko:

- Operatoren koennen bei Production-Vorbereitung falsche Annahmen treffen.

Empfehlung:

- Production Setup Guide aktualisieren:
  - kein Admin-Code-Login.
  - Admin: Firebase ID Token + Custom Claim oder bewusst serverseitige UID-Allowlist.
  - Firestore Rules bleiben claim-basiert.

## Gesamtbewertung

Status: Gelb-Gruen.

Das Env-System ist defensiv und gut getestet. Die Hauptgefahr liegt in falscher Umgebungskopplung: Staging-Config darf nie als Production-Config wiederverwendet werden.
