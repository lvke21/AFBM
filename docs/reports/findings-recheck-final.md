# Findings Recheck Final

Stand: 2026-05-03 14:10 Europe/Zurich

Grundlage:
- `docs/reports/full-project-analysis/_scored-findings.md`
- `docs/reports/findings-recheck-after-lifecycle-e2e-fixes.md`
- `docs/reports/package-implementation-verification.md`
- aktueller Codezustand und die unten dokumentierten Checks

Regel: Alte Statuswerte wurden nicht uebernommen. Sie dienten nur fuer den Delta-Vergleich. Bewertet wurde nach aktuellem Code, Tests und ausfuehrbaren Scripts.

## Executive Summary

Der aktuelle geloeste Anteil liegt bei **42.5%**: 51 von 120 Findings sind geloest. Gegenueber dem letzten Recheck haben sich vier Findings verbessert:

- `N037` Mirror/League-Member ist nicht mehr gleichwertige Wahrheit, sondern nur noch Index/Projektion.
- `N057` Firebase Online Repository ist in Queries, Commands, Subscriptions und Mapper getrennt.
- `N061` Multiplayer-Simulation hat einen dokumentierten Adaptervertrag und harte Preflight-/E2E-Validierung.
- `N112` aktuelle lokale QA-Gates und E2E stehen nicht mehr im Widerspruch.

Die wichtigsten Verbesserungen liegen in Core-Loop-Stabilitaet, Membership/Mirror-Konsistenz, Simulation-Preflight, Browser-E2E und Firebase-Rules-Parity. Die groessten verbleibenden Risiken sind nicht mehr einfache "Flow kaputt"-Fehler, sondern Wartbarkeit, Production-Governance, Performance/Kosten und verbleibende parallele Rohstatusfelder.

## Check-Ergebnisse

| Check | Ergebnis | Hinweis |
|---|---:|---|
| `npx tsc --noEmit` | Gruen | Keine TypeScript-Fehler. |
| `npm run lint` | Gruen | ESLint Exit-Code 0. |
| `npx vitest run src/lib/online/repositories src/lib/online src/components/online src/lib/admin src/app/api/admin/online/actions/route.test.ts src/components/admin src/server/repositories/firestoreAccess.test.ts` | Gruen | 50 Testdateien, 416 Tests. Erwartete stderr-Logs stammen aus Hard-Fail-/Conflict-Tests. |
| `npm run test:firebase:rules` | Gruen | Sandbox blockierte Emulator-Portbindung; ausserhalb Sandbox bestanden: 1 Datei, 24 Tests. |
| `npm run test:firebase:parity` | Gruen | Ausserhalb Sandbox bestanden: 1 Datei, 3 Tests. |
| `npm run test:e2e:multiplayer:firebase` | Gruen | Firebase Emulator + Playwright: 7 Tests bestanden. |

## Statuszahlen

| Status | Anzahl |
|---|---:|
| GELOEST | 51 |
| TEILWEISE | 43 |
| OFFEN | 26 |
| REGRESSION | 0 |

Geloester Anteil: **42.5%**.

Offene oder teilweise FIX-NOW Findings:
- `N041` - GM-Fortschritt haengt weiter am Admin Week Flow.
- `N088` - parallele Rohstatusfelder existieren weiter, auch wenn Lifecycle sie entschärft.
- `N116` - Production Firestore kann per Flag aktiviert werden; Cutover ist nicht voll bewiesen.
- `N117` - Production App Hosting Ziel ist nicht verifiziert.
- `N119` - Firestore Rules bleiben komplex.
- `N120` - stale Reports bleiben ein Prozessrisiko.

Offene oder teilweise Core-Loop-Blocker:
- `N041` - Admin-zentrierter Week-Fortschritt.
- `N088` - parallele Statusfelder, die neue lokale Direktreads wieder riskant machen koennen.

## Delta Zum Vorherigen Stand

| Delta | Anzahl | Findings |
|---|---:|---|
| Verbessert | 4 | `N037`, `N057`, `N061`, `N112` |
| Gleich geblieben | 116 | Alle uebrigen Findings |
| Verschlechtert | 0 | Keine |

