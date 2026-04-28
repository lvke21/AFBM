# Firebase Preview/Staging Enablement Report

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Status: Gruen

## Executive Summary

Preview/Staging-Faehigkeit wurde sicher vorbereitet, ohne Production zu aktivieren.

Der vorherige Dry Run war Rot, weil kein Preview-Projekt/Alias vorhanden war und Backfill/Compare bewusst Emulator-only waren. Dieser Slice schafft nun die sichere Grundlage:

- Dokumentierter Preview/Staging-Setup-Prozess.
- Beispiel `.firebaserc` ohne echte Projekt-ID.
- Preview ENV-Variablen in `.env.example`.
- Zentraler Preview-Guard fuer Nicht-Emulator-Firestore.
- Backfill/Compare koennen Staging nur mit explizitem Dry-Run-Flag und Allowlist nutzen.
- Seed/Reset/Verify bleiben Emulator-only.
- Production bleibt blockiert.

Es wurde kein Firebase Deployment ausgefuehrt, kein echtes Preview-Projekt angelegt und kein Production-Zugriff gestartet.

## Geaenderte Dateien

Neu:

- `.firebaserc.example`
- `docs/guides/firebase-preview-staging-setup.md`
- `docs/reports/firebase-preview-staging-enablement-report.md`
- `src/lib/firebase/previewGuard.ts`
- `src/lib/firebase/previewGuard.test.ts`
- `scripts/firestore-preview-guard.test.ts`

Aktualisiert:

- `.env.example`
- `package.json`
- `src/server/repositories/firestoreGuard.ts`
- `src/server/repositories/index.test.ts`
- `scripts/firestore-backfill.ts`
- `scripts/firestore-compare.ts`
- `scripts/seeds/firestore-seed.test.ts`

## Dokumentation

Erstellt:

- `docs/guides/firebase-preview-staging-setup.md`

Enthaelt:

- manuelle Erstellung eines Firebase Preview/Staging-Projekts
- Firestore-Aktivierung
- Projekt-ID und Alias `staging`
- `.firebaserc` Beispiel
- `firebase login` / CI-Credentials
- Service Account nur als Secret
- Rules/Indexes Deployment gegen Staging
- Backfill/Compare Dry Run
- klare Warnung: Production bleibt No-Go

## Sichere Config

Ergaenzt in `.env.example`:

```bash
FIREBASE_STAGING_PROJECT_ID=""
FIRESTORE_PREVIEW_DRY_RUN="false"
FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS=""
FIRESTORE_PREVIEW_CONFIRM_WRITE="false"
FIRESTORE_PREVIEW_CONFIRM_DELETE="false"
FIREBASE_PRODUCTION_PROJECT_ID=""
```

Beispiel `.firebaserc`:

```json
{
  "projects": {
    "staging": "replace-with-afbm-staging-project-id"
  }
}
```

Es wurde keine echte Projekt-ID committet.

## Preview Guard

Implementiert in:

- `src/lib/firebase/previewGuard.ts`

Nicht-Emulator-Firestore ist nur erlaubt, wenn:

- `FIRESTORE_PREVIEW_DRY_RUN=true`
- `FIREBASE_PROJECT_ID` oder `NEXT_PUBLIC_FIREBASE_PROJECT_ID` gesetzt ist
- Projekt-ID in `FIRESTORE_PREVIEW_ALLOWLIST_PROJECTS` steht
- Projekt-ID nicht production-like ist
- Projekt-ID nicht `FIREBASE_PRODUCTION_PROJECT_ID` entspricht
- `NODE_ENV !== "production"`

Emulator bleibt erlaubt, aber nur mit `demo-*` Projekt-ID.

Production-Firestore bleibt blockiert.

## Backfill/Compare

Backfill:

- Standard bleibt sicher.
- Preview erfordert:
  - `FIRESTORE_PREVIEW_DRY_RUN=true`
  - allowlistete Projekt-ID
  - `FIRESTORE_PREVIEW_CONFIRM_WRITE=true`
- Preview-Backfill nutzt standardmaessig `--append` im Package Script.
- Destructive Deletes gegen Preview sind blockiert, außer `FIRESTORE_PREVIEW_CONFIRM_DELETE=true` ist zusaetzlich gesetzt.

Compare:

- Preview erfordert:
  - `FIRESTORE_PREVIEW_DRY_RUN=true`
  - allowlistete Projekt-ID
- Keine Write-Confirmation notwendig, weil Compare read-only ist.

Seed/Reset/Verify:

- bleiben bei `ensureFirestoreEmulatorEnvironment()`
- bleiben auf Emulator/`demo-*` beschraenkt
- Staging-Projekt-IDs werden blockiert

## Package Scripts

Ergaenzt:

```bash
npm run firebase:staging:use
npm run firebase:staging:deploy:rules
npm run firebase:staging:deploy:indexes
npm run firebase:staging:backfill
npm run firebase:staging:compare
```

Hinweis:

- `firebase:staging:backfill` setzt `FIRESTORE_PREVIEW_DRY_RUN=true` und `FIRESTORE_PREVIEW_CONFIRM_WRITE=true`, nutzt aber `--append`.
- Projekt-ID und Allowlist muessen aus lokaler ENV oder CI Secrets kommen.
- Deploy-Scripts nutzen Alias `staging`; ohne echte `.firebaserc` bleiben sie wirkungslos.

## Tests

Ausgefuehrt:

```bash
npx tsc --noEmit
npm run lint
npx vitest run src/lib/firebase/previewGuard.test.ts src/server/repositories/index.test.ts scripts/seeds/firestore-seed.test.ts scripts/firestore-preview-guard.test.ts
```

Ergebnis:

- Typecheck: Gruen
- Lint: Gruen
- Guard Tests: Gruen, 19 Tests

Abgedeckt:

- Guard blockiert ohne Flag.
- Guard blockiert nicht-allowlistete Projekt-ID.
- Guard blockiert production-like Projekt-ID.
- Guard blockiert Preview in `NODE_ENV=production`.
- Guard erlaubt allowlistetes Staging nur mit Flag.
- Seed/Reset-Guard bleibt fuer Staging blockiert.
- Preview Backfill blockiert ohne Write-Confirmation.
- Preview Compare blockiert nicht-allowlistete Projekte.

## Nicht Ausgefuehrt

- Kein `firebase login`.
- Kein `.firebaserc` mit echter Projekt-ID.
- Kein `firebase deploy`.
- Kein Backfill gegen echte Staging-Cloud.
- Kein Compare gegen echte Staging-Cloud.
- Kein Browser Flow gegen Preview-App.
- Keine Production-Aktivierung.

## Statuspruefung

| Frage | Ergebnis |
| --- | --- |
| Preview/Staging dokumentiert? | Ja |
| Production weiterhin blockiert? | Ja |
| Backfill/Compare staging-faehig, aber sicher? | Ja, nur mit Dry-Run-Flag und Allowlist |
| Seed/Reset weiterhin Emulator-only? | Ja |
| Tests gruen? | Ja |

Status: Gruen
