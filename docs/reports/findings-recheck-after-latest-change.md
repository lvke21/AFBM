# Findings Recheck After Latest Change

Stand: 2026-05-02 23:00 Europe/Zurich

Grundlage:
- `docs/reports/full-project-analysis/_scored-findings.md`
- `docs/reports/full-project-analysis/master-findings-table.md`
- `docs/reports/work-package-status.md`
- aktueller Codezustand und die unten dokumentierten Checks

Bewertungsregel: Alte DONE/OPEN-Werte wurden nicht uebernommen. Status wurde aus aktuellem Code, Tests, Scripts und live ausgefuehrten Gates abgeleitet.

## Executive Summary

Die letzte Draft-Haertung hat die wichtigsten Draft-Widersprueche sichtbar gemacht: Pick Docs, Available-Player Docs, Legacy Blob, completed Draft Cursor und fehlende Pick Docs werden jetzt mit Tests als Hard-Fail oder explizite Kompatibilitaetsausnahme abgedeckt. Zusaetzlich ist der fruehere Staging-404 nicht mehr aktuell: `/api/build-info` auf Staging liefert HTTP 200 und Commit `1a28d88eaaa99a182612638652d0165705ce6901`; der authentifizierte Staging Admin Week Smoke ist fuer diesen Commit gruen.

Trotzdem ist der Stand kein Production-Go. Die groessten Restluecken liegen nicht mehr beim Draft-Gate selbst, sondern bei formaler Lifecycle-State-Maschine, Membership-Projektionsabschluss, Production-Preflight, Architektur-Monolithen, Performance-Budgets und fehlenden Browser-/Concurrency-E2E-Gates.

## Check-Ergebnisse

| Check | Ergebnis | Befund |
|---|---:|---|
| `npx vitest run src/app/api/build-info/route.test.ts src/lib/online/fantasy-draft-service.test.ts src/lib/online/multiplayer-draft-logic.test.ts src/lib/online/repositories/online-league-repository.test.ts src/lib/online/online-league-week-service.test.ts src/lib/online/online-league-week-simulation.test.ts src/lib/admin src/components/online/online-league-detail-model.test.ts src/components/online/online-league-route-state-model.test.ts src/components/online/online-league-route-fallback-model.test.ts src/components/online/online-league-coming-soon-model.test.ts src/components/layout/navigation-model.test.ts src/lib/observability/performance.test.ts` | Gruen | 17 Testdateien, 172 Tests. |
| `npx tsc --noEmit` | Gruen | Keine TypeScript-Fehler. |
| `npm run lint` | Gruen | ESLint Exit-Code 0. |
| `npm run build` | Gruen | Next Build enthaelt `ƒ /api/build-info`; Online League Route First Load JS 301 kB, Draft 284 kB, Admin 270/273 kB. |
| `npm run test:firebase:rules` | Gruen ausserhalb Sandbox | 22 Rules-Tests. In Sandbox blockiert Portbindung mit EPERM, ausserhalb OK. |
| `npm run test:firebase:parity` | Gruen ausserhalb Sandbox | 3 Parity-Tests. In Sandbox waere Emulator-Portbindung eingeschraenkt. |
| `npm run db:up` | Gruen ausserhalb Sandbox | PostgreSQL auf `127.0.0.1:5432`, DB `afbm_manager` vorhanden. |
| `npm run test:e2e:preflight` | Gruen ausserhalb Sandbox | Port 3100 frei, Chromium vorhanden, DB erreichbar. |
| `npm run test:e2e` | Gruen ausserhalb Sandbox | Prisma/Playwright Smoke: 1 Test bestanden. |
| Staging `/api/build-info` | Gruen | HTTP 200, Commit `1a28d88eaaa99a182612638652d0165705ce6901`, Revision `afbm-staging-backend-build-2026-05-02-007`. |
| `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league --expected-commit 1a28d88eaaa99a182612638652d0165705ce6901` | Gruen | Commit-Gate, IAM sign-jwt Auth, Admin Auth, Ready, Simulation Woche 6 -> 7, Reload OK. |
| `npm run production:preflight:apphosting` | Rot erwartet | `Production project id is required`; Production nicht bewertet/freigegeben. |

## Statuszahlen

| Status | Anzahl |
|---|---:|
| GELÖST | 39 |
| TEILWEISE | 52 |
| OFFEN | 29 |
| REGRESSION | 0 |

Geloester Anteil: 32.5%.

Offene/teilweise FIX-NOW Findings: 7 von 22 (`N033`, `N036`, `N037`, `N041`, `N061`, `N088`, `N089`).

Offene/teilweise Core-Loop-Blocker: 5 (`N033`, `N036`, `N041`, `N061`, `N088`).

## Tabelle aller 120 Findings