Kurzfassung: Die letzten M-/S-/A-Pakete haben echte Fortschritte gebracht, aber keine neue Problemklasse erzeugt. Der groesste qualitative Sprung ist, dass der Core Loop jetzt deutlich besser ueber Tests und Gate-Checks abgesichert ist. Das Projekt bleibt dennoch nicht production-ready.

## Kategorienanalyse

| Kategorie | Gesamt | GELOEST | TEILWEISE | OFFEN | REGRESSION | Groesste verbleibende Luecken |
|---|---:|---:|---:|---:|---:|---|
| Architektur | 32 | 2 | 12 | 18 | 0 | Monolithen, breite Typ-/UI-Kopplung, duplizierte Test-/Setup-Utilities. |
| State | 9 | 7 | 2 | 0 | 0 | Rohstatusfelder und Admin-/Repair-Mutationsflaeche bleiben strukturell riskant. |
| Flow | 20 | 15 | 5 | 0 | 0 | Week-Fortschritt bleibt adminzentriert; einige UX-/Statusdetails bleiben teilweise. |
| Test/Release | 14 | 10 | 3 | 1 | 0 | Production-Ziel nicht verifiziert; Seed-/Offline-Gates nur teilweise. |
| Security | 10 | 7 | 3 | 0 | 0 | Production-Flags und Rules-Komplexitaet bleiben. |
| Performance | 15 | 0 | 10 | 5 | 0 | Keine Bundle-/Read-Budgets; breite Subscriptions und wachsende Docs bleiben. |
| UI | 13 | 7 | 4 | 2 | 0 | Native Prompts/Confirms, Dashboard-Dichte, einzelne passive Statusbereiche. |
| Scope | 7 | 3 | 4 | 0 | 0 | MVP-Scope ist sichtbar, aber Offline/Draft/Acceptance-Reife bleibt begrenzt. |

## Alle 120 Findings

