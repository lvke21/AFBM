# Firebase Production Go/No-Go Report

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Rolle: Lead Engineer, Release Manager und Risk Reviewer  
Gate-Status: **Gruen**  
Produktive Firestore-Aktivierung: **No-Go**

## Executive Summary

Firestore darf aktuell **nicht** produktiv als App-Datenpfad aktiviert werden.

Die lokalen Firebase-Checks, Production-Konfiguration sowie Rules/Indexes sind gruen. Das reicht fuer Vorbereitung, Emulator-Weiterarbeit und spaeteres Rules-/Indexes-Deployment nach expliziter Freigabe. Es reicht aber nicht fuer `DATA_BACKEND=firestore` in Production.

Hauptgruende:

- Firestore-Browser-E2E ist nicht produktionsnah validiert.
- legacy session system, SaveGame-Root, Browser-Navigation, E2E-Seeds und mehrere transaktionale Fachpfade bleiben Prisma-basiert.
- Es gibt keinen produktionsnahen Backfill mit Count-, ID-, Status-, Score-, Stats- und Report-Vergleich.
- Kosten- und Monitoring-Gates sind dokumentiert, aber noch nicht produktionsnah bewiesen.
- `firestoreGuard` blockiert Production-Firestore bewusst weiterhin.

## Gepruefte Reports

| Report | Status | Relevante Aussage fuer dieses Gate |
| --- | --- | --- |
| `docs/reports/firebase-local-final-check-report.md` | Gruen | Emulator, Seed/Reset/Verify, Firebase Tests, Typecheck/Lint und Prisma-Fallback sind gruen. Production-Zugriffe bleiben ausgeschlossen. |
| `docs/reports/firebase-production-config-prep-report.md` | Gruen | Production ENV ist vorbereitet; Prisma bleibt Default; `DATA_BACKEND=firestore` bleibt in Production blockiert. |
| `docs/reports/firebase-rules-indexes-production-readiness-report.md` | Gruen | Rules/Indexes sind deployfaehig vorbereitet; kein Deployment und kein Go-Live wurden ausgefuehrt. |
| `docs/reports/systems/firebase-e2e-parity-report.md` | Gruen fuer serverseitige Kern-Parity | Firestore-Emulator-Parity ist serverseitig gruen, aber Browser-E2E mit Firestore ist ausdruecklich No-Go. |
| `docs/reports/systems/firebase-final-migration-decision.md` | Gruen fuer Entscheidung | Empfehlung bleibt Option A: Prisma behalten. Firestore als alleiniger Runtime-Pfad und Prisma-Removal sind No-Go. |

## Go/No-Go-Matrix

| Bereich | Bewertung | Entscheidung | Begruendung |
| --- | --- | --- | --- |
| Funktionalitaet | Teilweise bereit | **No-Go** | Serverseitige Kern-Parity ist gruen, aber Browser-Firestore-Flow, Auth/SaveGame-Einstieg und vollstaendige transaktionale Fachpfade sind nicht production-ready. |
| Security | Gut vorbereitet | **Conditional Go fuer Rules/Indexes, No-Go fuer App-Aktivierung** | Rules sind default deny, keine Client-Writes, fremde Liga blockiert. Auth-Claims/Role-Strategie fuer Production muss vor App-Go-Live final validiert werden. |
| Kosten | Risiko bekannt, nicht bewiesen | **No-Go** | Indexe sind vorbereitet, aber echte Read-/Write-Volumen, Simulation-Writes, Aggregates, Reports und Backfill-Kosten sind nicht in Preview/Staging gemessen. |
| Rollback | Klar fuer aktuellen Zustand | **Go fuer Vorbereitung, No-Go fuer Cutover** | Prisma bleibt Default und sicherer Fallback. Fuer Firestore-Cutover fehlen Backfill-Snapshot, Dual-Run-Strategie und Datenvergleich in staging-naher Umgebung. |
| Monitoring | Noch unvollstaendig | **No-Go** | Es fehlen produktionsnahe Alerts fuer Firestore Errors, Permission Denied Spikes, Read/Write-Kosten, Latenz, Backfill-Abweichungen und Repository-Fallback-Events. |
| Prisma-Fallback | Stark | **Go** | Prisma bleibt Default; `DATA_BACKEND` leer oder `prisma` nutzt PostgreSQL. Fallback ist lokal validiert. |
| Auth-Entscheidung | Offen | **No-Go** | legacy session system/Prisma bleibt fuehrend. Keine Auth-Umstellung, kein Firestore-Browser-Einstieg ohne Prisma-Zwang validiert. |

