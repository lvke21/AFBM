# Phase 2 Root Cause Clusters

Quelle:
- `docs/reports/full-project-analysis/master-findings-table.md`
- `docs/reports/full-project-analysis/_root-causes.md`

Ziel: Findings nach echter Ursache clustern, nicht nach sichtbarem Symptom.

Anzahl Cluster: 10

Groesster Cluster: Cluster 1 - Fehlende Architektur- und Modulgrenzen, 30 Findings

Kritischster Cluster: Cluster 2 - Inkonsistenter Multiplayer State und fehlende State Machine, 16 Findings, Core Loop direkt betroffen

## Cluster 1 - Fehlende Architektur- und Modulgrenzen

- Beschreibung der Ursache: Zentrale Dateien und Schichten haben zu viele Verantwortlichkeiten. UI, Domain, Application, Persistence, Admin/API und Engine-Grenzen sind nicht konsequent getrennt. Dadurch entstehen Monolithen, breite Imports, Kopplung und schwer testbare Module.
- Betroffene Systemteile: `src/lib/online/*`, `src/components/online/*`, `src/components/admin/*`, `src/lib/admin/*`, `src/modules/gameplay/*`, Shared Types, Shared UI Components, Reports/Docs.

Enthaltene Findings:
- N001 - Codebase ist quantitativ gross
- N002 - Online League Service ist zentraler Monolith
- N003 - Game Engine Dateien sind sehr gross
- N004 - `simulateMatch` ist sehr lang und schwer testbar
- N005 - Online League Placeholder ist grosse Client-Orchestrator-Komponente
- N006 - Admin League Detail ist grosse, schwer reviewbare Komponente
- N007 - Admin Online Actions sind zu breit
- N010 - Server-Action-Feedback-Logik ist dupliziert
- N011 - Player-Seed-Mapping-Logik ist dupliziert
- N012 - QA-Report-Rendering-Logik ist dupliziert
- N013 - Admin-/Online-Statuskarten sind aehnlich implementiert
- N014 - Viele ungenutzte Export-Kandidaten
- N015 - TODO/FIXME/HACK-Hinweise sind vorhanden
- N016 - Viele `console.*`-Vorkommen
- N018 - `team.types` ist ein Kopplungshotspot
- N019 - Shared Enums sind stark gekoppelt
- N020 - Format-Utilities sind stark gekoppelt
- N021 - StatusBadge ist breit verwendet
- N022 - Session/Auth ist breit gekoppelt
- N023 - Online League Types sind breit verwendet
- N024 - SectionPanel ist breit verwendet
- N025 - StatCard ist breit verwendet
- N026 - Seeded RNG ist breit gekoppelt
- N027 - Firebase Admin ist breit gekoppelt
- N055 - Zwei Architekturmodelle laufen parallel
- N056 - Multiplayer UI, State und Persistence sind eng gekoppelt
- N057 - Firebase Online Repository ist zu breit
- N059 - UI importiert Domain- und Application-Typen breit
- N060 - Application Services importieren UI-Modelle
- N061 - Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten

Impact:
- Findings betroffen: 30
- Core Loop betroffen: Ja, indirekt breit; direkt bei N061, weil Simulation vom Adaptervertrag abhaengt.

Empfehlung:
- Refactoring: Online-/Admin-Monolithen in kleine Use-Case-Module, ViewModels und Repository-Facades schneiden.
- Refactoring: Engine nur testgestuetzt in reine Teilfunktionen zerlegen.
- Logging hinzufügen: Console-/Debug-Nutzung in produktive Logs, Script-Ausgaben und temporare Debug-Ausgaben trennen.

## Cluster 2 - Inkonsistenter Multiplayer State und fehlende State Machine

- Beschreibung der Ursache: Multiplayer-Lifecycle, Draft, Ready, Week und Results werden ueber viele Felder und Dokumente abgebildet. Es gibt keine zentrale State Machine und keine eindeutigen Invarianten fuer Zustandsuebergaenge.
- Betroffene Systemteile: League State, Membership State, Team State, Draft State, Ready State, Week State, Results, Standings.

