# Reports Governance Index

Stand: 2026-05-03

## Aktuelle Wahrheit

**Nur diese Datei gilt als aktueller Report-Index und als aktuelle QA-/Release-Wahrheit.** Alle anderen Dateien in `docs/reports/` sind historische Detailreports, Evidenz oder ersetzt. Sie duerfen gelesen werden, aber sie duerfen diese README nicht ueberstimmen.

Aktuelle Gesamtbewertung:

- Gesamtfortschritt der 120 Findings: **53 geloest / 42 teilweise / 25 offen / 0 Regressionen** aus [findings-recheck-after-hardening-complete.md](./findings-recheck-after-hardening-complete.md).
- Paket-Gate-Status: **nicht vollstaendig final**, weil A4/A5 als Architekturpakete weiterhin teilweise sind. P1 Bundle Budget, G3 Release Gate Scope und G2 Report Governance sind nach den letzten Fixes nicht mehr als Performance-/Gate-fehlend zu behandeln.
- Internal MVP: **Go nur fuer lokal gepruefte, betroffene Pfade**, wenn Typecheck, Lint und relevante Vitest-/E2E-Gates gruen sind.
- Staging Smoke: **Go** fuer Commit `1a28d88eaaa99a182612638652d0165705ce6901`, Revision `afbm-staging-backend-build-2026-05-02-007`, Liga `afbm-multiplayer-test-league`.
- Staging QA: **No-Go**, obwohl der Ziel-Commit-Smoke gruen ist, weil `npm run release:check` im selben Gate-Lauf rot durch einen Vitest-Timeout in `src/modules/gameplay/application/gameplay-calibration.test.ts` war.
- Production: **No-Go**. Das Production-Preflight-Tool ist technisch vorbereitet, aber der aktuelle Preflight-Gate-Lauf ist rot, weil nur Platzhalterwerte vorliegen und keine Production Project ID, Backend ID oder Release-Commit-Freigabe verifiziert ist.
- Production Rollout: **nur nach `npm run production:preflight:apphosting -- --project <production-project-id> --backend <production-backend-id> --git-commit <release-commit-sha>` mit erfolgreicher Sichtbarkeitspruefung**.

## Aktuelle Staging-Wahrheit

