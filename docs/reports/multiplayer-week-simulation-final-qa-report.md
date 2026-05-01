# Multiplayer Week Simulation Final QA Report

Datum: 2026-05-01  
Rolle: Senior QA Engineer  
Scope: Admin Multiplayer/Firebase Week-Simulation, Admin API, Admin UI, Seed-Readiness

## QA-Ergebnis

**Empfehlung: No-Go fuer finale Staging-Abnahme, bis ein manueller Browser-Test mit echter Firebase-Admin-Session auf Staging ausgefuehrt wurde.**

Die automatisierte Code-, API- und Service-QA ist gruen. Die echte Browser-Staging-Strecke mit erlaubter UID wurde in dieser Umgebung nicht ausgefuehrt, weil keine reale Firebase-Login-Session und kein Staging-Write verwendet wurden. Deshalb ist die technische Implementierung testbereit, aber die finale Produktabnahme bleibt offen.

## Getestete Umgebung

- Lokales Repository: `/Users/lukashanzi/Documents/AFBM`
- Datum: 2026-05-01
- Node/Next/Vitest Projektumgebung
- Backend-Ziel fuer echte QA: Firebase Staging `afbm-staging`
- Automatisierte Tests: lokale Unit-/Route-/Service-Tests mit Firebase Admin Mocks
- Nicht ausgefuehrt: echter Browser-Login gegen Staging, echter Seed-Write, echte Week-Simulation in Staging

## Testdaten / Liga-ID

Empfohlene Staging-Testliga:

- `leagueId`: `afbm-admin-week-sim-test-league`
- Seed-Command:
  `npm run firebase:seed-online-league -- --project afbm-staging`
- Datenbasis:
  - 16 Teams
  - gueltiger Schedule
  - `currentWeek: 1`
  - `status: active`
  - `weekStatus: ready`
  - 53 aktive Roster-Spieler pro Team
  - Draft-State `completed`
  - Seed-Marker `seedKey: afbm-admin-week-simulation-v1`

## Ergebnisse je Flow

| # | Flow | Ergebnis | Nachweis |
|---|------|----------|----------|
| 1 | Admin Login mit erlaubter UID | Nicht live getestet | Admin Guard per Route-Test: UID-Allowlist und `admin:true` werden akzeptiert |
| 2 | `/admin` erreichbar | Nicht live getestet | `AdminAuthGate` und Admin-Route bleiben typisiert; kein Browserlauf ausgefuehrt |
| 3 | Liga erstellen oder Testliga verwenden | Testbereit | `firebase:seed-online-league -- --help` erfolgreich; echter Staging-Write nicht ausgefuehrt |
| 4 | Liga in Firebase-Liste sichtbar | Nicht live getestet | Admin `listLeagues` Route/Action automatisiert getestet |
| 5 | Ligadetailseite oeffnet | Nicht live getestet | UI Typecheck gruen; Admin Detail-Komponente kompiliert |
| 6 | Aktuelle Woche sichtbar | Automatisiert abgesichert | Admin Detail UI rendert `league.currentWeek`; Typecheck gruen |
| 7 | Games sichtbar | Automatisiert abgesichert | Schedule- und Week-Simulation-Tests validieren Games der aktuellen Woche |
| 8 | Woche simulieren | Automatisiert bestanden | API `simulateWeek` als Admin erfolgreich getestet |
| 9 | Ergebnisse sichtbar | Automatisiert abgesichert | Simulationsergebnis enthaelt Results; UI rendert letzte Simulation und gespeicherte Ergebnisse |
| 10 | Standings aktualisiert | Automatisiert bestanden | Records/Standings Tests: Wins, Losses, Punkte, Differential, Sortierung |
| 11 | Reload zeigt gespeicherte Ergebnisse | Teilweise automatisiert | Service-Test prueft Reload bei lokaler Online-Liga; Staging-Browser-Reload offen |
| 12 | Erneute Simulation derselben Woche verhindert | Automatisiert bestanden | Duplicate/Lock Tests und idempotenter Admin-Test |
| 13 | Naechste Woche nur korrekt simulierbar | Teilweise automatisiert | `expectedSeason/week` Guard vorhanden; echter Week-2-Staging-Flow offen |
| 14 | Nicht-Admin wird blockiert | Automatisiert bestanden | API Route Test: `403 ADMIN_FORBIDDEN` |
| 15 | Request ohne Token wird blockiert | Automatisiert bestanden | API Route Test: `401 ADMIN_UNAUTHORIZED` |

