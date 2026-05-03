# Work Packages

## WP-01: E2E und Staging Smoke stabilisieren

Ziel:
- Release-Gates liefern wieder ein verlaessliches Browser-/Live-Signal.

Problem:
- Unit/Build sind gruen, aber `npm run test:e2e` ist lokal durch fehlende PostgreSQL-DB blockiert. Staging Admin Week Smoke braucht echte Secrets/IAM.

Umfang:
- E2E-Preflight/DB-Bootstrap dokumentieren oder Script verbessern.
- Prisma Smoke, Navigation und Multiplayer E2E reproduzierbar machen.
- Staging Admin Week Smoke mit dediziertem Testuser/Secret Store beschreiben.
- Keine Produktlogik aendern, ausser kleine Test-Infrastruktur-Fixes.

Nicht-Ziele:
- Keine UI-Features.
- Kein Production Deployment.
- Keine Seeds gegen Production.

Betroffene Dateien:
- `package.json`
- `playwright.config.ts`
- `scripts/tools/e2e-preflight.mjs`
- `scripts/seeds/e2e-seed.ts`
- `scripts/staging-admin-week-smoke.ts`
- `docs/reports/full-project-analysis/07-tests-and-quality/*`

Akzeptanzkriterien:
- `npm run test:e2e` startet nach dokumentiertem Bootstrap.
- `npm run test:e2e:multiplayer` ist reproduzierbar.
- Staging Smoke Command ist ohne manuelle Token-Kopie ausfuehrbar, wenn Env-Secrets gesetzt sind.
- Reports dokumentieren echte Ergebnisse.

Tests:
- `npx tsc --noEmit`
- `npm run lint`
- `npm test -- --run`
- `npm run test:e2e`
- `npm run test:e2e:multiplayer`
- `npm run staging:smoke:admin-week` mit Staging-Secrets, falls verfuegbar.

Risiken:
- Lokale DB-/Docker-Verfuegbarkeit.
- Secret-/IAM-Abhaengigkeit.

Aufwand:
- Mittel.

Codex-Prompt:

```text
Rolle: Senior QA/DevOps Engineer
Aufgabe: Stabilisiere E2E- und Staging-Smoke-Gates ohne Produktlogik zu aendern. Lies WP-01 in docs/reports/full-project-analysis/10-work-packages/05-work-packages.md, pruefe package.json, Playwright, e2e-preflight, e2e-seed und staging-admin-week-smoke. Ziel: reproduzierbare lokale E2E-Voraussetzungen und klarer Staging-Smoke mit Env-Secrets. Keine Production, keine Feature-Changes. Fuehre tsc, lint, vitest, relevante E2E aus und dokumentiere Ergebnisse.
```

## WP-02: Multiplayer Rejoin und User-Team-Link haerten

Ziel:
- Ein eingeloggter User kommt zuverlaessig wieder in sein Team.

Problem:
- Membership, Mirror, Team `assignedUserId`, LocalStorage und Route-State koennen auseinanderlaufen.

Umfang:
- Invarianten fuer gueltige Membership zentralisieren.
- Rejoin/Recovery Flow fuer missing membership/team entlooppen.
- Browser-/Unit-Tests fuer valid, repairable und broken States.
- Keine automatische User-Verschiebung ohne klare Invariante.

Nicht-Ziele:
- Keine neuen Team-Zuweisungsfeatures.
- Keine Firestore-Schema-Aenderung.
- Keine Admin-Repair-GUI.