| Finding | Status | Begruendung | Code-/Test-Bezug |
|---|---|---|---|
| N001 Codebase ist quantitativ gross | OFFEN | Gesamtgroesse bleibt hoch; kein Abbauziel erreicht. | `wc -l src/lib/online/online-league-service.ts ...` |
| N002 Online League Service ist zentraler Monolith | TEILWEISE | Helper existieren, aber `online-league-service.ts` hat weiter 8899 Zeilen. | `src/lib/online/online-league-service.ts`, `online-league-week-service.ts` |
| N003 Game Engine Dateien sind sehr gross | OFFEN | Engine-Monolithen wurden in diesem Arbeitsstrang nicht reduziert. | `src/modules/gameplay/*` |
| N004 `simulateMatch` ist sehr lang und schwer testbar | OFFEN | Keine sichere Zerlegung oder neue Engine-Unit-Grenze nachweisbar. | `src/modules/gameplay/match-engine.ts` |
| N005 Online League Placeholder ist grosse Client-Orchestrator-Komponente | TEILWEISE | ViewModels existieren, Komponente bleibt 1735 Zeilen. | `src/components/online/online-league-placeholder.tsx`, Model-Tests |
| N006 Admin League Detail ist grosse, schwer reviewbare Komponente | TEILWEISE | Display/Config wurde getrennt, Datei bleibt 1656 Zeilen mit Handlern. | `src/components/admin/admin-league-detail.tsx` |
| N007 Admin Online Actions sind zu breit | TEILWEISE | Use Cases/Guards existieren, Datei bleibt 1903 Zeilen mit vielen Mutationen. | `src/lib/admin/online-admin-actions.ts` |
| N008 `MemoryStorage` Test-Fixtures sind dupliziert | OFFEN | Wiederholte lokale Storage-Fixtures bleiben in Tests. | `src/lib/online/*test.ts`, `src/lib/admin/*test.ts` |
| N009 League-/GM-Testsetup ist dupliziert | OFFEN | Gemeinsame Multiplayer-Testfactory fehlt weiterhin. | Online-/Admin-Testdateien |
| N010 Server-Action-Feedback-Logik ist dupliziert | OFFEN | Kein gemeinsames Feedback-Pattern nachweisbar. | Admin/Online Client-Komponenten |
| N011 Player-Seed-Mapping-Logik ist dupliziert | OFFEN | Seed-/Draft-Player-Mapping bleibt verteilt. | `scripts/seeds/*`, Draft/Online Services |
| N012 QA-Report-Rendering-Logik ist dupliziert | OFFEN | Reports werden weiter manuell/parallel gepflegt. | `docs/reports/*` |
| N013 Admin-/Online-Statuskarten sind aehnlich implementiert | OFFEN | Keine konsolidierte Statuskarten-Variante belegt. | `src/components/admin/*`, `src/components/online/*` |
| N014 Viele ungenutzte Export-Kandidaten | TEILWEISE | Code-Hygiene wurde triagiert, aber kein systematischer unused-export-Check ist Gate. | `docs/reports/code-hygiene-triage.md` |
| N015 TODO/FIXME/HACK-Hinweise sind vorhanden | GELÖST | Produktiver Suchraum ist bereinigt/klassifiziert; Treffer liegen in Reports/Analyse-Regex. | `rg TODO|FIXME|HACK`, `code-hygiene-triage.md` |
| N016 Viele `console.*`-Vorkommen | TEILWEISE | Konsolenlogs sind klassifiziert, aber weiterhin breit vorhanden. | `rg "console\\." src scripts` |
| N017 Firestore Rules enthalten offene TODOs | GELÖST | Rules enthalten keine offenen TODOs mehr; Admin/Ready/Rules-Matrix laeuft. | `firestore.rules`, `firestore.rules.test.ts` |
| N018 `team.types` ist ein Kopplungshotspot | OFFEN | Keine Bounded-Context-Trennung erkennbar. | `src/types/team.types.ts` |
| N019 Shared Enums sind stark gekoppelt | OFFEN | Globale Enums bleiben breite Importbasis. | `src/shared/domain/enums*` |
| N020 Format-Utilities sind stark gekoppelt | OFFEN | Keine Kontexttrennung der Formatter nachweisbar. | Format-Utilities |
| N021 StatusBadge ist breit verwendet | OFFEN | Shared UI Primitive bleibt breit; kein fachlicher Wrapper-Abschluss. | StatusBadge-Komponenten |
| N022 Session/Auth ist breit gekoppelt | TEILWEISE | Admin-Auth wurde vereinheitlicht, allgemeine Auth-Kopplung bleibt. | `admin-auth-model.ts`, Auth-Komponenten |
| N023 Online League Types sind breit verwendet | TEILWEISE | Mapper wurden gehaertet, zentrale Typdateien bleiben breit. | `src/lib/online/types.ts`, `online-league-types.ts` |
| N024 SectionPanel ist breit verwendet | OFFEN | Kein konkreter Defekt, aber Finding nicht aktiv reduziert. | `SectionPanel` Imports |
| N025 StatCard ist breit verwendet | OFFEN | Kein konkreter Defekt, aber keine fachliche Kapselung. | `StatCard` Imports |
| N026 Seeded RNG ist breit gekoppelt | OFFEN | Nutzung bleibt zentral und nicht weiter abgegrenzt. | `seeded-rng` Imports |
| N027 Firebase Admin ist breit gekoppelt | TEILWEISE | Server-Pfade sind stabil, aber direkte Admin-Firebase-Imports bleiben breit. | `src/lib/firebase/admin.ts`, server repositories |
| N028 Adminzugriff hat Claim-/UID-Allowlist-Komplexitaet | GELÖST | Custom Claim ist kanonisch; UID-Allowlist nur Bootstrap-Hinweis. | `admin-auth-model.ts`, `admin-auth-parity.test.ts`, Rules Tests |
| N029 Logout-Recovery muss Online-Kontext bereinigen | GELÖST | Logout-Cleanup fuer `lastLeagueId` ist getestet. | `src/lib/online/auth/online-auth.test.ts` |
| N030 Offline Flow wirkt trotz Name auth-/account-gebunden | TEILWEISE | Copy/Auth-Status verbessert, Offline-Entry bleibt nicht voll entkoppelt. | Savegames/Auth-Komponenten |
| N031 Loeschaktionen nutzen native Confirm-Dialoge | OFFEN | `window.confirm` bleibt in Savegames/Admin/Online. | `rg window.confirm` |
| N032 Admin Eingaben nutzen native Prompts | OFFEN | `window.prompt` bleibt in Admin Detail. | `src/components/admin/admin-league-detail.tsx` |
| N033 Online Join/Rejoin hat viele versteckte Abhaengigkeiten | TEILWEISE | Recovery/route guards existieren, aber Browser-Rejoin-E2E fehlt und Pfad bleibt komplex. | Repository/Route-State Tests, N104 offen |
| N034 Fehlende Membership kann Nutzer in Schleifen fuehren | GELÖST | Fehlende/kaputte Membership wird als Recovery-/Konfliktzustand behandelt. | `online-league-route-state-model.test.ts`, repository tests |
| N035 Fehlende Team-Zuordnung blockiert Multiplayer | GELÖST | No-Team/Ready-Blocker und Route-State sind sichtbar getestet. | `online-league-week-service.test.ts`, UI Model Tests |
| N036 User-Team-Link hat mehrere Inkonsistenzstellen | TEILWEISE | Membership ist staerker kanonisch, aber Team/Mirror-Projektionen bleiben riskant. | `firebase-online-league-mappers.ts`, repository tests |
| N037 Globaler League Member Mirror ist doppelte Source of Truth | TEILWEISE | Mirror wird als Projektion geprueft, bleibt aber als aktive Datenstruktur. | `createLeagueMemberMirrorFromMembership`, tests |
| N038 Team Assignment kann Race Conditions erzeugen | GELÖST | Join/Team-Claim nutzt transaktionale Guards und Tests fuer Auswahl/Projektion. | `firebase-online-league-repository.ts`, tests |
| N039 Ready-State braucht konsistente Persistenz und Anzeige | GELÖST | Ready blockiert No-Team, No-Roster, Depth, Draft, Simulation, Completed Week. | `online-league-week-service.test.ts`, detail model tests |
| N040 Admin Week Actions sind semantisch unklar | GELÖST | Admin Actions sind konfiguriert/gruppiert und getestet. | `admin-league-action-config.ts`, test |
| N041 GM-Fortschritt haengt stark vom Admin Week Flow ab | TEILWEISE | Staging Smoke ist gruen, Produktmodell bleibt adminzentriert. | Staging Smoke, `online-admin-actions.ts` |
| N042 Nicht-MVP Sidebar-Features sind Coming Soon | GELÖST | Online Non-MVP-Routen fuehren zu Coming-Soon. | Navigation-/Coming-Soon-Tests |
| N043 Offline Nebenfeatures sind unvollstaendig | TEILWEISE | Nicht-MVP-Status ist sichtbarer, Offline-Features bleiben unvollstaendig. | Offline/Savegames Routen |
| N044 Draft MVP ist begrenzt | TEILWEISE | Draft-Core ist gehaertet, aber bewusst MVP-begrenzt. | Draft Tests, Draft UI |
| N045 Active Draft darf nicht automatisch Fullscreen oeffnen | GELÖST | Navigation bleibt bei aktivem Draft verfuegbar; kein Auto-Fullscreen. | `navigation-model.test.ts` |
| N046 Active Draft kann andere Bereiche blockierend wirken lassen | GELÖST | Tests zeigen nur Team-Menues ohne Team gesperrt, Draft bleibt erreichbar. | `navigation-model.test.ts` |
| N047 Completed Draft braucht klare Statusdarstellung | TEILWEISE | Statuslabels existieren, aber Admin-/Draft-Detailtiefe bleibt begrenzt. | Detail/Dashboard Tests |
| N048 Draft State hat mehrere Race- und Truth-Risiken | GELÖST | Pick Docs/Available Docs/Legacy/Finalized-Cursor-Konflikte hard-failen in Tests und Runtime. | `multiplayer-draft-logic.ts`, repository/admin tests |
| N049 Online Navigation mischt Hashes und Routen | TEILWEISE | Hash/Page-Routen sind getestet unterscheidbar, Mischmodell bleibt. | `navigation-model.test.ts`, route fallback tests |
| N050 Statuskarten erzeugen visuelle Konkurrenz | TEILWEISE | Copy/Statusfokus verbessert, aber keine visuelle Hierarchie-Messung. | UI-Komponenten |
| N051 Terminologie ist inkonsistent | GELÖST | Glossar fuer Liga/Team/Manager/Woche/Simulation/Draft existiert und Copy wurde angepasst. | `online-glossary.tsx` |
| N052 First-Time und Returning Player Einstieg sind nicht eindeutig | TEILWEISE | Continue-State ist abgesichert, Priorisierung bleibt UX-Risiko. | `online-continue-model.test.ts` |
| N053 Admin UI ist ueberladen | GELÖST | Admin-Struktur wurde gruppiert und Action-Konfiguration getestet. | `admin-league-action-config.test.ts` |
| N054 Admin-Aktionen koennen versehentlich datenveraendernd sein | TEILWEISE | Guards/Audit existieren, aber native confirms/prompts und breite Action-Datei bleiben. | `online-admin-actions.ts`, `admin-league-detail.tsx` |
| N055 Zwei Architekturmodelle laufen parallel | OFFEN | Kein Zielarchitektur-Abgleich implementiert. | `src/modules/*`, `src/lib/online/*` |
| N056 Multiplayer UI, State und Persistence sind eng gekoppelt | TEILWEISE | Route/ViewModels existieren, Kopplung bleibt in grossen Komponenten. | Online Komponenten/Repository |
| N057 Firebase Online Repository ist zu breit | TEILWEISE | Mapper extrahiert, Repository bleibt 1534 Zeilen mit Reads/Writes/Subs. | `firebase-online-league-repository.ts` |
| N058 Firebase Admin darf nicht in Client Bundles gelangen | TEILWEISE | Tests/Build gruen, aber kein explizites import-boundary Gate. | Build, `src/lib/firebase/admin.ts` Imports |
| N059 UI importiert Domain- und Application-Typen breit | TEILWEISE | ViewModels reduzieren Kopplung, aber UI nutzt weiter Domain-Typen breit. | `src/components/*`, `src/lib/online/*` |
| N060 Application Services importieren UI-Modelle | OFFEN | Keine klare Abhaengigkeitsrichtungs-Korrektur. | Application Services |
| N061 Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten | TEILWEISE | Simulationstests existieren, stabiler Adaptervertrag bleibt nicht voll formalisiert. | `online-game-simulation.test.ts`, Week Simulation Tests |
| N062 Admin `Details verwalten` und `Oeffnen` sind redundant | GELÖST | Admin-Action-Struktur/Labels wurden geklaert. | Admin action config tests |
| N063 Firebase Multiplayer Training ist nur eingeschraenkt | GELÖST | Training ist im Online-MVP als Coming-Soon/Scope begrenzt. | Coming-Soon Tests |
| N064 Admin Draft Status ist nur ein Hinweisbereich | TEILWEISE | Draft-Adminstatus bleibt eher passiv; Kernpfade sind getestet. | Admin Detail/Draft actions |
| N065 Auth Debug ist technisch formuliert | GELÖST | Debug-Copy ist Admin/Dev-begrenzt. | Auth/Admin Komponenten |
| N066 Dashboard kann ueberladen wirken | TEILWEISE | Core-Loop-Status ist besser, Dashboard-Komplexitaet bleibt. | Dashboard/Detail model |
| N067 Team Management braucht klare No-Team- und No-Roster-Zustaende | GELÖST | No-Team/No-Roster/Depth-Blocker sind UI- und Service-getestet. | Ready tests |
| N068 Week Simulation braucht gueltigen Schedule | GELÖST | Simulation blockiert ohne Schedule mit klarer Fehlermeldung. | `online-week-simulation.test.ts`, admin tests |
| N069 Week Simulation braucht vorhandene Teams | GELÖST | Missing-Team- und Roster-/Team-Guards sind getestet. | Simulation tests |
| N070 Online League Route Bundle ist gross | TEILWEISE | Build misst 301 kB; Baseline vorhanden, kein Budget. | `npm run build`, `performance-baseline.md` |
| N071 Online Draft Route Bundle ist gross | TEILWEISE | Draft Route 284 kB; keine weitere Split-Massnahme. | Build output |
| N072 Admin Route Bundle ist gross | TEILWEISE | Admin 270/273 kB; Struktur besser, aber Bundle bleibt gross. | Build output |
| N073 Savegames Route Bundle ist gross | TEILWEISE | `/app/savegames` 292 kB; kein Budget/Split-Gate. | Build output |
| N074 Wenige dynamische Imports | OFFEN | Keine systematische Lazy-Import-Strategie umgesetzt. | Route/Component imports |
| N075 `subscribeToLeague` liest zu viele Datenbereiche | TEILWEISE | Coalescing/Tests existieren, Subscription bleibt breit. | `firebase-online-league-repository.ts` |
| N076 Lobby-/Teamreads koennen N+1 erzeugen | TEILWEISE | Join/reads gehaertet, aber kein Read-Fanout-Budget. | Repository, performance report |
| N077 Events werden breit reloadet | OFFEN | Events bleiben an breite League-Readmodelle gekoppelt. | Repository Events |
| N078 League Document kann stark wachsen | OFFEN | Results/Schedule/Standings bleiben im League-Dokument moeglich. | Firestore League Doc |
| N079 Firestore Reads/Writes sind Kostenrisiko | TEILWEISE | Usage-Messscript existiert, aber kein regelmaessiges Gate. | `scripts/firestore-usage-measure.ts` |
| N080 Route-Bundles koennen weiter wachsen | TEILWEISE | Build sichtbar, aber keine Budget-Grenze. | `npm run build` |
| N081 Online Detail Models berechnen mehrfach | TEILWEISE | Modeltests existieren, memoized Selector-Strategie fehlt. | `online-league-detail-model.ts` |
| N082 Standings-Fallback scannt Results | OFFEN | Standings-Projektion ist nicht als harte Persistenzquelle validiert. | Standings/Results Helpers |
| N083 Draft Room sortiert gesamten Spielerpool | TEILWEISE | Draft Room nutzt Memoisierung, sortiert aber weiter den Pool. | `online-fantasy-draft-room.tsx` |
| N084 Roster-/Depth-Listen sind nicht breit virtualisiert | OFFEN | Keine Virtualisierung; bei MVP-Groesse akzeptiert, Finding bleibt. | Roster/Depth UI |
| N085 Stale `lastLeagueId` kann Nutzer blockieren | GELÖST | Continue-State prueft sichere ID und bereinigt ungueltige Eintraege. | `online-continue-button.tsx`, tests |
| N086 Draft Pick und Draft State koennen parallel kollidieren | GELÖST | Pick Doc IDs, current-run Guards, occupied Pick Docs und Transaction-Pfade sind getestet. | Draft Logic/Repository Tests |
| N087 Week Simulation kann doppelt oder parallel laufen | GELÖST | Simulation Lock, Attempt-ID und Idempotenz sind getestet. | `online-week-simulation.test.ts`, admin tests |
| N088 Multiplayer hat viele parallele Statusfelder | TEILWEISE | Week/Draft/Ready normalisiert, aber kein uebergreifender Lifecycle-Automat. | `online-league-lifecycle.ts` |
| N089 Zentrale Online State Machine fehlt | OFFEN | Lifecycle Helper existiert, aber keine formale zentrale State Machine. | `online-league-lifecycle.ts` |
| N090 Week Status hat doppelte Wahrheit | GELÖST | `completedWeeks` ist kanonisch; Legacy-Konflikte hard-failen. | Week simulation/service tests |
| N091 `currentWeek` darf nur nach erfolgreicher Simulation steigen | GELÖST | Admin/local Simulation koppelt Persistenz und Week Advance; Reload/duplicate Tests gruen. | Admin/Online simulation tests |
| N092 Admin-/Repair-Scripts koennen Multiplayer-State veraendern | TEILWEISE | Confirm/Dry-run/Env-Flags existieren, Scripts bleiben risikoarm aber breit. | `scripts/seeds/*staging*`, preview guards |
| N093 Ready waehrend Simulation ist Race-Risiko | GELÖST | Ready writes werden bei Simulation/Lock blockiert. | Repository/Ready tests |
| N094 Core Loop ist dokumentiert, aber eng | TEILWEISE | Core-Loop laeuft im Smoke, Produktvertrag bleibt eng. | Staging Smoke, reports |
| N095 Adminmodus ist fuer normale Spieler zu prominent | GELÖST | Admin-Zugang folgt Custom Claim; normale Nutzer erhalten keinen Admininhalt. | Admin Auth tests |
| N096 Redundante Admin Actions konkurrieren sichtbar | GELÖST | Gruppierung und Action-Konfiguration getestet. | Admin action config tests |
| N097 Nicht-MVP-Features duerfen nicht aktiv konkurrieren | GELÖST | Online Non-MVP-Pfade sind Coming-Soon/nachrangig. | Navigation/Coming-Soon tests |
| N098 MVP-Zustand ist Gelb | TEILWEISE | Staging Smoke gruen, aber Production/Architektur/Testluecken bleiben. | Gate-Ergebnisse |
| N099 Multiplayer Acceptance und UX-Audit widersprechen sich | TEILWEISE | Gate-Matrix klaert Begriffe, stale alte Reports widersprechen weiter. | `release-gate-matrix.md`, dieser Report |
| N100 Vitest Suite ist vorhanden und umfangreich | GELÖST | Relevante Suites laufen gruen; 172 Tests in diesem Audit. | Vitest Check |
| N101 E2E scheitert lokal an DB-Verbindung | GELÖST | `db:up`, Preflight und `npm run test:e2e` laufen ausserhalb Sandbox gruen. | E2E Checks |
| N102 Firebase Parity braucht Emulator-Portbindung | GELÖST | Emulator-Parity laeuft ausserhalb Sandbox gruen; Sandbox-EPERM ist Umgebung, nicht Code. | `test:firebase:parity` |
| N103 Authentifizierter Staging Smoke fehlt als bestaetigtes Gate | GELÖST | Aktueller Staging-Smoke ist fuer Commit `1a28d88e...` gruen. | Staging Smoke Check |
| N104 Multiplayer GM Rejoin Browser-Test fehlt | OFFEN | Unit-/Repositorytests existieren, realer Browser-Rejoin bleibt ungetestet. | E2E-Suite |
| N105 Admin Week E2E Reload-Test fehlt | TEILWEISE | Staging-Smoke prueft Reload, aber Browser-E2E fuer Admin UI bleibt lueckenhaft. | Staging Smoke, E2E |
| N106 Tests fuer parallele Multiplayer-Aktionen fehlen | TEILWEISE | Draft/Ready/Simulation haben Race-Tests, Join/Browser-Concurrency fehlt. | Draft/Week/Ready Tests |
| N107 Firestore Rules Tests fuer Admin fehlen | GELÖST | Admin Claim, UID-Allowlist ohne Claim, Nicht-Admin und Cross-user Ready sind getestet. | `firestore.rules.test.ts`, Admin parity tests |
| N108 Sidebar/Coming-Soon Browser-Test fehlt | TEILWEISE | Component/Model-Tests existieren, Browser-Smoke fehlt. | Navigation/Coming-Soon tests |
| N109 Seed/Reset Emulator-Integration fehlt | TEILWEISE | Seeds existieren und Firebase parity laeuft, Reset/Seed als eigener Integrationstest fehlt. | Seed scripts, parity |
| N110 Savegames Offline Flow mit DB ist nicht ausreichend getestet | TEILWEISE | Prisma Smoke laeuft, aber Savegames-Offline-Flow ist nicht tief abgedeckt. | `npm run test:e2e` |
| N111 A11y/Mobile Smoke fehlt | OFFEN | Kein A11y/Mobile-Gate ausgefuehrt oder definiert. | E2E/QA Scripts |
| N112 QA-Gruen und E2E-Rot widersprechen sich | TEILWEISE | Aktuelle Gates sind differenziert, aber alte Reports sind stale/rot. | Gate Matrix, stale staging report |
| N113 Env-Dateien existieren lokal und muessen ignoriert bleiben | GELÖST | `.gitignore` ignoriert `.env` und `.env.*`, ausser `.env.example`. | `.gitignore` |
| N114 Public Firebase API Key kommt in Config/Scripts vor | GELÖST | Als public Web Config klassifiziert; keine Secret-Behandlung noetig. | Firebase config/report |
| N115 Runtime Guards schuetzen Umgebungen | GELÖST | Preview/Production Guards und Tests existieren. | `previewGuard.test.ts`, preflight scripts |
| N116 Production Firestore kann per Flag aktiviert werden | TEILWEISE | Guards existieren, Production-Cutover bleibt nicht freigegeben. | Preview guards, production preflight |
| N117 Production App Hosting Ziel ist nicht verifiziert | OFFEN | Preflight ohne Projekt-ID ist No-Go; keine verifizierten Production IDs. | `npm run production:preflight:apphosting` |
| N118 Staging Smoke kann an IAM `signJwt` scheitern | GELÖST | Aktueller Smoke nutzt `IAM sign-jwt custom token` erfolgreich. | Staging Smoke |
| N119 Firestore Rules sind komplex und clientseitig restriktiv | TEILWEISE | Rules-Tests gruen, Komplexitaet/API-Pfad-Abhaengigkeit bleibt. | `firestore.rules`, rules tests |
| N120 Dokumentation und Reports koennen stale werden | TEILWEISE | Dieser Report aktualisiert die Lage, aber alte Staging-Reports sind sichtbar stale. | `docs/reports/staging-smoke-final-gate.md` |

