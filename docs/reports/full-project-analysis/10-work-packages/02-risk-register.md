# Risk Register

| ID | Risiko | Kategorie | Schwere | Wahrscheinlichkeit | Auswirkung | Mitigation | Owner-Bereich |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | User-Team-Link inkonsistent nach Join/Rejoin/Repair | Data/UX | Hoch | Mittel-Hoch | User kann Liga nicht laden | Invarianten, Rejoin E2E, Repair Tests | Multiplayer |
| R2 | Week Simulation schreibt Results/Standings inkonsistent oder Reload zeigt falsche Daten | Data/Admin | Hoch | Mittel | Core Loop bricht | Admin Week Smoke, transaction/lock tests | Simulation/Admin |
| R3 | Production-Zielumgebung nicht verifiziert | DevOps | Hoch | Hoch | falsches Deployment oder No-Go | Production Preflight, keine geratenen IDs | Release |
| R4 | Staging `apphosting.yaml` wird fuer Production genutzt | DevOps/Security | Hoch | Mittel | Production spricht gegen Staging | separate Production Config | DevOps |
| R5 | E2E gibt lokal kein Signal wegen fehlender DB/Secrets | QA | Hoch | Hoch | UI-Regressionen rutschen durch | DB bootstrap, CI secret smoke | QA |
| R6 | Admin API und Firestore Rules nutzen unterschiedliche Admin-Definition | Security | Hoch | Mittel | inkonsistenter Zugriff | Claims-only Entscheidung oder Doku/Tests | Security |
| R7 | Nicht-MVP Features wirken kaputt | Product/UX | Mittel-Hoch | Hoch | Spieler verlieren Vertrauen | hide/freeze, Navigation reduzieren | Product/UX |
| R8 | Online-Service-Refactor bricht Join/Draft/Week | Architecture | Hoch | Mittel | Multiplayer Regression | kleine APs, contract tests | Architecture |
| R9 | `subscribeToLeague()` erzeugt hohe Firestore Reads und stale State | Performance/Data | Mittel-Hoch | Mittel | Kosten/Latenz | read metrics, subscription profiles | Firebase |
| R10 | Race Conditions bei Join/Ready/Draft/Simulate | Data | Hoch | Mittel | doppelte Teams/Picks/Simulation | concurrency tests, locks | Multiplayer |
| R11 | Admin-Tools fuehren destructive Writes ohne ausreichende UX | Admin/UX | Mittel-Hoch | Mittel | Datenkorruption | confirm modals, hide risky tools | Admin |
| R12 | Engine-Refactor veraendert Spielbalance | Simulation | Hoch | Niedrig-Mittel | Core Gameplay driftet | Golden Master, determinism tests | Simulation |
| R13 | LocalStorage `lastLeagueId` fuehrt zu Recovery-Loops | UX/Data | Mittel | Mittel | Online Continue wirkt kaputt | server-side membership resume | Online UX |
| R14 | Seed/Reset Workflow driftet | DevOps/Data | Mittel-Hoch | Mittel | Staging-Daten kaputt | emulator reset+seed+validate test | Seeds |
| R15 | Staging Smoke haengt an IAM/Token manuell | Release | Mittel-Hoch | Hoch | Production-Go blockiert | dedicated test admin + CI secrets | Release |
| R16 | Bundle/Client import von server-only Modulen | Build/Security | Mittel-Hoch | Niedrig-Mittel | Build fail / secret risk | import guard tests | Frontend |
| R17 | Grosse Client-Komponenten bleiben schwer wartbar | Maintainability | Mittel | Hoch | Regressionen bei UI-Aenderungen | display components, hooks | Frontend |
| R18 | Firestore League-Dokument waechst mit Results/Standings | Performance/Data | Mittel-Hoch | Mittel | teure reads/writes | normalize results/standings later | Firebase |
| R19 | Documentation widerspricht aktuellem Admin/Auth Flow | Ops | Mittel | Mittel | falsche Bedienung | docs cleanup | Tech Writing |
| R20 | Production Firestore Flag wird zu frueh gesetzt | Security/Data | Hoch | Niedrig-Mittel | produktive Datenrisiken | guard + release checklist | DevOps |

## Aktuelle Top 10 Risiken

1. R1 User-Team-Link inkonsistent.
2. R2 Week Simulation/Reload inkonsistent.
3. R3 Production-Ziel nicht verifiziert.
4. R5 E2E nicht self-contained.
5. R7 Nicht-MVP Features wirken kaputt.
6. R6 Admin Rules/API Divergenz.
7. R8 Online-Service-Refactor-Risiko.
8. R9 Breite Firestore Subscriptions.
9. R10 Race Conditions.
10. R15 Staging Smoke manuell/fragil.

## No-Go Kriterien

- Kein Production Rollout ohne verifizierte Production-Projekt-ID und Backend-ID.
- Kein Production Rollout mit staging-orientierter `apphosting.yaml`.
- Kein neues Multiplayer-Feature ohne gruenen Core Loop Smoke.
- Kein Engine-Refactor ohne deterministische Regressionstests.
- Kein Firestore-Schema-Umbau ohne Migrations-/Backfill-/Rollback-Plan.
- Kein Admin-Flow, der nur clientseitig abgesichert ist.

## Risikoabbau in Reihenfolge

1. E2E/Staging Smoke stabilisieren.
2. User-Team-Linking/Rejoin haerten.
3. Week Simulation Reload absichern.
4. Scope reduzieren.
5. State Machine/Invarianten codifizieren.
6. Subscription/Firestore-Kosten messen.
7. Online-Service schrittweise schneiden.
8. Production-Verifikation abschliessen.
