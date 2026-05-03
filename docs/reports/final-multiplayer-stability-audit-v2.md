# Final Multiplayer Stability Audit v2

Stand: 2026-05-02

## Executive Summary

**Core Loop:** stabil im lokalen Firebase-/Emulator-Flow, aber noch fragil fuer Production.

**System:** technisch deutlich robuster als im vorherigen Audit, aber weiterhin riskant durch verteilte State-Modelle und nicht frisch verifizierten Staging-Live-Smoke.

**Gesamt:** **No-Go fuer Production. Go fuer internes MVP. Staging QA nur mit frischem Smoke-Go.**

Der echte Core Loop

```text
Join -> Team -> Ready -> Simulation -> Results -> Reload
```

ist lokal mit Firebase Auth/Firestore Emulator browserseitig bestaetigt. Die entscheidenden Race-Klassen sind nicht nur theoretisch behandelt: Join, Draft Pick, Ready und Week Simulation haben Transaktionen, Invarianten oder Lock-Tests. Trotzdem ist die Lage nicht sauber genug fuer Production. Week, Draft und Ready sind nicht vollstaendig als einfache State Machines modelliert; sie laufen ueber kanonische Felder plus Projektionen, Legacy-Fallbacks und Resolver. Das ist kontrolliert, aber nicht elegant.

Die haerteste Wahrheit: Das System wirkt fuer den MVP-Flow spielbar, aber es ist noch kein robustes Produkt-System. Ein kaputtes Roster kann z. B. Ready gruen wirken lassen und erst die Admin-Simulation blockieren. Das ist kein Datenverlust, aber ein UX-/Flow-Bruch.

## Zahlen

Audit-Scope: alle `FIX NOW`, alle im vorherigen Audit `TEILWEISE` bewerteten Findings und kritische QA-/Smoke-Findings.

- **GELÖST:** 16
- **TEILWEISE:** 14
- **OFFEN:** 1
- **REGRESSIONEN:** 0

## Findings Re-Evaluation