## Top Offene Risiken

### Staging-/Release-Risiko

- Staging ist fuer den aktuellen Commit gruen, aber alte Gate-Reports melden weiterhin Rot. Das ist ein Dokumentations-/Governance-Risiko (`N112`, `N120`).
- Production bleibt No-Go, weil Production-Projekt/Backend-ID nicht verifiziert sind (`N117`) und Production Firestore nur guard-basiert, nicht cutover-geprueft ist (`N116`).

### Core-Loop-Risiko

- Join/Rejoin und User-Team-Projektionen sind besser, aber noch nicht als Browser-Rejoin plus Membership/Mirror/Team-End-to-End-Gate abgesichert (`N033`, `N036`).
- Week-Progress ist funktional gruen, bleibt aber adminzentriert und ohne formale State-Machine (`N041`, `N088`, `N089`).
- Multiplayer-Simulation-Adaptervertrag ist nur teilweise formalisiert (`N061`).

### State-Risiko

- Draft und Week sind stark verbessert. Das wichtigste verbleibende State-Risiko ist die fehlende uebergreifende Lifecycle-State-Machine (`N088`, `N089`).

### Security-Risiko

- Admin Auth ist geloest, aber Production-Guards und direkte Firestore/API-Zielarchitektur bleiben nicht produktionsfreigegeben (`N116`, `N119`).
- Mutierende Admin-/Repair-Scripts bleiben breit und brauchen langfristig einheitliche Dry-run/Confirm/Audit-Konventionen (`N092`, `N054`).

