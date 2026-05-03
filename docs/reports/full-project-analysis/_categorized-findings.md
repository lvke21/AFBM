# Categorized Findings aus `_normalized-findings.md`

Ursprung: `docs/reports/full-project-analysis/_normalized-findings.md`

Anzahl Findings: 120

Regel: Jedes Finding hat genau eine Hauptkategorie. Die Kategorie beschreibt die Hauptursache, nicht nur das sichtbare Symptom.

## Anzahl Findings pro Kategorie

| Kategorie | Anzahl |
|---|---:|
| Architektur | 31 |
| Performance | 15 |
| State | 15 |
| Test | 15 |
| Security | 12 |
| UI | 12 |
| Flow | 11 |
| Scope | 9 |

## Auffaellige Haeufungen

- Architektur ist die groesste Gruppe, vor allem durch grosse Services, breite Komponenten, Kopplung und unklare Modulgrenzen.
- Performance, State und Test liegen gleichauf; die Haeufung kommt aus breiten Firestore-Subscriptions, vielen parallelen Multiplayer-Statusfeldern und fehlenden E2E-/Smoke-Tests.
- Security ist stark durch Admin-Claims, Firestore Rules, Deployment-Zielklarheit und Script-/Seed-Sicherheit gepraegt.
- UI und Flow trennen sich relativ klar: UI-Findings betreffen Darstellung/Interaktion, Flow-Findings betreffen Nutzerpfade und blockierende Uebergaenge.
- Scope-Findings sammeln vor allem MVP-Abgrenzung, Coming-Soon-Bereiche und Produktumfang.

## Klassifizierung