| Finding | Status | Begruendung aus Code + Tests | Risiko |
|---|---|---|---|
| N033 - Online Join/Rejoin hat viele versteckte Abhaengigkeiten | GELÖST | `firebase-online-league-repository.ts` kapselt Join/Rejoin in Firestore Transactions; `e2e/multiplayer-firebase.spec.ts` prueft Join, Rejoin, stale `lastLeagueId` und Reload. | Niedrig |
| N034 - Fehlende Membership kann Nutzer in Schleifen fuehren | GELÖST | Route-State und E2E behandeln fehlende Membership als Recovery-State statt harter Sackgasse. | Niedrig |
| N035 - Fehlende Team-Zuordnung blockiert Multiplayer | GELÖST | Join setzt Membership und Team-Zuordnung transaktional; No-Team-/Stale-Team-E2E prueft Direktaufrufe. | Niedrig |
| N036 - User-Team-Link hat mehrere Inkonsistenzstellen | TEILWEISE | Membership, globaler Mirror und Team-Felder werden repariert/synchronisiert, bleiben aber weiterhin mehrere persistierte Datenpfade. | Mittel |
| N037 - Globaler League Member Mirror ist doppelte Source of Truth | TEILWEISE | Mirror wird als Projektion behandelt und repariert, existiert aber weiter und kann veralten. | Mittel |
| N038 - Team Assignment kann Race Conditions erzeugen | GELÖST | Join nutzt Firestore Transaction; Repository-Test prueft parallele Join-Versuche ohne doppelte Teamvergabe. | Niedrig |
| N039 - Ready-State braucht konsistente Persistenz und Anzeige | TEILWEISE | Ready ist zentral ueber Membership/aktive Participants abgeleitet und waehrend Simulation/Draft/completed blockiert. Aber Ready prueft kein spielbares Roster; Roster-Fehler werden erst in Simulation-Preconditions sichtbar. | Mittel |
| N041 - GM-Fortschritt haengt stark vom Admin Week Flow ab | TEILWEISE | Dashboard/Admin-Flow ist klarer, aber der Week-Fortschritt bleibt adminzentriert. Ohne Admin bleibt der GM-Loop stehen. | Mittel |
| N045 - Active Draft darf nicht automatisch Fullscreen oeffnen | GELÖST | Kein Auto-Redirect gefunden; Draft wird als Status und Route behandelt. E2E deckt Draft-Direktzugriff in Edge States ab. | Niedrig |
| N048 - Draft State hat mehrere Race- und Truth-Risiken | TEILWEISE | `multiplayer-draft-logic.ts` validiert Pick-Slots, Player-Duplikate, Draft-Order und currentPick. Firestore Pick laeuft transaktional. Trotzdem bleiben Draft Doc, Picks, Available Players und Legacy-Fallbacks als verteiltes Modell. | Mittel |
| N061 - Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten | GELÖST | `online-game-simulation.ts` und Week-Preconditions bilden Online-Teams kontrolliert auf Simulationsergebnisse ab; fehlende Daten werden strukturiert blockiert. | Niedrig |
| N067 - Team Management braucht klare No-Team- und No-Roster-Zustaende | TEILWEISE | Browser-E2E prueft No-Team, stale Team und No-Roster auf Unterseiten. No-Roster wird sauber angezeigt, aber Ready kann weiterhin vor Simulation als GM-Ready gesetzt werden, obwohl Simulation spaeter Roster blockt. | Mittel |
| N068 - Week Simulation braucht gueltigen Schedule | GELÖST | `online-league-week-simulation.ts` validiert Schedule und Matchups zentral; Service-Tests decken fehlenden/ungueltigen Schedule ab. | Niedrig |
| N069 - Week Simulation braucht vorhandene Teams | GELÖST | Preconditions pruefen aktive Teams und Matchup-Referenzen vor Writes; Tests decken fehlende Teams ab. | Niedrig |
| N085 - Stale `lastLeagueId` kann Nutzer blockieren | GELÖST | E2E bestaetigt Recovery von stale `lastLeagueId` und anschliessenden Rejoin. | Niedrig |
| N086 - Draft Pick und Draft State koennen parallel kollidieren | TEILWEISE | Firestore Transaction, Pick-Dokument-ID und Available-Player-Delete verhindern normale Doppel-Picks. Promise.all-Tests existieren. Rest-Risiko: kein vollstaendiger Browser-/Firestore-Mehrclient-Race fuer alle Pfade. | Mittel |
| N087 - Week Simulation kann doppelt oder parallel laufen | GELÖST | `adminActionLocks` pro Liga/Woche, `simulationAttemptId`, `assertCanStart...`, `assertCanComplete...`, TTL-Stale-Recovery und Tests fuer fresh/stale/simulated Locks sind vorhanden. E2E prueft doppelte Simulation als `week_already_simulated`. | Niedrig bis mittel |
| N088 - Multiplayer hat viele parallele Statusfelder | TEILWEISE | `online-league-lifecycle.ts` normalisiert UI-Status, aber persistierte Felder bleiben breit: League, Membership, Team, Draft, Week, Lock, Results. | Mittel |
| N089 - Zentrale Online State Machine fehlt | TEILWEISE | Kleine Lifecycle-Normalisierung existiert, aber keine vollstaendige State Machine mit expliziten Transitions fuer Join, Draft, Ready und Week. | Mittel |
| N090 - Week Status hat doppelte Wahrheit | TEILWEISE | `completedWeeks` ist kanonisch; `lastSimulatedWeekKey`, `weekStatus`, `matchResults` und `weeks/*` bleiben Projektionen/Legacy-Signale. Konflikte werden erkannt, aber nicht vollstaendig eliminiert. | Mittel |
| N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen | GELÖST | Admin-Simulation schreibt Results, Standings, `completedWeeks`, Ready-Reset und `currentWeek` in einer Firestore Transaction. Tests pruefen Duplicate/Failure-Pfade. | Niedrig |
| N093 - Ready waehrend Simulation ist Race-Risiko | GELÖST | `setUserReady` prueft Simulation Lock und `weekStatus`; Tests pruefen blockierte Ready-Writes waehrend Simulation/completed/Draft. | Niedrig |
| N099 - Multiplayer Acceptance und UX-Audit widersprechen sich | GELÖST | Release-/QA-Gates trennen interne technische MVP-Akzeptanz von UX-/Production-Freigabe. | Niedrig |
| N101 - E2E scheitert lokal an DB-Verbindung | OFFEN | `npm run test:e2e:multiplayer` scheitert weiter, wenn PostgreSQL auf `localhost:5432` fehlt. Preflight ist gut, Gate ist trotzdem rot ohne DB. | Mittel |
| N102 - Firebase Parity braucht Emulator-Portbindung | TEILWEISE | Parity ist ausserhalb Sandbox gruen. Innerhalb Sandbox scheitert Portbindung mit `EPERM`; der Test bleibt infra-abhaengig. | Niedrig bis mittel |
| N103 - Authentifizierter Staging Smoke fehlt als bestaetigtes Gate | TEILWEISE | `scripts/staging-admin-week-smoke.ts` ist vorhanden und prueft Ziel-Commit, aber in diesem Lauf fehlten Smoke-Credentials/Token. Kein frischer Staging-Beweis. | Mittel |
| N104 - Multiplayer GM Rejoin Browser-Test fehlt | GELÖST | `e2e/multiplayer-firebase.spec.ts` prueft Auth, Membership, Team-Zuordnung, stale `lastLeagueId` und Reload. | Niedrig |
| N105 - Admin Week E2E Reload-Test fehlt | GELÖST | E2E prueft Admin-Simulation, Results, Standings, Reload und Duplicate-Block. | Niedrig |
| N106 - Tests fuer parallele Multiplayer-Aktionen fehlen | TEILWEISE | Join, Ready, Draft und Week haben Promise.all-/Paralleltests. Vollstaendige echte Mehrclient-Firestore-Concurrency ist nicht fuer alle kritischen Pfade isoliert. | Mittel |
| N112 - QA-Gruen und E2E-Rot widersprechen sich | GELÖST | Gate-Dokumentation verhindert, dass lokale Unit-Gruenheit E2E-/Smoke-Rot ueberstimmt. | Niedrig |
| N118 - Staging Smoke kann an IAM `signJwt` scheitern | TEILWEISE | Smoke-Script dokumentiert Token/Testlogin/IAM-Pfade. Externe IAM-/Credential-Abhaengigkeit bleibt. | Mittel |