### Architektur-/Wartbarkeitsrisiko

- Die groessten Dateien bleiben sehr gross: `online-league-service.ts` 8899 Zeilen, Firebase Repository 1534 Zeilen, Admin Actions 1903 Zeilen, Online Placeholder 1735 Zeilen, Admin Detail 1656 Zeilen.

### UI/Scope/Performance

- Online Scope ist besser kontrolliert, aber Offline-Nebenfeatures, native Dialoge/Prompts und Dashboard-Dichte bleiben offen.
- Build ist gruen, aber es gibt keine automatischen Bundle- oder Firestore-Read-Budgets.

## Exakt 10 Verbesserungsvorschlaege

### 1. Production Preflight und Report-Konsistenz herstellen

- Betroffene Findings: `N112`, `N116`, `N117`, `N120`
- Warum wichtig: Staging ist jetzt gruen, aber Production bleibt unbelegt; stale Reports koennen falsche Go/No-Go-Entscheidungen erzeugen.
- Umsetzungsschritte: Production-Projekt/Backend-ID verifizieren; `production:preflight:apphosting` mit echten Parametern ausfuehren; stale Staging-Reports mit aktuellem Smoke-Ergebnis superseden; Report-Index mit "aktuell/ersetzt" markieren.
- Risiko bei Nicht-Umsetzung: Production-Go wird geraten oder durch veraltete rote/gruene Reports fehlinterpretiert.
- Empfohlene Checks: `npm run production:preflight:apphosting -- --project <id> --backend <id>`, Staging Smoke, `npx tsc --noEmit`, `npm run lint`.
- Impact: hoch
- Status-Ziel: `N112`, `N117`, `N120` GELÖST; `N116` TEILWEISE -> GELÖST nach Cutover-Gates.

