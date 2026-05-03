# Release Gate Matrix

Stand: 2026-05-03

## Zweck

Dieses Dokument ist die autoritative Gate-Matrix fuer Internal MVP, Staging und Production. Es ersetzt keine Detailreports, sondern ordnet ihre Aussagen ein. Ab jetzt gilt: "QA gruen" darf nur mit Scope gesagt werden, z. B. "lokale technische Gates gruen" oder "Staging Smoke rot". Ein rotes hoeheres Gate kann nicht durch ein gruenes niedrigeres Gate ueberstimmt werden.

## Gate-Matrix

| Gate | Command / Nachweis | Blockiert Internal MVP? | Blockiert Staging? | Blockiert Production? | Aktueller Stand | Regel |
|---|---|---:|---:|---:|---|---|
| Typecheck | `npx tsc --noEmit` | Ja | Ja | Ja | Gruen im letzten Lauf | Jeder rote Typecheck ist No-Go fuer alle Ziele. |
| Lint | `npm run lint` | Ja | Ja | Ja | Gruen im letzten Lauf | Jeder ESLint-Exit-Code ungleich 0 ist No-Go fuer alle Ziele. |
| Vitest | `npm run test:run` oder relevante `vitest run ...` Suites | Ja, wenn Core-/MVP-Pfad betroffen | Ja, wenn geaenderter Staging-Pfad betroffen | Ja, wenn Core, Security, Persistence, Admin oder Multiplayer betroffen | Teilweise gruen nach Einzelreports; volle Suite nicht in diesem Matrix-Lauf neu ausgefuehrt | "Vitest gruen" gilt nur fuer die konkret ausgefuehrte Suite. |
| Firebase Parity | `npm run test:firebase:parity` | Ja fuer Firebase-/Multiplayer-MVP | Ja fuer Firebase, Admin, Multiplayer, Persistence | Ja fuer jeden Firebase-/Firestore-nahen Release | Letzter Report: gruen fuer serverseitige Kern-Parity | Gruen bedeutet Emulator-Parity, kein Go fuer produktive Firestore-Aktivierung. |
| Firebase E2E | `npm run test:e2e:multiplayer:firebase`; bei Draft `npm run test:e2e:multiplayer:firebase:draft`; Firestore Browser: `npm run test:e2e:week-loop` | Ja fuer Internal Multiplayer MVP | Ja fuer Firebase/Multiplayer/Staging-Kandidaten | Ja fuer Multiplayer/Firebase Production-Kandidaten | Letzte Reports: lokale Emulator-Flows gruen; produktionsnahe Firestore-Aktivierung No-Go | Emulator-gruen ersetzt keinen authentifizierten Staging-Smoke. |
| Prisma E2E | `npm run db:up`; `npm run prisma:migrate`; `npm run test:e2e:seed`; `npm run test:e2e` | Ja fuer lokale/Prisma-MVP-Flows | Ja, wenn Prisma/Savegame/Navigation vom Release betroffen | Ja, wenn der produktive Flow Prisma nutzt | Gruen ausserhalb Sandbox; Sandbox-Socket-EPERM als Infra isoliert | Fehlende DB muss im Preflight klar scheitern; kein roher Prisma-Error darf als QA-Signal stehen bleiben. |
| Staging Smoke | `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league --expected-commit <sha>` | Nein fuer rein lokale Internal-MVP-Entscheidung; Ja fuer "Internal MVP auf Staging" | Ja | Ja | Gruen fuer Commit `1a28d88eaaa99a182612638652d0165705ce6901`, Revision `afbm-staging-backend-build-2026-05-02-007`; Staging QA bleibt wegen rotem lokalem `release:check` No-Go | Ohne gruenen Smoke fuer den Ziel-Commit gibt es kein Staging-Go und kein Production-Go. Ein gruener Smoke ueberstimmt keine roten lokalen Required Gates. |
| Production Preflight | `npm run production:preflight:apphosting -- --project <production-project-id> --backend <production-backend-id> --git-commit <release-commit-sha>` plus verifizierte IDs/Rollback | Nein | Nein, ausser Staging soll Production-Kandidat sein | Ja | Rot/No-Go: Script technisch vorbereitet, aber Gate-Lauf blockiert Platzhalterwerte; Production-Projekt, Backend und Release Commit sind nicht verifiziert | Keine geratenen Production-IDs. Nicht verifiziert zaehlt als Production-No-Go. |