## Core Loop Realitaetscheck

| Schritt | Bewertung | Beleg | Skeptische Einschaetzung |
|---|---|---|---|
| Join | Stabil | Firestore Transaction, `e2e/multiplayer-firebase.spec.ts` | Parallele Join-Versuche sind abgesichert. Mirror bleibt Projektion und daher Wartungsrisiko. |
| Team | Stabil mit Restkomplexitaet | Membership/Team/Mirror Repair, No-Team/Stale-Team E2E | User kommt wieder ins Team. Drei Datenpfade bleiben aber ein strukturelles Risiko. |
| Ready | Teilweise stabil | `getOnlineLeagueReadyChangeState`, `setUserReady`, Tests | Ready ist gegen Draft/Simulation/completed geschuetzt. Es ist aber GM-Ready, nicht Simulation-Ready; fehlendes Roster wird erst spaeter blockiert. |
| Simulation | Stabil im Emulator | Admin Lock, Preconditions, Transaction, E2E | Doppel-Simulation wird blockiert; Stale-Lock-Recovery existiert. Production-/Staging-Live-Signal fehlt frisch. |
| Results | Stabil | Transaction schreibt Results/Standings/completedWeeks; E2E Reload | Results bleiben nach Reload sichtbar. Langfristig kann das League-Dokument wachsen. |
| Reload | Stabil im getesteten Scope | Firebase E2E fuer Join/Ready/Admin/No-Team/No-Roster | Gute Abdeckung fuer MVP-Pfade; Staging-Live fehlt. |

## Source-of-Truth Bewertung

| Domaene | Bewertung | Urteil |
|---|---|---|
| Week | TEILWEISE | `completedWeeks` ist kanonisch, aber Resolver muessen `lastSimulatedWeekKey`, `weekStatus`, `matchResults` und `weeks/*` weiter einordnen. Das ist kontrollierte Redundanz, keine saubere einzige Wahrheit. |
| Draft | TEILWEISE | Pick-Slot-Dokumente und Available-Player-Docs sind fuer Writes stark, aber Draft-State wird weiterhin aus mehreren Quellen rekonstruiert und validiert. |
| Ready | TEILWEISE | Persistenzquelle ist klarer als vorher, aber semantisch bleibt Ready von Roster-/Simulation-Readiness getrennt. Der User kann "ready" wirken, obwohl Simulation spaeter scheitert. |

## Concurrency & Failure Audit

