# Phase 2 Decision Proposals

Quelle: `docs/reports/full-project-analysis/master-findings-table.md`

Hinweis: Dies sind Entscheidungsvorschlaege. Die Master Findings Table wurde nicht veraendert.

## Verteilung der Entscheidungen

| Entscheidung | Anzahl |
|---|---:|
| FIX LATER | 84 |
| FIX NOW | 22 |
| FREEZE | 8 |
| REMOVE | 6 |

Anzahl FIX NOW: 22

## Entscheidungsmatrix

| ID | Finding | Empfohlene Entscheidung | Kurze Begruendung | Bezug zum Core Loop | Risiko wenn ignoriert |
|---|---|---|---|---|---|
| N001 | Codebase ist quantitativ gross | FIX LATER | Kein direkter Core-Loop-Blocker; als Strukturthema spaeter bearbeiten. | Indirekt | Wartung bleibt langsamer. |
| N002 | Online League Service ist zentraler Monolith | FIX LATER | Wichtig, aber erst nach Core-State-Fixes schneiden. | Indirekt | Core-Fixes bleiben riskant und langsam. |
| N003 | Game Engine Dateien sind sehr gross | FREEZE | Engine-Refactor ist zu riskant ohne gezielte Tests. | Indirekt Simulation | Unuebersichtlichkeit bleibt bestehen. |
| N004 | `simulateMatch` ist sehr lang und schwer testbar | FREEZE | Kritisch, aber grosser Engine-Eingriff gehoert nicht in Phase 2. | Indirekt Simulation | Simulation bleibt schwer testbar. |
| N005 | Online League Placeholder ist grosse Client-Orchestrator-Komponente | FIX LATER | Nach Flow-/State-Stabilisierung weiter entlasten. | Indirekt | UI-Regressionen bleiben wahrscheinlicher. |
| N006 | Admin League Detail ist grosse, schwer reviewbare Komponente | FIX LATER | Relevant, aber kein unmittelbarer Daten- oder Flow-Blocker. | Indirekt Simulation | Admin-Fixes bleiben schwer reviewbar. |
| N007 | Admin Online Actions sind zu breit | FIX LATER | Wichtig fuer Wartbarkeit; akute State-Blocker zuerst. | Indirekt Simulation | Mutierende Admin-Pfade bleiben schwer isolierbar. |
| N008 | `MemoryStorage` Test-Fixtures sind dupliziert | FIX LATER | Testhygiene, aber nicht core-loop-blockierend. | Keiner | Tests bleiben pflegeintensiver. |
| N009 | League-/GM-Testsetup ist dupliziert | FIX LATER | Testhygiene; nach kritischen E2E-Gates konsolidieren. | Indirekt Lobby | Neue Tests bleiben aufwendiger. |
| N010 | Server-Action-Feedback-Logik ist dupliziert | FIX LATER | Duplikat ohne akuten Core-Loop-Block. | Keiner | UI-Feedback kann inkonsistent bleiben. |
| N011 | Player-Seed-Mapping-Logik ist dupliziert | FIX LATER | Seed-/Mapping-Duplizierung spaeter konsolidieren. | Indirekt Draft | Testdaten koennen auseinanderlaufen. |
| N012 | QA-Report-Rendering-Logik ist dupliziert | FIX LATER | Geringer Produktimpact. | Keiner | Report-Wartung bleibt doppelt. |
| N013 | Admin-/Online-Statuskarten sind aehnlich implementiert | FIX LATER | UI-Duplizierung ohne direkten Blocker. | Indirekt | Statusdarstellung kann uneinheitlich bleiben. |
| N014 | Viele ungenutzte Export-Kandidaten | FIX LATER | Cleanup nach Stabilisierung. | Keiner | Code bleibt groesser als noetig. |
| N015 | TODO/FIXME/HACK-Hinweise sind vorhanden | FIX LATER | Erst triagieren, keine pauschale Sofortarbeit. | Unklar | Offene Stellen bleiben unscharf. |
| N016 | Viele `console.*`-Vorkommen | FIX LATER | Logging-Hygiene, kein Core-Loop-Blocker. | Keiner | Debug-Ausgaben bleiben uneinheitlich. |
| N017 | Firestore Rules enthalten offene TODOs | FIX LATER | Wichtig, aber nicht als aktueller Core-Loop-Blocker belegt. | Indirekt | Berechtigungsmodell bleibt unscharf. |
| N018 | `team.types` ist ein Kopplungshotspot | FIX LATER | Architekturthema ohne akuten Block. | Indirekt Team | Aenderungen an Teamtypen bleiben riskant. |
| N019 | Shared Enums sind stark gekoppelt | FIX LATER | Globale Kopplung spaeter reduzieren. | Indirekt | Enum-Aenderungen koennen breit brechen. |
| N020 | Format-Utilities sind stark gekoppelt | FIX LATER | Niedriger Impact. | Keiner | Formatierung bleibt gekoppelt. |
| N021 | StatusBadge ist breit verwendet | FIX LATER | Shared UI kann bleiben, bis konkreter Schmerz entsteht. | Indirekt | Statusvarianten koennen inkonsistent werden. |
| N022 | Session/Auth ist breit gekoppelt | FIX LATER | Relevant, aber nicht sofort als Blocker markiert. | Indirekt Lobby | Auth-Regressionen bleiben breit wirksam. |
| N023 | Online League Types sind breit verwendet | FIX LATER | Typkopplung nach State-Fixes angehen. | Indirekt | Modell-Aenderungen bleiben riskant. |
| N024 | SectionPanel ist breit verwendet | FIX LATER | Kein klarer Defekt. | Keiner | Kein wesentliches Risiko. |
| N025 | StatCard ist breit verwendet | FIX LATER | Kein klarer Defekt. | Keiner | Kein wesentliches Risiko. |
| N026 | Seeded RNG ist breit gekoppelt | FIX LATER | Determinismus wichtig, aber kein akuter Blocker. | Indirekt Draft/Simulation | RNG-Aenderungen bleiben breit wirksam. |
| N027 | Firebase Admin ist breit gekoppelt | FIX LATER | Server-only-Grenzen weiter beobachten. | Indirekt Admin | Build-/Importfehler koennen wiederkehren. |
| N028 | Adminzugriff hat Claim-/UID-Allowlist-Komplexitaet | FIX LATER | Sicherheitsmodell wichtig, aber nicht als aktueller Core-Loop-Blocker markiert. | Indirekt Simulation | Adminzugriff kann unerwartet scheitern. |
| N029 | Logout-Recovery muss Online-Kontext bereinigen | FIX LATER | Wichtig fuer Robustheit, aber nicht Core-Loop-FIX-NOW. | Indirekt Lobby | Stale lokaler Kontext kann Nutzer verwirren. |
| N030 | Offline Flow wirkt trotz Name auth-/account-gebunden | FIX LATER | Offline ist nicht Teil des Multiplayer-Core-Loops. | Keiner | Einstieg bleibt verwirrend. |
| N031 | Loeschaktionen nutzen native Confirm-Dialoge | FIX LATER | UI-Qualitaet, kein Blocker. | Keiner | Inkonsistente Dialog-UX bleibt. |
| N032 | Admin Eingaben nutzen native Prompts | FIX LATER | Kein Core-Loop-Blocker; spaeter UI vereinheitlichen. | Indirekt Admin | Admin-Bedienung bleibt unprofessionell. |
| N033 | Online Join/Rejoin hat viele versteckte Abhaengigkeiten | FIX NOW | Blockiert den Einstieg in die Liga. | Direkt Lobby | Spieler erreichen Draft/Ready/Simulation nicht. |
| N034 | Fehlende Membership kann Nutzer in Schleifen fuehren | FIX NOW | Ohne Membership kann Liga nicht geladen werden. | Direkt Lobby | Nutzer bleiben vor dem Spiel haengen. |
| N035 | Fehlende Team-Zuordnung blockiert Multiplayer | FIX NOW | Ohne Team gibt es keinen GM-Kontext. | Direkt Lobby | Roster, Ready und Simulation sind unbrauchbar. |
| N036 | User-Team-Link hat mehrere Inkonsistenzstellen | FIX NOW | Dateninkonsistenz zwischen User, Membership und Team. | Direkt Lobby/Ready | User verliert Teamzugriff oder Rechte. |
| N037 | Globaler League Member Mirror ist doppelte Source of Truth | FIX NOW | Dateninkonsistenz durch Mirror und Membership. | Direkt Lobby | Rejoin und Permission Checks koennen brechen. |
| N038 | Team Assignment kann Race Conditions erzeugen | FIX NOW | Race Condition kann Teams doppelt vergeben. | Direkt Lobby | Teamzuweisungen werden inkonsistent. |
| N039 | Ready-State braucht konsistente Persistenz und Anzeige | FIX NOW | Ready ist ein Core-Loop-Schritt. | Direkt Ready | Simulation startet falsch oder gar nicht. |
| N040 | Admin Week Actions sind semantisch unklar | FIX LATER | UI-Klarheit, aber nicht direkt dateninkonsistent. | Indirekt Simulation | Admins koennen falsche Aktion waehlen. |
| N041 | GM-Fortschritt haengt stark vom Admin Week Flow ab | FIX NOW | Admin-Simulation ist notwendiger Fortschrittsschritt. | Direkt Simulation | GMs bleiben nach Ready stehen. |
| N042 | Nicht-MVP Sidebar-Features sind Coming Soon | REMOVE | Aktive Sichtbarkeit ohne MVP-Nutzen reduzieren. | Keiner | Spieler laufen in unfertige Bereiche. |
| N043 | Offline Nebenfeatures sind unvollstaendig | FREEZE | Nicht Teil des aktuellen Multiplayer-Ziels. | Keiner | Nebenfeatures ziehen Fokus ab. |
| N044 | Draft MVP ist begrenzt | FREEZE | Draft nicht ausbauen, nur Stabilitaet sichern. | Direkt Draft | Scope creep gefaehrdet Core-Fixes. |
| N045 | Active Draft darf nicht automatisch Fullscreen oeffnen | FIX NOW | Falsche Auto-Navigation stoert den Draft-Flow. | Direkt Draft | Nutzer werden aus dem Dashboard gerissen. |
| N046 | Active Draft kann andere Bereiche blockierend wirken lassen | FIX LATER | Gating erklaeren, aber nicht als Sofortblocker gesetzt. | Indirekt Draft | Nutzer verstehen gesperrte Bereiche nicht. |
| N047 | Completed Draft braucht klare Statusdarstellung | FIX LATER | UI-Status nach Core-State-Fixes schaerfen. | Indirekt Draft | Nutzer glauben, Draft sei noch aktiv. |
| N048 | Draft State hat mehrere Race- und Truth-Risiken | FIX NOW | Dateninkonsistenz im Draft blockiert Roster. | Direkt Draft | Picks/Roster koennen kaputt werden. |
| N049 | Online Navigation mischt Hashes und Routen | FIX LATER | Navigation stabilisieren, aber nicht akut dateninkonsistent. | Indirekt | Back/Reload kann verwirren. |
| N050 | Statuskarten erzeugen visuelle Konkurrenz | FIX LATER | Visuelles Thema ohne Blocker. | Keiner | Wichtige Zustaende werden schwerer erkennbar. |
| N051 | Terminologie ist inkonsistent | FIX LATER | UX-Polish nach Core-Fixes. | Indirekt | Nutzer verstehen Pfade schlechter. |
| N052 | First-Time und Returning Player Einstieg sind nicht eindeutig | FIX LATER | Wichtig, aber kein direkter Datenblocker. | Indirekt Lobby | Einstieg bleibt unklar. |
| N053 | Admin UI ist ueberladen | FIX LATER | Nach kritischer Simulation stabilisieren. | Indirekt Simulation | Adminfehler bleiben wahrscheinlicher. |
| N054 | Admin-Aktionen koennen versehentlich datenveraendernd sein | FIX LATER | Sicherheitsrelevant, aber nicht als aktuelle Inkonsistenz belegt. | Indirekt Simulation | Fehlbedienung kann Daten veraendern. |
| N055 | Zwei Architekturmodelle laufen parallel | FREEZE | Grosse Zielarchitektur nicht jetzt umbauen. | Indirekt | Uneinheitlichkeit bleibt. |
| N056 | Multiplayer UI, State und Persistence sind eng gekoppelt | FIX LATER | Nach State-Fixes modularisieren. | Indirekt | Regressionsrisiko bleibt hoch. |
| N057 | Firebase Online Repository ist zu breit | FIX LATER | Refactor nach Core-State-Stabilisierung. | Indirekt | Datenzugriff bleibt schwer wartbar. |
| N058 | Firebase Admin darf nicht in Client Bundles gelangen | FIX LATER | Wichtig als Guardrail, aber aktuell nicht blockierend. | Indirekt Admin | Build-/Security-Regression moeglich. |
| N059 | UI importiert Domain- und Application-Typen breit | FIX LATER | Architekturthema spaeter. | Indirekt | UI bleibt stark gekoppelt. |
| N060 | Application Services importieren UI-Modelle | FIX LATER | Architekturverletzung ohne akuten Block. | Indirekt | Schichtentrennung bleibt unsauber. |
| N061 | Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten | FIX NOW | Adapterdaten koennen Simulation blockieren. | Direkt Simulation | Woche kann nicht korrekt simuliert werden. |
| N062 | Admin `Details verwalten` und `Oeffnen` sind redundant | REMOVE | Redundante UI-Aktion ohne klaren Zusatznutzen. | Keiner | Admin UI bleibt unnoetig verwirrend. |
| N063 | Firebase Multiplayer Training ist nur eingeschraenkt | FREEZE | Nicht Core Loop; nicht weiter ausbauen. | Keiner | Scope erweitert sich ohne MVP-Nutzen. |
| N064 | Admin Draft Status ist nur ein Hinweisbereich | FIX LATER | Spater als passiven Status klaeren. | Indirekt Draft | Admin erwartet mehr Funktion. |
| N065 | Auth Debug ist technisch formuliert | REMOVE | Debug-Copy aus Spielerpfaden entfernen. | Keiner | Nutzer werden mit Technikdetails belastet. |
| N066 | Dashboard kann ueberladen wirken | FIX LATER | Nach Core-State-Fixes vereinfachen. | Indirekt | Naechster Schritt bleibt schwer erkennbar. |
| N067 | Team Management braucht klare No-Team- und No-Roster-Zustaende | FIX NOW | Fehlender Team-/Roster-State blockiert Spielvorbereitung. | Direkt Lobby/Ready | Nutzer landen in kaputten Teamseiten. |
| N068 | Week Simulation braucht gueltigen Schedule | FIX NOW | Ohne Schedule keine Simulation. | Direkt Simulation | Core Loop stoppt vor Ergebnissen. |
| N069 | Week Simulation braucht vorhandene Teams | FIX NOW | Ohne Teams keine Simulation. | Direkt Simulation | Games koennen nicht berechnet werden. |
| N070 | Online League Route Bundle ist gross | FIX LATER | Performance nach Stabilitaet optimieren. | Indirekt Lobby | Route kann langsam bleiben. |
| N071 | Online Draft Route Bundle ist gross | FIX LATER | Performance spaeter messen und optimieren. | Indirekt Draft | Draft-Route kann langsam bleiben. |
| N072 | Admin Route Bundle ist gross | FIX LATER | Kein Core-Loop-Blocker. | Indirekt Admin | Admin laedt langsamer. |
| N073 | Savegames Route Bundle ist gross | FIX LATER | Einstieg-Performance spaeter optimieren. | Indirekt Lobby | Einstieg bleibt schwerfaelliger. |
| N074 | Wenige dynamische Imports | FIX LATER | Optimierung nach Messung. | Indirekt | Bundles bleiben groesser. |
| N075 | `subscribeToLeague` liest zu viele Datenbereiche | FIX LATER | Performance/Kosten; nach Core-State-Fixes schneiden. | Indirekt | Reads und stale Updates bleiben teuer. |
| N076 | Lobby-/Teamreads koennen N+1 erzeugen | FIX LATER | Optimieren nach Stabilisierung. | Indirekt Lobby | Lobby kann langsam und teuer bleiben. |
| N077 | Events werden breit reloadet | FIX LATER | Kosten-/Performance-Thema. | Indirekt | Unnoetige Reads bleiben. |
| N078 | League Document kann stark wachsen | FIX LATER | Datenmodell spaeter skalieren. | Indirekt Ergebnis | Reads/Writes werden teurer. |
| N079 | Firestore Reads/Writes sind Kostenrisiko | FIX LATER | Nicht zuerst, solange Core Loop nicht stabil ist. | Indirekt | Firebase-Kosten steigen. |
| N080 | Route-Bundles koennen weiter wachsen | FIX LATER | Bundle-Budget spaeter. | Indirekt | Performance verschlechtert sich. |
| N081 | Online Detail Models berechnen mehrfach | FIX LATER | Renderoptimierung spaeter. | Indirekt | UI bleibt unnoetig teuer. |
| N082 | Standings-Fallback scannt Results | FIX LATER | Ergebnis-Projektionen nach State-Fixes pruefen. | Indirekt Ergebnis | Standings koennen langsam oder uneinheitlich werden. |
| N083 | Draft Room sortiert gesamten Spielerpool | FIX LATER | Performance optimieren, wenn Messung es zeigt. | Indirekt Draft | Draft UI kann bei Wachstum langsam werden. |
| N084 | Roster-/Depth-Listen sind nicht breit virtualisiert | FIX LATER | Kein aktueller MVP-Blocker. | Indirekt Ready | Listen koennen bei Wachstum langsam werden. |
| N085 | Stale `lastLeagueId` kann Nutzer blockieren | FIX NOW | Staler Einstieg blockiert Rejoin. | Direkt Lobby | Nutzer landen in falscher/kaputter Liga. |
| N086 | Draft Pick und Draft State koennen parallel kollidieren | FIX NOW | Race Condition im Draft. | Direkt Draft | Picks werden doppelt oder falsch vergeben. |
| N087 | Week Simulation kann doppelt oder parallel laufen | FIX NOW | Race Condition in Simulation. | Direkt Simulation | Ergebnisse und Records werden korrumpiert. |
| N088 | Multiplayer hat viele parallele Statusfelder | FIX NOW | Dateninkonsistenz durch mehrere Statusfelder. | Direkt Draft/Ready/Simulation | Gates koennen falsch sperren oder freigeben. |
| N089 | Zentrale Online State Machine fehlt | FIX NOW | Ursache mehrerer Dateninkonsistenzen. | Direkt Core Loop | Flow bleibt widerspruechlich und schwer testbar. |
| N090 | Week Status hat doppelte Wahrheit | FIX NOW | Dateninkonsistenz im Ergebniszustand. | Direkt Ergebnis | Results und naechste Woche widersprechen sich. |
| N091 | `currentWeek` darf nur nach erfolgreicher Simulation steigen | FIX NOW | Atomarer Week-Advance ist Core-kritisch. | Direkt Simulation/Ergebnis | Woche springt ohne gespeicherte Ergebnisse. |
| N092 | Admin-/Repair-Scripts koennen Multiplayer-State veraendern | FIX LATER | Script-Safety wichtig, aber nicht Live-Core-Loop. | Indirekt | Stagingdaten koennen beschaedigt werden. |
| N093 | Ready waehrend Simulation ist Race-Risiko | FIX NOW | Race zwischen Ready und Simulation. | Direkt Ready/Simulation | Simulierte Woche hat unklaren Ready-Stand. |
| N094 | Core Loop ist dokumentiert, aber eng | FREEZE | Core Loop nicht erweitern, erst stabilisieren. | Direkt gesamter Core Loop | Scope creep blockiert Stabilisierung. |
| N095 | Adminmodus ist fuer normale Spieler zu prominent | REMOVE | Admin-CTA aus normalen Spielerpfaden reduzieren. | Keiner | Spieler werden in falsche Rolle gelenkt. |
| N096 | Redundante Admin Actions konkurrieren sichtbar | REMOVE | Doppelte Admin-Aktionen entfernen/konsolidieren. | Indirekt Admin | Admin-Bedienung bleibt unklar. |
| N097 | Nicht-MVP-Features duerfen nicht aktiv konkurrieren | REMOVE | Nicht-MVP-Pfade aus aktiver Navigation entfernen/deaktivieren. | Indirekt | Spieler laufen in unfertige Features. |
| N098 | MVP-Zustand ist Gelb | FREEZE | Kein Scope-Ausbau, bis Gelbgruende aufgeloest sind. | Indirekt | Produkt bleibt halb fertig. |
| N099 | Multiplayer Acceptance und UX-Audit widersprechen sich | FIX LATER | Definition of Done klaeren. | Indirekt | Release-Entscheidungen bleiben unscharf. |
| N100 | Vitest Suite ist vorhanden und umfangreich | FIX LATER | Positiver Befund; Baseline erhalten. | Indirekt | Tests koennten entwertet werden, wenn sie nicht gepflegt werden. |
| N101 | E2E scheitert lokal an DB-Verbindung | FIX LATER | Release-Gate wichtig, aber kein Live-Core-Defekt. | Indirekt | E2E bleibt unzuverlaessig. |
| N102 | Firebase Parity braucht Emulator-Portbindung | FIX LATER | Testinfra stabilisieren. | Indirekt | Parity-Test bleibt umgebungsabhaengig. |
| N103 | Authentifizierter Staging Smoke fehlt als bestaetigtes Gate | FIX LATER | Release-Sicherheit, aber nicht Code-Blocker. | Indirekt | Staging-Go bleibt unsicher. |
| N104 | Multiplayer GM Rejoin Browser-Test fehlt | FIX LATER | Kritische Testluecke, nach Flow-Fix ergaenzen. | Indirekt Lobby | Rejoin regressiert unbemerkt. |
| N105 | Admin Week E2E Reload-Test fehlt | FIX LATER | Nach Week-Fix als Gate ergaenzen. | Indirekt Simulation/Ergebnis | Simulation regressiert unbemerkt. |
| N106 | Tests fuer parallele Multiplayer-Aktionen fehlen | FIX LATER | Nach Lock-Fixes testen. | Indirekt | Race Bugs bleiben unentdeckt. |
| N107 | Firestore Rules Tests fuer Admin fehlen | FIX LATER | Wichtig, aber kein Core-FIX-NOW. | Indirekt Admin | Admin/Rules Drift bleibt unentdeckt. |
| N108 | Sidebar/Coming-Soon Browser-Test fehlt | FIX LATER | Nach UI-Remove/Freeze ergaenzen. | Keiner | Placeholder regressieren. |
| N109 | Seed/Reset Emulator-Integration fehlt | FIX LATER | Testdaten-Sicherheit spaeter absichern. | Indirekt | Seeds koennen wieder nicht idempotent werden. |
| N110 | Savegames Offline Flow mit DB ist nicht ausreichend getestet | FIX LATER | Offline nicht Core Loop. | Keiner | Offline-Savebugs bleiben unentdeckt. |
| N111 | A11y/Mobile Smoke fehlt | FIX LATER | QA-Erweiterung spaeter. | Indirekt | Mobile/A11y-Probleme bleiben unentdeckt. |
| N112 | QA-Gruen und E2E-Rot widersprechen sich | FIX LATER | Release-Gates klaeren. | Indirekt | Vertrauen in Checks bleibt gering. |
| N113 | Env-Dateien existieren lokal und muessen ignoriert bleiben | FIX LATER | Secret-Hygiene regelmaessig pruefen. | Keiner | Secrets koennten versehentlich auftauchen. |
| N114 | Public Firebase API Key kommt in Config/Scripts vor | FIX LATER | Public Key, aber Secret-Scan beibehalten. | Keiner | Falsche Secret-Alarme oder echte Leaks werden uebersehen. |
| N115 | Runtime Guards schuetzen Umgebungen | FIX LATER | Guardrails beibehalten und pruefen. | Indirekt | Guards koennen unbemerkt veralten. |
| N116 | Production Firestore kann per Flag aktiviert werden | FIX LATER | Deployment-Safety, kein Core-Loop-FIX-NOW. | Keiner | Fehlkonfiguration kann Production-Daten gefaehrden. |
| N117 | Production App Hosting Ziel ist nicht verifiziert | FIX LATER | Deployment-Blocker separat klaeren. | Keiner | Kein sicherer Production-Rollout moeglich. |
| N118 | Staging Smoke kann an IAM `signJwt` scheitern | FIX LATER | IAM/Smoke-Infrastruktur klaeren. | Indirekt | Auth-Smoke bleibt blockierbar. |
| N119 | Firestore Rules sind komplex und clientseitig restriktiv | FIX LATER | Rules nach Admin-/State-Fixes harmonisieren. | Indirekt | Legitimer Zugriff kann blockieren oder Tests fehlen. |
| N120 | Dokumentation und Reports koennen stale werden | FIX LATER | Prozess-Thema. | Keiner | Entscheidungen beruhen auf alten Reports. |