Betroffene Dateien:
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/components/online/online-league-route-state.tsx`
- `src/components/online/online-league-route-state-model.ts`
- `src/components/online/online-league-search.tsx`
- `src/lib/online/online-league-storage.ts`
- `firestore.rules`

Akzeptanzkriterien:
- User mit gueltiger Membership laedt Liga.
- User mit gueltigem Mirror kann Rejoin-Pfad nutzen.
- Falsche User-ID bleibt blockiert.
- Ungueltige `lastLeagueId` fuehrt zu Liga suchen/Rejoin, nicht Retry-Loop.

Tests:
- Route-State Model Tests.
- Online Repository Tests.
- Firebase Rules Tests.
- Playwright Multiplayer Rejoin.

Risiken:
- Join/Load/Rules sind eng gekoppelt.

Aufwand:
- Mittel-Hoch.

Codex-Prompt:

```text
Rolle: Senior Multiplayer Firebase Engineer
Aufgabe: Haerte Rejoin und User-Team-Linking gemaess WP-02. Keine Schema-Aenderung, keine Admin-Repair-GUI. Zentralisiere gueltige Membership-Invarianten, entlooppe Recovery fuer fehlende Membership/TeamId, teste valid/repairable/broken States. Fuehre tsc, lint, relevante Online/Firebase Rules Tests und Multiplayer E2E aus.
```

## WP-03: Week Simulation Reload End-to-End absichern

Ziel:
- Ready -> Admin Simulation -> Results/Standings -> Reload ist nachweislich stabil.

Problem:
- Service-Tests sind gruen, aber Live-/Browser-Verifikation und doppelte Statusquellen bleiben Risiko.

Umfang:
- API-/Component-/E2E-Smoke fuer Admin Week Simulation.
- Reload-Assertions fuer Results, Standings, currentWeek.
- Doppelte Simulation und simulating/failed States pruefen.

Nicht-Ziele:
- Keine neue Simulation Engine.
- Kein Playoff.
- Keine Datenmodellmigration.

Betroffene Dateien:
- `src/lib/admin/online-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/app/api/admin/online/actions/route.ts`
- `src/components/admin/admin-league-detail.tsx`
- `src/lib/online/online-league-week-simulation.ts`
- `scripts/staging-admin-week-smoke.ts`

Akzeptanzkriterien:
- Bereits simulierte Woche wird nicht doppelt gezaehlt.
- Results/Standings bleiben nach Reload sichtbar.
- Fehlerfall erhoeht `currentWeek` nicht.
- Admin API gibt klare Fehlercodes.

Tests:
- Admin route tests.
- Online week simulation tests.
- Staging admin-week smoke.
- Optional Playwright Admin UI Smoke.

Risiken:
- Staging-Testliga kann bereits simuliert sein; Smoke muss idempotent oder auth-only koennen.

Aufwand:
- Mittel.

Codex-Prompt:

```text
Rolle: Senior Fullstack Simulation QA Engineer
Aufgabe: Sichere den Week-Simulation-End-to-End-Flow gemaess WP-03 ab. Fokus auf Tests/Smoke, Reload-Assertions und Fehlercodes. Keine Simulation-Engine-Aenderung. Pruefe Admin API, online-week-simulation, Admin UI Detail und staging-admin-week-smoke. Fuehre tsc, lint, relevante Vitest-Tests und Staging-Smoke falls Secrets verfuegbar aus.
```

## WP-04: Nicht-MVP Navigation reduzieren

Ziel:
- Spieler sieht im Multiplayer nur sinnvolle aktive Bereiche.

Problem:
- Contracts/Cap, Development, Trade Board, Inbox und Finance wirken wie Feature-Versprechen, sind aber nicht MVP.

Umfang:
- Nicht-MVP-Bereiche aus Hauptnavigation entfernen oder in "Spaeter" gruppieren.
- Coming-Soon Seiten beibehalten fuer direkte URLs.
- Sidebar Active/Disabled States testen.

Nicht-Ziele:
- Keine Backend-Aenderung.
- Keine neuen Feature-Implementierungen.

Betroffene Dateien:
- `src/components/layout/navigation-model.ts`
- `src/components/layout/sidebar-navigation.tsx`
- `src/components/online/online-league-coming-soon-model.ts`
- `src/app/online/league/[leagueId]/coming-soon/[feature]/page.tsx`

Akzeptanzkriterien:
- Core-Menue zeigt Dashboard, Spielablauf, Roster, Depth Chart, Team Overview, League, Draft, Savegames.
- Nicht-MVP-Direktlinks zeigen sauber Coming Soon.
- Keine 404s.
- Navigation ist per Tastatur erklaerbar.

Tests:
- `navigation-model.test.ts`
- Coming-Soon Model Tests.
- E2E Navigation.

Risiken:
- Nutzer koennen weniger Feature-Tiefe wahrnehmen.

Aufwand:
- Niedrig-Mittel.

Codex-Prompt:

```text
Rolle: Senior Product Frontend Engineer
Aufgabe: Reduziere Multiplayer-Navigation gemaess WP-04. Keine Backend- oder Feature-Logik. Nicht-MVP-Bereiche aus Hauptnavigation entfernen oder sauber gruppieren; Direkt-URLs muessen Coming Soon bleiben. Aktualisiere Navigation-Tests und fuehre tsc, lint, relevante Tests/E2E Navigation aus.
```

## WP-05: Admin Flow vereinfachen und sicherer machen

Ziel:
- Admin sieht klare Betriebsschritte und keine irrefuehrenden Aktionen.

Problem:
- Admin ist dicht, teilweise redundant und `Woche abschliessen` kann mit Simulation verwechselt werden.

Umfang:
- Admin als Utility visuell/inhaltlich reduzieren.
- Redundante Actions `Oeffnen`/`Details verwalten` klaeren.
- `Woche abschliessen` verstecken oder eindeutig umbenennen, wenn keine eigene Semantik.
- Native prompt/confirm fuer riskante GM-Tools mindestens dokumentieren oder durch kleine sichere Modals ersetzen, falls im Scope.

Nicht-Ziele:
- Keine neuen Admin-Actions.
- Keine destructive Action ohne Confirm.
- Keine Security-Guard-Aenderung.

Betroffene Dateien:
- `src/components/admin/admin-control-center.tsx`
- `src/components/admin/admin-league-manager.tsx`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/admin/admin-league-action-config.ts`