| Finding | Kategorie | Kurze Begruendung |
|---|---|---|
| N001 - Codebase ist quantitativ gross | Architektur | Die Groesse betrifft die strukturelle Wartbarkeit des gesamten Repositories. |
| N002 - Online League Service ist zentraler Monolith | Architektur | Hauptursache ist fehlende fachliche Aufteilung und zu breite Verantwortung. |
| N003 - Game Engine Dateien sind sehr gross | Architektur | Das Problem liegt in Modulzuschnitt und Wartbarkeit der Engine-Dateien. |
| N004 - `simulateMatch` ist sehr lang und schwer testbar | Architektur | Die Funktion ist strukturell zu gross und erschwert Tests als Folge. |
| N005 - Online League Placeholder ist grosse Client-Orchestrator-Komponente | Architektur | UI, State und Handler sind in einer grossen Verantwortlichkeit gebuendelt. |
| N006 - Admin League Detail ist grosse, schwer reviewbare Komponente | Architektur | Das Finding beschreibt primaer Komponentenstruktur und Verantwortungsbreite. |
| N007 - Admin Online Actions sind zu breit | Architektur | API-Handling, Firebase und League-Operationen sind zu stark vermischt. |
| N008 - `MemoryStorage` Test-Fixtures sind dupliziert | Test | Die Dopplung liegt in Test-Fixtures und beeinflusst Testwartung. |
| N009 - League-/GM-Testsetup ist dupliziert | Test | Die Wiederholung betrifft Testsetup und Testfixtures. |
| N010 - Server-Action-Feedback-Logik ist dupliziert | Architektur | Wiederholte Action-Feedback-Logik ist ein strukturelles Code-Duplizierungsproblem. |
| N011 - Player-Seed-Mapping-Logik ist dupliziert | Architektur | Die Dopplung betrifft Hilfslogik und Modulzuschnitt. |
| N012 - QA-Report-Rendering-Logik ist dupliziert | Architektur | Die Wiederholung betrifft Report-/Utility-Struktur. |
| N013 - Admin-/Online-Statuskarten sind aehnlich implementiert | Architektur | Aehnliche Implementierungen deuten auf fehlende gemeinsame UI-Abstraktion. |
| N014 - Viele ungenutzte Export-Kandidaten | Architektur | Ungenutzte Exports sind Struktur- und Wartbarkeitsschulden. |
| N015 - TODO/FIXME/HACK-Hinweise sind vorhanden | Architektur | Offene Markierungen zeigen unvollstaendige oder ungeklaerte Codebereiche. |
| N016 - Viele `console.*`-Vorkommen | Architektur | Debug-/Logging-Reste betreffen Codehygiene und Wartbarkeit. |
| N017 - Firestore Rules enthalten offene TODOs | Security | Offene Rules-TODOs betreffen Berechtigungen und Schreibstrategie. |
| N018 - `team.types` ist ein Kopplungshotspot | Architektur | Das Finding beschreibt Abhaengigkeitskopplung. |
| N019 - Shared Enums sind stark gekoppelt | Architektur | Breite Enum-Nutzung ist ein Modulgrenzen-/Kopplungsthema. |
| N020 - Format-Utilities sind stark gekoppelt | Architektur | Die starke Nutzung betrifft Utility-Kopplung. |
| N021 - StatusBadge ist breit verwendet | Architektur | Das Finding beschreibt zentrale Komponentenabhaengigkeit. |
| N022 - Session/Auth ist breit gekoppelt | Architektur | Der Schwerpunkt ist Kopplung; Security ist hier nur Folgewirkung. |
| N023 - Online League Types sind breit verwendet | Architektur | Breite Typabhaengigkeit zeigt Kopplung des Online-Modells. |
| N024 - SectionPanel ist breit verwendet | Architektur | Das Finding beschreibt zentrale UI-Komponentenabhaengigkeit. |
| N025 - StatCard ist breit verwendet | Architektur | Das Finding beschreibt zentrale UI-Komponentenabhaengigkeit. |
| N026 - Seeded RNG ist breit gekoppelt | Architektur | Breite Utility-Nutzung ist ein Kopplungsthema. |
| N027 - Firebase Admin ist breit gekoppelt | Architektur | Die Hauptursache ist breite Modulabhaengigkeit; Server-only-Grenze ist Folge. |
| N028 - Adminzugriff hat Claim-/UID-Allowlist-Komplexitaet | Security | Das Finding betrifft Adminberechtigung, Claims, UID-Allowlist und Rules. |
| N029 - Logout-Recovery muss Online-Kontext bereinigen | Flow | Logout ist ein Nutzer-/Session-Uebergang mit Recovery-Anforderung. |
| N030 - Offline Flow wirkt trotz Name auth-/account-gebunden | Flow | Das Problem liegt im Einstiegspfad und dessen Erwartung. |
| N031 - Loeschaktionen nutzen native Confirm-Dialoge | UI | Native Dialoge betreffen sichtbare Interaktion und Konsistenz. |
| N032 - Admin Eingaben nutzen native Prompts | UI | Native Prompts sind ein UI-/Interaktionsproblem. |
| N033 - Online Join/Rejoin hat viele versteckte Abhaengigkeiten | Flow | Das Finding betrifft den Join-/Rejoin-Nutzerpfad. |
| N034 - Fehlende Membership kann Nutzer in Schleifen fuehren | Flow | Der Kern ist ein blockierender Navigations-/Recovery-Flow. |
| N035 - Fehlende Team-Zuordnung blockiert Multiplayer | Flow | Das Finding betrifft den Spielerpfad in den Multiplayer. |
| N036 - User-Team-Link hat mehrere Inkonsistenzstellen | State | Der Kern ist persistierter Zuordnungszustand ueber mehrere Dokumente. |
| N037 - Globaler League Member Mirror ist doppelte Source of Truth | State | Das Finding beschreibt redundanten persistierten Zustand. |
| N038 - Team Assignment kann Race Conditions erzeugen | State | Gleichzeitige Zuweisung ist ein Konsistenzproblem im State. |
| N039 - Ready-State braucht konsistente Persistenz und Anzeige | State | Ready ist ein persistierter Status mit UI- und Simulationsfolgen. |
| N040 - Admin Week Actions sind semantisch unklar | UI | Die Unklarheit entsteht durch sichtbare Action-Benennung und Darstellung. |
| N041 - GM-Fortschritt haengt stark vom Admin Week Flow ab | Flow | Der Spielerfortschritt ist an einen Admin-Uebergang gekoppelt. |
| N042 - Nicht-MVP Sidebar-Features sind Coming Soon | Scope | Das Finding betrifft Produktumfang und MVP-Abgrenzung. |
| N043 - Offline Nebenfeatures sind unvollstaendig | Scope | Das Finding betrifft Feature-Umfang ausserhalb des Kern-MVPs. |
| N044 - Draft MVP ist begrenzt | Scope | Das Finding beschreibt bewusste Feature-Begrenzung. |
| N045 - Active Draft darf nicht automatisch Fullscreen oeffnen | Flow | Das Finding betrifft unerwuenschte automatische Navigation. |
| N046 - Active Draft kann andere Bereiche blockierend wirken lassen | Flow | Das Problem liegt im Wechsel zwischen Draft- und Team-Flows. |
| N047 - Completed Draft braucht klare Statusdarstellung | UI | Der Kern ist sichtbare Statuskommunikation. |
| N048 - Draft State hat mehrere Race- und Truth-Risiken | State | Draft-Daten liegen verteilt und koennen inkonsistent werden. |
| N049 - Online Navigation mischt Hashes und Routen | Flow | Das Finding betrifft Navigationspfade und Direktaufrufe. |
| N050 - Statuskarten erzeugen visuelle Konkurrenz | UI | Das Problem ist visuelle Hierarchie und Lesbarkeit. |
| N051 - Terminologie ist inkonsistent | UI | Uneinheitliche Begriffe betreffen die sichtbare Oberflaeche. |
| N052 - First-Time und Returning Player Einstieg sind nicht eindeutig | Flow | Das Finding betrifft Einstiegspfade und Resume-Verhalten. |
| N053 - Admin UI ist ueberladen | UI | Der Kern ist sichtbare Informations- und Action-Dichte. |
| N054 - Admin-Aktionen koennen versehentlich datenveraendernd sein | Security | Admin-Mutationen brauchen Sicherheits- und Schutzmechanismen. |
| N055 - Zwei Architekturmodelle laufen parallel | Architektur | Das Finding beschreibt unterschiedliche strukturelle Modelle. |
| N056 - Multiplayer UI, State und Persistence sind eng gekoppelt | Architektur | UI, State und Persistenz sind nicht sauber getrennt. |
| N057 - Firebase Online Repository ist zu breit | Architektur | Repository-Verantwortlichkeiten sind zu weit gefasst. |
| N058 - Firebase Admin darf nicht in Client Bundles gelangen | Security | Server-only Code im Client waere ein Sicherheits- und Build-Grenzproblem. |
| N059 - UI importiert Domain- und Application-Typen breit | Architektur | Das Finding betrifft Schichtengrenzen und Kopplung. |
| N060 - Application Services importieren UI-Modelle | Architektur | Die Abhaengigkeitsrichtung zwischen Application und UI ist unsauber. |
| N061 - Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten | Architektur | Das Finding betrifft Adapter- und Modellgrenzen zwischen Systemteilen. |
| N062 - Admin `Details verwalten` und `Oeffnen` sind redundant | UI | Sichtbare Aktionen wirken doppelt oder unklar. |
| N063 - Firebase Multiplayer Training ist nur eingeschraenkt | Scope | Das Feature ist funktional begrenzt und nicht voll im MVP ausgebaut. |
| N064 - Admin Draft Status ist nur ein Hinweisbereich | UI | Das Finding betrifft sichtbare Darstellung ohne tiefe Interaktion. |
| N065 - Auth Debug ist technisch formuliert | UI | Technische Copy betrifft Verstaendlichkeit der Oberflaeche. |
| N066 - Dashboard kann ueberladen wirken | UI | Das Finding betrifft Informationsdichte und Scannbarkeit. |
| N067 - Team Management braucht klare No-Team- und No-Roster-Zustaende | Flow | Es geht um blockierende Nutzerzustaende und passende Uebergaenge. |
| N068 - Week Simulation braucht gueltigen Schedule | State | Schedule ist persistierte Voraussetzung fuer Simulation. |
| N069 - Week Simulation braucht vorhandene Teams | State | Teamdaten sind persistierte Simulationsvoraussetzung. |
| N070 - Online League Route Bundle ist gross | Performance | Das Finding betrifft Bundle-Groesse. |
| N071 - Online Draft Route Bundle ist gross | Performance | Das Finding betrifft Bundle-Groesse. |
| N072 - Admin Route Bundle ist gross | Performance | Das Finding betrifft Bundle-Groesse. |
| N073 - Savegames Route Bundle ist gross | Performance | Das Finding betrifft Bundle-Groesse. |
| N074 - Wenige dynamische Imports | Performance | Dynamische Imports beeinflussen Bundle-Splitting. |
| N075 - `subscribeToLeague` liest zu viele Datenbereiche | Performance | Breite Subscriptions verursachen Read- und Renderkosten. |
| N076 - Lobby-/Teamreads koennen N+1 erzeugen | Performance | N+1 Reads betreffen Firestore-Kosten und Ladezeit. |
| N077 - Events werden breit reloadet | Performance | Breites Event-Reloading erhoeht Reads und Updates. |
| N078 - League Document kann stark wachsen | Performance | Wachsende Dokumente beeinflussen Read-/Write-Kosten und Latenz. |
| N079 - Firestore Reads/Writes sind Kostenrisiko | Performance | Das Finding betrifft Firebase-Kosten und Datenzugriffsperformance. |
| N080 - Route-Bundles koennen weiter wachsen | Performance | Das Finding betrifft langfristige Bundle-Groesse. |
| N081 - Online Detail Models berechnen mehrfach | Performance | Wiederholte map/filter/sort-Ableitungen betreffen Renderkosten. |
| N082 - Standings-Fallback scannt Results | Performance | Scans ueber Results koennen bei Wachstum teuer werden. |
| N083 - Draft Room sortiert gesamten Spielerpool | Performance | Vollstaendige Sortierung des Pools ist eine Render-/Berechnungslast. |
| N084 - Roster-/Depth-Listen sind nicht breit virtualisiert | Performance | Listenrendering ohne Virtualisierung kann bei Wachstum teuer werden. |
| N085 - Stale `lastLeagueId` kann Nutzer blockieren | State | Lokaler Persistenzzustand kann veraltet sein. |
| N086 - Draft Pick und Draft State koennen parallel kollidieren | State | Parallele Pick Requests sind Konsistenz- und Race-Probleme. |
| N087 - Week Simulation kann doppelt oder parallel laufen | State | Parallele Simulation betrifft Locking und konsistenten Week-State. |
| N088 - Multiplayer hat viele parallele Statusfelder | State | Viele Statusfelder erzeugen mehrere potenzielle Sources of Truth. |
| N089 - Zentrale Online State Machine fehlt | State | Das Finding betrifft fehlende formale Zustandsmodellierung. |
| N090 - Week Status hat doppelte Wahrheit | State | Week-Felder und Results koennen auseinanderlaufen. |
| N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen | State | Das Finding betrifft atomaren Zustandsuebergang. |
| N092 - Admin-/Repair-Scripts koennen Multiplayer-State veraendern | Security | Schreibende Scripts sind ein Daten- und Umgebungsschutzthema. |
| N093 - Ready waehrend Simulation ist Race-Risiko | State | Parallele Statusaenderung betrifft Zustandskonsistenz. |
| N094 - Core Loop ist dokumentiert, aber eng | Scope | Das Finding beschreibt MVP-Spielumfang und Kernloop. |
| N095 - Adminmodus ist fuer normale Spieler zu prominent | Scope | Das Finding betrifft Produktfokus und sichtbaren Funktionsumfang. |
| N096 - Redundante Admin Actions konkurrieren sichtbar | UI | Das Problem liegt in sichtbaren, redundanten Aktionen. |
| N097 - Nicht-MVP-Features duerfen nicht aktiv konkurrieren | Scope | Das Finding betrifft Abgrenzung des MVP-Umfangs. |
| N098 - MVP-Zustand ist Gelb | Scope | Das Finding beschreibt Produktreife und MVP-Status. |
| N099 - Multiplayer Acceptance und UX-Audit widersprechen sich | Scope | Der Widerspruch betrifft Produkt-/Release-Einschaetzung. |
| N100 - Vitest Suite ist vorhanden und umfangreich | Test | Das Finding beschreibt vorhandene Testabdeckung. |
| N101 - E2E scheitert lokal an DB-Verbindung | Test | Das Problem liegt in Testinfrastruktur. |
| N102 - Firebase Parity braucht Emulator-Portbindung | Test | Das Finding betrifft Testausfuehrung und Emulator-Setup. |
| N103 - Authentifizierter Staging Smoke fehlt als bestaetigtes Gate | Test | Das Finding betrifft fehlende Release-Testverifikation. |
| N104 - Multiplayer GM Rejoin Browser-Test fehlt | Test | Das Finding beschreibt eine fehlende E2E-Abdeckung. |
| N105 - Admin Week E2E Reload-Test fehlt | Test | Das Finding beschreibt eine fehlende E2E-Abdeckung. |
| N106 - Tests fuer parallele Multiplayer-Aktionen fehlen | Test | Das Finding beschreibt fehlende Race-/Concurrency-Tests. |
| N107 - Firestore Rules Tests fuer Admin fehlen | Test | Das Finding beschreibt fehlende Security-Rules-Testabdeckung. |
| N108 - Sidebar/Coming-Soon Browser-Test fehlt | Test | Das Finding beschreibt fehlende UI/E2E-Abdeckung. |
| N109 - Seed/Reset Emulator-Integration fehlt | Test | Das Finding beschreibt fehlende Seed-/Emulator-Testabdeckung. |
| N110 - Savegames Offline Flow mit DB ist nicht ausreichend getestet | Test | Das Finding beschreibt fehlende Flow-/Integrationstests. |
| N111 - A11y/Mobile Smoke fehlt | Test | Das Finding beschreibt fehlende Testabdeckung fuer Accessibility und Mobile. |
| N112 - QA-Gruen und E2E-Rot widersprechen sich | Test | Das Finding betrifft Zuverlaessigkeit und Aussagekraft der Testsignale. |
| N113 - Env-Dateien existieren lokal und muessen ignoriert bleiben | Security | Lokale Env-Dateien betreffen Secret- und Config-Schutz. |
| N114 - Public Firebase API Key kommt in Config/Scripts vor | Security | Auch public Keys betreffen Config-/Secret-Sensibilitaet. |
| N115 - Runtime Guards schuetzen Umgebungen | Security | Das Finding betrifft Umgebungsschutz und Guardrails. |
| N116 - Production Firestore kann per Flag aktiviert werden | Security | Ein aktivierbarer Production-Pfad ist ein Umgebungs- und Datenrisiko. |
| N117 - Production App Hosting Ziel ist nicht verifiziert | Security | Unverifizierte Production IDs betreffen Deployment-Sicherheit. |
| N118 - Staging Smoke kann an IAM `signJwt` scheitern | Security | IAM-Berechtigungen sind ein Security-/Access-Thema. |
| N119 - Firestore Rules sind komplex und clientseitig restriktiv | Security | Rules und Client-Write-Beschraenkungen betreffen Zugriffsschutz. |
| N120 - Dokumentation und Reports koennen stale werden | Architektur | Veraltete technische Dokumentation betrifft Wissensstruktur und Wartbarkeit. |
