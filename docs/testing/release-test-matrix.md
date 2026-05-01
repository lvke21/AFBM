# Release Test Matrix

Datum: 2026-05-01

## Ziel

Diese Matrix ordnet die Test- und QA-Skripte in klare Release-Kategorien. Der wichtigste Check fuer den aktuellen Stand ist `npm run test:multiplayer:mvp`: Er prueft den spielbaren Multiplayer-MVP inklusive Firebase Anonymous Auth, Firestore-Sync, Ready-State und 16-Team-Fantasy-Draft.

## Pflicht-Checks

### `npm run test:multiplayer:mvp`

**Zweck:** eindeutiger Multiplayer-MVP-Check.

Laeuft:

```bash
npx tsc --noEmit
npm run lint
vitest run src/lib/online/online-league-service.test.ts src/lib/online/fantasy-draft.test.ts src/lib/online/fantasy-draft-service.test.ts src/lib/admin/online-admin-actions.test.ts src/lib/online/multiplayer-firebase-mvp-actions.test.ts
npm run test:e2e:multiplayer
npm run test:firebase:mvp
```

Gruen bedeutet:

- TypeScript und ESLint sind sauber.
- Multiplayer-Domainlogik, Fantasy-Draft-Service, Admin-Actions und sichtbare Firebase-MVP-Aktionsmatrix sind gruen.
- Lokaler Multiplayer-Smoke-Test laeuft.
- Firebase-MVP-Checks inklusive Rules, Parity, Zwei-User-E2E und 16-Team-Draft-E2E laufen.

Rot bedeutet:

- Der Multiplayer-MVP ist nicht releasefaehig.
- Fehler zuerst nach Ebene einordnen: Typecheck/Lint, Unit/Integration, lokaler E2E, Firebase Rules/Parity oder Firebase Browser-E2E.

### `npm run test:firebase:mvp`

**Zweck:** Firebase-spezifischer MVP-Check.

Laeuft:

```bash
npm run test:firebase:rules
npm run test:firebase:parity
npm run test:e2e:multiplayer:firebase
npm run test:e2e:multiplayer:firebase:draft
```

Gruen bedeutet:

- Firestore Rules schuetzen die bekannten MVP-Pfade.
- Firestore-Parity bleibt stabil.
- Zwei unabhaengige Firebase Anonymous Auth User koennen beitreten, Sync/Ready/Reload funktioniert und Cross-User-Writes werden blockiert.
- Der komplette 16-Team-Firebase-Fantasy-Draft laeuft mit 656 Picks, eindeutigen Spielern, vollstaendigen Kadern und Week-1-Uebergang.

Rot bedeutet:

- Firebase-Multiplayer ist nicht staging-ready.
- Bei `listen EPERM` oder Portproblemen ist der Emulator nicht gestartet; Test in einer Umgebung mit lokalen Portrechten erneut ausfuehren.

### `npm run test:release:staging`

**Zweck:** breiter Staging-Release-Check vor Rollout.

Laeuft:

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run test:firebase:mvp
npm run build
```

Gruen bedeutet:

- Typen, Lint, komplette Vitest-Suite, Firebase-MVP und Next-Build sind gruen.
- Der Commit ist technisch bereit fuer ein Staging-Rollout, sofern App-Hosting/Secrets/Projektkonfiguration bereits korrekt sind.

Rot bedeutet:

- Kein Staging-Rollout.
- Bei Build-Rot zuerst Environment und serverseitige Runtime-Variablen pruefen.
- Bei Firebase-Rot zuerst Emulator-/Rules-/Auth-Konfiguration pruefen.

## Unterkategorien

| Kategorie | Script | Pflicht fuer MVP? | Bemerkung |
| --- | --- | --- | --- |
| Static | `npx tsc --noEmit` | Ja | TypeScript-Vertrag. |
| Static | `npm run lint` | Ja | ESLint/React-Hooks/Next-Regeln. |
| Unit/Integration | `npm run test:run` | Ja fuer Staging | Breite Vitest-Suite. |
| Multiplayer Unit | gezielte `vitest run ...online...admin...` | Ja fuer Multiplayer-MVP | Schneller Kerncheck fuer Online-Service, Draft und Admin-Actions. |
| Local Multiplayer E2E | `npm run test:e2e:multiplayer` | Ja fuer Multiplayer-MVP | Browser-Smoke ohne Firebase-Emulator. |
| Firebase Rules | `npm run test:firebase:rules` | Ja fuer Firebase-MVP | Security-Regeln. |
| Firebase Parity | `npm run test:firebase:parity` | Ja fuer Firebase-MVP | Daten-/Repository-Parity. |
| Firebase Browser E2E | `npm run test:e2e:multiplayer:firebase` | Ja fuer Firebase-MVP | Zwei User, Join, Ready, Reload, Cross-User-Write-Block. |
| Firebase Draft E2E | `npm run test:e2e:multiplayer:firebase:draft` | Ja fuer Firebase-MVP | 16 Teams, kompletter Fantasy Draft. |
| Build | `npm run build` | Ja fuer Staging | Next Build mit aktueller Env. |

## Optionale Checks

| Script | Wann nutzen | Warum optional |
| --- | --- | --- |
| `npm run test:e2e:all` | Vor groesseren UI-Releases | Breiter und langsamer als MVP-Gate. |
| `npm run test:firebase` | Bei Firestore-Repository-/Readmodel-Aenderungen | Deckt mehr Firestore-Slices ab als der MVP-Pfad. |
| `npm run test:firebase:repositories` | Bei Teams/Players/Repository-Aenderungen | Spezifischer Repository-Slice. |
| `npm run test:firebase:season-week-match` | Bei Season-/Week-/Match-Reads | Spezifischer Read-Slice. |
| `npm run test:firebase:week-state` | Bei Week-State-Machine-Aenderungen | Spezifischer State-Slice. |
| `npm run test:firebase:game-output` | Bei Match-Output-Persistenz | Spezifischer Persistenz-Slice. |
| `npm run test:firebase:stats` | Bei Stats-Aggregaten | Spezifischer Stats-Slice. |
| `npm run test:firebase:readmodels` | Bei Reports/Readmodels | Spezifischer Readmodel-Slice. |
| `npm run qa:production:test` | Bei Simulations-/Balancing-Aenderungen | QA-Gate, nicht jeder Multiplayer-MVP-Change. |
| `npm run qa:simulation-balancing:test` | Bei Balancing-Aenderungen | Kann bewusst rot werden, wenn Balancing geaendert wird. |

## Release-Regel

- Multiplayer-MVP: `npm run test:multiplayer:mvp` muss gruen sein.
- Firebase-MVP-only Aenderung: `npm run test:firebase:mvp` muss gruen sein.
- Staging-Rollout: `npm run test:release:staging` muss gruen sein.
- Optional rot ist nur erlaubt, wenn der optionale Check fachlich nicht betroffen ist und die Abweichung im Release-Report dokumentiert wird.