Enthaltene Findings:
- N036 - User-Team-Link hat mehrere Inkonsistenzstellen
- N037 - Globaler League Member Mirror ist doppelte Source of Truth
- N038 - Team Assignment kann Race Conditions erzeugen
- N039 - Ready-State braucht konsistente Persistenz und Anzeige
- N041 - GM-Fortschritt haengt stark vom Admin Week Flow ab
- N048 - Draft State hat mehrere Race- und Truth-Risiken
- N068 - Week Simulation braucht gueltigen Schedule
- N069 - Week Simulation braucht vorhandene Teams
- N085 - Stale `lastLeagueId` kann Nutzer blockieren
- N086 - Draft Pick und Draft State koennen parallel kollidieren
- N087 - Week Simulation kann doppelt oder parallel laufen
- N088 - Multiplayer hat viele parallele Statusfelder
- N089 - Zentrale Online State Machine fehlt
- N090 - Week Status hat doppelte Wahrheit
- N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen
- N093 - Ready waehrend Simulation ist Race-Risiko

Impact:
- Findings betroffen: 16
- Core Loop betroffen: Ja, direkt. Lobby, Draft, Ready, Simulation und Ergebnis koennen blockieren oder inkonsistent werden.

Empfehlung:
- State fixen: Kanonische Multiplayer-State-Machine fuer Lobby, Draft, Ready, Simulation und Ergebnis definieren.
- State fixen: Transaktionale Invarianten fuer Team Assignment, Draft Picks und Week Simulation festlegen.
- State fixen: Doppelte Truth-Felder reduzieren oder klare Projektionen/Mirrors mit Reparaturpfad definieren.

## Cluster 3 - Fehlende robuste User-Team-Verknuepfung

- Beschreibung der Ursache: User, Membership, Mirror, Team und localStorage sind nicht als ein atomarer, immer validierter Zusammenhang modelliert. Dadurch kann der Spieler zwar eingeloggt sein, aber ohne korrektes Team oder ohne gueltige League-Verbindung bleiben.
- Betroffene Systemteile: Online Hub, Route State, Membership Recovery, Team Assignment, LocalStorage, Team Documents.

Enthaltene Findings:
- N029 - Logout-Recovery muss Online-Kontext bereinigen
- N033 - Online Join/Rejoin hat viele versteckte Abhaengigkeiten
- N034 - Fehlende Membership kann Nutzer in Schleifen fuehren
- N035 - Fehlende Team-Zuordnung blockiert Multiplayer
- N067 - Team Management braucht klare No-Team- und No-Roster-Zustaende

Impact:
- Findings betroffen: 5
- Core Loop betroffen: Ja, direkt. Ohne gueltige User-Team-Verknuepfung startet Lobby/Rejoin nicht stabil.

Empfehlung:
- Flow korrigieren: Join/Rejoin als atomaren Use Case mit Reparatur und klaren Fallback States kapseln.
- State fixen: Membership, Mirror und Team assignedUserId bei jedem League Load validieren.
- Logging hinzufügen: Bei fehlender Membership, fehlendem Team und Mirror-Mismatch strukturierte Diagnose loggen.

## Cluster 4 - Unvollstaendige oder bewusst begrenzte Implementierung

- Beschreibung der Ursache: Mehrere Bereiche sind sichtbar, aber nicht voll MVP-relevant oder nur als MVP-Schnitt umgesetzt. Dadurch kann das Produkt groesser wirken als die tatsaechlich spielbare Funktionalitaet.
- Betroffene Systemteile: Sidebar, Contracts/Cap, Development, Trade Board, Inbox, Finance, Offline Nebenfeatures, Training, Draft MVP, Admin Draft Status.

