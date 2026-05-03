# Findings Delta Analysis

Datum: 2026-05-02  
Basis: aktueller Arbeitsbaum in `/Users/lukashanzi/Documents/AFBM`  
Vergleichsbasis: `docs/reports/full-project-analysis/_scored-findings.md` mit 120 Findings

## Summary

Der reale Fortschritt ist **hoch im Multiplayer-Core-Loop**, aber nur **mittel über die gesamte Findings-Liste**.

Von 120 Findings sind nach aktuellem Code- und Teststand **24 vollständig gelöst**. Weitere **60 sind teilweise entschärft**, aber strukturell nicht abgeschlossen. **36 bleiben offen**. Es wurden keine klaren Regressionen gefunden.

Die wichtigsten Gewinne:
- Join/Rejoin, fehlende Memberships, Team-Zuordnung und stale `lastLeagueId` sind browserseitig abgesichert.
- Week-Simulation hat zentrale Preconditions, atomare Locks, TTL-Recovery und Duplicate-Blocker.
- `completedWeeks` wird als kanonische Week-Completion-Quelle behandelt; widersprüchliche Legacy-Signale werden erkannt.
- Ready-State blockiert inzwischen No-Team, No-Roster, unspielbare Roster, ungültige Depth Charts, laufende Simulationen und abgeschlossene Wochen.
- Draft-Picks laufen transaktional, mit Pick-Slot-, Player- und Source-Consistency-Prüfungen.
- Nicht-MVP-Multiplayer-Seiten werden stabil als Coming-Soon oder Fallback geroutet.

Die größten verbleibenden Risiken:
- `online-league-service.ts`, Firebase Repository und Admin Actions bleiben große, breit gekoppelte Module.
- Draft und Week haben weiterhin mehrere gespeicherte Signale. Konflikte werden erkannt, aber das Modell ist noch nicht wirklich schlank.
- User-Team-Link nutzt weiter mehrere Pfade: League Membership, globaler Mirror und Team-Felder.
- Staging/Production-Gates bleiben nicht vollständig grün, solange der Ziel-Commit nicht live über `/api/build-info` bestätigt und authentifiziert gesmoked wurde.
- Klassischer Prisma-E2E ist lokal blockiert, wenn PostgreSQL nicht läuft.

## Zahlenübersicht

| Status | Anzahl | Anteil |
|---|---:|---:|
| GELÖST | 24 | 20.0% |
| TEILWEISE | 60 | 50.0% |
| OFFEN | 36 | 30.0% |
| REGRESSION | 0 | 0.0% |
| Gesamt | 120 | 100% |

| Teilmenge | Gelöst | Gesamt | Anteil vollständig gelöst |
|---|---:|---:|---:|
| FIX NOW Findings | 14 | 22 | 63.6% |
| Core-Loop-Blocker | 14 | 20 | 70.0% |

Bewertung: Der Core Loop ist deutlich stabiler als zu Beginn. Die gesamte Codebase ist aber nicht 70% fertig; viele nicht-core Findings bleiben bewusst offen oder nur teilweise entschärft.

## Checks

| Command | Ergebnis | Notiz |
|---|---|---|
| `npx tsc --noEmit` | Grün | Keine TypeScript-Fehler. |
| `npm run lint` | Grün | ESLint ohne Fehler. |
| `npx vitest run src/lib/online src/lib/admin src/components/online src/components/admin src/components/layout` | Grün | 43 Testdateien, 329 Tests. Deckt Ready, Week, Draft, Admin, Route-State und Navigation ab. |
| `npm run test:firebase:parity` | Grün | 3 Tests. In Sandbox wegen Port-Binding rot, außerhalb mit Firestore Emulator grün. |
| `npm run test:e2e:multiplayer:firebase` | Grün | 4 Playwright-Tests. Deckt Join/Rejoin, Ready, Admin Week, Reload, No-Team/No-Roster-Routen ab. |
| `npm run test:e2e` | Rot | Erwarteter Preflight-Stopp: PostgreSQL auf `localhost:5432` nicht erreichbar. Kein Spielcode-Fehler, aber lokales Release-Gate bleibt infra-abhängig. |

## Kategorienanalyse

