# Regression Risk Map

## Ziel der Analyse

Bewertung, wo Regressionen trotz vorhandener Tests am wahrscheinlichsten sind.

## Risikomatrix

| Bereich | Aktuelle Abdeckung | Risiko | Begruendung | Empfohlener Schutz |
| --- | --- | --- | --- | --- |
| Singleplayer Week Flow | Gute Unit-/Service-Tests, E2E vorhanden aber DB-abhaengig. | Mittel | Core ist getestet, Browser-Flow lokal nicht aktuell gelaufen. | Prisma-E2E in CI stabilisieren. |
| Savegames Einstieg | Service-/Model-Tests und E2E-Specs. | Mittel-Hoch | Zentraler Einstieg, viele Pfade, E2E blockiert ohne DB. | Savegames Browser-Smoke verpflichtend. |
| Multiplayer Join/Load | Viele Online-Service- und Model-Tests. | Hoch | Live-Firebase, LocalStorage, Membership Mirror und UI Route-State koennen auseinanderlaufen. | Firebase Auth Emulator Rejoin-E2E. |
| Team-Zuweisung | Unit/Service-Abdeckung vorhanden. | Hoch | Historisch kritisch wegen assignedUserId, memberships, leagueMembers Mirror. | Concurrent Join-/Backfill-Tests. |
| Draft Flow | Gute Unit-Tests, Draft Room Model Tests, E2E Draft vorhanden. | Mittel | Draft ist komplex, aber schon gut abgedeckt. | E2E Draft Reload + Doppelklick-Schutz. |
| Week Simulation | Gute Service-/Admin-Tests. | Mittel-Hoch | Firestore Payloads und Admin API/Reload sind live-riskant. | Admin Week Staging Smoke als Release-Gate. |
| Results/Standings | Unit-Tests vorhanden. | Mittel | Persistenz und Reload muessen live zusammenpassen. | End-to-End Simulation + Reload Assertion. |
| Firebase/Auth Sync | Unit-Tests und Emulator-Tests. | Hoch | Claim/UID-Allowlist, Rules und API Guards koennen divergieren. | Rules/API/Auth Contract Test. |
| Admin UI | Admin API gut, UI teilweise. | Hoch | Viele Actions, Debug, League Detail; echte Browser-Flows weniger stark. | Admin Browser Smoke. |
| Sidebar Navigation | Navigation Model Tests, E2E Navigation vorhanden aber DB-blockiert. | Mittel-Hoch | Viele Seiten/Coming-Soon-Zustaende. | Vollstaendiger Menue-Routing-Test. |
| Seeds/Fixtures | Mehrere Tests, aber kombinierter Workflow nicht voll als Emulator-E2E. | Mittel-Hoch | Idempotenz kann skriptuebergreifend brechen. | Reset+Seed+Validate Integration. |
| Simulation Determinism | Sehr stark. | Niedrig-Mittel | Guter Schutz, aber lange Tests koennen in schnellen Gates ausgespart werden. | Nightly + Release Gate fuer volle QA. |
| Performance | Einzelne Observability Tests. | Mittel | Keine festen Bundle-/Read-Budgets. | Bundle/Read Budget Tests. |

## Kritischste Regressionen

### 1. User ist eingeloggt, aber nicht mit Team verbunden

Warum kritisch:
- Blockiert Multiplayer komplett.
- Kann aus Membership-/Mirror-/Team-Feldern entstehen.

Bestehender Schutz:
- Route-State-Model-Tests.
- Online-Service-Tests.

Luecke:
- Kein immer laufender Live-/Firebase-Browser-Rejoin-Test.

### 2. Admin simuliert Woche, aber Ergebnisse/Standings sind nach Reload inkonsistent

Warum kritisch:
- Kern-Multiplayer-Loop bricht.

Bestehender Schutz:
- Admin Actions Tests.
- Online Week Simulation Tests.

Luecke:
- Live-Staging-Smoke ist nicht automatisiert ohne Secrets.

### 3. E2E-Suite gibt kein Signal, weil Infrastruktur fehlt

Warum kritisch:
- Regressionen koennen trotz gruener Unit-Suite durchrutschen.

Bestehender Schutz:
- E2E Preflight gibt klare Fehlermeldung.

Luecke:
- DB wird nicht automatisch gestartet.

### 4. Firestore Rules/API Guard Divergenz

Warum kritisch:
- UI kann Zugriff anzeigen, waehrend direkte Firestore-Pfade blockieren oder umgekehrt.

Bestehender Schutz:
- Admin Action Hardening.
- Firestore Rules Tests.

Luecke:
- Gemeinsamer Contract fuer UID-Allowlist + Claim + Rules fehlt.

### 5. Seed Workflow driftet

Warum kritisch:
- Multiplayer-Testdaten sind Grundlage fuer Staging-Smoke.

Bestehender Schutz:
- Seed-Unit-Tests.

Luecke:
- Voller Reset/Seed/Validate-Flow gegen Emulator fehlt als Standardtest.

## Regressionen mit niedrigerem Risiko

- Pure model formatting regressions: gut durch Model-Tests geschuetzt.
- Deterministische Simulation: stark durch Regression-/Balance-Tests geschuetzt.
- Basic API validation: Admin route tests vorhanden.

## Empfehlung

Vor jedem groesseren Multiplayer-Feature:

1. Unit/Vitest komplett.
2. Firebase Parity und Rules.
3. Prisma E2E Smoke + Navigation + Multiplayer.
4. Firebase Multiplayer E2E.
5. Staging Admin Week Smoke mit echtem Testuser.