Akzeptanzkriterien:
- Admin-Hauptactions sind semantisch eindeutig.
- Kritische Aktionen haben klare Auswirkungsbeschreibung.
- Kein Button verkauft Simulation und Abschluss als zwei verschiedene Dinge, wenn es derselbe Pfad ist.

Tests:
- Admin Component/Model Tests.
- Admin route tests.
- Navigation E2E, falls stabil.

Risiken:
- Admin-Ops koennen sich an alten Buttonnamen orientieren.

Aufwand:
- Mittel.

Codex-Prompt:

```text
Rolle: Senior Admin UX/Safety Engineer
Aufgabe: Vereinfache den Admin Flow gemaess WP-05. Keine Security-Abschwaechung, keine neuen Admin-Actions. Klaere redundante Buttons, verstecke/benenne irrefuehrende Week-Actions, halte mutierende Actions serverseitig. Fuehre tsc, lint und relevante Admin-Tests aus.
```

## WP-06: Multiplayer State Machine Helper einfuehren

Ziel:
- UI und Admin API nutzen dieselben State-Invarianten.

Problem:
- `league.status`, `weekStatus`, `draft.status`, `ready`, locks und results koennen widerspruechlich kombiniert sein.

Umfang:
- Reine Helper fuer League/Draft/User-Team/Week States.
- Keine Firestore-Migration.
- UI-Guards und Admin Preconditions schrittweise darauf umstellen.

Nicht-Ziele:
- Kein neues Datenmodell.
- Keine Simulation-Engine-Aenderung.

Betroffene Dateien:
- `src/lib/online/*week*`
- `src/lib/online/*draft*`
- `src/components/online/online-league-detail-model.ts`
- `src/lib/admin/online-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`