| Kategorie | Gesamt | GELÖST | TEILWEISE | OFFEN | REGRESSION | Größte Lücke |
|---|---:|---:|---:|---:|---:|---|
| Flow | 11 | 6 | 4 | 1 | 0 | Offline/Entry-Flows und GM-Fortschritt bleiben nicht vollständig glatt. |
| State | 15 | 8 | 7 | 0 | 0 | Konflikte werden erkannt, aber Draft/Week/User-Team-State bleiben verteilt. |
| Architektur | 31 | 1 | 13 | 17 | 0 | Große Monolithen und breite Kopplung bleiben das Hauptproblem. |
| Security | 12 | 3 | 8 | 1 | 0 | Admin-UID-Allowlist, Rules-Komplexität und Prod-Gates bleiben kritisch. |
| Performance | 15 | 0 | 10 | 5 | 0 | Einige Render-/Subscription-Risiken sind entschärft, aber nicht grundsätzlich gelöst. |
| Test | 15 | 5 | 7 | 3 | 0 | Firebase E2E ist besser; Prisma-E2E und Staging Smoke bleiben Gate-Risiken. |
| UI | 12 | 0 | 6 | 6 | 0 | Viele UX/UI-Themen sind gedämpft, aber nicht fertig produktisiert. |
| Scope | 9 | 1 | 5 | 3 | 0 | Nicht-MVP-Bereiche sind sichtbarer kontrolliert, aber Scope bleibt groß. |

## Reality Check

### Nur Symptome gefixt

- User-Team-Link: Rejoin und Mirror-Reparatur funktionieren besser, aber es gibt weiterhin mehrere gespeicherte Pfade, die auseinanderlaufen können.
- Week-State: `completedWeeks` ist kanonisch und Konflikte werden erkannt. Trotzdem existieren `weekStatus`, `lastSimulatedWeekKey`, `matchResults` und UI-Projektionen weiter.
- Draft-State: Transaktionen und Konfliktprüfungen sind stark verbessert. Draft Doc, Pick Docs, Available Players und Legacy-Draft-Blobs bleiben aber verteilt.
- Nicht-MVP UI: Coming-Soon/Fallbacks verhindern kaputte Seiten. Das ist Scope-Kontrolle, keine Feature-Fertigstellung.
- Prisma-E2E: Der Preflight gibt jetzt eine klare Meldung. Das ersetzt nicht eine lokal immer verfügbare DB.

### Strukturelle Schuld bleibt

- `src/lib/online/online-league-service.ts` ist weiter ein zentraler Monolith.
- `src/lib/admin/online-admin-actions.ts` bleibt breit und enthält mehrere Admin-Domänen.
- `src/lib/online/repositories/firebase-online-league-repository.ts` bündelt Join, Ready, Draft, Subscription und Firestore-Schreiblogik.
- UI-Model, Domain-Model und Persistence bleiben an vielen Stellen eng gekoppelt.
- Firestore Rules und Admin Guarding sind sicherer, aber schwer zu auditieren.

### Komplexität erhöht

- Locking, TTL-Recovery, Conflict Detection und Fallback-Routing erhöhen Robustheit, aber auch mentale Last.
- State-Normalisierung hilft der UI, erzeugt aber zusätzliche Derived-State-Ebenen.
- Testabdeckung ist besser, aber die Seed-/Emulator-/DB-Matrix ist komplexer geworden.

## Top 15 verbleibende Probleme

| Rang | Finding | Status | Impact | Warum wichtig |
|---:|---|---|---:|---|
| 1 | N036 - User-Team-Link hat mehrere Inkonsistenzstellen | TEILWEISE | 5 | Der Flow funktioniert besser, aber Membership, Mirror und Team-Felder bleiben mehrere Wahrheiten. |
| 2 | N048 - Draft State hat mehrere Race- und Truth-Risiken | TEILWEISE | 5 | Pick-Transaktionen sind stabiler, aber Draft State bleibt verteilt. |
| 3 | N086 - Draft Pick und Draft State können parallel kollidieren | TEILWEISE | 5 | Hauptpfade sind geschützt; Legacy-/Fallback-State bleibt Risiko. |
| 4 | N090 - Week Status hat doppelte Wahrheit | TEILWEISE | 5 | Konflikte werden erkannt, aber nicht alle Legacy-Signale sind verschwunden. |
| 5 | N041 - GM-Fortschritt hängt stark vom Admin Week Flow ab | TEILWEISE | 5 | Der Spieler-Core-Loop endet weiterhin faktisch beim Admin-gesteuerten Advance. |
| 6 | N028 - Adminzugriff hat Claim-/UID-Allowlist-Komplexität | TEILWEISE | 4 | Kurzfristig praktikabel, aber Sicherheitsmodell ist zweigleisig. |
| 7 | N054 - Admin-Aktionen können versehentlich datenverändernd sein | TEILWEISE | 4 | Confirm/Guards helfen, aber Admin Surface bleibt groß und gefährlich. |
| 8 | N092 - Admin-/Repair-Scripts können Multiplayer-State verändern | TEILWEISE | 4 | Guards existieren, aber Scripts bleiben produktionsnah riskant. |
| 9 | N119 - Firestore Rules sind komplex und clientseitig restriktiv | TEILWEISE | 4 | Rules sind testbarer, aber schwer vollständig zu validieren. |
| 10 | N002 - Online League Service ist zentraler Monolith | TEILWEISE | 4 | Refactors haben nur kleine Schnitte gemacht; Risiko bleibt hoch. |
| 11 | N004 - `simulateMatch` ist sehr lang und schwer testbar | OFFEN | 4 | Engine bleibt Wartbarkeitsrisiko, auch wenn Multiplayer-Adapter funktionieren. |
| 12 | N005 - Online League Placeholder ist große Client-Orchestrator-Komponente | TEILWEISE | 4 | Handler wurden teils extrahiert, aber Komponente bleibt breit. |
| 13 | N006 - Admin League Detail ist große, schwer reviewbare Komponente | TEILWEISE | 4 | Display-Splits helfen, aber Admin-Seite bleibt schwer. |
| 14 | N007 - Admin Online Actions sind zu breit | TEILWEISE | 4 | Service hat Tests und Guards, aber sehr viele Verantwortlichkeiten. |
| 15 | N017 - Firestore Rules enthalten offene TODOs | TEILWEISE | 4 | Rules-Risiko bleibt bis vollständige Rule-Testmatrix steht. |