| Finding | Status | Delta | Code-/Test-Bezug |
|---|---|---|---|
| N001 Codebase ist quantitativ gross | OFFEN | Gleich | Gesamtumfang bleibt hoch; keine systematische Reduktion. |
| N002 Online League Service ist zentraler Monolith | TEILWEISE | Gleich | `online-league-service.ts` wurde um Mapper/Validatoren/Derived-State entlastet, bleibt mit ca. 8620 Zeilen sehr gross. |
| N003 Game Engine Dateien sind sehr gross | OFFEN | Gleich | Keine Engine-Zerlegung; nur Adaptergrenze dokumentiert. |
| N004 `simulateMatch` ist sehr lang und schwer testbar | OFFEN | Gleich | Keine neue Zerlegung der Match-Engine. |
| N005 Online League Placeholder ist grosse Client-Orchestrator-Komponente | TEILWEISE | Gleich | ViewModels existieren, aber Client-Orchestrierung bleibt umfangreich. |
| N006 Admin League Detail ist grosse, schwer reviewbare Komponente | TEILWEISE | Gleich | Admin-Model/Display/Config besser getrennt, Detail-Komponente bleibt komplex. |
| N007 Admin Online Actions sind zu breit | TEILWEISE | Gleich | Policy/Use-Case-Gruppen existieren; `online-admin-actions.ts` bleibt gross und mutierend. |
| N008 `MemoryStorage` Test-Fixtures sind dupliziert | OFFEN | Gleich | Keine zentrale Testfactory belegt. |
| N009 League-/GM-Testsetup ist dupliziert | OFFEN | Gleich | E2E/Unit-Fixtures bleiben verteilt. |
| N010 Server-Action-Feedback-Logik ist dupliziert | OFFEN | Gleich | Kein einheitliches Feedback-Pattern belegt. |
| N011 Player-Seed-Mapping-Logik ist dupliziert | OFFEN | Gleich | Seed-/Draft-Mapping bleibt verteilt. |
| N012 QA-Report-Rendering-Logik ist dupliziert | OFFEN | Gleich | Reports bleiben manuell gepflegt. |
| N013 Admin-/Online-Statuskarten sind aehnlich implementiert | OFFEN | Gleich | Keine gemeinsame Statuskarten-Abstraktion. |
| N014 Viele ungenutzte Export-Kandidaten | TEILWEISE | Gleich | Code-Hygiene triagiert, aber kein unused-export-Gate. |
| N015 TODO/FIXME/HACK-Hinweise sind vorhanden | GELOEST | Gleich | Triage/Report vorhanden; produktiver Suchraum klassifiziert. |
| N016 Viele `console.*`-Vorkommen | TEILWEISE | Gleich | Logging klassifiziert, aber `console.*` bleibt breit vorhanden. |
| N017 Firestore Rules enthalten offene TODOs | GELOEST | Gleich | Rules-Tests laufen; keine offenen TODO-Guards als Blocker. |
| N018 `team.types` ist ein Kopplungshotspot | OFFEN | Gleich | Keine Kontexttrennung umgesetzt. |
| N019 Shared Enums sind stark gekoppelt | OFFEN | Gleich | Globale Enums bleiben breit importiert. |
| N020 Format-Utilities sind stark gekoppelt | OFFEN | Gleich | Formatter nicht kontextuell getrennt. |
| N021 StatusBadge ist breit verwendet | OFFEN | Gleich | Shared UI bleibt breit ohne fachliche Wrapper. |
| N022 Session/Auth ist breit gekoppelt | TEILWEISE | Gleich | Admin-Auth ist konsistenter; allgemeine Auth-Kopplung bleibt. |
| N023 Online League Types sind breit verwendet | TEILWEISE | Gleich | Mapper/Guards helfen, Typmodell bleibt zentral. |
| N024 SectionPanel ist breit verwendet | OFFEN | Gleich | Kein aktiver Abbau. |
| N025 StatCard ist breit verwendet | OFFEN | Gleich | Kein aktiver Abbau. |
| N026 Seeded RNG ist breit gekoppelt | OFFEN | Gleich | Determinismus-Komponente weiter breit. |
| N027 Firebase Admin ist breit gekoppelt | TEILWEISE | Gleich | Build/Tests gruen, aber Boundary-Gate fehlt. |
| N028 Adminzugriff hat Claim-/UID-Allowlist-Komplexitaet | GELOEST | Gleich | Custom Claim ist kanonisch; Admin-Parity/Ruls-Tests gruen. |
| N029 Logout-Recovery muss Online-Kontext bereinigen | GELOEST | Gleich | Rejoin/stale `lastLeagueId` Browser-E2E deckt Recovery ab. |
| N030 Offline Flow wirkt trotz Name auth-/account-gebunden | TEILWEISE | Gleich | Copy besser, Offline-Einstieg nicht voll entkoppelt. |
| N031 Loeschaktionen nutzen native Confirm-Dialoge | OFFEN | Gleich | Native Confirms bleiben. |
| N032 Admin Eingaben nutzen native Prompts | OFFEN | Gleich | Native Prompts bleiben in Admin-Pfaden. |
| N033 Online Join/Rejoin hat viele versteckte Abhaengigkeiten | GELOEST | Gleich | Browser-E2E deckt Rejoin, stale `lastLeagueId`, Reload und Same-Team-Race ab. |
| N034 Fehlende Membership kann Nutzer in Schleifen fuehren | GELOEST | Gleich | Route-State/Recovery-Tests blocken Missing-Membership ohne Loop. |
| N035 Fehlende Team-Zuordnung blockiert Multiplayer | GELOEST | Gleich | No-Team wird sichtbar geblockt und per E2E/Modeltests geprueft. |
| N036 User-Team-Link hat mehrere Inkonsistenzstellen | GELOEST | Gleich | Membership ist kanonisch; Team/Mirror-Projektionen hard-failen oder werden kontrolliert repariert. |
| N037 Globaler League Member Mirror ist doppelte Source of Truth | GELOEST | Verbessert | Discovery-Inventar aktualisiert; Mirror ist Index/Projektion, Direct Load/Rejoin/Server-Access pruefen Membership. |
| N038 Team Assignment kann Race Conditions erzeugen | GELOEST | Gleich | Transaktionale Team-Claims und Browser-Same-Team-Race vorhanden. |
| N039 Ready-State braucht konsistente Persistenz und Anzeige | GELOEST | Gleich | Ready-Gates blockieren No-Team, No-Roster, Draft, Simulation und Completed Week. |
| N040 Admin Week Actions sind semantisch unklar | GELOEST | Gleich | Admin Actions sind gruppiert/konfiguriert und getestet. |
| N041 GM-Fortschritt haengt stark vom Admin Week Flow ab | TEILWEISE | Gleich | Admin Week E2E gruen; Produktmodell bleibt adminzentriert. |
| N042 Nicht-MVP Sidebar-Features sind Coming Soon | GELOEST | Gleich | Navigation/Direct URLs im Browser-Smoke abgedeckt. |
| N043 Offline Nebenfeatures sind unvollstaendig | TEILWEISE | Gleich | Scope sichtbarer, Features bleiben begrenzt. |
| N044 Draft MVP ist begrenzt | TEILWEISE | Gleich | Draft-Core stabil, Umfang bewusst MVP-begrenzt. |
| N045 Active Draft darf nicht automatisch Fullscreen oeffnen | GELOEST | Gleich | Navigation/Flow-Tests decken Status ab. |
| N046 Active Draft kann andere Bereiche blockierend wirken lassen | GELOEST | Gleich | Navigation unterscheidet Draft und teamgebundene Bereiche. |
| N047 Completed Draft braucht klare Statusdarstellung | TEILWEISE | Gleich | Status vorhanden, Admin-/Detailtiefe begrenzt. |
| N048 Draft State hat mehrere Race- und Truth-Risiken | GELOEST | Gleich | Pick Docs/Available Docs/Legacy-Konflikte sind runtime- und testseitig hart. |
| N049 Online Navigation mischt Hashes und Routen | TEILWEISE | Gleich | Route-Fallbacks getestet; Mischmodell bleibt. |
| N050 Statuskarten erzeugen visuelle Konkurrenz | TEILWEISE | Gleich | Copy/Fokus besser, keine visuelle Messung. |
| N051 Terminologie ist inkonsistent | GELOEST | Gleich | Glossar und Copy-Anpassungen vorhanden. |
| N052 First-Time und Returning Player Einstieg sind nicht eindeutig | TEILWEISE | Gleich | Continue-State getestet, UX-Priorisierung bleibt ausbaufaehig. |
| N053 Admin UI ist ueberladen | GELOEST | Gleich | Admin-Struktur und Action-Konfig getestet. |
| N054 Admin-Aktionen koennen versehentlich datenveraendernd sein | TEILWEISE | Gleich | Guards/Confirm/Audit existieren, Mutationsflaeche bleibt breit. |
| N055 Zwei Architekturmodelle laufen parallel | OFFEN | Gleich | Keine Zielarchitektur-Konsolidierung. |
| N056 Multiplayer UI, State und Persistence sind eng gekoppelt | TEILWEISE | Gleich | ViewModels/Lifecycle helfen, grosse Komponenten bleiben gekoppelt. |
| N057 Firebase Online Repository ist zu breit | GELOEST | Verbessert | Repository ist in Queries, Commands, Subscriptions und Mapper getrennt; Public API bleibt Facade. |
| N058 Firebase Admin darf nicht in Client Bundles gelangen | TEILWEISE | Gleich | Build gruen; explizites Import-Boundary-Gate fehlt. |
| N059 UI importiert Domain- und Application-Typen breit | TEILWEISE | Gleich | ViewModels reduzieren, Imports bleiben breit. |
| N060 Application Services importieren UI-Modelle | OFFEN | Gleich | Abhaengigkeitsrichtung nicht systematisch korrigiert. |
| N061 Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten | GELOEST | Verbessert | Adaptervertrag dokumentiert; Preflight und E2E blockieren invalide Multiplayer-Simulationsdaten. |
| N062 Admin `Details verwalten` und `Oeffnen` sind redundant | GELOEST | Gleich | Admin-Action-Struktur geklaert. |
| N063 Firebase Multiplayer Training ist nur eingeschraenkt | GELOEST | Gleich | Online-MVP Scope/Coming-Soon begrenzt Nebenfeatures. |
| N064 Admin Draft Status ist nur ein Hinweisbereich | TEILWEISE | Gleich | Kernpfade getestet, Statusbereich bleibt passiv. |
| N065 Auth Debug ist technisch formuliert | GELOEST | Gleich | Debug-Copy ist Admin/Dev-begrenzt. |
| N066 Dashboard kann ueberladen wirken | TEILWEISE | Gleich | Core-Loop klarer, Dashboard-Dichte bleibt. |
| N067 Team Management braucht klare No-Team- und No-Roster-Zustaende | GELOEST | Gleich | UI/Service/E2E decken No-Team/No-Roster ab. |
| N068 Week Simulation braucht gueltigen Schedule | GELOEST | Gleich | Simulation blockiert ohne gueltigen Schedule klar. |
| N069 Week Simulation braucht vorhandene Teams | GELOEST | Gleich | Missing-Team/Roster-Guards getestet. |
| N070 Online League Route Bundle ist gross | TEILWEISE | Gleich | Baseline vorhanden, kein Budget-Gate. |
| N071 Online Draft Route Bundle ist gross | TEILWEISE | Gleich | Gemessen, aber nicht budgetiert. |
| N072 Admin Route Bundle ist gross | TEILWEISE | Gleich | Gemessen, aber nicht budgetiert. |
| N073 Savegames Route Bundle ist gross | TEILWEISE | Gleich | Gemessen, aber nicht budgetiert. |
| N074 Wenige dynamische Imports | OFFEN | Gleich | Keine Lazy-Import-Strategie umgesetzt. |
| N075 `subscribeToLeague` liest zu viele Datenbereiche | TEILWEISE | Gleich | Repository-Struktur besser, Subscription bleibt breit. |
| N076 Lobby-/Teamreads koennen N+1 erzeugen | TEILWEISE | Gleich | Join stabil, aber kein Read-Fanout-Budget. |
| N077 Events werden breit reloadet | OFFEN | Gleich | Events bleiben breit gekoppelt. |
| N078 League Document kann stark wachsen | OFFEN | Gleich | Results/Schedule/Standings bleiben potentiell doc-lastig. |
| N079 Firestore Reads/Writes sind Kostenrisiko | TEILWEISE | Gleich | Messbericht vorhanden, kein regelmaessiges Gate. |
| N080 Route-Bundles koennen weiter wachsen | TEILWEISE | Gleich | Build sichtbar, keine Grenzwerte. |
| N081 Online Detail Models berechnen mehrfach | TEILWEISE | Gleich | Modeltests vorhanden, Selector-/Memo-Strategie nicht abgeschlossen. |
| N082 Standings-Fallback scannt Results | OFFEN | Gleich | Persistierte Standings-Projektion nicht hart validiert. |
| N083 Draft Room sortiert gesamten Spielerpool | TEILWEISE | Gleich | Memoisierung vorhanden, Pool-Sort bleibt. |
| N084 Roster-/Depth-Listen sind nicht breit virtualisiert | OFFEN | Gleich | Keine Virtualisierung; fuer MVP-Datenmenge toleriert. |
| N085 Stale `lastLeagueId` kann Nutzer blockieren | GELOEST | Gleich | Browser-Rejoin und stale-Recovery sind abgedeckt. |
| N086 Draft Pick und Draft State koennen parallel kollidieren | GELOEST | Gleich | Draft-Race/Integrity-Tests vorhanden. |
| N087 Week Simulation kann doppelt oder parallel laufen | GELOEST | Gleich | Lock/Idempotenz/Paralleltests vorhanden. |
| N088 Multiplayer hat viele parallele Statusfelder | TEILWEISE | Gleich | Lifecycle normalisiert, aber Rohfelder koennen weiter direkt gelesen werden. |
| N089 Zentrale Online State Machine fehlt | GELOEST | Gleich | Pure Lifecycle Read-Model mit Phasen, Transitionen, Admin-Modus und Tests existiert. |
| N090 Week Status hat doppelte Wahrheit | GELOEST | Gleich | `completedWeeks` ist kanonisch; Konflikte hard-failen. |
| N091 `currentWeek` darf nur nach erfolgreicher Simulation steigen | GELOEST | Gleich | Week Advance ist an erfolgreiche Simulation gekoppelt und getestet. |
| N092 Admin-/Repair-Scripts koennen Multiplayer-State veraendern | TEILWEISE | Gleich | Guards/Flags existieren, Script-Flaeche bleibt breit. |
| N093 Ready waehrend Simulation ist Race-Risiko | GELOEST | Gleich | Ready-Write-Gates nutzen Lifecycle und blockieren Simulation/Lock. |
| N094 Core Loop ist dokumentiert, aber eng | TEILWEISE | Gleich | Core Loop laeuft im E2E, Produktvertrag bleibt eng. |
| N095 Adminmodus ist fuer normale Spieler zu prominent | GELOEST | Gleich | Admin-Zugang folgt Custom Claim und Gate-Tests. |
| N096 Redundante Admin Actions konkurrieren sichtbar | GELOEST | Gleich | Action-Konfiguration/Gruppierung getestet. |
| N097 Nicht-MVP-Features duerfen nicht aktiv konkurrieren | GELOEST | Gleich | Coming-Soon und MVP-Navigation sind Browser-getestet. |
| N098 MVP-Zustand ist Gelb | TEILWEISE | Gleich | Lokale Gates gruen, Production/Architektur offen. |
| N099 Multiplayer Acceptance und UX-Audit widersprechen sich | TEILWEISE | Gleich | Aktuelle Reports klaeren, alte Reports bleiben im Baum. |
| N100 Vitest Suite ist vorhanden und umfangreich | GELOEST | Gleich | Relevante Suites laufen gruen. |
| N101 E2E scheitert lokal an DB-Verbindung | GELOEST | Gleich | DB-Preflight/Setup vorhanden; aktueller Multiplayer-E2E nicht DB-blockiert. |
| N102 Firebase Parity braucht Emulator-Portbindung | GELOEST | Gleich | Emulator braucht freie Ports; ausserhalb Sandbox laeuft Parity gruen. |
| N103 Authentifizierter Staging Smoke fehlt als bestaetigtes Gate | GELOEST | Gleich | Staging-Smoke-Gate und Build-Info-Arbeit vorhanden; in diesem Audit nicht mutierend gegen Staging gestartet. |
| N104 Multiplayer GM Rejoin Browser-Test fehlt | GELOEST | Gleich | Rejoin-Browserflow mit Reload und stale `lastLeagueId` existiert. |
| N105 Admin Week E2E Reload-Test fehlt | GELOEST | Gleich | Browser-E2E prueft Admin Week Simulation, Reload und Doppelsimulation. |
| N106 Tests fuer parallele Multiplayer-Aktionen fehlen | GELOEST | Gleich | Browser-E2E enthaelt Same-Team-Join-Race; Unit-Tests decken Ready/Simulation/Draft-Races. |
| N107 Firestore Rules Tests fuer Admin fehlen | GELOEST | Gleich | Admin-/Cross-user-Rules-Tests existieren und sind gruen. |
| N108 Sidebar/Coming-Soon Browser-Test fehlt | GELOEST | Gleich | Browser-Smoke prueft MVP-Navigation und Direct URLs. |
| N109 Seed/Reset Emulator-Integration fehlt | TEILWEISE | Gleich | Seeds laufen im E2E, eigener Reset-/Seed-Integrationstest fehlt. |
| N110 Savegames Offline Flow mit DB ist nicht ausreichend getestet | TEILWEISE | Gleich | Prisma-/DB-Setup vorhanden, tiefer Offline-Flow fehlt. |
| N111 A11y/Mobile Smoke fehlt | GELOEST | Gleich | Browser-Smoke prueft Mobile Viewport, Button-Namen und Console Errors. |
| N112 QA-Gruen und E2E-Rot widersprechen sich | GELOEST | Verbessert | Aktuelle Checks sind gemeinsam gruen; dieser Report ersetzt den roten Zwischenstand. |
| N113 Env-Dateien existieren lokal und muessen ignoriert bleiben | GELOEST | Gleich | `.gitignore` deckt `.env`/`.env.*` ab. |
| N114 Public Firebase API Key kommt in Config/Scripts vor | GELOEST | Gleich | Als public Web Config bewertet, nicht Secret. |
| N115 Runtime Guards schuetzen Umgebungen | GELOEST | Gleich | Runtime-/Preview-Guards existieren. |
| N116 Production Firestore kann per Flag aktiviert werden | TEILWEISE | Gleich | Guards vorhanden, Production-Cutover nicht bewiesen. |
| N117 Production App Hosting Ziel ist nicht verifiziert | OFFEN | Gleich | Production Preflight nicht mit echten Zielparametern belegt. |
| N118 Staging Smoke kann an IAM `signJwt` scheitern | GELOEST | Gleich | Letzter Smoke-/Gate-Pfad nutzt IAM-Fallback erfolgreich; nicht in diesem Audit wiederholt. |
| N119 Firestore Rules sind komplex und clientseitig restriktiv | TEILWEISE | Gleich | Rules-Tests gruen, Komplexitaet bleibt hoch. |
| N120 Dokumentation und Reports koennen stale werden | TEILWEISE | Gleich | Dieser Report ist aktuell, alte Reports bleiben aber als stale Risiko im Baum. |

