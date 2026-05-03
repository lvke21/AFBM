# Scored Findings

Ursprung:
- `docs/reports/full-project-analysis/_normalized-findings.md`
- `docs/reports/full-project-analysis/_categorized-findings.md`
- `docs/reports/full-project-analysis/_root-causes.md`

Core Loop Definition: Lobby -> Draft -> Ready -> Simulation -> Ergebnis

Skala:
- Severity: 1 = kosmetisch, 5 = kritisch technisch
- Impact: 1 = kaum relevant, 5 = blockiert Spielbarkeit
- Confidence: 1 = unsicher, 5 = sehr sicher
- Blockiert Core Loop: `YES` / `NO`

## Top 10 nach Impact

| Rang | Finding | Severity | Impact | Confidence | Blockiert Core Loop |
|---:|---|---:|---:|---:|---|
| 1 | N033 - Online Join/Rejoin hat viele versteckte Abhaengigkeiten | 5 | 5 | 5 | YES |
| 2 | N034 - Fehlende Membership kann Nutzer in Schleifen fuehren | 5 | 5 | 5 | YES |
| 3 | N035 - Fehlende Team-Zuordnung blockiert Multiplayer | 5 | 5 | 5 | YES |
| 4 | N036 - User-Team-Link hat mehrere Inkonsistenzstellen | 5 | 5 | 5 | YES |
| 5 | N039 - Ready-State braucht konsistente Persistenz und Anzeige | 4 | 5 | 5 | YES |
| 6 | N048 - Draft State hat mehrere Race- und Truth-Risiken | 5 | 5 | 5 | YES |
| 7 | N068 - Week Simulation braucht gueltigen Schedule | 5 | 5 | 5 | YES |
| 8 | N087 - Week Simulation kann doppelt oder parallel laufen | 5 | 5 | 5 | YES |
| 9 | N090 - Week Status hat doppelte Wahrheit | 5 | 5 | 5 | YES |
| 10 | N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen | 5 | 5 | 5 | YES |

## Alle Core Loop Blocker

- N033 - Online Join/Rejoin hat viele versteckte Abhaengigkeiten
- N034 - Fehlende Membership kann Nutzer in Schleifen fuehren
- N035 - Fehlende Team-Zuordnung blockiert Multiplayer
- N036 - User-Team-Link hat mehrere Inkonsistenzstellen
- N038 - Team Assignment kann Race Conditions erzeugen
- N039 - Ready-State braucht konsistente Persistenz und Anzeige
- N041 - GM-Fortschritt haengt stark vom Admin Week Flow ab
- N045 - Active Draft darf nicht automatisch Fullscreen oeffnen
- N048 - Draft State hat mehrere Race- und Truth-Risiken
- N061 - Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten
- N067 - Team Management braucht klare No-Team- und No-Roster-Zustaende
- N068 - Week Simulation braucht gueltigen Schedule
- N069 - Week Simulation braucht vorhandene Teams
- N085 - Stale `lastLeagueId` kann Nutzer blockieren
- N086 - Draft Pick und Draft State koennen parallel kollidieren
- N087 - Week Simulation kann doppelt oder parallel laufen
- N088 - Multiplayer hat viele parallele Statusfelder
- N090 - Week Status hat doppelte Wahrheit
- N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen
- N093 - Ready waehrend Simulation ist Race-Risiko

## Bewertungsmatrix

