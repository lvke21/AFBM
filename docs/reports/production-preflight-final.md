# Production Preflight Final

Date: 2026-05-03

## Ziel

Production App Hosting Rollouts duerfen nur vorbereitet werden, wenn die Zielumgebung eindeutig verifiziert ist. Der Preflight ist read-only und erstellt keinen Rollout.

## Aktueller Gate-Lauf

Datum: 2026-05-03

Der angeforderte Production-Preflight konnte nicht gegen eine echte Zielumgebung ausgefuehrt werden, weil in der Anfrage und in den geprueften Repo-Quellen nur Platzhalter statt verifizierter Production-Zielwerte vorliegen.

Ausgefuehrter Guard-Check:

```bash
npm run production:preflight:apphosting -- --project '<production-project-id>' --backend '<production-backend-id>' --git-commit '<release-commit>'
```

Ergebnis:

```text
[production-preflight] status=NO_GO Production project id must be a concrete verified value, not a placeholder.
```

Bewertung: **Preflight rot**. Das ist das korrekte Gate-Verhalten; der Preflight darf mit Platzhalterwerten keine Firebase-/GCP-Sichtbarkeitschecks starten und keinen Rollout-Command ausgeben.

## Zielumgebung-Verifikation

| Pruefpunkt | Ergebnis | Bewertung |
| --- | --- | --- |
| Production Project ID | Nicht bereitgestellt / nicht verifiziert | Blocker |
| Production Backend ID | Nicht bereitgestellt / nicht verifiziert | Blocker |
| Release Commit | Platzhalter `<release-commit>`; lokaler HEAD `1a28d88eaaa99a182612638652d0165705ce6901` ist nicht als Production-Release-Commit freigegeben | Blocker |
| Projekt sichtbar? | Nicht geprueft, weil Project ID Platzhalter ist | Blocker |
| Backend sichtbar? | Nicht geprueft, weil Backend ID Platzhalter ist | Blocker |
| IAM ausreichend? | Nicht bestimmbar ohne echte Zielumgebung | Blocker |
| App Hosting erreichbar? | Nicht geprueft, weil keine echte Production-Zielumgebung verifiziert ist | Blocker |
| Rollout Command | Nicht ausgegeben | Korrekt; kein Entwurf ohne verifizierte Zielumgebung |

Verifizierte Production-Zielumgebung: **keine**.

## Implementierte Regel

`npm run production:preflight:apphosting` verlangt jetzt konkrete Werte fuer:

- Production Project ID: `--project <production-project-id>`
- Production Backend ID: `--backend <production-backend-id>`
- Release Commit SHA: `--git-commit <release-commit-sha>`

Der Preflight blockiert:

- fehlende Werte
- Platzhalterwerte
- nicht SHA-foermige Commits
- offensichtlich nicht-produktive Targets wie `staging`, `dev`, `test`, `demo`, `local`, `emulator`, `preview`
- fehlenden aktiven `gcloud` Account
- Firebase-Projekte, die fuer die aktuelle CLI-Identitaet nicht sichtbar sind
- App Hosting Backends, die im verifizierten Projekt nicht sichtbar sind

Der Rollout-Command wird erst nach erfolgreicher Projekt- und Backend-Sichtbarkeit ausgegeben.

## Gueltiger Preflight-Aufruf

```bash
npm run production:preflight:apphosting -- \
  --project <production-project-id> \
  --backend <production-backend-id> \
  --git-commit <release-commit-sha>
```

## Ausgabe bei Erfolg

Bei erfolgreicher Verifikation gibt das Script aus:

```text
[production-preflight] status=GO_FOR_EXPLICIT_APPROVAL
[production-preflight] rolloutCommand=
XDG_CONFIG_HOME=.local/firebase-config npx firebase-tools apphosting:rollouts:create <production-backend-id> --project <production-project-id> --git-commit <release-commit-sha> --force --json
```

Der Status ist absichtlich `GO_FOR_EXPLICIT_APPROVAL`, nicht automatisches `GO`. Der ausgegebene Command ist der naechste manuelle Rollout-Schritt.

## Aktueller lokaler Status

Ohne echte Production IDs bleibt der Preflight korrekt rot:

```text
[production-preflight] status=NO_GO Production project id is required.
```

Mit Platzhalterwerten bleibt der Preflight ebenfalls korrekt rot:

```text
[production-preflight] status=NO_GO Production project id must be a concrete verified value, not a placeholder.
```

Die positive Sichtbarkeits- und Command-Ausgabe ist ueber `scripts/production-apphosting-preflight.test.ts` mit gemockter `gcloud`/`firebase-tools`-Antwort abgesichert.

## Checks

| Check | Status | Ergebnis |
| --- | --- | --- |
| `npm run production:preflight:apphosting` | Gruen als Guard | Blockiert ohne konkrete Project ID: `Production project id is required.` |
| `npm run production:preflight:apphosting -- --project '<production-project-id>' --backend '<production-backend-id>' --git-commit '<release-commit>'` | Rot / Guard korrekt | Blockiert Platzhalter: `Production project id must be a concrete verified value, not a placeholder.` |
| `npm run production:preflight:apphosting -- --project afbm-staging --backend afbm-staging-backend --git-commit 9bd4d2cc604f` | Gruen als Guard | Blockiert Staging-Target: `refuses non-production-looking project or backend ids.` |
| `npx vitest run scripts/production-apphosting-preflight.test.ts` | Gruen | Pflichtfelder, Non-Production-Target, Sichtbarkeit und Rollout-Command getestet |
| `npx tsc --noEmit` | Gruen | Keine TypeScript-Fehler |
| `npm run lint` | Gruen | Keine Lint-Fehler |

## Entscheidung

Production bleibt **No-Go**, solange keine echte Production Project ID, Backend ID und kein freigegebener Release Commit mit der aktuellen CLI-Identitaet sichtbar verifiziert wurden.

Production Preflight mit echten Parametern: **No-Go**, weil die Voraussetzung "Production project id und backend id sind bekannt und verifiziert" in diesem Arbeitsstand nicht erfuellt ist.
