# Refactor AP7: Final Architecture Regression Report

Status: Rot

## Executive Summary

Nach den Refactoring-APs ist die Kernbasis technisch weitgehend stabil: TypeScript, ESLint, die komplette Vitest-Suite, die breite Engine-Suite, Firestore-Repository-Tests, Firestore-Parity und der Firebase-Multiplayer-E2E laufen gruen. Der finale Architektur-Regressionstest ist trotzdem nicht release-gruen, weil zwei spezialisierte Engine-QA-Gates fehlschlagen:

- `npm run qa:production:test`: Regression-Fingerprints weichen fuer alle 8 Seeds ab.
- `npm run qa:simulation-balancing:test`: `medium-vs-medium.averageTotalScore` liegt mit `22.31` unter dem erwarteten Minimum `24`.

Diese Fehler sind keine TypeScript- oder Importprobleme. Sie zeigen, dass sich die Simulationsergebnisse bzw. Balancing-Kennzahlen gegenueber den hinterlegten QA-Erwartungen veraendert haben. Das muss als fachliche Regression oder bewusst neu zu baselinender Engine-Aenderung bewertet werden.

## Finale Modulstruktur

Gepruefte Zielstruktur nach AP1 bis AP6:

- App-Routen und API: `src/app`
- UI-Komponenten: `src/components`
- Online/Multiplayer-UI: `src/components/online`
- Admin-UI: `src/components/admin`
- Online-Services, Auth, Sync und Repositories: `src/lib/online`
- Admin-Services und Admin-Guards: `src/lib/admin`
- Firebase/Admin-SDK-Anbindung: `src/lib/firebase`
- Savegame-Anwendungslogik: `src/modules/savegames`
- Gameplay-Engine: `src/modules/gameplay`
- Season-Application und reine Simulation: `src/modules/seasons/application`
- Simulation-Infrastruktur/Adapter: `src/modules/seasons/infrastructure/simulation`
- Team/Roster/Depth-Chart-Domain und Application Services: `src/modules/teams`
- Server-Repositories fuer Prisma/Firestore: `src/server/repositories`

Die Refactorings haben die wichtigste Architekturtrennung verbessert: produktive Simulationseinheiten bleiben in `application/simulation`, waehrend persistierende oder app-nahe Simulationsadapter in `infrastructure/simulation` liegen.

## Gepruefte Engine-Grenzen

Automatischer Import-Check:

```bash
rg -n "from ['\"](react|next/|firebase|@firebase)|firebase|firestore|localStorage|sessionStorage|next/navigation|next/router|src/lib/online|@/src/lib/online|@/src/components|router" src/modules/gameplay src/modules/seasons/application/simulation
```

Ergebnis: keine Treffer.

Bewertung:

- Keine produktiven React-Imports in den geprueften Engine-Bereichen gefunden.
- Keine Firebase/Firestore-Imports in den geprueften Engine-Bereichen gefunden.
- Keine Browser-Storage- oder Router-Imports in den geprueften Engine-Bereichen gefunden.
- Engine-Tests laufen technisch gruen, aber spezialisierte QA-Fingerprints/Balancing-Gates sind rot.

## Gepruefte Service-Grenzen

Gepruefte Service-Bereiche:

- Online-League-Facade: `src/lib/online/online-league-service.ts`
- Online-Repositories: `src/lib/online/repositories`
- Online-Storage/State-Helfer: `src/lib/online/online-league-storage.ts`, `src/lib/online/browser-storage.ts`
- Online-Auth/Identity: `src/lib/online/auth`, `src/lib/online/online-user-service.ts`
- Admin-Actions und Guards: `src/lib/admin`
- Firestore/Prisma Repository Provider: `src/server/repositories`, `src/lib/online/online-league-repository-provider.ts`

Bewertung:

- Online- und Admin-Services sind besser getrennt als vor AP3/AP5.
- Persistenzdetails sind staerker in Repository-/Storage-Schichten gebuendelt.
- Firebase-Multiplayer-E2E bestaetigt Anonymous Auth, Join, Sync, Reload-Persistenz und blockierte Cross-User-Writes.
- Legacy-Local-E2E ist weiterhin an PostgreSQL/DATABASE_URL gebunden und lokal nicht ausgefuehrt worden, weil PostgreSQL auf `localhost:5432` nicht erreichbar war.

## Testmatrix

| Bereich | Test / Pruefung | Ergebnis | Details |
| --- | --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | Gruen | Keine Typfehler. |
| Lint | `npm run lint` | Gruen | ESLint erfolgreich. |
| Gesamt-Vitest | `npm test -- --run` | Gruen | 133 Testdateien, 771 Tests bestanden. |
| Engine breit | `npx vitest run src/modules/gameplay src/modules/seasons/application/simulation src/modules/seasons/infrastructure/simulation` | Gruen | 32 Testdateien, 190 Tests bestanden. |
| Engine Production QA | `npm run qa:production:test` | Rot | 1/4 Tests fehlgeschlagen: Seed-Fingerprints weichen ab. |
| Engine Balancing QA | `npm run qa:simulation-balancing:test` | Rot | 1/2 Tests fehlgeschlagen: `medium-vs-medium.averageTotalScore = 22.31`, erwartet `>= 24`. |
| Firebase/Firestore | `npm run test:firebase` | Gruen | 10 Testdateien, 69 Tests bestanden. |
| Firebase Parity | `npm run test:firebase:parity` | Gruen | 1 Testdatei, 3 Tests bestanden. |
| Multiplayer Firebase E2E | `npm run test:e2e:multiplayer:firebase` | Gruen | 1 Playwright-Test bestanden: zwei User joinen, Ready-Sync, Reload, Cross-User-Write-Schutz. |
| Multiplayer Local E2E | `npm run test:e2e:multiplayer` | Nicht ausfuehrbar lokal | Preflight stoppt, weil PostgreSQL auf `localhost:5432` nicht erreichbar ist. |
| Engine Boundary Imports | `rg`-Grenzcheck | Gruen | Keine React/Firebase/Firestore/Storage/Router-Treffer in `gameplay` und `seasons/application/simulation`. |