| Feld | Wert |
| --- | --- |
| Commit | [`1a28d88eaaa99a182612638652d0165705ce6901`](./staging-smoke-final-gate.md#ziel-commit) |
| Revision | [`afbm-staging-backend-build-2026-05-02-007`](./staging-smoke-final-gate.md#staging-build-info) |
| Smoke Command | [`CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901`](./staging-smoke-final-gate.md#smoke-command) |
| Ergebnis | [Smoke GREEN, Staging QA NO-GO](./staging-smoke-final-gate.md#smoke-ergebnis) |
| Genutzte Liga | `afbm-multiplayer-test-league` |
| Datenmutation | Ja. Der Smoke simulierte Woche `7`, setzte die Liga auf `currentWeek=8` und hinterliess `results=28` in Staging. |
| Production-Daten | Nicht beruehrt |

## Aktuelle Production-Entscheidung

| Feld | Wert |
| --- | --- |
| Entscheidung | **Production No-Go** |
| Gate-Status | Preflight-Script technisch vorbereitet; Zielumgebung nicht verifiziert |
| Letzter Preflight-Gate-Lauf | [Rot: Platzhalterwerte blockiert](./production-preflight-final.md#aktueller-gate-lauf) |
| Target Inventory | [Production Project ID und Backend ID fehlen](./production-target-inventory.md#fehlende-zielparameter) |
| Rollout Command | Nicht ausgegeben; korrekt, weil keine verifizierte Zielumgebung vorliegt |
| Deployment | **Nicht deployen** |
| Fehlende Schritte | Echte Production Project ID bereitstellen, Backend ID sichtbar verifizieren, IAM-Leserechte bestaetigen, Release Commit freigeben, Preflight mit echten Parametern erneut ausfuehren |

## Status-Markierung

| Status | Bedeutung |
| --- | --- |
| AKTUELL | Nur `docs/reports/README.md`. Diese Datei ist der einzige Einstiegspunkt fuer Go/No-Go-Aussagen. |
| REFERENZ | Detailreport mit nuetzlicher Evidenz. Er ist nicht autoritativ, ausser diese README zitiert ihn fuer einen konkreten Punkt. |
| ERSETZT | Historischer Report. Inhalt kann stimmen oder veraltet sein, ist aber nicht mehr die aktuelle Wahrheit. |

## Aktuelle Referenzen

Diese Reports sind die neuesten Detailquellen fuer die aktuelle Bewertung. Status: **REFERENZ**, nicht AKTUELL.

| Thema | Referenz | Aktuelle Aussage |
| --- | --- | --- |
| Paket-Gate-Status | [final-package-verification.md](./final-package-verification.md) | Aktueller Paket-Gate-Report mit Nachtragsstatus: P1/G2/G3/L5/L6 wurden nachgearbeitet; A4/A5 bleiben teilweise. |
| Gesamtfindings | [findings-recheck-after-hardening-complete.md](./findings-recheck-after-hardening-complete.md) | Letzter vollstaendiger 120-Findings-Recheck: 53/120 geloest; keine Regressionen; Production weiter No-Go. |
| Release-Gates | [release-gate-matrix.md](./release-gate-matrix.md) | Typecheck/Lint blockieren alle Ziele; Staging Smoke und Production Preflight blockieren hoeheren Rollout. |
| Release Check Script | `npm run release:check` | Blockiert lokal auf Typecheck, Lint, Build, Bundle Size, Firestore Read Budget, Vitest, Firebase Rules, Firebase Parity und Firebase E2E. Production Preflight und Staging Smoke werden explizit als skipped/nicht freigegeben ausgewiesen, wenn ohne Zielparameter gelaufen. |
| Production Target Inventory | [production-target-inventory.md](./production-target-inventory.md) | Echte Production Project ID, Backend ID, Production Runtime ENV und freigegebener Release Commit fehlen; Preflight mit echten Parametern bleibt No-Go. |
| Production Preflight | [production-preflight-final.md](./production-preflight-final.md) | Script/Gate ist technisch vorbereitet, blockiert aber korrekt mit Platzhalterwerten; kein Projekt, kein Backend und kein Rollout-Command verifiziert. |
| Bundle Budget | [bundle-budget.md](./bundle-budget.md) | Bundle-Budget-Gate existiert und ist nach `npm run build` ueber `npm run bundle:size` reproduzierbar gruen. |
| Firestore Read Budget | [firestore-read-budget.md](./firestore-read-budget.md) | Required Gate in `npm run release:check`; Dashboard `9`, League Load `12`, Draft `121` Reads im letzten Emulator-Messlauf. |
| Performance Baseline | [performance-baseline.md](./performance-baseline.md) | Historische Bundle-/Read-Baseline plus Low-Risk-Optimierung; nicht mehr als Aussage lesen, dass Budgets/Gates fehlen. |
| Lifecycle-Regeln | [lifecycle-usage-rules.md](./lifecycle-usage-rules.md) | Flow-Entscheidungen muessen ueber Lifecycle Read-Model oder klaren Lifecycle-Adapter laufen. |
| Staging Gate | [staging-smoke-final-gate.md](./staging-smoke-final-gate.md) | Aktuelle Staging-Smoke-Wahrheit: [Commit](./staging-smoke-final-gate.md#ziel-commit), [Revision](./staging-smoke-final-gate.md#staging-build-info), [Smoke Command](./staging-smoke-final-gate.md#smoke-command), [Ergebnis](./staging-smoke-final-gate.md#smoke-ergebnis). Smoke ist gruen; Staging QA bleibt No-Go wegen rotem lokalem `release:check`. |
| Prisma E2E Gate | [e2e-postgres-gate-report.md](./e2e-postgres-gate-report.md) | Lokales DB/E2E-Setup ist dokumentiert; fehlende Infrastruktur soll klar preflighten. |
| Admin Security | [admin-auth-report.md](./admin-auth-report.md) | Custom Claim ist kanonische Admin-Wahrheit; UID-Allowlist ist Bootstrap-/Hinweisflaeche. |
| Membership/Mirror | [league-discovery-inventory.md](./league-discovery-inventory.md) und [user-team-source-of-truth-inventory.md](./user-team-source-of-truth-inventory.md) | Membership ist Wahrheit; Mirror/Teamfelder sind Projektionen oder Index. |
| Draft State | [draft-source-of-truth-inventory.md](./draft-source-of-truth-inventory.md) | Pick Docs und Available-Player-Docs sind kanonisch; Legacy-Fallbacks bleiben Risiko, wenn sie aktiv werden. |
| Simulation Boundary | [simulation-adapter-contract.md](./simulation-adapter-contract.md) | Multiplayer-Simulation hat einen Adaptervertrag mit validierten Inputs/Outputs. |

## Performance- und Gate-Wahrheit

| Gate | Status | Aktuelle Regel |
| --- | --- | --- |
| Build | Blockierend lokal | `npm run build` ist Teil von `npm run release:check`. |
| Bundle Budget | Blockierend lokal | `npm run bundle:size` ist Teil von `npm run release:check`; nur reale Required-Routen blockieren, optionale Routen werden explizit markiert. |
| Firebase Parity | Blockierend lokal | `npm run test:firebase:parity` ist Teil von `npm run release:check`. |
| Firestore Read Budget | Blockierend lokal | `npm run firestore:read-budget` ist Teil von `npm run release:check`; aktuelle Budgets: Dashboard <= 25, League Load <= 150, Draft <= 150 Reads. |
| Staging Smoke | Blockierend fuer Staging | Wird nur mit Zielparametern ausgefuehrt; ohne Zielparameter ist das kein Staging-Go. |
| Production Preflight | Blockierend fuer Production | Script ist technisch vorbereitet, aber der aktuelle Gate-Lauf ist rot. Production braucht echte Project ID, Backend ID, Commit SHA und sichtbare App-Hosting-Verifikation. Ohne diese Werte ist Production No-Go. |

## Ersetzte Report-Gruppen

Alle folgenden Gruppen sind **ERSETZT** fuer aktuelle Status- und Go/No-Go-Aussagen. Sie bleiben als Audit-Historie im Repository.

| Gruppe | Status | Ersetzt durch |
| --- | --- | --- |
| Alte Findings-Rechecks: `findings-recheck-final.md`, `findings-recheck-after-latest-change.md`, `findings-recheck-after-lifecycle-e2e-fixes.md`, `findings-delta-analysis.md`, `work-package-status.md` | ERSETZT | Diese README plus [findings-recheck-after-hardening-complete.md](./findings-recheck-after-hardening-complete.md). |
| Alte Paket-/Package-Reports ohne Nachtragsstatus: `package-implementation-verification.md`, alte Arbeitspaketlisten | ERSETZT | Diese README plus [final-package-verification.md](./final-package-verification.md). |
| Alte Staging-Smoke-Reports: `staging-smoke-report-9bd4d2c.md`, `staging-smoke-report-eb812d3.md`, `staging-auth-smoke-gate-report.md`, `staging-release-readiness-report.md`, `release-readiness-9bd4d2c.md` | ERSETZT/HISTORISCH | Diese README plus [staging-smoke-final-gate.md](./staging-smoke-final-gate.md). Aeltere Smoke-Ergebnisse duerfen nicht als aktuelle Staging-Wahrheit genutzt werden. |
| Alte Production-Reports: `production-release-plan-6151fb6.md`, `production-no-go-root-cause-eb812d3.md`, `production-deployment-blocker-verification.md`, `production-access-requirements.md`, `firebase-production-go-no-go-report.md`, `controlled-production-rollout-report.md` | ERSETZT | Diese README plus [production-target-inventory.md](./production-target-inventory.md) und [production-preflight-final.md](./production-preflight-final.md). |
| Alte Performance-Reports: `performance-and-firestore-cost-analysis.md`, `codebase-refactor-performance-analysis.md`, `codebase-refactor-performance-workpackages.md`, `full-project-analysis/05-performance/*` | ERSETZT | Diese README plus [bundle-budget.md](./bundle-budget.md), [firestore-read-budget.md](./firestore-read-budget.md) und [performance-baseline.md](./performance-baseline.md). |
| Alte Multiplayer-Stabilitaets-Audits: `final-multiplayer-stability-audit.md`, `final-multiplayer-stability-audit-v2.md`, `lifecycle-e2e-verification.md`, `multiplayer-lifecycle-state-inventory.md` | ERSETZT | Diese README plus Lifecycle-/Paketreferenzen oben. |
| Alte Architektur-/Refactor-Reports: `refactor-*`, `ap*-report.md`, `codebase-*`, `client-component-responsibility-map.md`, `final-refactor-evaluation.md`, `refactor-final-evaluation.md` | ERSETZT | Diese README plus [findings-recheck-final.md](./findings-recheck-final.md). |
| Alte UX-/GUI-/Scope-Reports: `ux-*`, `gui-*`, `sidebar-*`, `online-hub-*`, `admin-hub-*`, `savegames-*`, `multiplayer-menu-audit.md`, `multiplayer-mvp-acceptance.md` | ERSETZT | Diese README plus aktuelle Findings-Kategorien. |
| Alte Firebase-/Firestore-Reports: `firebase-*`, `multiplayer-firestore-*`, `multiplayer-backbone-firestore-report.md`, `firebase-preview-*` | ERSETZT | Diese README plus aktuelle Gate-/Security-/Read-Budget-Referenzen. |
| Alte Feature-System-Reports: `contracts-*`, `coaching-*`, `franchise-*`, `media-*`, `player-development-*`, `scouting-*`, `stadium-*`, `team-*`, `trade-*`, `training-*`, `x-factor-*` | ERSETZT | Diese README plus aktuelle Findings-Kategorien. |
| HTML-Reports im Root von `docs/reports/` | ERSETZT | Diese README. HTML bleibt historische Ausgabe, nicht Governance-Quelle. |
| Unterordner `full-project-analysis/`, `phases/`, `qa/`, `simulations/`, `systems/`, `code-analysis/` | ERSETZT fuer aktuelle Wahrheit | Diese README. Unterordner bleiben Detailarchiv. |

## Blanket-Regel Fuer Nicht Gelistete Reports

Jede Datei unter `docs/reports/`, die nicht diese README ist, gilt automatisch als **ERSETZT** fuer aktuelle Statusentscheidungen. Wenn ein Detailreport weiterhin gebraucht wird, muss er oben unter "Aktuelle Referenzen" mit konkreter Aussage verlinkt werden. Auch dann bleibt er **REFERENZ**, nicht **AKTUELL**.

## Go/No-Go-Regeln

| Ziel | Regel |
| --- | --- |
| Internal MVP | Go nur fuer den konkret getesteten Scope. Rote oder nicht ausgefuehrte relevante lokale Gates sind No-Go fuer diesen Scope. |
| Staging QA | No-Go ohne gruenen authentifizierten Staging Smoke fuer den Ziel-Commit oder bei rotem lokalen Required Gate. Aktuell: Smoke gruen, `release:check` rot, also No-Go. |
| Production | No-Go ohne Staging-QA-Go, Production-Preflight-Go, verifizierte Project/Backend-Sichtbarkeit und explizite Rollout-Freigabe. |

## Pflege-Regel

Bei jedem neuen Governance- oder Release-Report:

1. Diese README zuerst aktualisieren.
2. Den neuen Detailreport unter "Aktuelle Referenzen" eintragen, falls er die aktuelle Bewertung stuetzt.
3. Ersetzte Reports nicht loeschen.
4. Keine Formulierung wie "QA gruen" verwenden, ohne Scope und Gate zu nennen.
5. Nur diese README darf als "aktuell" bezeichnet werden.