Enthaltene Findings:
- N042 - Nicht-MVP Sidebar-Features sind Coming Soon
- N043 - Offline Nebenfeatures sind unvollstaendig
- N044 - Draft MVP ist begrenzt
- N063 - Firebase Multiplayer Training ist nur eingeschraenkt
- N064 - Admin Draft Status ist nur ein Hinweisbereich
- N094 - Core Loop ist dokumentiert, aber eng
- N097 - Nicht-MVP-Features duerfen nicht aktiv konkurrieren

Impact:
- Findings betroffen: 7
- Core Loop betroffen: Teilweise. Draft MVP ist Core-Loop-nah; die meisten anderen Findings betreffen Scope und Erwartungsmanagement.

Empfehlung:
- UI entfernen/deaktivieren: Nicht-MVP-Bereiche sichtbar nachrangig oder deaktiviert darstellen.
- Refactoring: Draft MVP-Grenzen dokumentieren und nur Core-Loop-relevante Draft-Faehigkeiten absichern.

## Cluster 5 - UI und Navigation ohne eindeutige Flow-Logik

- Beschreibung der Ursache: Sichtbare Aktionen, Statuskarten, Navigation und Terminologie sind nicht konsequent an einen klaren Nutzerzustand und naechsten Schritt gebunden. Einige UI-Elemente wirken doppelt, technisch oder semantisch unklar.
- Betroffene Systemteile: Savegames Screen, Online Dashboard, Sidebar, Admin UI, Draft UI, Statuskarten, Auth Debug, Admin Actions.

Enthaltene Findings:
- N030 - Offline Flow wirkt trotz Name auth-/account-gebunden
- N031 - Loeschaktionen nutzen native Confirm-Dialoge
- N032 - Admin Eingaben nutzen native Prompts
- N040 - Admin Week Actions sind semantisch unklar
- N045 - Active Draft darf nicht automatisch Fullscreen oeffnen
- N046 - Active Draft kann andere Bereiche blockierend wirken lassen
- N047 - Completed Draft braucht klare Statusdarstellung
- N049 - Online Navigation mischt Hashes und Routen
- N050 - Statuskarten erzeugen visuelle Konkurrenz
- N051 - Terminologie ist inkonsistent
- N052 - First-Time und Returning Player Einstieg sind nicht eindeutig
- N053 - Admin UI ist ueberladen
- N062 - Admin `Details verwalten` und `Oeffnen` sind redundant
- N065 - Auth Debug ist technisch formuliert
- N066 - Dashboard kann ueberladen wirken
- N095 - Adminmodus ist fuer normale Spieler zu prominent
- N096 - Redundante Admin Actions konkurrieren sichtbar

Impact:
- Findings betroffen: 17
- Core Loop betroffen: Ja, punktuell. N045 kann Draft-Navigation direkt stoeren; andere Findings verschlechtern Verstaendnis und Bedienung.

Empfehlung:
- Flow korrigieren: Navigation auf klare Routen oder klare In-Page-Sections vereinheitlichen.
- UI entfernen/deaktivieren: Doppelte, technische oder nicht-MVP-relevante Aktionen aus Spielerpfaden entfernen oder nachrangig anzeigen.
- UI entfernen/deaktivieren: Native Prompts/Confirms durch konsistente Dialoge ersetzen, wenn diese Aktionen aktiv bleiben.

## Cluster 6 - Breite Firestore Reads, wachsende Dokumente und Bundle-Groesse

- Beschreibung der Ursache: Daten werden breit geladen, Routen sind gross, abgeleitete Daten werden mehrfach berechnet und einige Dokumente koennen wachsen. Das erzeugt Performance-, Kosten- und Skalierungsrisiken.
- Betroffene Systemteile: `subscribeToLeague`, Firestore League Document, Online/Draft/Admin/Savegames Routes, Draft Room, Standings/Results, Roster/Depth.