Akzeptanzkriterien:
- Completed Draft schaltet Team/Roster frei.
- Active Draft sperrt Week Flow.
- Missing roster blockiert Simulation.
- Simulated week laesst keine doppelte Simulation zu.

Tests:
- Neue State Machine Unit Tests.
- Online Detail Model Tests.
- Admin Week Tests.

Risiken:
- Falsche Helper koennen viele UI-Sperren verschieben.

Aufwand:
- Mittel-Hoch.

Codex-Prompt:

```text
Rolle: Senior Game State Engineer
Aufgabe: Implementiere reine Multiplayer-State-Machine-Helper gemaess WP-06. Keine Schema-Aenderung. Definiere League/Draft/User-Team/Week Invarianten und nutze sie in UI-Models/Admin-Preconditions nur minimal. Tests fuer active draft, completed draft, roster_ready, missing roster, simulated week. Fuehre tsc, lint und relevante Vitest-Tests aus.
```

## WP-07: Firestore Read Metrics und Subscription Profile vorbereiten

Ziel:
- Firestore Reads/Re-Renders messbar machen, bevor Subscription-Split erfolgt.

Problem:
- `subscribeToLeague()` ist breit und teuer, aber Umbau ohne Messung ist riskant.

Umfang:
- Development-only Read/Emit Metrics.
- Dokumentation der Datenbereiche pro Route.
- Optional Feature Flag fuer Debug Logging.

Nicht-Ziele:
- Noch kein Subscription-Split.
- Keine Schema-Aenderung.

