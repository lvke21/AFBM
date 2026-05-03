# QA Release Gates

Stand: 2026-05-02

## Ziel

Dieses Dokument ist die verbindliche QA-Governance fuer Release-Entscheidungen. Es loest widerspruechliche Signale wie "QA gruen, E2E rot" oder "Multiplayer Acceptance gelb/gruen, UX-Audit rot" auf, indem jedes Signal einer Gate-Klasse zugeordnet wird.

Grundregel: Ein niedrigeres oder engeres Signal darf ein hoeheres Gate nicht ueberstimmen. Ein gruener Unit-Test macht einen roten E2E-Test nicht gruen. Ein gruener technischer Multiplayer-Smoke macht einen roten UX-/Product-Audit nicht releasefaehig fuer echte Spieler.

## Signal-Hierarchie

| Ebene | Signal | Zweck | Darf ueberstimmen |
| --- | --- | --- | --- |
| G0 | Scope/Product/UX Entscheidung | Entscheidet, ob ein Flow fuer echte Nutzer freigegeben werden darf | alles darunter |
| G1 | Staging Live Smoke | Beweist, dass der deployed Stand mit echten Auth-/Firebase-/App-Hosting-Bedingungen funktioniert | lokale Gates |
| G2 | Browser E2E lokal | Beweist, dass echte Browser-Flows gegen lokale/Emulator-Testdaten funktionieren | Unit/Service |
| G3 | Firebase Parity/Rules | Beweist Firestore-Kompatibilitaet, Rules und Emulator-Persistenz | Unit/Service |
| G4 | Unit/Service/Component | Beweist deterministische Fachlogik und UI-Modelle | nichts hoeheres |
| G5 | Typecheck/Lint/Build | Beweist technische Kompilierbarkeit und statische Mindestqualitaet | nichts hoeheres |

## Gate-Matrix

| Gate | Command / Nachweis | Staging Blocker | Production Blocker | Warnung wenn |
| --- | --- | --- | --- | --- |
| Typecheck | `npx tsc --noEmit` | Ja, wenn rot | Ja, wenn rot | nie nur Warnung |
| Lint | `npm run lint` | Ja, wenn rot | Ja, wenn rot | nur bei bereits dokumentierten Legacy-Warnungen ohne Exit-Code 1 |
| Build | `npm run build` | Ja, wenn rot | Ja, wenn rot | nie nur Warnung |
| Unit/Service | `npm test` oder gezielt `npx vitest run src/lib/online src/lib/admin` | Ja, wenn betroffener Release-Bereich rot | Ja, wenn irgendein Core-Loop-/Security-/Persistence-Test rot | Rot in nicht releaserelevantem Feature kann Staging warnen, muss dokumentiert werden |
| Firebase parity | `npm run test:firebase:parity` | Ja fuer Firebase-/Multiplayer-/Admin-/Persistence-Aenderungen | Ja fuer jeden Release mit Firebase-Persistenz | Sandbox-Port-EPERM ist Infra-Warnung, solange Wiederholung ausserhalb der Sandbox gruen ist |
| Firebase rules MVP | `npm run test:firebase:rules` oder `npm run test:firebase:mvp` | Ja fuer Rules/Auth/Firestore-Aenderungen | Ja fuer Firebase-Produktion | nicht relevant nur bei reinem Offline-UI-Change ohne Firestore-Pfad |
| E2E local Prisma | `npm run test:e2e` / `npm run test:e2e:navigation` / passende E2E-Suite | Ja, wenn der Release Prisma-/Savegame-/Navigation-Flows betrifft | Ja, wenn der betroffene Flow produktiv genutzt wird | lokale PostgreSQL/DB fehlt: Infra-Warnung fuer Staging, aber Production bleibt No-Go bis Ersatz- oder Wiederholungstest gruen ist |
| E2E local Firebase Multiplayer | `npm run test:e2e:multiplayer:firebase` und bei Draft-Aenderungen `npm run test:e2e:multiplayer:firebase:draft` | Ja fuer Multiplayer/Firebase/Admin-Week-Aenderungen | Ja fuer Multiplayer/Firebase-Produktion | Emulator-Port-EPERM ist Infra-Warnung, wenn Wiederholung mit erlaubten lokalen Ports gruen ist |
| Staging auth smoke | `CONFIRM_STAGING_SMOKE=true npm run staging:smoke:auth -- --league-id afbm-multiplayer-test-league` | Ja fuer Staging-Go | Ja fuer Production-Go-Kandidat | fehlende Credentials/IAM sind Infra-Blocker, nicht gruen |
| Staging admin-week smoke | `CONFIRM_STAGING_SMOKE=true npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league` | Ja fuer Admin-/Week-/Results-/Standings-Aenderungen | Ja fuer Production-Go-Kandidat mit Multiplayer Week Simulation | darf uebersprungen werden nur bei reinem statischem UI-/Docs-Change ohne Admin/Week-Pfad |
| UX/Product audit | `docs/reports/ux-sollzustand-verifikation.md`, Acceptance-Reports, manuelle QA | Nein fuer technische Staging-Testumgebung, wenn explizit intern | Ja fuer Release an echte Spieler, wenn Core-Flow rot | Gelb erlaubt internes Staging, nicht automatisch Production |