| Angriff | Ergebnis | Bewertung |
|---|---|---|
| Doppelte Simulation starten | Lock + completedWeeks verhindern doppelte Results; E2E prueft Duplicate als Fehler. | Korrekt blockiert |
| Stale simulating Lock nach Prozessabbruch | TTL-/createdAt-basierte Recovery existiert und ist getestet. | Entschaerft, operativ noch sensibel |
| Draft Picks parallel feuern | Transaction, Pick-Dokument-ID, currentPick und Available-Player-Delete verhindern normale Kollisionen. | Korrekt fuer Hauptpfad, Teilrisiko fuer Legacy/local Pfade |
| Ready waehrend Simulation toggeln | `setUserReady` blockt aktive Simulation Lock und `weekStatus=simulating`. | Korrekt blockiert |
| Join parallel mehrfach ausfuehren | Transaktionale Teamauswahl und Tests verhindern doppelte Teamzuweisung. | Korrekt blockiert |

## Lock & Recovery Audit

- **Simulation Lock:** vorhanden, pro `leagueId + season + week`, mit `simulationAttemptId`, Owner/Session-Feldern, `createdAt/updatedAt` und TTL-Recovery. Frischer Lock blockiert, stale Lock kann ersetzt werden, simulated Lock bleibt geschlossen.
- **Draft Lock/State:** kein separater Lock, aber Pick-Slot-Dokumente plus Firestore Transaction wirken als impliziter Lock. Das ist fuer Pick-Operationen ausreichend, aber schwerer zu auditieren als ein expliziter Draft-State-Automat.
- **Ready:** kein Lock noetig, aber expected season/week plus Simulation-Lock-Check verhindern wichtigste Kollisionen.
- **Atomaritaet:** Week-Simulation nutzt zwei Transactions: Lock-Start und Persistenz/Complete. Das ist akzeptabel, weil stale Recovery existiert. Die eigentlichen Ergebnis-/Week-Advance-Writes sind atomar gekoppelt.

## Testqualitaet

Die Tests sind besser als reine Happy Paths:

- Draft: unavailable player, duplicate pick slot, wrong team, stale same-team pick, Promise.all pick race, idempotent finalization.
- Week: missing schedule, missing teams, empty roster, contradictory week states, duplicate simulation, stale lock recovery, standings/results persistence.
- Ready: set/unset, stale week guard, simulation lock, completed week, draft active.
- Browser E2E: Join/Rejoin, Ready sync, forbidden cross-user write, Admin Simulation, Results/Standings Reload, No-Team, Stale-Team, No-Roster, Direct URL recovery.

Luecken bleiben:

- Kein frischer authentifizierter Staging-Smoke in diesem Lauf.
- Prisma-E2E bleibt infra-rot ohne lokale PostgreSQL-DB.
- Nicht jeder Race-Fall ist als echter Mehrbrowser-/Mehrclient-Firestore-Test modelliert.
- Ready-vs-Roster-Semantik ist nicht als roter UI-Zustand abgesichert.

## Infrastruktur & Gates

| Gate | Ergebnis | Bewertung |
|---|---|---|
| `npx tsc --noEmit` | Gruen | 0 Fehler |
| `npm run lint` | Gruen | 0 Fehler |
| Fokussierte Vitest-Suites | Gruen | 10 Dateien, 148 Tests |
| `npm run test:firebase:parity` | Gruen ausserhalb Sandbox | Sandbox blockiert Ports; ausserhalb Sandbox 3 Tests gruen |
| `npm run test:e2e:multiplayer` | Rot / Infra | PostgreSQL auf `localhost:5432` nicht erreichbar |
| `npm run test:e2e:multiplayer:firebase` | Gruen ausserhalb Sandbox | 4 Browser-Tests gruen |
| Staging Smoke | Nicht ausgefuehrt | Smoke-Env fehlte: `CONFIRM_STAGING_SMOKE`, Testlogin/Token nicht gesetzt |

## Top 10 Risiken

1. **Production-No-Go wegen fehlendem frischem Staging-Smoke:** Der Code kann lokal gut sein, aber der Live-Auth/Admin-Flow fuer den Ziel-Commit ist hier nicht bewiesen.
2. **Ready ist nicht gleich Simulation-Ready:** Roster-Probleme koennen nach Ready erst in der Admin-Simulation auffallen.
3. **Week bleibt redundant modelliert:** `completedWeeks` ist kanonisch, aber Projektionen/Legacy-Felder koennen weiter Konflikte erzeugen.
4. **Draft-State bleibt verteilt:** Transaktional sicherer, aber nicht einfach genug, um dauerhaft trivial auditierbar zu sein.
5. **Prisma-E2E-Gate ist infra-rot:** Ohne DB kein vollstaendiges lokales Release-Signal.
6. **Staging/IAM bleibt externer Gate-Faktor:** Smoke kann an Credentials oder `signJwt`-Rechten haengen.
7. **Dirty Worktree:** Viele geaenderte/ungetrackte Dateien; Release braucht sauberen Commit und reproduzierbare Checks.
8. **Breite Services bleiben Kopplungshotspots:** Online-Service, Firebase Repository und Admin Actions sind weiter schwer zu reviewen.
9. **League-Dokument kann wachsen:** Results, standings, completedWeeks und Projektionen koennen langfristig Kosten/Performance belasten.
10. **Tests sind stark, aber nicht vollstaendig realweltlich:** Emulator-/local-Tests ersetzen keine echte Staging-Mehrnutzer-Validierung.

