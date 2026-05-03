# Code Hygiene Triage

Stand: 2026-05-02

## Scope

Fokus: N014, N015, N016.

Geprüft wurden:

- unused exports
- TODO/FIXME/HACK
- console.*

## Methode

- `node scripts/analysis/codebase-metrics.mjs --compact`
- `rg -n "TODO|FIXME|HACK" firestore.rules src scripts --glob '!node_modules' --glob '!*.tsbuildinfo'`
- `rg -n "\bconsole\.(log|debug|info|warn|error|trace|table|group|groupEnd)\b" src scripts e2e prisma --glob '!node_modules' --glob '!*.tsbuildinfo'`
- gezielte `rg`-Prüfung für entfernte exportierte Typen

Grenze: Der vorhandene unused-export-Analyzer ist bewusst nicht compiler-aware. Er zählt Namensreferenzen in anderen Dateien und erzeugt daher False Positives bei Next.js-Routen, Server Actions, Barrel-Exports, Tests, CLI-Scripts und öffentlich gedachten Modelltypen.

## Entfernt

Sicher entfernt wurde nur exportierte API-Oberfläche, kein Laufzeitcode:

| Datei | Änderung | Begründung |
|---|---|---|
| `src/components/admin/admin-feedback-banner.tsx` | `AdminFeedbackTone` nicht mehr exportiert | nur lokal genutzt |
| `src/components/admin/admin-league-detail-display.tsx` | `AdminDisplayedWeekGame` nicht mehr exportiert | nur lokal genutzt |
| `src/components/admin/admin-league-form-validation.ts` | `AdminLeagueFormValidationResult` nicht mehr exportiert | nur lokal genutzt |
| `src/components/auth/use-firebase-admin-access.ts` | `FirebaseAdminAccessState` nicht mehr exportiert | nur Hook-Rückgabetyp im selben Modul |
| `src/components/admin/admin-league-action-config.ts` | `AdminLeagueActionGroup` nicht mehr exportiert | nur lokale Config-/Filter-Grenze |
| `firestore.rules` | zwei TODO-Kommentare in diesen Report überführt | keine Rules-Semantik geändert |

## Behalten Mit Begründung

### Unused Exports

Der Analyzer meldete vor Cleanup 577 Kandidaten. Nach manueller Prüfung wurden nur die fünf lokalen Typ-Exports oben bereinigt.

Behalten:

- Next.js Route-Typen und Server Actions: können indirekt oder framework-seitig relevant sein.
- Script-/Seed-Exports: können von Tests, `tsx`-Direktaufrufen oder Operator-Workflows genutzt werden.
- Modelltypen in `src/components/**`: oft absichtlich als Test-/ViewModel-Grenzen exportiert.
- Barrel-Exports in `src/modules/gameplay/**/index.ts`: öffentliche Moduloberfläche, nicht mit Textsuche entfernen.

### TODO/FIXME/HACK

Produktionsnahe offene Marker nach Cleanup:

- keine in `firestore.rules` oder `src`.
- verbleibender Treffer in `scripts/analysis/codebase-metrics.mjs` ist die Suchlogik selbst und bleibt.

Dokumentations-Treffer in bestehenden Reports bleiben als historische Analyse erhalten.

### console.*

Nicht entfernt, weil die Treffer bewusstes Logging oder CLI-Ausgabe sind.

Produktionsnahe `src`-Treffer:

| Bereich | Dateien | Entscheidung |
|---|---|---|
| Audit | `src/lib/audit/security-audit-log.ts` | behalten, Audit-Ausgabe |
| Performance | `src/lib/observability/performance.ts` | behalten, explizite Performance-Telemetrie |
| Auth | `src/lib/online/auth/online-auth.ts` | behalten, produktiver Auth-Fehlerlog ohne Passwort/Token |
| Online Integrity | `src/lib/online/online-league-service.ts`, `src/lib/admin/online-week-simulation.ts`, `src/lib/online/repositories/firebase-online-league-repository.ts` | behalten, Hard-Fail-/Repair-Diagnose bei widersprüchlichem State |
| Firestore Ops | `src/server/repositories/firestoreUsageLogger.ts`, `src/server/repositories/firestoreOperationalLogger.ts` | behalten, Operational Logging |

Script-/Seed-/Smoke-Treffer bleiben, weil sie direkte CLI-Ergebnisse, Staging-Smoke-Ausgaben, Preflight-Hinweise oder Seed-Zusammenfassungen liefern.

## Follow-up

1. `unused exports`: compiler-aware Tool wie `knip` oder `ts-prune` als eigenes QA-Ticket evaluieren; nicht über die aktuelle Textsuche löschen.
2. `console.*`: Logging-Policy festlegen: App-Code nur über Audit/Observability/Operational-Logger oder bewusst markierte Integrity-Fails.
3. Firestore Auth/Write-Strategie: aus den ehemaligen Rules-TODOs ein Security-Ticket ableiten:
   - finale Rolle von Custom Claims vs. Memberships
   - Admin SDK only für Simulation, Stats, Finance, Reports und Roster-Schreibpfade
4. Script-Exports: separat prüfen, welche Seed-/Staging-Helfer echte Library-Exports sein sollen und welche nur CLI-intern bleiben.

## Status

Kein produktives Logging wurde entfernt oder abgeschwächt. Die vorgenommenen Änderungen sind auf Kommentar-/API-Hygiene beschränkt.