## Top Offene Probleme

### 1. Core Loop Risiko

- `N041`: Week-Fortschritt ist weiterhin vom Admin Week Flow abhaengig. Technisch ist der Flow getestet, aber das Produktmodell bleibt betrieblich eng.
- `N088`: Lifecycle Read-Model entschärft parallele Statusfelder, ersetzt aber nicht alle Rohfelder als Persistenzmodell.
- `N094`: Core Loop ist lauffaehig, aber bewusst schmal; echte User koennen an Scope-Grenzen stossen.

### 2. State / Konsistenz

- `N088`: Neue UI-/Admin-Pfade koennen Rohfelder wieder direkt lesen, wenn keine Architekturgrenze greift.
- `N092`: Admin-/Repair-Scripts koennen weiterhin Multiplayer-State veraendern; Guards helfen, ersetzen aber keine kleine, harte Mutationsoberflaeche.
- `N119`: Rules-Komplexitaet macht Inkonsistenzen zwischen Client- und Servermodellen weiterhin moeglich.

### 3. Security

- `N116`: Production-Firestore-Flags bleiben ein Betriebsrisiko, solange der Cutover nicht nachweisbar und dokumentiert ist.
- `N119`: Rules sind getestet, aber komplex. Kuenftige Aenderungen brauchen strikte Parity-Matrix.
- `N054`: Admin-Mutationen sind besser abgesichert, aber die Mutationsflaeche bleibt breit.