## Entscheidung

**No-Go fuer produktive Firestore-Aktivierung.**

Erlaubt:

- Weiterarbeit im lokalen Emulator.
- Preview/Staging-Vorbereitung ohne echte Nutzerdaten.
- Rules-/Indexes-Deployment nur nach separater expliziter Freigabe.
- Serverseitige Parity-Erweiterung und Backfill-Probelauf gegen nicht-produktive Daten.

Nicht erlaubt:

- `DATA_BACKEND=firestore` in Production.
- Firestore als produktiver App-Datenpfad.
- Prisma-Entfernung.
- Auth-Umstellung als Nebenprodukt.
- Seed/Reset/Verify gegen Production.
- Produktiver Backfill ohne separaten Migrationsplan.

## Rollout-Plan

### Phase 1: Lokal

Ziel: Emulator-Parity weiter ausbauen.

Gate:

- `npm run firebase:reset`
- `npm run firebase:seed`
- `npm run firebase:verify`
- `npm run test:firebase`
- `npm run test:firebase:parity`
- `npm run firebase:rules:test`
- `npx tsc --noEmit`
- `npm run lint`

Erlaubt: Firestore nur ueber `demo-*` Projekt und Emulator.

### Phase 2: Preview/Staging

Ziel: Production-aehnliche Firebase-Konfiguration ohne Production-Datenpfad.

Gate:

- Eigenes Preview/Staging-Firebase-Projekt.
- Keine Production-Daten.
- Rules/Indexes in Preview/Staging deployen.
- Backfill-Probelauf mit anonymisierten oder synthetischen Daten.
- Count-, ID-, Status-, Score-, Stats- und Report-Vergleiche.
- Firestore Browser-E2E oder dedizierter Hybrid-Testeinstieg geklaert.
- Monitoring-Dashboard fuer Reads, Writes, Errors, Latenz und Kosten.

### Phase 3: Begrenzter Production-Test

Ziel: Kontrollierter Test ohne breiten Nutzerimpact.

Voraussetzung:

- Explizite Freigabe fuer diesen Schritt.
- `firestoreGuard` bewusst fuer Production-Firestore angepasst.
- Feature Flag/Rollout-Schalter vorhanden.
- PostgreSQL-Snapshot vor Test.
- Backfill in Production dry-run oder read-only validiert.
- Firestore-Writes nur fuer eng begrenzten Scope.
- Prisma bleibt sofortiger Fallback.

Stop-Kriterien:

- Datenabweichung bei Counts, IDs, Week-State, Scores, Stats oder Reports.
- Firestore Permission Denied Spikes.
- Kostenanstieg ausserhalb Budget.
- Latenzregression in Kernflows.
- Auth-/SaveGame-Inkonsistenzen.

### Phase 4: Breiter Rollout

Ziel: Schrittweise Erhoehung des Firestore-Traffics.

Gate:

- Begrenzter Production-Test ohne Blocker abgeschlossen.
- Monitoring mindestens eine Release-Phase stabil.
- Rollback getestet.
- On-call/Incident-Runbook vorhanden.
- Kostenbudget bestaetigt.
- Prisma bleibt mindestens eine weitere Release-Phase als Fallback erhalten.