## Was blockiert Staging?

Staging ist blockiert, wenn eines zutrifft:

- Typecheck, Lint oder Build rot sind.
- Unit-/Service-Tests fuer den geaenderten Bereich rot sind.
- Firebase parity/rules rot sind und der Release Firebase, Multiplayer, Admin oder Persistence betrifft.
- Der relevante lokale Browser-E2E rot ist und der Fehler nicht eindeutig als lokale Infra dokumentiert ist.
- `staging:smoke:auth` rot ist.
- `staging:smoke:admin-week` rot ist, wenn der Release Admin Week Simulation, Results, Standings, Ready-State oder Multiplayer Core Loop betrifft.
- Seed-/Reset-Sicherheit unklar ist und der Release Seed-/Daten-Scripts anfasst.

Nicht blockierend fuer Staging, aber dokumentationspflichtig:

- UX-Audit Gelb/Rot fuer echte Spieler, sofern Staging ausdruecklich nur internes QA-/Testsystem ist.
- Lokaler Prisma-E2E ist durch fehlende lokale PostgreSQL-Infra blockiert, wenn der Release ausschliesslich Firebase-Multiplayer betrifft und ein Firebase-E2E plus Staging-Smoke gruen ist.
- Sandbox-EPERM fuer lokale Emulator-Ports, wenn derselbe Command ausserhalb der Sandbox gruen ausgefuehrt wurde.

## Was blockiert Production?

Production ist blockiert, wenn eines zutrifft:

- Irgendein Pflicht-Gate aus Typecheck, Lint, Build, Unit/Service, Firebase parity/rules oder relevanter E2E ist rot.
- Staging auth smoke wurde fuer den zu deployenden Commit nicht erfolgreich ausgefuehrt.
- Staging admin-week smoke wurde fuer Multiplayer Week Simulation nicht erfolgreich ausgefuehrt.
- Staging zeigt `severity>=ERROR` Logs ohne erklaerte, nicht relevante Ursache.
- Production-Projekt-ID oder App Hosting Backend-ID ist nicht verifiziert.
- Es existiert kein Rollback-Plan.
- UX/Product Audit ist rot fuer den geplanten Zielnutzerkreis. Ein technisches Staging-Go bleibt dann nur ein internes QA-Go, kein echter Spieler-Release.
- Credentials/IAM fehlen fuer die Reproduktion der Staging-Smokes. "Nicht getestet" zaehlt als Production-No-Go.

## Warnungen

Warnungen muessen im Release-Report stehen, blockieren aber nicht automatisch:

- Emulator-Port-EPERM in der Sandbox, wenn Wiederholung mit lokalen Ports gruen ist.
- Erwartete Firestore `PERMISSION_DENIED` Logs aus Negativtests.
- `punycode` Deprecation aus Firebase Tooling.
- Lokale Test-DB fehlt, wenn der Release keinen Prisma-/Offline-Savegame-Pfad betrifft und ein alternatives E2E-Gate gruen ist.
- UX-Gelb fuer interne Staging-Freigabe.

## Aufloesung der bekannten Widersprueche

### N112: QA-Gruen und E2E-Rot

Ab jetzt gilt:

- Unit/Service-Gruen bedeutet nur: Fachlogik in Isolation ist gruen.
- E2E-Rot bedeutet: der betroffene Browser-/Flow-Release ist nicht freigegeben.
- Wenn E2E wegen Infrastruktur rot ist, muss der Report zwischen "Infra Blocker" und "Produktfehler" unterscheiden. Ohne erfolgreiche Wiederholung bleibt Production No-Go.

### N099: Multiplayer Acceptance und UX-Audit

Ab jetzt gilt:

- `multiplayer-mvp-acceptance.md` bewertet technische Spielbarkeit fuer interne QA.
- `ux-sollzustand-verifikation.md` bewertet, ob das System fuer echte Spieler intuitiv und produktreif wirkt.
- Technische Acceptance Gelb/Gruen darf UX Rot nicht ueberstimmen. Fuer echte Spieler gilt das strengere UX/Product-Gate.
- Interne Staging-Freigabe kann trotz UX Rot erlaubt sein, wenn der Zweck explizit QA/Staging ist und alle technischen Gates gruen sind.

## Empfohlene Gate-Sequenz

### Lokaler Staging-Kandidat

```bash
npx tsc --noEmit
npm run lint
npm run build
npm test
npm run test:firebase:parity
npm run test:e2e
npm run test:e2e:navigation
npm run test:e2e:multiplayer:firebase
```

Bei Draft-Aenderungen zusaetzlich:

```bash
npm run test:e2e:multiplayer:firebase:draft
```

### Staging Live

```bash
CONFIRM_STAGING_SMOKE=true npm run staging:smoke:auth -- --league-id afbm-multiplayer-test-league
```

Bei Admin-/Week-/Results-/Standings-Aenderungen:

```bash
CONFIRM_STAGING_SMOKE=true npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league
```

### Production-Kandidat

Production darf erst als Go-Kandidat gelten, wenn:

1. lokale Pflicht-Gates gruen sind,
2. Staging-Smokes fuer den konkreten Commit gruen sind,
3. Production-Projekt und Backend-ID verifiziert sind,
4. Rollback-Plan dokumentiert ist,
5. UX/Product-Gate fuer den Zielnutzerkreis nicht rot ist.

## Offene Infra-Abhaengigkeiten

- Staging-Smoke benoetigt entweder `STAGING_FIREBASE_TEST_EMAIL`/`STAGING_FIREBASE_TEST_PASSWORD`, `E2E_FIREBASE_ADMIN_ID_TOKEN` oder IAM `roles/iam.serviceAccountTokenCreator` auf dem Staging-Service-Account.
- Lokale Firebase-E2E-Tests benoetigen freie Ports fuer Auth/Firestore Emulator.
- Lokale Prisma-E2E-Tests benoetigen erreichbare PostgreSQL-Testdatenbank und idempotenten Seed.
- Production-Verifikation benoetigt echte Production-Projekt-ID und App Hosting Backend-ID. Keine geratenen IDs verwenden.

## Reporting-Regel

Jeder Release-Report muss folgende Felder explizit enthalten:

- Ampel je Gate: Unit/Service, Typecheck, Lint, Build, Firebase parity, E2E local, Staging smoke, UX/Product.
- "Nicht ausgefuehrt" ist kein Gruen.
- Bei Rot: Root Cause als Produktfehler, Testfehler oder Infra-Blocker klassifizieren.
- Finale Entscheidung getrennt ausweisen:
  - `Staging: Go / Teil-Go / No-Go`
  - `Production: Go-Kandidat / No-Go`

