# Root Causes zu `_categorized-findings.md`

Ursprung:
- `docs/reports/full-project-analysis/_normalized-findings.md`
- `docs/reports/full-project-analysis/_categorized-findings.md`

Anzahl Findings: 120

Regel: Ursachen beschreiben Systemursachen, nicht sichtbare Symptome. Wenn aus den Reports keine belastbare Ursache ableitbar ist, ist `Ursache unklar` eingetragen.

## Haeufigste Ursachen

- Fehlende oder zu schwache Modulgrenzen zwischen UI, State, Domain, Persistence und Admin/API.
- Fehlende zentrale State Machine fuer Multiplayer-Lifecycle, Draft, Ready und Week Progression.
- Doppelte Sources of Truth in Firestore und lokalem Client-State.
- Zu breite Firestore-Subscriptions und wachsende Dokumentstrukturen.
- Fehlende oder fragile E2E-/Smoke-Testabdeckung fuer reale Multiplayer- und Admin-Flows.
- Unklare MVP-Abgrenzung, wodurch nicht fertige Features sichtbar bleiben.
- Unterschiedliche Sicherheitsmodelle zwischen App/API, Firebase Custom Claims, UID-Allowlist und Firestore Rules.
- Deployment-/Environment-Informationen sind nicht voll verifiziert oder nicht strikt getrennt.

## Wiederkehrende Muster

- Monolithische Dateien entstehen dort, wo neue Multiplayer-/Admin-Faehigkeiten ohne klare Fachmodule ergaenzt wurden.
- Viele UI-Probleme haben dieselbe Ursache: Funktionen sind sichtbar, aber nicht sauber in Flow, State und Datenquelle eingebettet.
- Viele State-Probleme entstehen durch Spiegel-Dokumente, lokale Speicherung und Firestore-Dokumentfelder ohne zentrale Invarianten.
- Viele Testprobleme entstehen dadurch, dass kritische reale Flows nur lokal/unit-getrieben, aber nicht als authentifizierte Browser-/Staging-Flows abgesichert sind.
- Security- und Release-Risiken entstehen vor allem durch unterschiedliche Umgebungsmodelle und unvollstaendig verifizierte Production-Konfiguration.

## Root-Cause-Tabelle