### 2. Membership Source-of-Truth final abschliessen

- Betroffene Findings: `N033`, `N036`, `N037`, `N088`
- Warum wichtig: User-Team-Konflikte sind der letzte grosse Lobby-/Route-State-Risikoblock.
- Umsetzungsschritte: Alle `assignedUserId`-/Mirror-Entscheidungen inventarisieren; nur Membership fuer fachliche Entscheidungen verwenden; Projection-Konflikte einheitlich hard-failen oder explizit repairen; Repository- und Route-State-Tests erweitern.
- Risiko bei Nicht-Umsetzung: Einzelne Guards koennen alte Team-/Mirror-Projektionen wieder als Wahrheit behandeln.
- Empfohlene Checks: `npx vitest run src/lib/online/repositories src/lib/online src/components/online`, `npm run test:firebase:rules`, Typecheck, Lint.
- Impact: hoch
- Status-Ziel: `N033`, `N036`, `N037` GELÖST; `N088` weiter TEILWEISE bis State-Machine.

### 3. Multiplayer Lifecycle State Machine als Read-Model definieren

- Betroffene Findings: `N041`, `N061`, `N088`, `N089`
- Warum wichtig: Draft, Ready, Simulation und Results sind einzeln gehaertet, aber noch nicht als formaler Gesamtzustand garantiert.
- Umsetzungsschritte: Lifecycle-Phasen definieren; erlaubte Transitionen dokumentieren; Derived Read-Model bauen; UI und Admin aus diesem Read-Model lesen lassen; Legacy-/Projektionsfelder nur als Inputs/Warnings behandeln.
- Risiko bei Nicht-Umsetzung: Neue Fixes koennen wieder lokale Statuslogik einfuehren.
- Empfohlene Checks: `npx vitest run src/lib/online src/lib/admin src/components/online`, Staging Smoke.
- Impact: hoch
- Status-Ziel: `N041`, `N088`, `N089` GELÖST; `N061` TEILWEISE -> GELÖST mit Adaptervertrag.