## Funktionale Regression-Matrix

| Flow | Abdeckung | Status |
| --- | --- | --- |
| Singleplayer Start | Durch Gesamt-Vitest, Savegame-/Snapshot-/Week-Flow-Tests indirekt abgedeckt. Kein Browser-Smoke ausgefuehrt. | Gelb |
| Multiplayer Start | Firebase E2E oeffnet `/online` erfolgreich. | Gruen |
| Liga laden | Firebase E2E oeffnet Joined-League-Dashboard und prueft Last-League-Persistenz nach Reload. | Gruen |
| Liga beitreten | Firebase E2E mit zwei unabhaengigen Anonymous-Usern. | Gruen |
| Adminbereich | Firebase E2E prueft, dass geschuetzte Admin-League-Route ohne Claim blockiert. Admin-Unit/API-Tests in Vitest gruen. | Gruen |
| Week Simulation | Unit-/Integrationstests fuer Week/Simulation gruen, QA-Fingerprints rot. | Rot |
| Roster/Depth Chart | Team-/Roster-/Depth-Chart-Tests im Vitest-Lauf gruen. | Gruen |
| Save/Load | Savegame-Tests im Vitest-Lauf gruen. Legacy-Local-E2E nicht ausgefuehrt wegen fehlender PostgreSQL-Instanz. | Gelb |
| Firebase/Firestore Sync | Emulator-, Parity- und Firebase-Multiplayer-E2E gruen. | Gruen |

## Offene Risiken

1. Engine-Fingerprint-Abweichung
   - Alle 8 erwarteten Production-Fingerprints weichen ab.
   - Das kann eine gewollte Folge der Refactorings sein, ist aber ohne fachliche Bewertung nicht als stabil freizugeben.

2. Balancing-Grenzwert unterschritten
   - `medium-vs-medium.averageTotalScore` liegt bei `22.31`.
   - Der Test erwartet mindestens `24`.
   - Risiko: Simulation ist defensiver/score-armer als die bisherige QA-Baseline.

3. Legacy-Local-E2E haengt an PostgreSQL
   - `npm run test:e2e:multiplayer` verlangt eine erreichbare `DATABASE_URL`.
   - In der aktuellen lokalen Umgebung war PostgreSQL auf `localhost:5432` nicht erreichbar.
   - Fuer Firestore/Staging ist der Firebase-E2E aussagekraeftiger und gruen.

4. Kein manueller Browser-Smoke fuer Singleplayer ausgefuehrt
   - Die automatisierten Tests decken Savegame, Week-Flow und Simulation breit ab.
   - Ein echter Klicktest fuer Singleplayer-Start im Browser wurde in diesem Lauf nicht separat dokumentiert.

## Empfehlung Fuer Das Naechste Wachstums-AP

Naechstes AP sollte ein gezieltes "Simulation QA Baseline Review" sein:

- Ursache der Fingerprint-Aenderungen lokalisieren.
- Entscheiden, ob neue Fingerprints fachlich korrekt sind oder eine Regression vorliegt.
- Balancing-Metriken pruefen, insbesondere Scoring-Niveau im `medium-vs-medium`-Szenario.
- Danach QA-Baselines bewusst aktualisieren oder Engine-Fix isoliert umsetzen.
- Anschliessend denselben AP7-Regressionslauf erneut fahren.

Parallel, aber nachrangig:

- Legacy-Local-E2E klar als Prisma/Postgres-Modus dokumentieren oder auf Firestore-First-E2E umstellen.
- Einen kleinen Browser-Smoke fuer Singleplayer-Start und Save/Load ergaenzen, damit dieser Flow nicht nur indirekt ueber Unit-/Integrationstests abgesichert ist.

## Fazit

Die Architekturgrenzen sehen nach AP1 bis AP6 deutlich besser aus: Engine-Abhaengigkeiten sind sauberer, Service-Grenzen sind nachvollziehbarer, Firebase/Firestore-Sync ist automatisiert gruen, und der Multiplayer-Firebase-E2E bestaetigt die wichtigsten Online-Flows.

Der finale Regressionstest bleibt trotzdem Rot. Grund sind die roten spezialisierten Engine-QA-Gates, nicht die Multiplayer-/Firebase-Schicht. Fuer eine belastbare Freigabe muss zuerst entschieden werden, ob die veraenderten Simulationsergebnisse erwartet sind oder korrigiert werden muessen.

Status: Rot