| Finding | Ursache | Betroffene Systemteile |
|---|---|---|
| N001 - Codebase ist quantitativ gross | Ursache unklar; die Reports nennen Wachstum und Umfang, aber keine einzelne Entstehungsursache. | gesamtes Repository |
| N002 - Online League Service ist zentraler Monolith | Fehlende fachliche Modulgrenzen im Online-/Multiplayer-Layer; neue Features wurden in einem zentralen Service gebuendelt statt nach Draft, Week, Teams, Memberships und Persistence getrennt. | `src/lib/online/online-league-service.ts`, Online Domain, Online Persistence |
| N003 - Game Engine Dateien sind sehr gross | Fehlende interne Aufteilung der Engine in kleinere Regel-, Playbook-, Simulation- und Ergebnis-Module. | `src/modules/gameplay/play-library.ts`, `src/modules/gameplay/match-engine.ts` |
| N004 - `simulateMatch` ist sehr lang und schwer testbar | Simulation Control Flow, Match State Mutationen und Ergebnisberechnung liegen in einer grossen Funktion statt in getrennten, testbaren Schritten. | `src/modules/gameplay/match-engine.ts`, Match Simulation |
| N005 - Online League Placeholder ist grosse Client-Orchestrator-Komponente | UI, abgeleitete Daten, lokale States und Action Handler wurden in einer Client-Komponente zusammengefuehrt. | `src/components/online/online-league-placeholder.tsx`, Online Dashboard |
| N006 - Admin League Detail ist grosse, schwer reviewbare Komponente | Admin-Anzeige, Debug, Mutationen, Statuslogik und Action-Konfiguration wurden in einer Komponentenebene gebuendelt. | `src/components/admin/admin-league-detail.tsx`, Admin League UI |
| N007 - Admin Online Actions sind zu breit | Fehlende Trennung zwischen API-Action-Routing, Admin-Use-Cases, Firestore-Zugriffen und League-Domain-Operationen. | `src/lib/admin/online-admin-actions.ts`, Admin API, Firestore Writes |
| N008 - `MemoryStorage` Test-Fixtures sind dupliziert | Gemeinsame Test-Fixtures wurden nicht zentral bereitgestellt oder konsequent wiederverwendet. | Test-Fixtures, Unit-/Integrationstests |
| N009 - League-/GM-Testsetup ist dupliziert | Wiederverwendbares Multiplayer-Testsetup fehlt oder wird nicht einheitlich importiert. | Online-/Admin-Tests, Test Fixtures |
| N010 - Server-Action-Feedback-Logik ist dupliziert | Feedback-State und Server-Action-Ergebnisbehandlung sind nicht als gemeinsames UI-/Hook-Pattern gekapselt. | Server Actions, Client Components |
| N011 - Player-Seed-Mapping-Logik ist dupliziert | Seed- und Player-Mapping besitzen keine zentrale Transformationsfunktion. | Seed Scripts, Online Player Mapping |
| N012 - QA-Report-Rendering-Logik ist dupliziert | Report-Erzeugung nutzt keine gemeinsame Template-/Renderer-Hilfslogik. | Docs-/Report-Generatoren |
| N013 - Admin-/Online-Statuskarten sind aehnlich implementiert | Gemeinsame Statuskarten-Varianten oder View-Modelle fehlen. | Admin UI, Online UI, Shared Components |
| N014 - Viele ungenutzte Export-Kandidaten | Oeffentliche Moduloberflaechen wurden erweitert, ohne ungenutzte Exports regelmaessig zu entfernen. | mehrere Source-Dateien, Barrel Exports |
| N015 - TODO/FIXME/HACK-Hinweise sind vorhanden | Ursache unklar; die Reports nennen offene Markierungen, aber nicht fuer jede Markierung den Entstehungskontext. | mehrere Source- und Config-Dateien |
| N016 - Viele `console.*`-Vorkommen | Debug-/Observability-Code ist nicht klar zwischen produktiven Logs, Script-Ausgaben und temporarem Debugging getrennt. | `scripts/*`, Observability, Debug Code |
| N017 - Firestore Rules enthalten offene TODOs | Berechtigungsmodell und Schreibstrategie sind nicht voll formalisiert. | `firestore.rules`, Firestore Security Model |
| N018 - `team.types` ist ein Kopplungshotspot | Team-Domain-Typen werden als gemeinsames Querschnittsmodell ohne engere bounded contexts verwendet. | `src/types/team.types.ts`, Team Domain |
| N019 - Shared Enums sind stark gekoppelt | Globale Enums dienen mehreren Fachbereichen als gemeinsame Abhaengigkeit statt bereichsspezifisch gekapselt zu sein. | `src/shared/domain/enums*`, Domain Types |
| N020 - Format-Utilities sind stark gekoppelt | Formatierungslogik ist zentralisiert, aber ohne klare Trennung zwischen Domain-, UI- und Report-Formatting. | Format Utilities |
| N021 - StatusBadge ist breit verwendet | Statusdarstellung ist zentral, aber Statusmodell und Varianten sind nicht fachlich gekapselt. | StatusBadge Components |
| N022 - Session/Auth ist breit gekoppelt | Auth-/Session-Zustand wird von vielen UI- und Servicebereichen direkt benoetigt statt ueber engere Facades. | `src/lib/auth/session*`, Auth Consumers |
| N023 - Online League Types sind breit verwendet | Online-League-Datenmodell ist zentrale Importbasis fuer viele Schichten. | `src/lib/online/online-league-types.ts`, Online UI/Services |
| N024 - SectionPanel ist breit verwendet | Gemeinsames Layout-Primitive wird stark genutzt; Ursache unklar, ob problematisch oder erwarteter Shared-Component-Effekt. | SectionPanel Components |
| N025 - StatCard ist breit verwendet | Gemeinsames Status-/Metrik-Primitive wird stark genutzt; Ursache unklar, ob problematisch oder erwarteter Shared-Component-Effekt. | StatCard Components |
| N026 - Seeded RNG ist breit gekoppelt | Deterministische Logik haengt zentral an einem gemeinsamen RNG Utility. | Seeded RNG Utility, Simulation/Seeds |
| N027 - Firebase Admin ist breit gekoppelt | Serverseitige Firebase-Funktionen sind fuer viele Scripts/API-Pfade direkte Abhaengigkeit statt ueber schmale Server-Facades isoliert. | `src/lib/firebase/admin.ts`, Scripts, Admin API |
| N028 - Adminzugriff hat Claim-/UID-Allowlist-Komplexitaet | Es existieren mehrere Admin-Autorisierungsquellen ohne voll harmonisiertes Sicherheitsmodell zwischen UI, API und Rules. | Admin Auth Gate, Admin Action Guard, `firestore.rules`, Admin Claims/Allowlist |
| N029 - Logout-Recovery muss Online-Kontext bereinigen | Lokaler Online-Kontext und Firebase-Auth-Session sind gekoppelt, aber der Cleanup ist ein eigener Zustandsuebergang. | Auth UI, Online Context, LocalStorage |
| N030 - Offline Flow wirkt trotz Name auth-/account-gebunden | Produkt-/Flow-Modell trennt Offline-Modus und Account-/Savegame-Voraussetzungen nicht klar genug. | Savegames Screen, Auth UI, Offline Entry |
| N031 - Loeschaktionen nutzen native Confirm-Dialoge | Es fehlt ein gemeinsames, app-integriertes Confirm-Dialog-Pattern. | Savegames UI, Admin UI |
| N032 - Admin Eingaben nutzen native Prompts | Es fehlt ein Admin-spezifisches Form-/Modal-Pattern fuer GM- und Debug-Eingaben. | Admin League Detail, Admin Forms |
| N033 - Online Join/Rejoin hat viele versteckte Abhaengigkeiten | Join/Rejoin ist kein einzelner transaktionaler Use Case mit klaren Invarianten, sondern haengt an mehreren Datenquellen und lokalem State. | Online Hub, Membership Services, Team Assignment, LocalStorage |
| N034 - Fehlende Membership kann Nutzer in Schleifen fuehren | Recovery fuer kaputte oder fehlende Memberships ist nicht als expliziter State mit klarer Reparatur-/Fallback-Route modelliert. | Online Hub, Route State, Membership Recovery |
| N035 - Fehlende Team-Zuordnung blockiert Multiplayer | Membership und Team Assignment sind nicht als atomare, immer gemeinsam gueltige Verbindung abgesichert. | Online Hub, Team Linking, Team Assignment |
| N036 - User-Team-Link hat mehrere Inkonsistenzstellen | User-Team-Zuordnung ist ueber Membership, Mirror und Team-Felder verteilt und besitzt keine einzelne Source of Truth. | League Memberships, `leagueMembers`, Team Documents |
| N037 - Globaler League Member Mirror ist doppelte Source of Truth | Lokale League-Membership und globaler Mirror werden parallel gepflegt. | `leagues/{leagueId}/memberships/{uid}`, `leagueMembers/{leagueId_uid}` |
| N038 - Team Assignment kann Race Conditions erzeugen | Team-Join-Zuweisung braucht transaktionale Reservierung oder eindeutige Constraints, die in den Findings nicht als ausreichend belegt sind. | Join/Rejoin Team Assignment |
| N039 - Ready-State braucht konsistente Persistenz und Anzeige | Ready-State ist ueber UI, Membership/Team State und Week Preconditions verteilt statt zentral aus einer Invariante abgeleitet. | Online Dashboard, Ready State, Week Simulation |
| N040 - Admin Week Actions sind semantisch unklar | Admin-UI benennt oder gruppiert Week-Aktionen nicht eindeutig nach ihrem tatsaechlichen Datenuebergang. | Admin League Detail, Admin Week UI |
| N041 - GM-Fortschritt haengt stark vom Admin Week Flow ab | Multiplayer-Week-Progression ist adminzentriert, ohne eigenstaendigen GM-seitigen Fortschrittsabschluss. | Week Flow, Admin API, Online Dashboard |
| N042 - Nicht-MVP Sidebar-Features sind Coming Soon | Produktumfang ist groesser sichtbar als die implementierte MVP-Funktionalitaet. | Multiplayer Sidebar, Contracts/Cap, Development, Trade Board, Inbox, Finance |
| N043 - Offline Nebenfeatures sind unvollstaendig | Feature-Scope enthaelt Offline-Nebenbereiche, die noch nicht auf MVP-Niveau implementiert sind. | Offline Finance/Trade UI, Offline Development UI |
| N044 - Draft MVP ist begrenzt | Draft wurde als MVP-Schnitt implementiert, nicht als vollstaendiges Langzeit-Feature. | Draft Room, Online Draft UI |
| N045 - Active Draft darf nicht automatisch Fullscreen oeffnen | Navigationslogik wurde oder koennte an Draft-Status gekoppelt sein statt an explizite Nutzeraktion. | Online Draft Route, Dashboard Navigation |
| N046 - Active Draft kann andere Bereiche blockierend wirken lassen | Feature-Gating bei aktivem Draft ist nicht klar genug als Zustand und Begruendung sichtbar. | Sidebar, Online Dashboard, Draft Flow |
| N047 - Completed Draft braucht klare Statusdarstellung | Draft Completion wird nicht ausreichend als eigener UI-State kommuniziert. | Draft UI, Dashboard, Sidebar Guards |
| N048 - Draft State hat mehrere Race- und Truth-Risiken | Draft State ist ueber mehrere Dokumente und Ableitungen verteilt; Pick- und Finalize-Pfade brauchen transaktionale Invarianten. | Draft Firestore Model, Draft Pick Logic, Draft Finalization, Roster Writes |
| N049 - Online Navigation mischt Hashes und Routen | Navigationsmodell fuer Online-Unterbereiche ist nicht einheitlich als Route- oder In-Page-Section-Modell definiert. | Online League UI, Online Navigation, Sidebar |
| N050 - Statuskarten erzeugen visuelle Konkurrenz | UI-Hierarchie und Status-Priorisierung sind nicht streng genug definiert. | Dashboard, Admin UI, Statuskarten |
| N051 - Terminologie ist inkonsistent | Es fehlt ein gemeinsames Produkt-/UI-Wording fuer App, Hauptmenue, Savegames und Online-Kontext. | Navigation, Savegames, Admin UI, Online UI |
| N052 - First-Time und Returning Player Einstieg sind nicht eindeutig | Einstiegspunkt priorisiert nicht eindeutig zwischen Continue, Neu starten, Online und Admin. | Savegames Screen, Resume Flow, Online Hub |
| N053 - Admin UI ist ueberladen | Admin Control Center kombiniert Uebersicht, Debug, Mutationen und Detailnavigation ohne klare Informationsarchitektur. | Admin Control Center, Admin League Detail, Debug Panels |
| N054 - Admin-Aktionen koennen versehentlich datenveraendernd sein | Mutierende Admin Use Cases sind sichtbar eng neben nicht-destruktiven Anzeigen platziert und brauchen staerkere Guard-/Confirm-Grenzen. | Admin League Detail, Admin Actions, Admin API |
| N055 - Zwei Architekturmodelle laufen parallel | Singleplayer/Modules und Online/Lib wurden historisch oder fachlich getrennt entwickelt, ohne gemeinsame Zielarchitektur. | `src/modules/*`, `src/lib/online/*` |
| N056 - Multiplayer UI, State und Persistence sind eng gekoppelt | Multiplayer-Flow besitzt keine klare Schichtentrennung zwischen View, Route State, Domain Use Cases und Firestore Repository. | `src/components/online/*`, `src/lib/online/*` |
| N057 - Firebase Online Repository ist zu breit | Firestore Query-, Command-, Mapper- und Subscription-Aufgaben wurden in einem Repository-Layer zusammengezogen. | Firebase Online Repository, Online League Repository |
| N058 - Firebase Admin darf nicht in Client Bundles gelangen | Server-only und client-safe Admin/Firebase-Module muessen strikt getrennt sein; Barrel-Importe koennen diese Grenze verwischen. | `src/lib/firebase/admin.ts`, Admin/Auth Imports, Firebase Imports |
| N059 - UI importiert Domain- und Application-Typen breit | UI-Schicht konsumiert interne Fachmodelle direkt statt ueber view-spezifische Modelle oder Facades. | `src/components/*`, `src/modules/*`, `src/lib/online/*` |
| N060 - Application Services importieren UI-Modelle | Abhaengigkeitsrichtung ist teilweise invertiert; Application-Schicht kennt UI-nahe Modelle. | `team-roster.service`, `team-trade.service`, `decision-effects` |
| N061 - Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten | Es fehlt ein stabiler Adaptervertrag zwischen Multiplayer-Teamdaten und Singleplayer-/Engine-Simulationsmodell. | Game Engine, Online Simulation Adapter, Online Services, Local/Firebase Adapters |
| N062 - Admin `Details verwalten` und `Oeffnen` sind redundant | Admin-Ligenliste hat keine klare Action-Taxonomie fuer Navigation versus Verwaltung. | Admin League Manager |
| N063 - Firebase Multiplayer Training ist nur eingeschraenkt | Training wurde nicht als vollstaendiger Firebase-MVP-Use-Case implementiert. | Online Training UI |
| N064 - Admin Draft Status ist nur ein Hinweisbereich | Admin-Draft-Daten sind nicht in eine verwaltbare Detailansicht oder Action-Struktur eingebunden. | Admin League Detail |
| N065 - Auth Debug ist technisch formuliert | Debug-Informationen werden direkt nutzer-/adminnah angezeigt statt in eine technische Debug-Schicht mit passender Sprache gekapselt. | Auth Debug UI, Admin Debug UI |
| N066 - Dashboard kann ueberladen wirken | Dashboard aggregiert viele Status- und Detailinformationen ohne harte Priorisierung nach Spieleraufgabe. | Online Dashboard |
| N067 - Team Management braucht klare No-Team- und No-Roster-Zustaende | Teamseiten setzen implizit gueltige Team-/Roster-Daten voraus, statt fehlende Voraussetzungen als eigenen Flow-State zu modellieren. | Team Overview, Roster, Depth Chart |
| N068 - Week Simulation braucht gueltigen Schedule | Schedule ist notwendige Datenvoraussetzung, aber nicht als eigener validierter Readiness-State ausreichend zentral sichtbar. | Week Simulation, League Schedule |
| N069 - Week Simulation braucht vorhandene Teams | Teamdaten sind notwendige Simulationsvoraussetzung, aber Validierung und UI-Fallback muessen diesen State explizit behandeln. | Week Simulation, Teams |
| N070 - Online League Route Bundle ist gross | Grosse Client-Komponenten und breite Runtime-Imports landen in der Online-League-Route. | Online League Route |
| N071 - Online Draft Route Bundle ist gross | Draft UI und zugehoerige Runtime-Abhaengigkeiten werden in einem grossen Route-Bundle geladen. | Online Draft Route |
| N072 - Admin Route Bundle ist gross | Admin-Route laedt breite Admin-UI- und Action-nahe Module. | Admin Route |
| N073 - Savegames Route Bundle ist gross | Savegames-Route kombiniert Einstieg, Auth, Online/Admin-Zugaenge und Savegame UI. | Savegames Route |
| N074 - Wenige dynamische Imports | Route- und Feature-Code wird nur begrenzt lazy geladen. | grosse Client-Komponenten, Route Bundles |
| N075 - `subscribeToLeague` liest zu viele Datenbereiche | Eine Subscription ist fuer mehrere fachlich getrennte Datenbereiche verantwortlich statt feiner nach View/Need getrennt zu laden. | `src/lib/online/online-league-service.ts`, Online Dashboard, Firestore Subscriptions |
| N076 - Lobby-/Teamreads koennen N+1 erzeugen | Teamdaten werden wahrscheinlich einzeln oder nicht aggregiert genug geladen. | Online Hub, League Repository |
| N077 - Events werden breit reloadet | Eventdaten sind an breite League-Subscription gekoppelt statt selektiv nach Bedarf geladen. | Online League Events, Firestore Subscriptions |
| N078 - League Document kann stark wachsen | Zeitreihen- und Ergebnisdaten werden im League-Dokument oder an zu zentraler Stelle gesammelt statt in skalierbaren Subcollections/Views. | Firestore League Document |
| N079 - Firestore Reads/Writes sind Kostenrisiko | Datenzugriff folgt breiten Listenern und wachsendem Dokumentmodell statt view-spezifischen, kleinen Reads. | Firestore Subscriptions, League Document, Online Repository |
| N080 - Route-Bundles koennen weiter wachsen | Grosse Featurebereiche sind noch nicht konsequent in lazy geladene Module getrennt. | Online, Draft, Admin, Savegames Routes |
| N081 - Online Detail Models berechnen mehrfach | Abgeleitete View Models werden mehrfach im Render-/Datenpfad berechnet statt zentral memoisiert oder voraggregiert. | Online Detail Model Helpers |
| N082 - Standings-Fallback scannt Results | Standings werden bei fehlender Persistenz aus Roh-Results rekonstruiert statt immer als konsistente Projektion vorzuliegen. | Standings/Results Helpers |
| N083 - Draft Room sortiert gesamten Spielerpool | Available-Players-View wird aus dem vollen Pool berechnet statt ueber vorgefilterte/inkrementelle Datenstrukturen. | `src/components/online/online-fantasy-draft-room.tsx` |
| N084 - Roster-/Depth-Listen sind nicht breit virtualisiert | Listenkomponenten sind auf aktuelle MVP-Groessen ausgelegt und nicht generell fuer groessere Datenmengen virtualisiert. | Roster UI, Depth Chart UI |
| N085 - Stale `lastLeagueId` kann Nutzer blockieren | Lokaler Persistenzstate wird als Einstiegspunkt genutzt, ohne immer zuerst gegen aktuelle Membership/League-Daten zu normalisieren. | LocalStorage, Online Hub |
| N086 - Draft Pick und Draft State koennen parallel kollidieren | Pick-Operationen brauchen eindeutige Transaktions-/Lock-Invarianten pro Draft Pick. | Draft Pick Logic, Draft Services |
| N087 - Week Simulation kann doppelt oder parallel laufen | Week Simulation braucht einen atomaren Lock und Idempotenz pro Liga/Woche. | Week Simulation, Admin API, Week Simulation Lock |
| N088 - Multiplayer hat viele parallele Statusfelder | Multiplayer Lifecycle ist nicht als zentraler Statusautomat modelliert; Status wird aus mehreren Feldern zusammengesetzt. | Firestore League/Membership/Team/Draft/Week State |
| N089 - Zentrale Online State Machine fehlt | Es gibt keinen formalen, gemeinsamen State Machine Layer fuer Join, Draft, Ready und Week. | Online State, Route State, Week/Draft/Ready Services |
| N090 - Week Status hat doppelte Wahrheit | Week-Completion wird gleichzeitig ueber Statusfelder, completedWeeks, lastSimulatedWeek und Results abgebildet. | League Week Fields, Results, Standings |
| N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen | Week Advance und Result Persistierung muessen atomar gekoppelt sein. | Week Simulation Service |
| N092 - Admin-/Repair-Scripts koennen Multiplayer-State veraendern | Schreibende Scripts sind Teil des Datenbetriebs, aber ihre Guardrails und Zielumgebungen muessen strikt kontrolliert sein. | `scripts/*`, `scripts/seeds/*`, Firestore Testdaten |
| N093 - Ready waehrend Simulation ist Race-Risiko | Ready-State und Simulation-Lock sind nicht als strikt voneinander abgegrenzte Zustandsuebergaenge beschrieben. | Ready State, Week Simulation |
| N094 - Core Loop ist dokumentiert, aber eng | MVP-Spielbarkeit haengt an wenigen Pflichtpfaden; Ausweich- oder Nebenflows sind nicht voll tragend. | Multiplayer Flow, Online Dashboard, Admin Week |
| N095 - Adminmodus ist fuer normale Spieler zu prominent | Produktnavigation trennt Spieler- und Admin-Aufgaben nicht streng genug. | Savegames Screen, Admin CTA |
| N096 - Redundante Admin Actions konkurrieren sichtbar | Admin-Aktionsmodell unterscheidet nicht klar zwischen Navigation, Verwaltung, Simulation und Debug. | Admin UI |
| N097 - Nicht-MVP-Features duerfen nicht aktiv konkurrieren | Scope-Grenzen sind in der sichtbaren Navigation nicht konsequent genug durchgesetzt. | Sidebar, Savegames, Product Scope, Coming-Soon Screens |
| N098 - MVP-Zustand ist Gelb | Ursache unklar; die Reports nennen Produktreife als Zustand, aber keine einzelne Ursache. | Multiplayer MVP |
| N099 - Multiplayer Acceptance und UX-Audit widersprechen sich | Akzeptanzkriterien und UX-Bewertung verwenden unterschiedliche Massstaebe fuer "spielbar". | UX Reports, QA Reports |
| N100 - Vitest Suite ist vorhanden und umfangreich | Ursache unklar; das Finding beschreibt vorhandene Abdeckung, nicht ein Problem. | Test Suite |
| N101 - E2E scheitert lokal an DB-Verbindung | E2E-Testumgebung ist an eine lokale Datenbankvoraussetzung gekoppelt, die nicht automatisch bereitgestellt wird. | E2E Setup, DB/Test Config |
| N102 - Firebase Parity braucht Emulator-Portbindung | Firebase-Parity-Tests haengen von Emulatorstart und Portverfuegbarkeit ab. | Firebase Parity Tests, Firebase Emulator |
| N103 - Authentifizierter Staging Smoke fehlt als bestaetigtes Gate | Release-Gates enthalten keinen immer reproduzierbaren authentifizierten Staging-Smoke. | Staging Smoke Scripts, Auth/Admin Flow |
| N104 - Multiplayer GM Rejoin Browser-Test fehlt | Rejoin-Flow ist nicht als Browser-E2E mit realistischem User-Team-State abgesichert. | Online Hub, E2E Tests |
| N105 - Admin Week E2E Reload-Test fehlt | Admin-Week-Simulation und Reload-Persistenz sind nicht als Ende-zu-Ende-Test abgedeckt. | Admin Week UI/API, E2E Tests |
| N106 - Tests fuer parallele Multiplayer-Aktionen fehlen | Concurrency-Faelle sind nicht als eigene Testklasse fuer Multiplayer State modelliert. | Join, Ready, Draft, Week Simulation |
| N107 - Firestore Rules Tests fuer Admin fehlen | Admin-Sicherheitsmodell wird nicht ausreichend gegen Rules getestet. | `firestore.rules`, Admin Auth |
| N108 - Sidebar/Coming-Soon Browser-Test fehlt | Navigations- und Placeholder-Zustaende sind nicht vollstaendig browserseitig abgesichert. | Sidebar, Placeholder Screens |
| N109 - Seed/Reset Emulator-Integration fehlt | Seed-/Reset-Workflows sind nicht als wiederholbarer Emulator-Integrationstest abgedeckt. | Seed Scripts, Firebase Emulator Tests |
| N110 - Savegames Offline Flow mit DB ist nicht ausreichend getestet | Savegames/Offline-Flow hat keine ausreichende Integrationstest-Abdeckung mit Persistenz. | Savegames Flow, E2E/Integration Tests |
| N111 - A11y/Mobile Smoke fehlt | QA-Scope enthaelt keine expliziten mobilen und Accessibility-Smoke-Gates. | UI/E2E Tests |
| N112 - QA-Gruen und E2E-Rot widersprechen sich | Testsignal ist uneinheitlich, weil lokale Unit-/Build-Gates und E2E-/Infra-Gates nicht denselben Releasezustand abbilden. | QA Reports, E2E Tests |
| N113 - Env-Dateien existieren lokal und muessen ignoriert bleiben | Lokale Secrets/Config werden ausserhalb des Repos verwaltet und brauchen dauerhaft korrekte Ignore-/Scan-Regeln. | `.env`, `.env.local`, `.gitignore` |
| N114 - Public Firebase API Key kommt in Config/Scripts vor | Firebase Client-Konfiguration ist in App/Scripts sichtbar; Ursache ist public Firebase Web Config. | Firebase Config/Scripts |
| N115 - Runtime Guards schuetzen Umgebungen | Ursache unklar; das Finding beschreibt vorhandene Guardrails, nicht ein Problem. | Env Guard/Config Scripts |
| N116 - Production Firestore kann per Flag aktiviert werden | Environment-Konfiguration erlaubt einen expliziten Production-Firestore-Pfad, der durch Flags kontrolliert wird. | Env Config, Firebase Config |
| N117 - Production App Hosting Ziel ist nicht verifiziert | Production-Projekt und Backend-ID sind nicht als verifizierte, dokumentierte Konfiguration im Repo/Access-Kontext vorhanden. | `apphosting.yaml`, `.firebaserc`, Deployment Config/Reports |
| N118 - Staging Smoke kann an IAM `signJwt` scheitern | Smoke-Ausfuehrung kann von Service-Account-Token-Creation/IAM-Berechtigung abhaengen. | Smoke Scripts, IAM Config |
| N119 - Firestore Rules sind komplex und clientseitig restriktiv | Berechtigungsmodell ist stark server-/API-zentriert und in Rules komplex ausformuliert. | `firestore.rules`, Admin API, Online API, Draft Finalization |
| N120 - Dokumentation und Reports koennen stale werden | Viele Analyse- und Statusreports werden parallel gepflegt, ohne erkennbare zentrale Aktualisierungsquelle. | `docs/reports/*` |