## Rollback

Aktueller Rollback ist einfach:

- `DATA_BACKEND` leer lassen oder auf `prisma` setzen.
- Firestore bleibt durch `firestoreGuard` fuer Production blockiert.
- Prisma/PostgreSQL bleibt aktiver Datenpfad.

Rollback fuer spaeteren Cutover:

1. Vor Cutover PostgreSQL-Snapshot erstellen.
2. Firestore-Backfill mit Vergleichsreport abschliessen.
3. Firestore-Aktivierung nur ueber Feature Flag.
4. Bei Fehlern Feature Flag auf Prisma zuruecksetzen.
5. Firestore-Writes stoppen.
6. Abweichende Daten aus Snapshot/Prisma rekonstruieren.
7. Prisma-Code erst entfernen, wenn der Rollback nicht mehr vom alten Codepfad abhaengt.

## Kostenrisiken

Bekannte Risiken:

- Hohe Read-Zahlen durch Listen, Standings, Match Reports und Roster-Views.
- Hohe Write-Zahlen durch Simulation, Game Events, Stats und Reports.
- Aggregates und Counter koennen Mehrfachwrites erzeugen.
- Backfill kann kurzfristig hohe Kosten verursachen.
- Fehlende oder falsche Indexe koennen Queries blockieren oder ineffizient machen.

Vor Go-Live erforderlich:

- Read-/Write-Budget definieren.
- Preview/Staging-Lastlauf mit Kostenprotokoll.
- Backfill-Kosten schaetzen.
- Alerting fuer Firestore Usage und Billing aktivieren.
- Query- und Indexbedarf nach realen UI-Flows bestaetigen.

## Security

Geprueft:

- Rules sind default deny.
- User koennen nur eigene Profile lesen.
- League-Daten sind membership-/owner-geschuetzt.
- Fremde Liga ist blockiert.
- Client-Writes sind geschlossen.
- Game Engine Writes bleiben serverseitig.
- Emulator-Rules-Tests sind gruen.

Offen vor App-Go-Live:

- Finale Auth-/Claims-Strategie fuer Production.
- Firestore-Browser-Einstieg mit echter Auth-Session.
- Security Review der Produktions-Service-Account-Rechte.
- Incident-Prozess fuer Rule-Fehlkonfiguration.

## Aktivierungsstatus

Nicht erfolgt:

- Kein `firebase deploy`.
- Keine Firestore-Production-Migration.
- Keine Aktivierung von `DATA_BACKEND=firestore` in Production.
- Keine Prisma-Entfernung.
- Keine Auth-Umstellung.

Aktueller Codezustand:

- `.env.example` dokumentiert `DATA_BACKEND="prisma"`.
- `getRepositories()` defaultet auf Prisma.
- `firestoreGuard` erlaubt Firestore nur mit Emulator-Host und `demo-*` Projekt-ID.

## Statuspruefung

| Frage | Ergebnis |
| --- | --- |
| Go/No-Go klar? | Ja: No-Go fuer produktive Firestore-Aktivierung |
| Rollback klar? | Ja: Prisma bleibt Default und Fallback |
| Kostenrisiken klar? | Ja: bekannt, aber vor Go-Live noch zu messen |
| Security geprueft? | Ja: Rules/Indexes und Emulator-Rules-Tests sind gruen; Auth-Production-Gate bleibt offen |
| Aktivierung noch nicht versehentlich erfolgt? | Ja |

## Final Decision

**Gate-Status: Gruen**  
**Produktive Firestore-Aktivierung: No-Go**

Die Firebase-Vorbereitung ist in gutem Zustand, aber Firestore darf noch nicht produktiv als Datenpfad aktiviert werden. Der naechste sinnvolle Schritt ist ein Preview/Staging-Rollout mit Backfill-Probe, Monitoring, Kostenmessung, Auth-/SaveGame-Klaerung und Firestore-Browser-E2E.