Betroffene Dateien:
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/server/repositories/firestoreUsageLogger.ts`
- `src/lib/observability/performance.ts`

Akzeptanzkriterien:
- Development kann Anzahl Snapshot-Reads pro Route sehen.
- Keine sensiblen Daten in Logs.
- Production Logs bleiben aus.

Tests:
- Observability/performance tests.
- Repository tests.

Risiken:
- Logging darf keine Kosten oder Secrets erzeugen.

Aufwand:
- Niedrig-Mittel.

Codex-Prompt:

```text
Rolle: Senior Firebase Performance Engineer
Aufgabe: Fuehre development-only Read/Emit-Metriken fuer subscribeToLeague gemaess WP-07 ein. Keine Subscription-Splits, keine Schema-Aenderung, keine sensiblen Daten loggen. Nutze bestehende Observability-Patterns. Fuehre tsc, lint und relevante Repository/Observability Tests aus.
```

## WP-08: Online-Service und Firebase Repository inkrementell schneiden

Ziel:
- Wartbarkeit verbessern, ohne Verhalten zu aendern.

Problem:
- Online-Service und Firebase Repository sind God-Module.

Umfang:
- Maximal 3-5 read-only Helper/Mapper pro Schritt extrahieren.
- Public APIs kompatibel halten.
- Importgrenzen verbessern.

Nicht-Ziele:
- Keine Firestore Write-Logik verschieben.
- Keine Transactions umbauen.
- Keine UI-Aenderung.

Betroffene Dateien:
- `src/lib/online/online-league-service.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/online-league-types.ts`
- Fachmodule Draft/Week/Contracts/Training nach Bedarf.

Akzeptanzkriterien:
- Weniger Runtime-Imports aus `online-league-service.ts`.
- Keine API-Breaks.
- Tests gruen.

Tests:
- `npm test -- --run`
- `npm run test:firebase:parity`
- relevante Online Tests.

Risiken:
- Zirkulaere Imports.
- Versehentliche Client-Bundle-Veraenderungen.

Aufwand:
- Mittel, wiederholbar.

Codex-Prompt:

```text
Rolle: Senior TypeScript Architecture Engineer
Aufgabe: Schneide in einem kleinen Schritt read-only Helper aus online-league-service/Firebase Repository gemaess WP-08. Maximal 3-5 Helper, keine Writes, keine Transactions, keine UI. Public APIs kompatibel halten, zirkulaere Imports vermeiden. Fuehre tsc, lint, firebase parity und relevante Online Tests aus.
```

## WP-09: Admin Claims und Rules-Adminmodell harmonisieren

Ziel:
- Admin-Zugriff ist serverseitig sicher und operativ eindeutig.

Problem:
- Admin API akzeptiert Claim oder UID-Allowlist; Firestore Rules akzeptieren nur Claim.

Umfang:
- Entscheidung dokumentieren oder implementieren:
  - kurzfristig API-Allowlist bleibt, Rules claim-only.
  - mittelfristig Custom Claims operationalisieren.
- Tests fuer 401/403/Admin UID/Custom Claim.
- Doku bereinigen, alte Admin-Code-Hinweise entfernen.

Nicht-Ziele:
- Keine neue Passwortloesung.
- Keine client-only Adminrechte.

Betroffene Dateien:
- `src/lib/admin/admin-claims.ts`
- `src/lib/admin/admin-action-guard.ts`
- `src/lib/admin/admin-uid-allowlist.ts`
- `firestore.rules`
- `scripts/set-admin.js`
- `docs/guides/*`

Akzeptanzkriterien:
- Nicht-Admin bleibt 403.
- Kein Token bleibt 401.
- Allowlisted UID/Admin Claim verhalten dokumentiert.
- Firestore Rules Tests erklaeren claim-only Admin.

Tests:
- Admin route tests.
- Firestore Rules tests.
- `scripts/set-admin.js --help`.

Risiken:
- Admin kann sich aussperren, wenn Claims nicht operationalisiert sind.

Aufwand:
- Mittel.

Codex-Prompt:

```text
Rolle: Senior Firebase/Auth Security Engineer
Aufgabe: Harmonisiere und dokumentiere Admin Claim/UID-Allowlist Modell gemaess WP-09. Keine Passwortloesung. Server/API muss sicher bleiben, Rules claim-only Entscheidung testen oder sauber dokumentieren. Bereinige widerspruechliche Doku. Fuehre tsc, lint, Admin route tests und Firestore Rules tests aus.
```

## WP-10: Production Access und Config verifizieren

Ziel:
- Production-Rollout wird sicher moeglich, ohne geratenen IDs.

Problem:
- Production-Projekt-ID und Backend-ID sind nicht verifiziert; `apphosting.yaml` ist staging.

Umfang:
- Production-Projekt und Backend read-only verifizieren.
- Separate Production-App-Hosting-Konfiguration planen/erstellen, falls Werte bekannt.
- Rollback-Runbook konkretisieren.
- Kein Deployment.

Nicht-Ziele:
- Kein Production Rollout.
- Keine Production Datenzugriffe.
- Keine Seeds.

Betroffene Dateien:
- `scripts/production-apphosting-preflight.mjs`
- `docs/reports/production-access-requirements.md`
- `apphosting.yaml`
- `firebase.json`
- ggf. neue Production Config Doku.

Akzeptanzkriterien:
- Production Projekt/Backend entweder verifiziert oder konkrete fehlende Rollen dokumentiert.
- Kein Rollout ausgefuehrt.
- Rollout Command nur als Entwurf nach Verifikation.

Tests:
- `npm run production:preflight:apphosting -- --help`
- read-only CLI Listen, falls Berechtigung vorhanden.

Risiken:
- IAM fehlt.

Aufwand:
- Niedrig-Mittel, haengt an Zugriff.

Codex-Prompt:

```text
Rolle: Senior DevOps Release Engineer
Aufgabe: Verifiziere Production Access und App Hosting Config gemaess WP-10, ohne Deployment. Nutze nur read-only Commands. Keine geratenen IDs. Dokumentiere sichtbare Projekte, Backend-ID, fehlende Rollen und Rollout-Command nur als Entwurf nach Verifikation. Keine Production-Datenzugriffe.
```