## Vollständige Neubewertung aller 120 Findings

| Finding | Status | Kurzbegründung | Code-/Test-Bezug |
|---|---|---|---|
| N001 - Codebase ist quantitativ gross | TEILWEISE | Einige Reports und kleine Refactors existieren, Gesamtgröße bleibt hoch. | `docs/reports/final-refactor-evaluation.md`, `src/lib/online/online-league-service.ts` |
| N002 - Online League Service ist zentraler Monolith | TEILWEISE | Helper wurden ausgelagert, aber Service bleibt mehrere Tausend Zeilen und zentraler Runtime-Hub. | `src/lib/online/online-league-service.ts`, `src/lib/online/*service*.test.ts` |
| N003 - Game Engine Dateien sind sehr gross | OFFEN | Kein aktueller Umbau der Engine; bewusst nicht angefasst. | `src/lib/game`, keine neuen Engine-Refactor-Tests |
| N004 - `simulateMatch` ist sehr lang und schwer testbar | OFFEN | Multiplayer nutzt Adapter/Fallbacks, aber die Funktion selbst wurde nicht verkleinert. | `src/lib/game`, `src/lib/online/online-game-simulation.test.ts` |
| N005 - Online League Placeholder ist grosse Client-Orchestrator-Komponente | TEILWEISE | Einige Handler/Models sind extrahiert, JSX/State/Actions bleiben breit gemischt. | `src/components/online/online-league-placeholder.tsx`, `use-online-league-placeholder-actions.ts` |
| N006 - Admin League Detail ist grosse, schwer reviewbare Komponente | TEILWEISE | Display-Komponenten wurden teils extrahiert, destruktive und administrative Logik bleibt schwer. | `src/components/admin/admin-league-detail.tsx`, `src/components/admin/*` |
| N007 - Admin Online Actions sind zu breit | TEILWEISE | Guards, Audit Logs und Tests sind besser; Action-Service bleibt breit. | `src/lib/admin/online-admin-actions.ts`, `src/lib/admin/online-admin-actions.test.ts` |
| N008 - `MemoryStorage` Test-Fixtures sind dupliziert | OFFEN | Keine dedizierte Fixture-Konsolidierung erkennbar. | `src/lib/online/*.test.ts` |
| N009 - League-/GM-Testsetup ist dupliziert | TEILWEISE | E2E-Seeds sind stabiler, Unit-Fixtures bleiben mehrfach lokal dupliziert. | `scripts/seeds/multiplayer-e2e-firestore-seed.ts`, `src/lib/online/*.test.ts` |
| N010 - Server-Action-Feedback-Logik ist dupliziert | OFFEN | Kein gezielter Feedback-Utility-Schnitt nachweisbar. | `src/lib/admin`, `src/components/admin` |
| N011 - Player-Seed-Mapping-Logik ist dupliziert | TEILWEISE | Seed-/validation scripts sind sicherer, Mapping-Duplizierung bleibt nicht grundsätzlich entfernt. | `scripts/seeds/*multiplayer*` |
| N012 - QA-Report-Rendering-Logik ist dupliziert | OFFEN | Berichtserzeugung blieb dokumentationslastig, keine Konsolidierung. | `docs/reports/*`, `scripts/*report*` |
| N013 - Admin-/Online-Statuskarten sind ähnlich implementiert | TEILWEISE | Modelle wurden stabilisiert, aber UI-Pattern nicht vereinheitlicht. | `src/components/admin`, `src/components/online` |
| N014 - Viele ungenutzte Export-Kandidaten | OFFEN | Keine vollständige Dead-Export-Bereinigung im aktuellen Scope. | `docs/reports/codebase-*`, `src/lib/**` |
| N015 - TODO/FIXME/HACK-Hinweise sind vorhanden | OFFEN | Kein systematischer TODO-Abbau. | `rg -n "TODO|FIXME|HACK"` |
| N016 - Viele `console.*`-Vorkommen | OFFEN | Teilweise bewusst für Audit/Conflict Logs genutzt, aber nicht zentralisiert. | `src/lib/admin`, `src/lib/online` |
| N017 - Firestore Rules enthalten offene TODOs | TEILWEISE | Rules wurden getestet/gehärtet, vollständige Security-Testmatrix fehlt. | `firestore.rules`, `npm run test:firebase:parity` |
| N018 - `team.types` ist ein Kopplungshotspot | OFFEN | Kein gezielter Type-Split im aktuellen Scope. | `src/lib/team*`, `src/types` |
| N019 - Shared Enums sind stark gekoppelt | OFFEN | Keine strukturelle Entkopplung erfolgt. | `src/lib/**/types.ts` |
| N020 - Format-Utilities sind stark gekoppelt | OFFEN | Kein dedizierter Format-Layer-Refactor. | `src/lib/**format**`, `src/components/**` |
| N021 - StatusBadge ist breit verwendet | OFFEN | Shared-UI-Nutzung bleibt unverändert; kein Problemfix erforderlich, aber Finding offen. | `src/components/**/status*` |
| N022 - Session/Auth ist breit gekoppelt | TEILWEISE | Auth UI und admin guards besser, aber Session bleibt breiter Einflussfaktor. | `src/lib/online/auth`, `src/components/admin/admin-auth-gate.tsx` |
| N023 - Online League Types sind breit verwendet | TEILWEISE | Type-only imports wurden teils entkoppelt, zentrale Typdateien bleiben breit. | `src/lib/online/online-league-types.ts`, `src/lib/online/types.ts` |
| N024 - SectionPanel ist breit verwendet | OFFEN | Keine Änderung; wahrscheinlich akzeptables Primitive, aber Finding nicht gelöst. | `src/components/**` |
| N025 - StatCard ist breit verwendet | OFFEN | Keine Änderung; wahrscheinlich akzeptables Primitive, aber Finding nicht gelöst. | `src/components/**` |
| N026 - Seeded RNG ist breit gekoppelt | OFFEN | Keine gezielte Entkopplung. | `src/lib/**seed**`, `scripts/seeds/**` |
| N027 - Firebase Admin ist breit gekoppelt | TEILWEISE | Client-Bundle-Importfehler wurde behoben; Server-Kopplung bleibt. | `src/lib/admin/admin-uid-allowlist.ts`, `src/lib/firebase/admin.ts` |
| N028 - Adminzugriff hat Claim-/UID-Allowlist-Komplexität | TEILWEISE | Claim oder UID-Allowlist funktioniert, bleibt aber zweigleisiges Sicherheitsmodell. | `src/lib/admin/admin-action-guard.ts`, `src/lib/admin/admin-uid-allowlist.ts` |
| N029 - Logout-Recovery muss Online-Kontext bereinigen | TEILWEISE | Auth UI/Context-Recovery verbessert, aber nicht als eigener E2E-Gate voll bewiesen. | `src/lib/online/error-recovery.ts`, `src/components/savegames` |
| N030 - Offline Flow wirkt trotz Name auth-/account-gebunden | OFFEN | Multiplayer-Fokus; Offline UX nicht neu validiert. | `src/components/savegames`, `e2e/smoke.spec.ts` blockiert durch DB |
| N031 - Löschaktionen nutzen native Confirm-Dialoge | OFFEN | Bewusst nicht umgebaut. | `src/components/admin`, `src/components/savegames` |
| N032 - Admin Eingaben nutzen native Prompts | OFFEN | Keine gezielte Admin-Prompt-UX-Änderung. | `src/components/admin` |
| N033 - Online Join/Rejoin hat viele versteckte Abhängigkeiten | GELÖST | Join/Rejoin ist getestet; stale `lastLeagueId` und Membership-Recovery sind abgedeckt. | `e2e/multiplayer-firebase.spec.ts`, `firebase-online-league-repository.test.ts` |
| N034 - Fehlende Membership kann Nutzer in Schleifen führen | GELÖST | Missing/stale Memberships führen zu erklärten Fallbacks statt harter Schleife. | `online-league-route-state-model.test.ts`, Firebase E2E |
| N035 - Fehlende Team-Zuordnung blockiert Multiplayer | GELÖST | No-Team-State wird sauber erkannt und geroutet. | `online-league-detail-model.test.ts`, `e2e/multiplayer-firebase.spec.ts` |
| N036 - User-Team-Link hat mehrere Inkonsistenzstellen | TEILWEISE | Flow ist stabiler, aber Membership, globaler Mirror und Team-Felder bleiben mehrere Pfade. | `firebase-online-league-repository.ts`, `online-league-repository.test.ts` |
| N037 - Globaler League Member Mirror ist doppelte Source of Truth | TEILWEISE | Mirror-Reparatur/Detection existiert; Struktur bleibt doppelt. | `createLeagueMemberMirrorFromMembership`, repository tests |
| N038 - Team Assignment kann Race Conditions erzeugen | GELÖST | Join/Team assignment nutzt Transaktionen/idempotente Rejoin-Logik; E2E deckt unabhängige User ab. | `firebase-online-league-repository.test.ts`, `e2e/multiplayer-firebase.spec.ts` |
| N039 - Ready-State braucht konsistente Persistenz und Anzeige | GELÖST | Ready wird zentral validiert und blockiert No-Team, No-Roster, invalid roster/depth, simulation und completed week. | `online-league-week-service.ts`, `online-league-week-service.test.ts` |
| N040 - Admin Week Actions sind semantisch unklar | TEILWEISE | Admin Week Flow ist besser beschriftet und getestet, aber Admin UI bleibt breit. | `admin-league-action-config.test.ts`, `admin-league-detail.tsx` |
| N041 - GM-Fortschritt hängt stark vom Admin Week Flow ab | TEILWEISE | Simulation funktioniert, bleibt aber adminzentriert und damit produktseitig abhängig. | `online-admin-actions.ts`, `e2e/multiplayer-firebase.spec.ts` |
| N042 - Nicht-MVP Sidebar-Features sind Coming Soon | OFFEN | Coming-Soon ist technisch gelöst, aber Scope-Finding bleibt produktseitig nicht vollständig entschieden. | `online-league-coming-soon-page.tsx`, route fallback tests |
| N043 - Offline Nebenfeatures sind unvollständig | OFFEN | Nicht im Multiplayer-Fixscope bearbeitet. | `src/app/app/savegames`, Prisma E2E blockiert lokal |
| N044 - Draft MVP ist begrenzt | TEILWEISE | Draft ist stabiler, aber weiterhin kein vollständiges Product-Draft-Erlebnis. | `online-fantasy-draft-room.tsx`, draft tests |
| N045 - Active Draft darf nicht automatisch Fullscreen öffnen | GELÖST | Draft-Route ist explizit; Dashboard zeigt Status statt Auto-Redirect. | `online-league-app-shell.tsx`, `online-league-dashboard-panels.test.tsx` |
| N046 - Active Draft kann andere Bereiche blockierend wirken lassen | GELÖST | Active Draft bleibt Status, nicht globale Zwangsnavigation; Ready bleibt bewusst blockiert. | `online-league-lifecycle.test.ts`, dashboard panel tests |
| N047 - Completed Draft braucht klare Statusdarstellung | TEILWEISE | Statusdarstellung existiert, aber Draft/League Lifecycle bleibt komplex. | `online-league-draft-page.tsx`, `online-league-detail-model.test.ts` |
| N048 - Draft State hat mehrere Race- und Truth-Risiken | TEILWEISE | Transaktionen und Inkonsistenzprüfung existieren; mehrere Draft-Quellen bleiben. | `multiplayer-draft-logic.ts`, `fantasy-draft-service.test.ts` |
| N049 - Online Navigation mischt Hashes und Routen | TEILWEISE | Multiplayer-Unterseiten/Fallbacks sind stabil, aber alte Panel-/Hash-Nutzung ist nicht komplett eliminiert. | `online-league-route-fallback-model.ts`, E2E direct routes |
| N050 - Statuskarten erzeugen visuelle Konkurrenz | OFFEN | Kein reiner Visual-Refactor durchgeführt. | `online-league-overview-sections.tsx` |
| N051 - Terminologie ist inkonsistent | OFFEN | Keine vollständige Copy-/Terminologie-Runde. | `src/components/**` |
| N052 - First-Time und Returning Player Einstieg sind nicht eindeutig | TEILWEISE | Savegames/Online Hub wurden verbessert, aber klassischer E2E ist DB-blockiert. | `docs/reports/savegames-functionality-report.md`, Prisma E2E preflight |
| N053 - Admin UI ist überladen | TEILWEISE | Actions gruppierter, aber Admin Detail bleibt vielschichtig. | `admin-league-detail.tsx`, `admin-league-action-config.test.ts` |
| N054 - Admin-Aktionen können versehentlich datenverändernd sein | TEILWEISE | Guards/Audit/Confirm sind besser, aber Admin Surface bleibt riskant. | `online-admin-actions.ts`, security audit logs in E2E |
| N055 - Zwei Architekturmodelle laufen parallel | OFFEN | Singleplayer/Multiplayer/Prisma/Firebase bleiben parallel. | `src/lib`, `src/server`, repositories |
| N056 - Multiplayer UI, State und Persistence sind eng gekoppelt | TEILWEISE | Route-State und models helfen, aber UI/Repo/State bleiben eng verbunden. | `online-league-route-state.tsx`, `online-league-placeholder.tsx` |
| N057 - Firebase Online Repository ist zu breit | TEILWEISE | Tests und helper existieren, aber Repository bleibt Join/Ready/Draft/Subscription-Knoten. | `firebase-online-league-repository.ts` |
| N058 - Firebase Admin darf nicht in Client Bundles gelangen | GELÖST | Client-safe UID allowlist trennt Firebase Admin SDK vom Client. | `admin-uid-allowlist.ts`, build/lint/typecheck grün |
| N059 - UI importiert Domain- und Application-Typen breit | OFFEN | Keine vollständige Import-Grenzen-Bereinigung. | `src/components/online`, `src/lib/online` |
| N060 - Application Services importieren UI-Modelle | OFFEN | Keine vollständige Layer-Bereinigung. | `src/lib/**`, `src/components/**` |
| N061 - Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten | GELÖST | Online Game Adapter erzeugt plausible Ergebnisse und Fehler statt Fake-Erfolg. | `online-game-simulation.ts`, `online-game-simulation.test.ts` |
| N062 - Admin `Details verwalten` und `Öffnen` sind redundant | TEILWEISE | Labels/Flow wurden vereinfacht, aber Admin-Actions bleiben nicht vollständig neu designt. | `admin-league-manager.tsx`, `admin-league-detail.tsx` |
| N063 - Firebase Multiplayer Training ist nur eingeschränkt | OFFEN | Bewusst nicht MVP-relevant und nicht umgesetzt. | `training-system.test.ts`, online placeholder |
| N064 - Admin Draft Status ist nur ein Hinweisbereich | TEILWEISE | Draftstatus wird klarer angezeigt; kein vollständiges Admin-Draft-Tool. | `multiplayer-firebase-mvp-actions.ts`, admin UI |
| N065 - Auth Debug ist technisch formuliert | OFFEN | Debug-Copy nicht umfassend produktisiert. | `admin-auth-gate.tsx`, admin debug panels |
| N066 - Dashboard kann überladen wirken | TEILWEISE | Core Loop stärker priorisiert, aber Dashboard bleibt informationsreich. | `online-league-overview-sections.tsx`, dashboard tests |
| N067 - Team Management braucht klare No-Team- und No-Roster-Zustände | GELÖST | Direct URLs mit No-Team, stale Team und No-Roster recovern sauber; Ready blockiert no roster. | `e2e/multiplayer-firebase.spec.ts`, `online-league-week-service.test.ts` |
| N068 - Week Simulation braucht gültigen Schedule | GELÖST | Preconditions blockieren fehlenden/ungültigen Schedule. | `online-week-simulation.ts`, `online-week-simulation.test.ts` |
| N069 - Week Simulation braucht vorhandene Teams | GELÖST | Preconditions prüfen Teams und spielbare Roster. | `online-week-simulation.ts`, admin tests |
| N070 - Online League Route Bundle ist gross | TEILWEISE | Einige Imports/Components sind entschärft, aber Route bleibt groß. | `online-league-placeholder.tsx`, bundle reports |
| N071 - Online Draft Route Bundle ist gross | TEILWEISE | Draft Room hat Memoization/Virtual Window, Bundle bleibt substantiell. | `online-fantasy-draft-room.tsx`, model tests |
| N072 - Admin Route Bundle ist gross | TEILWEISE | Display-Komponenten helfen, aber Admin Route bleibt groß. | `admin-league-detail.tsx` |
| N073 - Savegames Route Bundle ist gross | TEILWEISE | UX wurde verbessert, Bundle nicht gezielt reduziert. | `src/components/savegames` |
| N074 - Wenige dynamische Imports | OFFEN | Keine gezielte Dynamic-Import-Strategie umgesetzt. | `next build`/bundle reports |
| N075 - `subscribeToLeague` liest zu viele Datenbereiche | TEILWEISE | Read-only Helper/Subscription-Splits existieren, API bleibt breit. | `firebase-online-league-repository.ts`, `subscribeToLeague` |
| N076 - Lobby-/Teamreads können N+1 erzeugen | OFFEN | Keine Query-/Read-Optimierung als Beleg. | Firebase repository |
| N077 - Events werden breit reloadet | OFFEN | Keine dedizierte Event-Pagination/Windowing-Lösung. | `online-league-service.ts`, repository |
| N078 - League Document kann stark wachsen | TEILWEISE | Draft/Week Subcollections helfen, aber Legacy und large document risks bleiben. | `online-league-types.ts`, Firestore mapper |
| N079 - Firestore Reads/Writes sind Kostenrisiko | OFFEN | Keine Kostenmessung oder Query-Budgetierung umgesetzt. | `firebase-online-league-repository.ts` |
| N080 - Route-Bundles können weiter wachsen | OFFEN | Kein dauerhaftes Bundle Gate. | `package.json`, Next build reports |
| N081 - Online Detail Models berechnen mehrfach | TEILWEISE | Einige derived helpers/tests existieren, aber Modell bleibt groß. | `online-league-detail-model.ts`, model tests |
| N082 - Standings-Fallback scannt Results | TEILWEISE | Standings werden persistiert/aktualisiert, Fallback-Pfade bleiben. | `online-league-week-simulation.ts`, standings tests |
| N083 - Draft Room sortiert gesamten Spielerpool | TEILWEISE | Memoized derived data und windowing entschärfen Renderkosten. | `online-fantasy-draft-room.tsx`, model tests |
| N084 - Roster-/Depth-Listen sind nicht breit virtualisiert | TEILWEISE | Virtualisierung nur selektiv, nicht flächendeckend. | `use-virtual-table-window.ts`, Draft Room |
| N085 - Stale `lastLeagueId` kann Nutzer blockieren | GELÖST | Stale league flow wird bereinigt und führt zurück zum Hub/Fallback. | `error-recovery.ts`, `online-continue-model.test.ts`, E2E |
| N086 - Draft Pick und Draft State können parallel kollidieren | TEILWEISE | Transaction guards und same-slot/player checks existieren; distributed state bleibt. | `firebase-online-league-repository.ts`, `fantasy-draft-service.test.ts` |
| N087 - Week Simulation kann doppelt oder parallel laufen | GELÖST | Lock, TTL-Recovery und idempotent duplicate blocking sind getestet. | `online-week-simulation.ts`, `online-week-simulation.test.ts`, admin E2E |
| N088 - Multiplayer hat viele parallele Statusfelder | TEILWEISE | Lifecycle-Normalisierung existiert, gespeicherte Felder bleiben zahlreich. | `online-league-lifecycle.ts`, lifecycle tests |
| N089 - Zentrale Online State Machine fehlt | TEILWEISE | Kleine Lifecycle-Normalisierung statt echter State Machine; akzeptiert, aber nicht vollständig. | `online-league-lifecycle.ts` |
| N090 - Week Status hat doppelte Wahrheit | TEILWEISE | `completedWeeks` ist kanonisch und Konflikte werden gemeldet; Legacy-Felder bleiben. | `online-league-week-simulation.ts`, conflict tests |
| N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen | GELÖST | Simulation schreibt Results/Standings/completedWeeks atomar, Week Advance erst danach. | `online-admin-actions.ts`, week simulation tests |
| N092 - Admin-/Repair-Scripts können Multiplayer-State verändern | TEILWEISE | Staging/confirm guards vorhanden, aber Scripts bleiben riskante Operationsfläche. | `scripts/seeds/*`, admin reports |
| N093 - Ready während Simulation ist Race-Risiko | GELÖST | Ready writes prüfen simulating lock/status und completed week. | `firebase-online-league-repository.ts`, repository tests |
| N094 - Core Loop ist dokumentiert, aber eng | TEILWEISE | Core Loop klarer, aber spielerischer Umfang weiterhin knapp. | `phase-2-playable-plan.md`, MVP reports |
| N095 - Adminmodus ist für normale Spieler zu prominent | TEILWEISE | Adminzugriff ist gated; UI-Scope bleibt sichtbar. | `admin-auth-gate.tsx`, savegames/admin links |
| N096 - Redundante Admin Actions konkurrieren sichtbar | OFFEN | Einige Labels verbessert, aber Admin-Oberfläche nicht grundsätzlich reduziert. | `src/components/admin` |
| N097 - Nicht-MVP-Features dürfen nicht aktiv konkurrieren | TEILWEISE | Coming-Soon reduziert kaputte Aktivität, aber Feature-Scope bleibt sichtbar. | Coming-Soon route/tests |
| N098 - MVP-Zustand ist Gelb | TEILWEISE | Core Loop besser, Production und Gesamtcode bleiben nicht grün. | dieser Report, final audit v2 |
| N099 - Multiplayer Acceptance und UX-Audit widersprechen sich | GELÖST | QA-Gates und No-Go-Regeln wurden klarer dokumentiert. | `docs/reports/full-project-analysis/10-work-packages`, gate docs |
| N100 - Vitest Suite ist vorhanden und umfangreich | GELÖST | Relevante Suites laufen grün mit 329 Tests. | aktueller Vitest-Run |
| N101 - E2E scheitert lokal an DB-Verbindung | TEILWEISE | Preflight erklärt Fix klar, aber ohne laufendes PostgreSQL bleibt Gate rot. | `scripts/tools/e2e-preflight.mjs`, `npm run test:e2e` |
| N102 - Firebase Parity braucht Emulator-Portbindung | TEILWEISE | Test läuft grün außerhalb Sandbox, bleibt infra-/portabhängig. | `npm run test:firebase:parity` |
| N103 - Authentifizierter Staging Smoke fehlt als bestätigtes Gate | TEILWEISE | Smoke-Script existiert, aber Ziel-Commit-Staging-Verifikation ist aktuell nicht durchgehend grün. | `docs/reports/staging-smoke-final-gate.md`, `/api/build-info` Thema |
| N104 - Multiplayer GM Rejoin Browser-Test fehlt | GELÖST | Firebase E2E deckt GM Rejoin/Reload ab. | `e2e/multiplayer-firebase.spec.ts` |
| N105 - Admin Week E2E Reload-Test fehlt | GELÖST | Firebase E2E simuliert Admin Week, Reload, Results und Duplicate-Block. | `e2e/multiplayer-firebase.spec.ts` |
| N106 - Tests für parallele Multiplayer-Aktionen fehlen | TEILWEISE | Draft, Ready und Week Paralleltests existieren; Join-Concurrency bleibt nicht vollständig breit. | `online-league-service.test.ts`, draft/admin tests |
| N107 - Firestore Rules Tests für Admin fehlen | TEILWEISE | Parity/Rules werden benutzt, aber Admin Rules-Matrix ist nicht komplett. | `firestore.rules`, parity tests |
| N108 - Sidebar/Coming-Soon Browser-Test fehlt | GELÖST | E2E deckt Coming-Soon und Direct URL Recovery ab. | `e2e/multiplayer-firebase.spec.ts` |
| N109 - Seed/Reset Emulator-Integration fehlt | TEILWEISE | E2E-Firestore-Seed ist idempotent/stabiler, allgemeine Seed-Matrix bleibt groß. | `scripts/seeds/multiplayer-e2e-firestore-seed.ts` |
| N110 - Savegames Offline Flow mit DB ist nicht ausreichend getestet | OFFEN | Klassischer Prisma-E2E läuft ohne DB nicht. | `npm run test:e2e` Preflight rot |
| N111 - A11y/Mobile Smoke fehlt | OFFEN | Kein aktuelles A11y/Mobile-Gate ausgeführt. | keine passenden aktuellen Checks |
| N112 - QA-Grün und E2E-Rot widersprechen sich | GELÖST | Reports und Gates trennen Unit, Firebase E2E, Prisma E2E und Staging klarer. | QA/Gate Reports, aktueller Check-Abschnitt |
| N113 - Env-Dateien existieren lokal und müssen ignoriert bleiben | TEILWEISE | Secret-Checks/Ignore-Regeln vorhanden, aber lokale Env bleibt Operationsrisiko. | `.gitignore`, release reports |
| N114 - Public Firebase API Key kommt in Config/Scripts vor | GELÖST | Als Public Web Config bewertet; keine Secrets ausgegeben. | package scripts, security reports |
| N115 - Runtime Guards schützen Umgebungen | GELÖST | Staging/seed/admin guards existieren und blockieren unsichere Modi. | seed/admin scripts, reports |
| N116 - Production Firestore kann per Flag aktiviert werden | TEILWEISE | Guards vorhanden, aber Produktionszugriff und IDs sind weiterhin No-Go bis verifiziert. | `docs/reports/production-access-requirements.md` |
| N117 - Production App Hosting Ziel ist nicht verifiziert | OFFEN | Kein verifiziertes Production Project/Backend im aktuellen Audit. | production access reports |
| N118 - Staging Smoke kann an IAM `signJwt` scheitern | TEILWEISE | Login/ID-token Wege dokumentiert, aber Live-Staging-Gate bleibt infra-abhängig. | staging smoke reports/scripts |
| N119 - Firestore Rules sind komplex und clientseitig restriktiv | TEILWEISE | Rules verhindern Cross-user writes im E2E, aber Komplexität bleibt hoch. | `firestore.rules`, Firebase E2E permission-denied checks |
| N120 - Dokumentation und Reports können stale werden | TEILWEISE | Viele Reports aktualisiert, aber Reportmenge selbst ist Drift-Risiko. | `docs/reports/**` |

## Fazit

Das System ist gegenüber dem Startzustand **deutlich näher an einem spielbaren Multiplayer-MVP**. Für den Kernloop `Lobby -> Draft -> Ready -> Simulation -> Ergebnis` ist der Fortschritt **hoch**: 70% der ursprünglichen Core-Loop-Blocker sind vollständig gelöst, die übrigen sind überwiegend strukturelle Restschulden statt akute Happy-Path-Blocker.

Für **Production Ready** reicht das nicht. Der Abstand zu Production ist weiterhin spürbar:
- Staging muss für den Ziel-Commit live und authentifiziert grün sein.
- Production-Projekt/Backend bleiben No-Go, solange nicht verifiziert.
- Prisma-E2E braucht reproduzierbare lokale DB oder ein nicht-blockierendes Gate-Modell.
- Die größten Architekturmonolithen bleiben echte Änderungsrisiken.

Entscheidung:
- Internal MVP: **Go mit Einschränkungen**
- Staging QA: **Go, wenn Ziel-Commit live bestätigt ist**
- Production: **No-Go**