### 4. Architektur / Wartbarkeit

- `N002`, `N005`, `N006`, `N007`: Kernmodule sind besser geschnitten, aber weiterhin gross.
- `N055`, `N060`: Parallele Architekturmodelle und Abhaengigkeitsrichtungen sind nicht systematisch bereinigt.
- `N008`-`N013`: Test-/Report-/Setup-Duplizierung bleibt.

### 5. Performance / Kosten

- `N070`-`N083`: Messung existiert, aber keine Budgets und keine CI-Grenzen.
- `N075`: `subscribeToLeague` bleibt datenbreit.
- `N078`, `N082`: League-Doc-Wachstum und Standings-Fallback bleiben Skalierungsrisiken.

### 6. UI / Scope

- `N030`, `N031`, `N032`: Offline/Auth-Entry und native Dialoge sind noch nicht sauber.
- `N043`, `N044`, `N098`, `N099`: Scope ist klarer, aber MVP-Reife und alte Bewertungsreports bleiben teilweise.

## Reality Check

- **Ist das System jetzt robust gegen echte User?** Fuer den Internal-MVP-Core-Loop deutlich ja: Login, Join/Rejoin, Ready, Admin Week Simulation, Results/Standings Reload, No-Team/No-Roster und Coming-Soon/Mobile sind lokal browserseitig abgesichert. Gegen grosse echte Last, Production-Cutover und lange Saison-/Datenmengen ist es noch nicht robust bewiesen.
- **Gibt es noch versteckte State-Probleme?** Ja, aber weniger im Happy Path. Die groesste Restflaeche ist, dass Rohfelder weiter existieren und neue Codepfade sie direkt lesen koennen.
- **Gibt es Bereiche, die funktionieren, aber strukturell unsauber sind?** Ja: `online-league-service.ts`, `online-admin-actions.ts`, grosse UI-Orchestratoren, Rules-Komplexitaet und Performance-/Subscription-Breite.
- **Wo wurde nur symptomatisch gefixt?** Performance ist vor allem gemessen statt begrenzt. Report-Governance ist verbessert, aber stale Reports bleiben. Admin-Mutationen sind guarded, aber noch nicht auf eine wirklich kleine Oberflaeche reduziert.

## Fazit

- **Internal MVP: Go.** Core Loop ist lokal und im Firebase-Browser-E2E gruen genug fuer interne Nutzung.
- **Staging QA: Go.** QA kann weiterlaufen; fuer ein Release-Gate muss der jeweils aktuelle Staging-Smoke gegen den deployten Commit separat bestaetigt bleiben.
- **Production: No-Go.** Production App Hosting Ziel, Production-Firestore-Cutover, Performance-Budgets und Report-Governance sind noch nicht hart genug.