### 4. Browser-E2E fuer GM Rejoin, Admin Week Reload und Concurrency ergaenzen

- Betroffene Findings: `N104`, `N105`, `N106`, `N108`, `N111`
- Warum wichtig: Unit- und Staging-Script-Smokes sind gruen, aber Browser-Regressionen bei Rejoin/Reload/Mobile bleiben wahrscheinlich.
- Umsetzungsschritte: Firebase-Emulator-Browser-Test fuer GM Rejoin; Admin Week UI Reload-Test; parallele Ready/Draft/Join-Aktion im Emulator; minimaler mobile viewport smoke; Coming-Soon-Sidebar Browser-Test.
- Risiko bei Nicht-Umsetzung: UI- oder Browser-spezifische Core-Loop-Regressionen bleiben unsichtbar.
- Empfohlene Checks: `npm run test:e2e:multiplayer:firebase`, `npm run test:e2e:multiplayer:firebase:draft`, neuer Rejoin/Admin-Week-Test, Typecheck, Lint.
- Impact: hoch
- Status-Ziel: `N104`, `N105`, `N106`, `N108`, `N111` GELÖST oder mindestens TEILWEISE.

### 5. Admin Mutations hardening vervollstaendigen

- Betroffene Findings: `N007`, `N031`, `N032`, `N054`, `N092`
- Warum wichtig: Admin-Aktionen sind live-staging-wirksam und koennen Daten veraendern.
- Umsetzungsschritte: Native Prompt/Confirm durch interne Confirm-/Intent-Komponenten ersetzen; mutierende Actions mit einheitlichem Guard/Confirm/Audit/Env-Schutz versehen; Seed/Repair Scripts auf Dry-run/Confirm-Konvention pruefen.
- Risiko bei Nicht-Umsetzung: Bedienfehler oder Scriptfehler koennen Test-/Stagingdaten korrumpieren.
- Empfohlene Checks: `npx vitest run src/components/admin src/lib/admin scripts/seeds`, Rules Tests, Lint.
- Impact: mittel bis hoch
- Status-Ziel: `N054`, `N092` GELÖST; `N007` TEILWEISE reduziert; `N031`, `N032` GELÖST.