## Bugs

Keine neuen Bugs in der automatisierten QA gefunden.

Bekannte nicht abgeschlossene QA-Luecke:

- Kein echter Staging-Browserlauf mit UID `KFy5PrqAzzP7vRbfP4wIDamzbh43`.
- Kein echter Staging-Seed-Write ausgefuehrt.
- Kein echter Klick auf `/admin/league/afbm-admin-week-sim-test-league` in Safari/Chrome ausgefuehrt.

## Fixes

In diesem QA-Schritt wurden keine neuen Code-Fixes vorgenommen. Vorherige Implementierungen, die durch diese QA validiert wurden:

- Admin API `simulateWeek` nutzt serverseitige Simulation.
- Week-Simulation nutzt Firestore Transaction und Lock-Status.
- Standings werden aus Match Results berechnet und nicht doppelt gezaehlt.
- Admin Detail UI zeigt Games, Results und Records.
- Staging-Seed-Script fuer eine 16-Team-Testliga ist vorhanden.

## Ausgefuehrte Checks

```bash
npm run lint
npx tsc --noEmit
npx vitest run src/app/api/admin/online/actions/route.test.ts src/lib/admin/online-week-simulation.test.ts src/lib/admin/online-admin-actions.test.ts src/lib/online/online-game-simulation.test.ts src/lib/online/online-league-schedule.test.ts src/lib/online/online-league-week-simulation.test.ts src/lib/online/online-league-service.test.ts
```

Ergebnis:

- Lint: gruen
- Typecheck: gruen
- Vitest: 7 Testdateien, 84 Tests, gruen
- Hinweis: Vitest zeigt weiterhin die bekannte Node-Deprecation-Warnung zu `punycode`, ohne Testfehler.

## Offene Risiken

- Firestore Rules/IAM koennen in Staging anders wirken als die gemockten Route-Tests.
- Firebase ID Token Refresh fuer den erlaubten Admin-User muss im Browser real validiert werden.
- App Hosting Deployment/Cache kann UI-Staende beeinflussen.
- Echter Staging-Seed kann an ADC/IAM/Quota-Projekt scheitern, obwohl Script und Guards korrekt sind.
- Week 2+ Flow ist technisch vorbereitet, aber noch nicht als echter Staging-Browser-Loop validiert.

## Manuelle Staging-QA Schritte

1. Admin-Claim oder UID-Allowlist fuer `KFy5PrqAzzP7vRbfP4wIDamzbh43` bestaetigen.
2. Testliga seed'en:
   `npm run firebase:seed-online-league -- --project afbm-staging`
3. App Hosting Staging oeffnen und mit Admin-User einloggen.
4. `/admin` oeffnen.
5. Pruefen, dass `afbm-admin-week-sim-test-league` in Firebase Ligen sichtbar ist.
6. Ligadetailseite oeffnen.
7. Week 1, 16 Teams, aktuelle Games und leere Results pruefen.
8. `Woche simulieren` klicken.
9. Ergebnisse, Standings und Next Week pruefen.
10. Seite neu laden und gespeicherte Ergebnisse pruefen.
11. API-Replay fuer alte Week 1 versuchen und Blockierung pruefen.
12. Mit Nicht-Admin einloggen und `/admin` sowie API Action pruefen.
13. API Request ohne Bearer Token pruefen.

## Go / No-Go

- **Code/API/Service QA:** Go
- **Finale Staging-Produktabnahme:** No-Go bis manueller Browser-Staging-Test abgeschlossen ist