Enthaltene Findings:
- N070 - Online League Route Bundle ist gross
- N071 - Online Draft Route Bundle ist gross
- N072 - Admin Route Bundle ist gross
- N073 - Savegames Route Bundle ist gross
- N074 - Wenige dynamische Imports
- N075 - `subscribeToLeague` liest zu viele Datenbereiche
- N076 - Lobby-/Teamreads koennen N+1 erzeugen
- N077 - Events werden breit reloadet
- N078 - League Document kann stark wachsen
- N079 - Firestore Reads/Writes sind Kostenrisiko
- N080 - Route-Bundles koennen weiter wachsen
- N081 - Online Detail Models berechnen mehrfach
- N082 - Standings-Fallback scannt Results
- N083 - Draft Room sortiert gesamten Spielerpool
- N084 - Roster-/Depth-Listen sind nicht breit virtualisiert

Impact:
- Findings betroffen: 15
- Core Loop betroffen: Indirekt. Performance kann Lobby, Draft und Ergebnisanzeige verlangsamen, ist aber nicht als direkter funktionaler Blocker markiert.

Empfehlung:
- Refactoring: View-spezifische Firestore Subscriptions und kleinere Read Models einfuehren.
- Refactoring: Grosse Routen und schwere Panels gezielt lazy laden.
- State fixen: Results/Standings als konsistente Projektionen speichern statt teuer aus Rohdaten zu scannen.

## Cluster 7 - Fehlende oder fragile Test- und Release-Gates

- Beschreibung der Ursache: Kritische reale Flows sind nicht vollstaendig durch reproduzierbare Browser-, Staging-, Firebase- und Concurrency-Tests abgesichert. Testsignale widersprechen sich teilweise.
- Betroffene Systemteile: E2E Setup, Firebase Parity, Staging Smoke, Admin Week Tests, Rejoin Tests, Rules Tests, Seed/Reset Tests, Mobile/A11y Tests.

Enthaltene Findings:
- N008 - `MemoryStorage` Test-Fixtures sind dupliziert
- N009 - League-/GM-Testsetup ist dupliziert
- N100 - Vitest Suite ist vorhanden und umfangreich
- N101 - E2E scheitert lokal an DB-Verbindung
- N102 - Firebase Parity braucht Emulator-Portbindung
- N103 - Authentifizierter Staging Smoke fehlt als bestaetigtes Gate
- N104 - Multiplayer GM Rejoin Browser-Test fehlt
- N105 - Admin Week E2E Reload-Test fehlt
- N106 - Tests fuer parallele Multiplayer-Aktionen fehlen
- N107 - Firestore Rules Tests fuer Admin fehlen
- N108 - Sidebar/Coming-Soon Browser-Test fehlt
- N109 - Seed/Reset Emulator-Integration fehlt
- N110 - Savegames Offline Flow mit DB ist nicht ausreichend getestet
- N111 - A11y/Mobile Smoke fehlt
- N112 - QA-Gruen und E2E-Rot widersprechen sich

Impact:
- Findings betroffen: 15
- Core Loop betroffen: Indirekt. Fehlende Tests blockieren den Flow nicht selbst, machen Core-Loop-Regressionen aber wahrscheinlich und schwer erkennbar.

Empfehlung:
- Refactoring: Gemeinsame Test-Fixtures fuer League/GM/Storage einfuehren.
- Refactoring: E2E-DB-Setup und Firebase Emulator Setup reproduzierbar machen.
- Flow korrigieren: Authenticated Staging Smoke, GM Rejoin und Admin Week Reload als Release-Gates definieren.

## Cluster 8 - Uneinheitliches Security-, Admin- und Rules-Modell

- Beschreibung der Ursache: Adminrechte, UID-Allowlist, Custom Claims, Firestore Rules und mutierende Admin-Actions sind nicht vollstaendig harmonisiert. Dadurch koennen API, UI und Rules unterschiedliche Berechtigungslogik haben.
- Betroffene Systemteile: Admin Auth Gate, Admin Action Guard, Firestore Rules, Admin API, Firebase Admin, Admin Scripts.