### 6. Firebase Repository in Queries, Commands und Subscriptions schneiden

- Betroffene Findings: `N057`, `N075`, `N076`, `N077`, `N079`
- Warum wichtig: Repository-Breite ist die gemeinsame Ursache fuer Read-Fanout, Race-Fixes und hohe Review-Kosten.
- Umsetzungsschritte: Public API stabil lassen; Query-Module, Command-Module und Subscription-Modul extrahieren; Firestore-Pfade unveraendert lassen; Read-Fanout messen.
- Risiko bei Nicht-Umsetzung: Jeder State-Fix beruehrt weiter dieselbe breite Datei.
- Empfohlene Checks: `npx vitest run src/lib/online/repositories src/lib/online`, Firebase Rules/Parity, Staging Smoke.
- Impact: mittel
- Status-Ziel: `N057`, `N075`, `N076` GELÖST; `N077`, `N079` TEILWEISE.

### 7. Online Service und grosse Client-Komponenten weiter entkoppeln

- Betroffene Findings: `N002`, `N005`, `N006`, `N023`, `N056`, `N059`
- Warum wichtig: Die Core-Loop-Fixes sind funktional, aber die Aenderungsflaeche bleibt zu gross.
- Umsetzungsschritte: Nur reine Mapper/Validatoren/ViewModels extrahieren; keine Firestore-Semantik aendern; Zeilenzahl und Verantwortlichkeiten messen; Tests unveraendert gruen halten.
- Risiko bei Nicht-Umsetzung: Kleine fachliche Aenderungen bleiben riskant und teuer.
- Empfohlene Checks: `npx vitest run src/lib/online src/components/online src/components/admin`, Typecheck, Lint.
- Impact: mittel
- Status-Ziel: `N002`, `N005`, `N006`, `N056`, `N059` weiter Richtung GELÖST.