## Unnoetige Komplexitaet

1. Week Completion braucht kanonische `completedWeeks` plus Legacy-Konflikterkennung.
2. Draft Completion/Picks werden ueber Draft Doc, Picks, Available Players und Player Pool abgeleitet.
3. Membership, globaler Mirror und Team-Felder muessen synchron bleiben.
4. Ready-State vermischt GM-Absicht mit Week-/Draft-/Lock-Guards, aber nicht mit Roster-Readiness.
5. Admin-Simulation braucht Lock-Start-Transaction und Completion-Transaction.
6. UI-Status entsteht aus Lifecycle-Normalisierung statt aus einer persistierten State Machine.
7. Staging-Smoke hat mehrere Auth-Wege: ID Token, Testlogin, IAM signJwt.
8. Local/Prisma und Firebase-E2E sind verschiedene Gates mit verschiedenen Infrastrukturproblemen.
9. Browser-E2E erzeugt erwartete Firestore `PERMISSION_DENIED` Logs, die Log-Auswertung lauter machen.
10. Viele Reports/Gates koennen stale werden, wenn Ziel-Commit nicht explizit gebunden ist.

## Ausgefuehrte Checks

```text
npx tsc --noEmit
-> gruen

npm run lint
-> gruen

npx vitest run src/lib/online/fantasy-draft-service.test.ts src/lib/online/multiplayer-draft-logic.test.ts src/lib/online/online-league-week-simulation.test.ts src/lib/admin/online-week-simulation.test.ts src/lib/online/online-league-lifecycle.test.ts src/lib/online/online-league-service.test.ts src/components/online/online-league-detail-model.test.ts src/components/online/online-league-dashboard-panels.test.tsx src/lib/online/repositories/online-league-repository.test.ts src/components/online/online-league-route-state-model.test.ts
-> gruen, 10 Testdateien, 148 Tests

npm run test:firebase:parity
-> erster Sandbox-Lauf rot wegen EPERM auf Emulator-Ports
-> Wiederholung ausserhalb Sandbox gruen, 1 Testdatei, 3 Tests

npm run test:e2e:multiplayer
-> rot / Infra: PostgreSQL localhost:5432 nicht erreichbar

npm run test:e2e:multiplayer:firebase
-> erster Sandbox-Lauf rot wegen EPERM auf Emulator-Ports
-> Wiederholung ausserhalb Sandbox gruen, 4 Browser-Tests
```

Staging Smoke wurde nicht ausgefuehrt, weil im Prozess keine sicheren Smoke-Credentials gesetzt waren:

```text
CONFIRM_STAGING_SMOKE=missing
STAGING_FIREBASE_TEST_EMAIL=missing
STAGING_FIREBASE_TEST_PASSWORD=missing
E2E_FIREBASE_ADMIN_ID_TOKEN=missing
GOOGLE_CLOUD_PROJECT=missing
```

## Empfehlung

| Ziel | Entscheidung | Begruendung |
|---|---|---|
| Internal MVP | **Go** | Der Core Loop ist im lokalen Firebase-Emulator real browsergetestet und fuer interne QA spielbar. |
| Staging QA | **Go mit Pflicht-Gate** | Nur wenn `staging:smoke:admin-week` fuer den konkreten Ziel-Commit live gruen ist. Ohne diesen Smoke: Teil-Go. |
| Production | **No-Go** | Kein frischer Staging-Live-Smoke, Prisma-E2E infra-rot, verteilte Sources of Truth und dirty Release-Stand verhindern eine serioese Production-Freigabe. |

## Schlussurteil

Die kritischen Findings sind nicht nur oberflaechlich angefasst. Der Code enthaelt echte Guards, Transaktionen, Locks und Tests. Aber mehrere Loesungen sind bewusst kompatibilitaetsorientiert statt architektonisch final. Das ist fuer ein internes Multiplayer-MVP akzeptabel. Fuer Production ist es noch zu fragil.