Enthaltene Findings:
- N017 - Firestore Rules enthalten offene TODOs
- N028 - Adminzugriff hat Claim-/UID-Allowlist-Komplexitaet
- N054 - Admin-Aktionen koennen versehentlich datenveraendernd sein
- N058 - Firebase Admin darf nicht in Client Bundles gelangen
- N092 - Admin-/Repair-Scripts koennen Multiplayer-State veraendern
- N119 - Firestore Rules sind komplex und clientseitig restriktiv

Impact:
- Findings betroffen: 6
- Core Loop betroffen: Indirekt bis direkt. Admin Week Simulation kann betroffen sein, wenn Rechte oder Rules nicht greifen.

Empfehlung:
- Refactoring: Einheitliches Admin-Autorisierungsmodell fuer UI, API und Rules festlegen.
- State fixen: Mutierende Admin-Actions nur ueber serverseitige, validierte Use Cases erlauben.
- Logging hinzufügen: Admin-Mutationen und Permission-Denials strukturiert protokollieren.

## Cluster 9 - Deployment-, Environment- und Secret-Risiken

- Beschreibung der Ursache: Staging/Production-Ziele, Firestore-Flags, IAM-Anforderungen und lokale Env-Dateien sind nicht vollstaendig als sichere, reproduzierbare Release-Kette belegt.
- Betroffene Systemteile: Env Config, Firebase Config, App Hosting Config, Smoke Scripts, IAM, Deployment Reports, `.env`, `.firebaserc`.

Enthaltene Findings:
- N113 - Env-Dateien existieren lokal und muessen ignoriert bleiben
- N114 - Public Firebase API Key kommt in Config/Scripts vor
- N115 - Runtime Guards schuetzen Umgebungen
- N116 - Production Firestore kann per Flag aktiviert werden
- N117 - Production App Hosting Ziel ist nicht verifiziert
- N118 - Staging Smoke kann an IAM `signJwt` scheitern

Impact:
- Findings betroffen: 6
- Core Loop betroffen: Nein im lokalen Produktfluss; ja fuer Release-Sicherheit und Staging/Production-Betrieb.

Empfehlung:
- Refactoring: Production- und Staging-Preflight strikt trennen und dokumentieren.
- Logging hinzufügen: Smoke-/Deployment-Preflight soll Projekt, Backend und Identitaet ohne Secrets ausgeben.
- UI entfernen/deaktivieren: Keine Production-Commands mit geratenen IDs dokumentieren.

## Cluster 10 - Produktumfang und Release-Definition sind nicht eindeutig genug

- Beschreibung der Ursache: "Spielbar", MVP, Acceptance und UX-Audit verwenden nicht immer denselben Massstab. Dadurch koennen Features als fertig wirken, obwohl sie nur als Coming Soon, Admin-only oder eingeschraenkter MVP-Pfad existieren.
- Betroffene Systemteile: MVP Definition, UX Reports, QA Reports, Release Reports, Sidebar, Savegames, Admin Entry.

Enthaltene Findings:
- N098 - MVP-Zustand ist Gelb
- N099 - Multiplayer Acceptance und UX-Audit widersprechen sich
- N120 - Dokumentation und Reports koennen stale werden

Impact:
- Findings betroffen: 3
- Core Loop betroffen: Indirekt. Uneinheitliche Definitionen koennen falsche Release-Entscheidungen verursachen, blockieren aber keine einzelne Runtime-Aktion.

Empfehlung:
- Refactoring: Definition of Done fuer Core Loop und MVP zentral dokumentieren.
- UI entfernen/deaktivieren: Sichtbare Nicht-MVP-Pfade an diese Definition binden.
- Logging hinzufügen: Release-Reports mit eindeutiger Quelle, Datum und Gate-Status versehen.