### 8. Performance-Budgets und Firestore-Read-Baseline automatisieren

- Betroffene Findings: `N070`, `N071`, `N072`, `N073`, `N074`, `N075`, `N078`, `N079`, `N080`, `N081`, `N082`, `N083`
- Warum wichtig: Build misst grosse Routen, aber ohne Budget kann Performance wieder wachsen.
- Umsetzungsschritte: Bundle-Budget-Script fuer relevante Routen; Firestore-Usage-Messung als reproduzierbaren Check; Top-Read-Flows dokumentieren; nur Low-Risk Lazy Loading nach Messung.
- Risiko bei Nicht-Umsetzung: Performance-/Kostenregressionen fallen erst spaet auf.
- Empfohlene Checks: `npm run build`, `tsx scripts/firestore-usage-measure.ts`, Performance-Tests.
- Impact: mittel
- Status-Ziel: `N070`-`N083` mindestens TEILWEISE mit Budget; einzelne Low-Risk-Findings GELÖST.

### 9. Draft-Kompatibilitaetsausnahmen explizit auslaufen lassen

- Betroffene Findings: `N044`, `N047`, `N048`, `N064`, `N086`
- Warum wichtig: Draft-State ist jetzt hard-fail-sicher, aber Legacy-Kompatibilitaetslesepfade sollten nicht dauerhaft als Normalfall wirken.
- Umsetzungsschritte: `allowLegacyDraftFallback` nur in Migrations-/Read-only-Code erlauben; Admin-Draft-Status um Konflikt-/Migration-Hinweis erweitern; Legacy-Blob-Nutzung mit Tests absichern; keine stille Reparatur.
- Risiko bei Nicht-Umsetzung: Spaetere Arbeit koennte Legacy wieder als bequemen Fallback nutzen.
- Empfohlene Checks: Draft Logic/Repository/Admin Tests, Typecheck, Lint.
- Impact: mittel
- Status-Ziel: `N044`, `N047`, `N064` TEILWEISE -> GELÖST; `N048`, `N086` bleiben GELÖST.

### 10. Offline/Savegames Scope und mobile Qualitaet klaeren

- Betroffene Findings: `N030`, `N043`, `N050`, `N052`, `N066`, `N110`, `N111`
- Warum wichtig: Internal MVP ist spielbar, aber Entry/Offline/Savegames und Mobile/A11y sind noch keine belastbaren Gates.
- Umsetzungsschritte: Offline-Voraussetzungen in Entry Flow klaeren; Savegames-DB-E2E erweitern; mobile viewport Smoke und einfache A11y-Pruefung einfuehren; Dashboard-Statuspriorisierung reduzieren.
- Risiko bei Nicht-Umsetzung: Nicht-Core-Loop-Polish wird zum Demo-/Acceptance-Risiko.
- Empfohlene Checks: `npm run test:e2e`, neuer Savegames/Mobile-Smoke, Component-Tests, Lint.
- Impact: mittel
- Status-Ziel: `N030`, `N052`, `N066`, `N110`, `N111` verbessern; `N043` bewusst FREEZE dokumentieren.

## Empfehlung

| Ziel | Entscheidung | Begruendung |
|---|---|---|
| Internal MVP | Go | Lokale Pflichtgates, relevante Vitest-Suites, Prisma E2E, Firebase Rules/Parity und Core-Staging-Smoke sind gruen. Go gilt fuer internes MVP mit dokumentierten Architektur-/Performance-/Browser-E2E-Risiken. |
| Staging QA | Go | Live-Staging liefert Build-Info fuer Commit `1a28d88eaaa99a182612638652d0165705ce6901`; authentifizierter Admin Week Smoke ist gruen. |
| Production | No-Go / noch nicht voll bewertet | Production-Projekt/Backend-ID fehlen im Preflight; produktive Firestore-/App-Hosting-Cutover-Gates sind nicht verifiziert. |

## Naechste Reihenfolge

1. Production Preflight und stale Report Governance fixen.
2. Membership Source-of-Truth und Lifecycle State Machine abschliessen.
3. Browser-E2E fuer Rejoin/Admin Week/Concurrency ergaenzen.
4. Admin Mutations hardening und Repository-Split angehen.
5. Performance-/Firestore-Budgets automatisieren.