| Finding | Severity | Impact | Confidence | Blockiert Core Loop | Begruendung |
|---|---:|---:|---:|---|---|
| N001 - Codebase ist quantitativ gross | 2 | 2 | 5 | NO | Groesse erschwert Wartung, blockiert aber keinen konkreten Spielflow. |
| N002 - Online League Service ist zentraler Monolith | 4 | 4 | 5 | NO | Hohe Aenderungsrisiken im Multiplayer, aber kein einzelner direkter Runtime-Blocker. |
| N003 - Game Engine Dateien sind sehr gross | 3 | 3 | 5 | NO | Wartbarkeitsrisiko fuer Simulation, aber nicht als aktueller Ausfall belegt. |
| N004 - `simulateMatch` ist sehr lang und schwer testbar | 4 | 4 | 5 | NO | Kritisch fuer Simulationswartung; direkter Core-Loop-Ausfall ist nicht nachgewiesen. |
| N005 - Online League Placeholder ist grosse Client-Orchestrator-Komponente | 4 | 4 | 5 | NO | Breite Komponente kann Dashboard-Regressionsrisiken erzeugen, blockiert nicht zwangslaeufig. |
| N006 - Admin League Detail ist grosse, schwer reviewbare Komponente | 4 | 4 | 5 | NO | Admin-Simulation ist wichtig, aber Groesse allein blockiert nicht. |
| N007 - Admin Online Actions sind zu breit | 4 | 4 | 5 | NO | Mutierende Admin-Use-Cases sind riskant, aber kein konkreter Fehler in jedem Lauf. |
| N008 - `MemoryStorage` Test-Fixtures sind dupliziert | 2 | 2 | 5 | NO | Testwartung betroffen, kein direkter Spielbarkeitsblocker. |
| N009 - League-/GM-Testsetup ist dupliziert | 2 | 2 | 5 | NO | Erhoeht Testpflegeaufwand, nicht den User-Flow direkt. |
| N010 - Server-Action-Feedback-Logik ist dupliziert | 2 | 2 | 4 | NO | Kann Inkonsistenzen erzeugen, aber aktuell eher Wartungsthema. |
| N011 - Player-Seed-Mapping-Logik ist dupliziert | 3 | 3 | 4 | NO | Kann Seed-Daten inkonsistent machen, aber kein unmittelbarer Runtime-Blocker. |
| N012 - QA-Report-Rendering-Logik ist dupliziert | 1 | 1 | 4 | NO | Dokumentations-/Tooling-Duplizierung mit geringem Gameplay-Impact. |
| N013 - Admin-/Online-Statuskarten sind aehnlich implementiert | 2 | 2 | 4 | NO | UI-Wartung betroffen, nicht Core Loop. |
| N014 - Viele ungenutzte Export-Kandidaten | 2 | 2 | 5 | NO | Codehygiene-/Bundle-Risiko, aber kein direkter Flow-Block. |
| N015 - TODO/FIXME/HACK-Hinweise sind vorhanden | 2 | 2 | 4 | NO | Offene Hinweise sind unspezifisch; Impact konservativ niedrig. |
| N016 - Viele `console.*`-Vorkommen | 2 | 1 | 5 | NO | Stoert Codehygiene, aber kaum Spielbarkeitsimpact. |
| N017 - Firestore Rules enthalten offene TODOs | 4 | 4 | 4 | NO | Berechtigungsmodell kann kritisch sein; konkreter Core-Loop-Block ist nicht belegt. |
| N018 - `team.types` ist ein Kopplungshotspot | 3 | 3 | 5 | NO | Breite Kopplung erhoeht Regressionsrisiko bei Teamfeatures. |
| N019 - Shared Enums sind stark gekoppelt | 3 | 3 | 5 | NO | Globale Enum-Aenderungen koennen breit wirken, aber nicht direkt blockieren. |
| N020 - Format-Utilities sind stark gekoppelt | 2 | 2 | 5 | NO | Formatierung ist breit, aber selten core-loop-kritisch. |
| N021 - StatusBadge ist breit verwendet | 2 | 2 | 5 | NO | Darstellung kann inkonsistent werden, aber kein Flow-Blocker. |
| N022 - Session/Auth ist breit gekoppelt | 4 | 4 | 5 | NO | Auth-Kopplung kann viele Flows betreffen; kein konkreter Blocker allein. |
| N023 - Online League Types sind breit verwendet | 3 | 4 | 5 | NO | Online-Modellaenderungen koennen Multiplayer breit treffen. |
| N024 - SectionPanel ist breit verwendet | 1 | 1 | 4 | NO | Wahrscheinlich normales Shared-UI-Primitive. |
| N025 - StatCard ist breit verwendet | 1 | 1 | 4 | NO | Wahrscheinlich normales Shared-UI-Primitive. |
| N026 - Seeded RNG ist breit gekoppelt | 3 | 3 | 4 | NO | Determinismus ist wichtig, aber kein aktueller Ausfall belegt. |
| N027 - Firebase Admin ist breit gekoppelt | 4 | 3 | 5 | NO | Server-only-Grenzen sind wichtig, aber Buildfehler sind nicht aktuell belegt. |
| N028 - Adminzugriff hat Claim-/UID-Allowlist-Komplexitaet | 5 | 4 | 5 | NO | Adminzugriff kann Week-Simulation verhindern, aber Core-Loop-Block ist indirekt. |
| N029 - Logout-Recovery muss Online-Kontext bereinigen | 3 | 3 | 4 | NO | Schlechter Logout kann spaetere Online-Flows stoeren. |
| N030 - Offline Flow wirkt trotz Name auth-/account-gebunden | 2 | 2 | 4 | NO | Betrifft Verstaendnis des Offline-Einstiegs, nicht Multiplayer-Core-Loop. |
| N031 - Loeschaktionen nutzen native Confirm-Dialoge | 2 | 1 | 5 | NO | UI-Konsistenzproblem mit geringem Core-Impact. |
| N032 - Admin Eingaben nutzen native Prompts | 2 | 2 | 5 | NO | Admin-UX unschoen, aber nicht automatisch blockierend. |
| N033 - Online Join/Rejoin hat viele versteckte Abhaengigkeiten | 5 | 5 | 5 | YES | Lobby-Einstieg kann scheitern, wenn Membership/Team/lastLeagueId nicht konsistent sind. |
| N034 - Fehlende Membership kann Nutzer in Schleifen fuehren | 5 | 5 | 5 | YES | Ohne Membership kann der Nutzer die Liga nicht laden oder rejoinen. |
| N035 - Fehlende Team-Zuordnung blockiert Multiplayer | 5 | 5 | 5 | YES | Ohne Team-Zuordnung ist der Multiplayer-Core-Loop fuer GM blockiert. |
| N036 - User-Team-Link hat mehrere Inkonsistenzstellen | 5 | 5 | 5 | YES | Inkonsistente User-Team-Verbindung blockiert Lobby, Ready und Teamkontext. |
| N037 - Globaler League Member Mirror ist doppelte Source of Truth | 4 | 4 | 5 | NO | Kann N036 ausloesen, ist aber als Strukturproblem nicht immer direkt blockierend. |
| N038 - Team Assignment kann Race Conditions erzeugen | 5 | 4 | 5 | YES | Gleichzeitige Teamzuweisung kann Lobby/Join fuer betroffene Nutzer brechen. |
| N039 - Ready-State braucht konsistente Persistenz und Anzeige | 4 | 5 | 5 | YES | Ready ist expliziter Core-Loop-Schritt. |
| N040 - Admin Week Actions sind semantisch unklar | 2 | 3 | 5 | NO | Verwirrt Admins, blockiert technisch aber nicht zwingend. |
| N041 - GM-Fortschritt haengt stark vom Admin Week Flow ab | 4 | 5 | 5 | YES | Simulation und Week Progression koennen ohne Admin-Aktion stehenbleiben. |
| N042 - Nicht-MVP Sidebar-Features sind Coming Soon | 2 | 2 | 5 | NO | Scope-/UX-Thema ausserhalb Core Loop. |
| N043 - Offline Nebenfeatures sind unvollstaendig | 2 | 1 | 5 | NO | Betrifft Offline-Nebenfeatures. |
| N044 - Draft MVP ist begrenzt | 3 | 4 | 5 | NO | Draft ist Core-Loop-Teil, aber Begrenzung allein blockiert nicht zwingend. |
| N045 - Active Draft darf nicht automatisch Fullscreen oeffnen | 3 | 4 | 5 | YES | Auto-Navigation kann den Draft-/Dashboard-Flow fuer Spieler stoeren. |
| N046 - Active Draft kann andere Bereiche blockierend wirken lassen | 3 | 3 | 5 | NO | Verstaendnisproblem; blockiert nur bei falscher Guard-Logik. |
| N047 - Completed Draft braucht klare Statusdarstellung | 3 | 3 | 5 | NO | UI-Status kann verwirren, blockiert nur indirekt. |
| N048 - Draft State hat mehrere Race- und Truth-Risiken | 5 | 5 | 5 | YES | Draft ist Core-Loop-Schritt; inkonsistenter Draft-State kann den Flow brechen. |
| N049 - Online Navigation mischt Hashes und Routen | 3 | 3 | 5 | NO | Kann Direktaufrufe/Back-Handling stoeren, aber nicht zwingend Core-Loop-Blocker. |
| N050 - Statuskarten erzeugen visuelle Konkurrenz | 1 | 2 | 4 | NO | Kosmetisch/UX, kein technischer Blocker. |
| N051 - Terminologie ist inkonsistent | 1 | 2 | 4 | NO | Verstaendnisproblem, kein technischer Blocker. |
| N052 - First-Time und Returning Player Einstieg sind nicht eindeutig | 2 | 3 | 5 | NO | Einstieg kann verwirren, aber nicht zwingend blockieren. |
| N053 - Admin UI ist ueberladen | 2 | 3 | 5 | NO | Erhoeht Bedienfehler, blockiert nicht direkt. |
| N054 - Admin-Aktionen koennen versehentlich datenveraendernd sein | 5 | 4 | 5 | NO | Kritisches Datenrisiko, aber nicht zwingend Core-Loop-Ausfall. |
| N055 - Zwei Architekturmodelle laufen parallel | 3 | 3 | 5 | NO | Wartbarkeits- und Kopplungsthema. |
| N056 - Multiplayer UI, State und Persistence sind eng gekoppelt | 4 | 4 | 5 | NO | Erhoeht Regressionsrisiko im Multiplayer, aber nicht ein einzelner Blocker. |
| N057 - Firebase Online Repository ist zu breit | 4 | 4 | 5 | NO | Breite Datenzugriffsschicht kann viele Flows beeinflussen. |
| N058 - Firebase Admin darf nicht in Client Bundles gelangen | 5 | 4 | 5 | NO | Build-/Security-kritisch, aber nicht direkt Core Loop zur Laufzeit. |
| N059 - UI importiert Domain- und Application-Typen breit | 3 | 3 | 5 | NO | Kopplungsthema. |
| N060 - Application Services importieren UI-Modelle | 4 | 3 | 4 | NO | Architekturverletzung mit Regressionsrisiko. |
| N061 - Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten | 4 | 5 | 4 | YES | Falsche Adapterdaten koennen Simulationsergebnisse verhindern oder verfälschen. |
| N062 - Admin `Details verwalten` und `Oeffnen` sind redundant | 1 | 1 | 5 | NO | UI-Klarheit, kein Core-Loop-Blocker. |
| N063 - Firebase Multiplayer Training ist nur eingeschraenkt | 2 | 1 | 5 | NO | Nicht Teil des definierten Core Loops. |
| N064 - Admin Draft Status ist nur ein Hinweisbereich | 2 | 2 | 5 | NO | Admin-Informationsluecke, aber nicht direkt blockierend. |
| N065 - Auth Debug ist technisch formuliert | 1 | 1 | 5 | NO | Copy-/Debug-Thema. |
| N066 - Dashboard kann ueberladen wirken | 2 | 3 | 4 | NO | Kann Verstaendnis erschweren, aber nicht technisch blockieren. |
| N067 - Team Management braucht klare No-Team- und No-Roster-Zustaende | 4 | 4 | 5 | YES | Fehlende Team-/Roster-Daten koennen Draft-/Ready-/Simulation-Kontext blockieren. |
| N068 - Week Simulation braucht gueltigen Schedule | 5 | 5 | 5 | YES | Ohne Schedule ist Simulation direkt blockiert. |
| N069 - Week Simulation braucht vorhandene Teams | 5 | 5 | 5 | YES | Ohne Teams ist Simulation direkt blockiert. |
| N070 - Online League Route Bundle ist gross | 3 | 3 | 5 | NO | Performance-Risiko, aber kein funktionaler Blocker. |
| N071 - Online Draft Route Bundle ist gross | 3 | 3 | 5 | NO | Performance-Risiko fuer Draft-Route. |
| N072 - Admin Route Bundle ist gross | 3 | 2 | 5 | NO | Performance-Risiko fuer Admin, Core Loop nur indirekt. |
| N073 - Savegames Route Bundle ist gross | 3 | 2 | 5 | NO | Performance-Risiko beim Einstieg. |
| N074 - Wenige dynamische Imports | 2 | 2 | 4 | NO | Optimierungspotenzial, kein Blocker. |
| N075 - `subscribeToLeague` liest zu viele Datenbereiche | 4 | 4 | 5 | NO | Kann Performance/Kosten und stale Updates beeinflussen, aber kein direkter Blocker. |
| N076 - Lobby-/Teamreads koennen N+1 erzeugen | 3 | 3 | 4 | NO | Kann Lobby verlangsamen, aber nicht zwingend blockieren. |
| N077 - Events werden breit reloadet | 3 | 2 | 4 | NO | Kosten-/Performance-Thema. |
| N078 - League Document kann stark wachsen | 4 | 4 | 5 | NO | Skalierungsrisiko fuer Results/Schedule, aber aktuell nicht zwingend blockierend. |
| N079 - Firestore Reads/Writes sind Kostenrisiko | 4 | 3 | 5 | NO | Kosten und Latenz, kein unmittelbarer Spielbarkeitsblocker. |
| N080 - Route-Bundles koennen weiter wachsen | 3 | 2 | 5 | NO | Langfristiges Performance-Risiko. |
| N081 - Online Detail Models berechnen mehrfach | 3 | 2 | 4 | NO | Renderkosten, kein direkter Blocker. |
| N082 - Standings-Fallback scannt Results | 3 | 3 | 4 | NO | Ergebnisanzeige kann langsamer werden, aber nicht als Ausfall belegt. |
| N083 - Draft Room sortiert gesamten Spielerpool | 3 | 3 | 5 | NO | Draft-Performance kann leiden, aber MVP-Datenmenge vermutlich tragbar. |
| N084 - Roster-/Depth-Listen sind nicht breit virtualisiert | 2 | 2 | 4 | NO | Bei 53 Spielern eher moderat. |
| N085 - Stale `lastLeagueId` kann Nutzer blockieren | 4 | 4 | 5 | YES | Ungueltiger Einstieg kann Lobby/Rejoin blockieren. |
| N086 - Draft Pick und Draft State koennen parallel kollidieren | 5 | 5 | 5 | YES | Draft-Picks sind Core-Loop-kritisch. |
| N087 - Week Simulation kann doppelt oder parallel laufen | 5 | 5 | 5 | YES | Doppelte Simulation kann Ergebnisse und Woche korrumpieren. |
| N088 - Multiplayer hat viele parallele Statusfelder | 4 | 4 | 5 | YES | Statuswidersprueche koennen Draft/Ready/Simulation blockieren. |
| N089 - Zentrale Online State Machine fehlt | 4 | 4 | 5 | NO | Ursache vieler State-Probleme, aber nicht unmittelbar einzelner Blocker. |
| N090 - Week Status hat doppelte Wahrheit | 5 | 5 | 5 | YES | Ergebnis/Week-Progression kann widerspruechlich werden. |
| N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen | 5 | 5 | 5 | YES | Falscher Week Advance blockiert oder verfaelscht Simulation/Ergebnis. |
| N092 - Admin-/Repair-Scripts koennen Multiplayer-State veraendern | 5 | 4 | 5 | NO | Datenrisiko, aber nicht Teil des Live-Core-Loops. |
| N093 - Ready waehrend Simulation ist Race-Risiko | 4 | 5 | 5 | YES | Ready und Simulation sind direkt im Core Loop gekoppelt. |
| N094 - Core Loop ist dokumentiert, aber eng | 2 | 3 | 5 | NO | Produktumfang ist knapp, aber nicht automatisch blockierend. |
| N095 - Adminmodus ist fuer normale Spieler zu prominent | 1 | 2 | 5 | NO | Scope-/UX-Thema. |
| N096 - Redundante Admin Actions konkurrieren sichtbar | 2 | 2 | 5 | NO | UI-Verwirrung, kein Core-Loop-Ausfall. |
| N097 - Nicht-MVP-Features duerfen nicht aktiv konkurrieren | 2 | 2 | 5 | NO | Scope-Fokus, kein Core-Loop-Block. |
| N098 - MVP-Zustand ist Gelb | 2 | 3 | 4 | NO | Reifegradsignal, kein einzelner technischer Blocker. |
| N099 - Multiplayer Acceptance und UX-Audit widersprechen sich | 2 | 3 | 4 | NO | Bewertungswiderspruch, kein Runtime-Blocker. |
| N100 - Vitest Suite ist vorhanden und umfangreich | 1 | 1 | 5 | NO | Positiver Befund; kein Blocker. |
| N101 - E2E scheitert lokal an DB-Verbindung | 3 | 4 | 5 | NO | Release-Sicherheit betroffen, aber Spiel selbst nicht direkt. |
| N102 - Firebase Parity braucht Emulator-Portbindung | 2 | 3 | 5 | NO | Testinfra-Abhaengigkeit. |
| N103 - Authentifizierter Staging Smoke fehlt als bestaetigtes Gate | 4 | 4 | 5 | NO | Release-Blocker moeglich, aber kein direkter Spiel-Flow-Defekt. |
| N104 - Multiplayer GM Rejoin Browser-Test fehlt | 4 | 4 | 5 | NO | Kritische Testluecke fuer Lobby/Rejoin. |
| N105 - Admin Week E2E Reload-Test fehlt | 4 | 4 | 5 | NO | Kritische Testluecke fuer Simulation/Ergebnis. |
| N106 - Tests fuer parallele Multiplayer-Aktionen fehlen | 4 | 4 | 5 | NO | Race-Risiken ungetestet, aber Tests fehlen statt Runtime-Defekt. |
| N107 - Firestore Rules Tests fuer Admin fehlen | 4 | 3 | 5 | NO | Security-Testluecke. |
| N108 - Sidebar/Coming-Soon Browser-Test fehlt | 2 | 2 | 5 | NO | UI-Testluecke ausserhalb Core Loop. |
| N109 - Seed/Reset Emulator-Integration fehlt | 3 | 3 | 5 | NO | Testdaten-Stabilitaet betroffen. |
| N110 - Savegames Offline Flow mit DB ist nicht ausreichend getestet | 3 | 2 | 5 | NO | Offline-Testluecke, nicht Core Loop. |
| N111 - A11y/Mobile Smoke fehlt | 2 | 2 | 5 | NO | QA-Abdeckung, kein direkter Core-Loop-Defekt. |
| N112 - QA-Gruen und E2E-Rot widersprechen sich | 4 | 4 | 5 | NO | Release-Vertrauen betroffen, Spielbarkeit nicht direkt. |
| N113 - Env-Dateien existieren lokal und muessen ignoriert bleiben | 3 | 2 | 5 | NO | Secret-Hygiene relevant, aber nicht Core Loop. |
| N114 - Public Firebase API Key kommt in Config/Scripts vor | 2 | 1 | 4 | NO | Public Web Config, daher konservativ niedriger Impact. |
| N115 - Runtime Guards schuetzen Umgebungen | 2 | 2 | 4 | NO | Positiver Guardrail-Befund; kein Blocker. |
| N116 - Production Firestore kann per Flag aktiviert werden | 5 | 3 | 5 | NO | Kritisches Betriebsrisiko, aber nicht Core Loop. |
| N117 - Production App Hosting Ziel ist nicht verifiziert | 5 | 3 | 5 | NO | Deployment-Blocker, kein Staging-Spielbarkeitsblocker. |
| N118 - Staging Smoke kann an IAM `signJwt` scheitern | 4 | 3 | 5 | NO | Release-/Testinfra-Blocker, nicht direkter Spiel-Flow. |
| N119 - Firestore Rules sind komplex und clientseitig restriktiv | 5 | 4 | 5 | NO | Kann Admin/Online-Zugriffe brechen, aber nicht als konkreter Core-Loop-Defekt isoliert. |
| N120 - Dokumentation und Reports koennen stale werden | 2 | 2 | 5 | NO | Wissens-/Prozessrisiko. |