## Go/No-Go-Regeln

### Internal MVP

Internal MVP ist nur Go, wenn Typecheck, Lint und die relevanten Vitest-Suites gruen sind. Fuer Multiplayer-/Firebase-MVP muessen zusaetzlich Firebase Parity und passende Firebase E2E-Smokes gruen sein. Prisma E2E blockiert Internal MVP, wenn der gepruefte MVP-Pfad Prisma/Savegames/klassische Navigation nutzt.

Internal MVP darf trotz rotem Staging Smoke nur dann als lokales internes Go gelten, wenn klar dokumentiert ist, dass es nicht auf Staging deployed oder live verifiziert wurde.

### Staging

Staging ist No-Go, wenn eines dieser Gates rot oder nicht ausgefuehrt ist: Typecheck, Lint, relevante Vitest-Suites, relevante Firebase Parity/E2E, relevante Prisma E2E und Staging Smoke fuer den Ziel-Commit. "Nicht ausgefuehrt" ist fuer Staging kein Gruen.

Ein lokales Gruen ist nur ein Staging-Kandidat. Staging-Go entsteht erst, wenn `/api/build-info` den Ziel-Commit ausweist und der authentifizierte Smoke Auth/Login, User-Team-Link, Ready-State, Admin Week Simulation sowie Results/Standings Reload prueft.

### Production

Production ist No-Go, solange Staging QA No-Go ist, Production-Projekt/Backend nicht verifiziert sind, der Release Commit nicht freigegeben ist oder Production Preflight nicht erfolgreich war. Zusaetzlich muessen alle lokalen Pflichtgates des betroffenen Bereichs gruen sein.

Firebase-/Firestore-Gruen in Emulatoren ist kein Go fuer produktive Firestore-Aktivierung. Dafuer bleiben eigene Backfill-, Monitoring-, Kosten-, Auth- und Rollback-Gates erforderlich.

## Offene Rote Gates

| Gate | Rot fuer | Ursache | Blockiert |
|---|---|---|---|
| Staging QA | Ziel-Commit `1a28d88eaaa99a182612638652d0165705ce6901` | Authentifizierter Staging-Smoke ist gruen, aber lokales `release:check` war im selben Gate-Lauf rot durch Vitest-Timeout. | Staging und Production |
| Production Preflight | Production-Rollout | Production-Preflight-Script ist technisch vorbereitet, aber nur mit Platzhalterwerten gelaufen; echte Production Project ID, Backend ID und freigegebener Release Commit fehlen. | Production |
| Produktive Firestore-Aktivierung | Firestore als Production-Datenpfad | Emulator-Parity ist gruen, aber produktionsnahe Auth-/SaveGame-/Backfill-/Monitoring-/Kosten-Gates fehlen. | Production-Firestore-Cutover |

## Widerspruchsregel

Verbotene Formulierungen:

- "QA gruen", wenn E2E oder Staging Smoke rot ist.
- "Release gruen", wenn nur Typecheck/Lint/Vitest gruen sind.
- "Firebase gruen", wenn damit Production-Firestore gemeint ist, aber nur Emulator-Parity lief.

Erlaubte Formulierungen:

- "Lokale statische Gates gruen; Staging Smoke rot."
- "Firebase Emulator-Parity gruen; produktive Firestore-Aktivierung No-Go."
- "Prisma E2E gruen ausserhalb der Sandbox; Sandbox-Socket-EPERM als Infra-Blocker isoliert."

## Autoritative Detailreports

- `docs/reports/qa-release-gates.md`
- `docs/reports/staging-smoke-final-gate.md`
- `docs/reports/production-target-inventory.md`
- `docs/reports/production-preflight-final.md`
- `docs/reports/findings-recheck-after-hardening-complete.md`
- `docs/reports/e2e-postgres-gate-report.md`
- `docs/reports/systems/firebase-e2e-parity-report.md`
- `docs/reports/firebase-browser-e2e-report.md`
