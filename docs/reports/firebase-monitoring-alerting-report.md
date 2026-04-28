# Firebase Monitoring and Alerting Report

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Status: Gruen

## Executive Summary

Das minimale Monitoring-/Alerting-Konzept fuer einen spaeteren Firestore-Betrieb ist vorbereitet. Es wurde keine produktive Firestore-Aktivierung vorgenommen, keine Prisma-Entfernung durchgefuehrt, keine Auth-Umstellung umgesetzt und keine Secrets committet.

Firestore bleibt Production-No-Go. Die neuen Hooks sind opt-in und erzeugen strukturierte Logs fuer lokale, Preview- oder Staging-Validierung.

## Implementierte Hooks

Neu:

- `src/server/repositories/firestoreOperationalLogger.ts`
- `src/server/repositories/firestoreOperationalLogger.test.ts`

Aktualisiert:

- `src/server/repositories/firestoreGuard.ts`
- `src/server/repositories/index.ts`
- `src/server/repositories/weekMatchStateRepository.firestore.ts`

Bestehende Hooks, die weiter genutzt werden:

- `src/lib/observability/performance.ts`
- `src/server/repositories/firestoreUsageLogger.ts`

## Aktivierung

Operational Logs:

```bash
AFBM_FIRESTORE_OPERATION_LOG=true
```

Alternative:

```bash
FIRESTORE_OPERATION_LOGGING=true
```

Performance Logs:

```bash
AFBM_PERFORMANCE_LOG=true
```

Usage/Kosten Logs:

```bash
FIRESTORE_USAGE_LOGGING=true
```

Optionale Korrelation:

```bash
AFBM_REQUEST_ID=<request-or-trace-id>
```

## Log-Events

| Event | Zweck | Beispielquelle |
| --- | --- | --- |
| `data_backend_configuration` | `DATA_BACKEND` falsch, Firestore ohne Emulator, nicht-demo Projekt | `firestoreGuard`, Repository Provider |
| `repository_error` | Repository-Operation wirft Fehler | Week Loop Repository Wrapper |
| `write_failure` | Firestore-Write/Transaction scheitert | Week-State Update |
| `state_transition_failure` | Ungueltige Week-State Transition | `prepare/start/finish/advance` |
| `unexpected_prisma_fallback` | vorgesehener Marker fuer spaetere Preview/Production-Gates | Operational Logger |
| `firestore_operation` | allgemeiner Betriebsmarker fuer spaetere Erweiterung | Operational Logger |

Keine Dokumentinhalte, Secrets, Tokens, Passwoerter, private Keys oder User-IDs werden geloggt. Sensitive Metadata Keys werden redacted.

## Monitoring-Anforderungen

| Bereich | Signal | Schwelle | Severity | Reaktion |
| --- | --- | ---: | --- | --- |
| Permission Denied | Firestore `permission-denied` / Rules deny | > 5/min in Preview oder jeder Spike nach Release | Critical | Rollout stoppen, Rules/Auth-Claims pruefen |
| Repository Errors | `repository_error` | > 3 in 5 min pro Kernflow | High | Error-Logs und letzten Deploy pruefen |
| Write Failures | `write_failure` | >= 1 bei Match/Week State | Critical | Firestore-Writes stoppen, DATA_BACKEND auf Prisma |
| State Transition Failures | `state_transition_failure` | >= 1 in Browser-E2E oder Preview | Critical | Week Loop blockieren, Datenstatus vergleichen |
| Ungewoehnlich hohe Reads | Usage Reads > Budget | Dashboard > 150, Stats View > 100, Match Detail > 75 | Warning/High | Readmodel/Query pruefen |
| Ungewoehnlich hohe Writes | Writes pro Match > Budget | State-only > 15, Full Game+Stats > 150 | High | Stats/Events-Orchestrator pruefen |
| Latenz Kernflows | `AFBM_PERFORMANCE_LOG` duration | Dashboard > 1500ms, Match Finish > 3000ms | Warning/High | Query-Plan, Index, Aggregate pruefen |
| Backfill/Compare | Critical differences | > 0 | Critical | Migration stoppen, Prisma als Source of Truth |
| Prisma-Fallback | `unexpected_prisma_fallback` | >= 1 bei Firestore-Test | High | Repository-Switch und ENV pruefen |
| DATA_BACKEND | `data_backend_configuration` | >= 1 in Preview/Prod | Critical | Deployment/ENV korrigieren |

## Rollback-Kriterien

Sofortiger Rollback auf Prisma, wenn eines davon auftritt:

- Firestore-Write-Failure im Week Loop oder Match Finish.
- Backfill-/Compare-Abweichung bei Counts, IDs, Week-State, Scores, Stats oder Reports.
- Permission-Denied-Spike nach Release.
- `DATA_BACKEND=firestore` ohne explizite Freigabe.
- Unerwarteter Prisma-Fallback waehrend eines Firestore-Gates.
- Kosten-/Usage-Budget wird in Preview/Staging deutlich ueberschritten.

## Runbook

Runbook erstellt:

- `docs/runbooks/firebase-rollback-runbook.md`

Kurzfassung:

1. Firestore-Go-Live stoppen.
2. `DATA_BACKEND=prisma` setzen oder unsetten.
3. App neu deployen/restarten.
4. Firestore-Writes stoppen.
5. Logs/Usage/Compare pruefen.
6. Prisma-Snapshot als Source of Truth nutzen.
7. Firestore erst nach Ursachenanalyse wieder in Preview/Staging testen.

## Bewusst Nicht Aktiviert

- Kein externer Monitoring-Dienst.
- Kein Firebase Production Deployment.
- Keine produktiven Alert Policies.
- Keine Secrets.
- Keine Auth-Umstellung.
- Keine Prisma-Entfernung.

## Tests

Ausgefuehrt:

- `npx tsc --noEmit`: Gruen
- `npm run lint`: Gruen
- `npx vitest run src/server/repositories/firestoreOperationalLogger.test.ts src/server/repositories/index.test.ts src/lib/observability/performance.test.ts`: Gruen, 11 Tests
- `npm run test:firebase`: Gruen, 13 Tests

## Statuspruefung

| Frage | Ergebnis |
| --- | --- |
| Fehler sichtbar? | Ja, strukturierte Repository-/Guard-/State-Transition-Logs |
| Rollback dokumentiert? | Ja |
| Alert-Kriterien klar? | Ja |
| Keine Secrets im Repo? | Ja |
| Prisma-Fallback bleibt sicher? | Ja, Prisma bleibt Default |
| Tests gruen? | Ja |

Status: Gruen
