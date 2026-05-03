# Findings Recheck After Lifecycle/E2E Fixes

Stand: 2026-05-03 12:40 Europe/Zurich

Grundlage:
- `docs/reports/full-project-analysis/_scored-findings.md`
- aktueller Codezustand nach den Lifecycle-/E2E-Fixes
- ausgefuehrte lokale Checks in diesem Audit

Regel: Bewertet wurde nach Code, Tests und ausfuehrbaren Scripts. Alte Reports wurden nur als Kontext gelesen, nicht als Wahrheit uebernommen.

## Executive Summary

Die letzten Lifecycle-/E2E-Fixes schliessen mehrere zuvor rote oder nur teilweise belegte Multiplayer-Gates: Admin nutzt jetzt ein globales League-Lifecycle-Read-Model, UI/Admin-Enablement und Ready-/Simulation-Writes haengen an derselben Lifecycle-Logik, und der Firebase-Browser-E2E enthaelt nun einen echten Same-Team-Join-Race-Test. Damit sind `N089`, `N104`, `N105`, `N106`, `N108` und `N111` gegenueber dem letzten Recheck auf geloest hochgestuft. `N033` und `N036` sind ebenfalls geloest, weil Rejoin, Team-Claim, stale Team-Link, Membership/Team-Projektion und Write-Gates jetzt verhaltensnah getestet sind.

Kein Production-Go: Die wichtigsten Restluecken liegen bei Production-Preflight/Governance, weiter breiten Monolithen, Mirror-basierter League-Discovery, Performance-Budgets und einigen nicht-MVP/Offline-/Polish-Themen.

## Check-Ergebnisse

| Check | Ergebnis | Hinweis |
|---|---:|---|
| `npx tsc --noEmit` | Gruen | Keine TypeScript-Fehler. |
| `npm run lint` | Gruen | ESLint Exit-Code 0. |
| `npx vitest run src/lib/online/online-league-lifecycle.test.ts src/components/online/online-league-detail-model.test.ts src/components/admin/admin-league-detail-model.test.ts src/components/online/online-league-dashboard-panels.test.tsx src/lib/admin/online-week-simulation.test.ts src/lib/online/repositories/online-league-repository.test.ts src/lib/online/online-league-service.test.ts src/lib/admin/online-admin-actions.test.ts` | Gruen | 8 Testdateien, 161 Tests. |
| `npm run test:e2e:multiplayer:firebase` | Gruen ausserhalb Sandbox | 6 Browser-Tests bestanden; Sandbox blockiert Emulator-Portbindung mit `EPERM`. |

## Statuszahlen

| Status | Anzahl |
|---|---:|
| GELOEST | 47 |
| TEILWEISE | 47 |
| OFFEN | 26 |
| REGRESSION | 0 |

Geloester Anteil: 39.2%.

Offene oder teilweise Core-Loop-Blocker:
- `N041` - Admin-zentrierter Week-Fortschritt bleibt Produkt-/Betriebsrisiko.
- `N061` - Multiplayer-/Singleplayer-Simulationsdatenvertrag ist nur teilweise formalisiert.
- `N088` - Parallelfelder existieren weiter; Read-Model entschärft, ersetzt sie aber nicht hart.

Offene oder teilweise FIX-NOW/Release-Risiken:
- `N037`, `N041`, `N061`, `N088`, `N112`, `N116`, `N117`, `N119`, `N120`

## Alle 120 Findings

| Finding | Status | Kurzbegruendung |
|---|---|---|
| N001 Codebase ist quantitativ gross | OFFEN | Gesamtgroesse bleibt hoch; keine Reduktionsarbeit. |
| N002 Online League Service ist zentraler Monolith | TEILWEISE | Helper/Services existieren, aber `online-league-service.ts` bleibt sehr gross. |
| N003 Game Engine Dateien sind sehr gross | OFFEN | Engine-Monolithen unveraendert. |
| N004 `simulateMatch` ist sehr lang und schwer testbar | OFFEN | Keine neue Engine-Zerlegung belegt. |
| N005 Online League Placeholder ist grosse Client-Orchestrator-Komponente | TEILWEISE | ViewModels existieren, Komponente bleibt gross. |
| N006 Admin League Detail ist grosse, schwer reviewbare Komponente | TEILWEISE | Display/Config/Model sind besser, Datei bleibt handlerreich. |
| N007 Admin Online Actions sind zu breit | TEILWEISE | Guards/Use-Cases existieren, Datei buendelt weiter viele Mutationen. |
| N008 `MemoryStorage` Test-Fixtures sind dupliziert | OFFEN | Gemeinsame Testfactory fehlt. |
| N009 League-/GM-Testsetup ist dupliziert | OFFEN | Multiplayer-Fixtures bleiben breit verteilt. |
| N010 Server-Action-Feedback-Logik ist dupliziert | OFFEN | Kein einheitliches Feedback-Pattern belegt. |
| N011 Player-Seed-Mapping-Logik ist dupliziert | OFFEN | Seed-/Draft-Mapping bleibt verteilt. |
| N012 QA-Report-Rendering-Logik ist dupliziert | OFFEN | Reports bleiben manuell/parallel gepflegt. |
| N013 Admin-/Online-Statuskarten sind aehnlich implementiert | OFFEN | Keine gemeinsame Statuskarten-Abstraktion. |
| N014 Viele ungenutzte Export-Kandidaten | TEILWEISE | Triagiert, aber kein unused-export-Gate. |
| N015 TODO/FIXME/HACK-Hinweise sind vorhanden | GELOEST | Produktiver Suchraum ist bereinigt/klassifiziert. |
| N016 Viele `console.*`-Vorkommen | TEILWEISE | Klassifiziert, aber weiter breit vorhanden. |
| N017 Firestore Rules enthalten offene TODOs | GELOEST | Rules/Tests enthalten keine offenen TODO-Guards mehr. |
| N018 `team.types` ist ein Kopplungshotspot | OFFEN | Keine Kontexttrennung umgesetzt. |
| N019 Shared Enums sind stark gekoppelt | OFFEN | Globale Enums bleiben breite Importbasis. |
| N020 Format-Utilities sind stark gekoppelt | OFFEN | Formatter nicht kontextuell getrennt. |
| N021 StatusBadge ist breit verwendet | OFFEN | Shared UI bleibt breit, ohne fachliche Wrapper. |
| N022 Session/Auth ist breit gekoppelt | TEILWEISE | Admin-Auth geloest, allgemeine Auth-Kopplung bleibt. |
| N023 Online League Types sind breit verwendet | TEILWEISE | Mapper/Guards besser, Typdateien bleiben zentral. |
| N024 SectionPanel ist breit verwendet | OFFEN | Kein aktiver Abbau. |
| N025 StatCard ist breit verwendet | OFFEN | Kein aktiver Abbau. |
| N026 Seeded RNG ist breit gekoppelt | OFFEN | Determinismus-Komponente weiter breit. |
| N027 Firebase Admin ist breit gekoppelt | TEILWEISE | Build gruen, aber kein Import-Boundary-Gate. |
| N028 Adminzugriff hat Claim-/UID-Allowlist-Komplexitaet | GELOEST | Custom Claim ist kanonisch; UID-Allowlist nur Bootstrap-Hinweis. |
| N029 Logout-Recovery muss Online-Kontext bereinigen | GELOEST | Logout/lastLeagueId-Recovery getestet. |
| N030 Offline Flow wirkt trotz Name auth-/account-gebunden | TEILWEISE | Copy besser, Offline-Entry nicht voll entkoppelt. |
| N031 Loeschaktionen nutzen native Confirm-Dialoge | OFFEN | Native Confirms bleiben. |
| N032 Admin Eingaben nutzen native Prompts | OFFEN | Native Prompts bleiben in Admin-Pfaden. |
| N033 Online Join/Rejoin hat viele versteckte Abhaengigkeiten | GELOEST | Rejoin, stale lastLeagueId und Same-Team-Join-Race sind im Browser-E2E abgedeckt. |
| N034 Fehlende Membership kann Nutzer in Schleifen fuehren | GELOEST | Missing Membership wird als Recovery-/Blockzustand getestet. |
| N035 Fehlende Team-Zuordnung blockiert Multiplayer | GELOEST | No-Team wird sichtbar geblockt und per E2E/Modeltests geprueft. |
| N036 User-Team-Link hat mehrere Inkonsistenzstellen | GELOEST | Membership ist kanonisch; Team/Mirror-Projektionen hard-failen oder werden kontrolliert repariert. |
| N037 Globaler League Member Mirror ist doppelte Source of Truth | TEILWEISE | Mirror ist Projektion, bleibt aber fuer League-Discovery aktive Kandidatenquelle. |
| N038 Team Assignment kann Race Conditions erzeugen | GELOEST | Transaktionale Team-Claims plus Same-Team-Browser-Race. |
| N039 Ready-State braucht konsistente Persistenz und Anzeige | GELOEST | Ready blockiert Draft, Simulation, Week Completed, No-Team, No-Roster und ungültige Roster. |
| N040 Admin Week Actions sind semantisch unklar | GELOEST | Admin Actions sind gruppiert/konfiguriert und getestet. |
| N041 GM-Fortschritt haengt stark vom Admin Week Flow ab | TEILWEISE | Admin Week E2E ist gruen, aber Produktmodell bleibt adminzentriert. |
| N042 Nicht-MVP Sidebar-Features sind Coming Soon | GELOEST | Navigation/Direct URLs sind im Browser-Smoke abgedeckt. |
| N043 Offline Nebenfeatures sind unvollstaendig | TEILWEISE | Scope sichtbarer, Features bleiben begrenzt. |
| N044 Draft MVP ist begrenzt | TEILWEISE | Draft-Core stabil, Umfang bewusst MVP-begrenzt. |
| N045 Active Draft darf nicht automatisch Fullscreen oeffnen | GELOEST | Navigation/Flow-Tests decken es ab. |
| N046 Active Draft kann andere Bereiche blockierend wirken lassen | GELOEST | Navigation unterscheidet Draft und teamgebundene Bereiche. |
| N047 Completed Draft braucht klare Statusdarstellung | TEILWEISE | Status vorhanden, Admin-/Detailtiefe begrenzt. |
| N048 Draft State hat mehrere Race- und Truth-Risiken | GELOEST | Pick Docs/Available Docs/Legacy-Konflikte sind runtime- und testseitig hart. |
| N049 Online Navigation mischt Hashes und Routen | TEILWEISE | Route-Fallbacks getestet, Mischmodell bleibt. |
| N050 Statuskarten erzeugen visuelle Konkurrenz | TEILWEISE | Copy/Fokus besser, keine visuelle Messung. |
| N051 Terminologie ist inkonsistent | GELOEST | Glossar und Copy-Anpassungen vorhanden. |
| N052 First-Time und Returning Player Einstieg sind nicht eindeutig | TEILWEISE | Continue-State getestet, UX-Priorisierung bleibt. |
| N053 Admin UI ist ueberladen | GELOEST | Admin-Struktur und Action-Konfig sind getestet. |
| N054 Admin-Aktionen koennen versehentlich datenveraendernd sein | TEILWEISE | Guards/Audit existieren, breite Mutationsflaeche bleibt. |
| N055 Zwei Architekturmodelle laufen parallel | OFFEN | Keine Zielarchitektur-Konsolidierung. |
| N056 Multiplayer UI, State und Persistence sind eng gekoppelt | TEILWEISE | ViewModels/Lifecycle helfen, grosse Komponenten bleiben gekoppelt. |
| N057 Firebase Online Repository ist zu breit | TEILWEISE | Mapper extrahiert, Reads/Writes/Subs bleiben in grosser Datei. |
| N058 Firebase Admin darf nicht in Client Bundles gelangen | TEILWEISE | Build gruen, explizites Boundary-Gate fehlt. |
| N059 UI importiert Domain- und Application-Typen breit | TEILWEISE | ViewModels reduzieren, Imports bleiben breit. |
| N060 Application Services importieren UI-Modelle | OFFEN | Abhaengigkeitsrichtung nicht systematisch korrigiert. |
| N061 Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten | TEILWEISE | Simulationstests existieren, Adaptervertrag nicht final formalisiert. |
| N062 Admin `Details verwalten` und `Oeffnen` sind redundant | GELOEST | Admin-Action-Struktur geklaert. |
| N063 Firebase Multiplayer Training ist nur eingeschraenkt | GELOEST | Online-MVP Scope/Coming-Soon begrenzt es. |
| N064 Admin Draft Status ist nur ein Hinweisbereich | TEILWEISE | Kernpfade getestet, Statusbereich bleibt passiv. |
| N065 Auth Debug ist technisch formuliert | GELOEST | Debug-Copy ist Admin/Dev-begrenzt. |
| N066 Dashboard kann ueberladen wirken | TEILWEISE | Core-Loop klarer, Dashboard-Dichte bleibt. |
| N067 Team Management braucht klare No-Team- und No-Roster-Zustaende | GELOEST | UI/Service/E2E decken No-Team/No-Roster ab. |
| N068 Week Simulation braucht gueltigen Schedule | GELOEST | Simulation blockiert ohne Schedule klar. |
| N069 Week Simulation braucht vorhandene Teams | GELOEST | Missing-Team/Roster-Guards getestet. |
| N070 Online League Route Bundle ist gross | TEILWEISE | Baseline vorhanden, kein Budget-Gate. |
| N071 Online Draft Route Bundle ist gross | TEILWEISE | Gemessen, aber nicht budgetiert. |
| N072 Admin Route Bundle ist gross | TEILWEISE | Gemessen, aber nicht budgetiert. |
| N073 Savegames Route Bundle ist gross | TEILWEISE | Gemessen, aber nicht budgetiert. |
| N074 Wenige dynamische Imports | OFFEN | Keine Lazy-Import-Strategie umgesetzt. |
| N075 `subscribeToLeague` liest zu viele Datenbereiche | TEILWEISE | Tests/Coalescing vorhanden, Subscription bleibt breit. |
| N076 Lobby-/Teamreads koennen N+1 erzeugen | TEILWEISE | Join stabil, kein Read-Fanout-Budget. |
| N077 Events werden breit reloadet | OFFEN | Events bleiben breit gekoppelt. |
| N078 League Document kann stark wachsen | OFFEN | Results/Schedule/Standings bleiben potenziell doc-lastig. |
| N079 Firestore Reads/Writes sind Kostenrisiko | TEILWEISE | Messung vorhanden, kein regelmaessiges Gate. |
| N080 Route-Bundles koennen weiter wachsen | TEILWEISE | Build sichtbar, keine Grenzwerte. |
| N081 Online Detail Models berechnen mehrfach | TEILWEISE | Modeltests vorhanden, Selector-/Memo-Strategie nicht abgeschlossen. |
| N082 Standings-Fallback scannt Results | OFFEN | Persistierte Standings-Projektion nicht hart validiert. |
| N083 Draft Room sortiert gesamten Spielerpool | TEILWEISE | Memoisierung vorhanden, Pool-Sort bleibt. |
| N084 Roster-/Depth-Listen sind nicht breit virtualisiert | OFFEN | Keine Virtualisierung; fuer MVP-Datenmenge toleriert. |
| N085 Stale `lastLeagueId` kann Nutzer blockieren | GELOEST | Browser-Rejoin und stale-Recovery sind abgedeckt. |
| N086 Draft Pick und Draft State koennen parallel kollidieren | GELOEST | Draft-Race/Integrity-Tests vorhanden. |
| N087 Week Simulation kann doppelt oder parallel laufen | GELOEST | Lock/Idempotenz/Paralleltests vorhanden. |
| N088 Multiplayer hat viele parallele Statusfelder | TEILWEISE | Lifecycle normalisiert, aber Rohfelder existieren weiter und koennen neu direkt gelesen werden. |
| N089 Zentrale Online State Machine fehlt | GELOEST | Pure Lifecycle Read-Model mit Phasen, Transitionen, globalem Admin-Modus und Tests existiert. |
| N090 Week Status hat doppelte Wahrheit | GELOEST | `completedWeeks` ist kanonisch; Konflikte hard-failen. |
| N091 `currentWeek` darf nur nach erfolgreicher Simulation steigen | GELOEST | Week Advance ist an erfolgreiche Simulation gekoppelt und getestet. |
| N092 Admin-/Repair-Scripts koennen Multiplayer-State veraendern | TEILWEISE | Guards/Flags existieren, Script-Flaeche bleibt breit. |
| N093 Ready waehrend Simulation ist Race-Risiko | GELOEST | Ready-Write-Gates nutzen Lifecycle und blockieren Simulation/Lock. |
| N094 Core Loop ist dokumentiert, aber eng | TEILWEISE | Core Loop laeuft im E2E, Produktvertrag bleibt eng. |
| N095 Adminmodus ist fuer normale Spieler zu prominent | GELOEST | Admin-Zugang folgt Custom Claim und Gate-Tests. |
| N096 Redundante Admin Actions konkurrieren sichtbar | GELOEST | Action-Konfiguration/Gruppierung getestet. |
| N097 Nicht-MVP-Features duerfen nicht aktiv konkurrieren | GELOEST | Coming-Soon und MVP-Navigation sind Browser-getestet. |
| N098 MVP-Zustand ist Gelb | TEILWEISE | Lokale Gates gruen, Production/Architektur offen. |
| N099 Multiplayer Acceptance und UX-Audit widersprechen sich | TEILWEISE | Aktueller Report klaert, alte Reports bleiben stale. |
| N100 Vitest Suite ist vorhanden und umfangreich | GELOEST | Relevante Suites laufen gruen. |
| N101 E2E scheitert lokal an DB-Verbindung | GELOEST | Prisma-E2E-Setup war im letzten Gate gruen; nicht durch Lifecycle-Fix regressiert. |
| N102 Firebase Parity braucht Emulator-Portbindung | GELOEST | Portbindung ist Sandbox-Thema; ausserhalb laeuft Emulator-E2E. |
| N103 Authentifizierter Staging Smoke fehlt als bestaetigtes Gate | GELOEST | Zuletzt bestaetigter Staging Smoke war gruen; in diesem Audit nicht erneut mutierend gestartet. |
| N104 Multiplayer GM Rejoin Browser-Test fehlt | GELOEST | Rejoin-Browserflow mit Reload und stale lastLeagueId existiert. |
| N105 Admin Week E2E Reload-Test fehlt | GELOEST | Browser-E2E prueft Admin Week Simulation, Reload und Doppelsimulation. |
| N106 Tests fuer parallele Multiplayer-Aktionen fehlen | GELOEST | Browser-E2E enthaelt Same-Team-Join-Race; Unit-Tests decken Ready/Simulation/Draft-Races. |
| N107 Firestore Rules Tests fuer Admin fehlen | GELOEST | Admin-/Cross-user-Rules-Tests existieren. |
| N108 Sidebar/Coming-Soon Browser-Test fehlt | GELOEST | Browser-Smoke prueft MVP-Navigation und Direct URLs. |
| N109 Seed/Reset Emulator-Integration fehlt | TEILWEISE | Seeds laufen im E2E, eigener Reset-/Seed-Integrationstest fehlt. |
| N110 Savegames Offline Flow mit DB ist nicht ausreichend getestet | TEILWEISE | Prisma-Smoke vorhanden, tiefer Offline-Flow fehlt. |
| N111 A11y/Mobile Smoke fehlt | GELOEST | Browser-Smoke prueft Mobile Viewport, Button-Namen und Console Errors. |
| N112 QA-Gruen und E2E-Rot widersprechen sich | TEILWEISE | Aktuelle Checks gruen, alte Reports bleiben widerspruechlich/stale. |
| N113 Env-Dateien existieren lokal und muessen ignoriert bleiben | GELOEST | `.gitignore` deckt `.env`/`.env.*` ab. |
| N114 Public Firebase API Key kommt in Config/Scripts vor | GELOEST | Als public Web Config bewertet. |
| N115 Runtime Guards schuetzen Umgebungen | GELOEST | Runtime-/Preview-Guards existieren. |
| N116 Production Firestore kann per Flag aktiviert werden | TEILWEISE | Guards vorhanden, Production-Cutover nicht bewiesen. |
| N117 Production App Hosting Ziel ist nicht verifiziert | OFFEN | Production Preflight nicht mit echten Zielparametern belegt. |
| N118 Staging Smoke kann an IAM `signJwt` scheitern | GELOEST | Letzter Smoke nutzte IAM sign-jwt erfolgreich. |
| N119 Firestore Rules sind komplex und clientseitig restriktiv | TEILWEISE | Rules-Tests gruen, Komplexitaet bleibt hoch. |
| N120 Dokumentation und Reports koennen stale werden | TEILWEISE | Dieser Report aktualisiert, aber alte Reports bleiben im Baum. |

## Wichtigste offene Arbeitspakete

### 1. Production Gate und Report-Governance finalisieren

Betroffene Findings: `N112`, `N116`, `N117`, `N120`

Warum wichtig: Lokale Multiplayer-Gates sind gruen, aber Production ist nicht verifiziert und alte Reports koennen Release-Entscheidungen verfaelschen.

Konkrete Aufgaben:
- Production-Projekt/Backend-ID verbindlich dokumentieren.
- `production:preflight:apphosting` mit echten Zielparametern ausfuehren.
- Report-Index um "aktuell/ersetzt" erweitern.
- Staging/Production-Go-Regeln an den aktuellen Gate-Status koppeln.

Checks:
- `npm run production:preflight:apphosting -- --project <id> --backend <id>`
- `npx tsc --noEmit`
- `npm run lint`

Risiko: hoch.

### 2. Mirror-basierte League-Discovery entschärfen

Betroffene Findings: `N037`, `N033`, `N036`, `N120`

Warum wichtig: Membership ist fachlich kanonisch, aber `leagueMembers` bleibt als Discovery-Index relevant. Fehlende/stale Mirror koennen "Meine Ligen" unvollstaendig machen, auch wenn Direct Rejoin funktioniert.

Konkrete Aufgaben:
- Discovery-Pfade inventarisieren: `getJoinedLeagueIdsForUser`, Subscriptions, Continue-State.
- Mirror als Index dokumentieren, nicht als Wahrheit.
- Fehlende Mirror-Erkennung fuer aktive Memberships soweit technisch moeglich testen oder als Firestore-Limit dokumentieren.
- Safe Repair fuer stale Mirror nur hinter explizitem Rejoin/Admin-Repair belassen.

Checks:
- `npx vitest run src/lib/online/repositories src/components/online`
- `npm run test:e2e:multiplayer:firebase`
- Typecheck/Lint

Risiko: hoch.

### 3. Lifecycle-Nutzung als Architekturgrenze absichern

Betroffene Findings: `N088`, `N089`, `N056`, `N059`

Warum wichtig: Das Read-Model existiert und ist genutzt, aber neue UI/Admin-Codepfade koennen weiterhin rohe Felder wie `weekStatus`, `readyForWeek` oder `fantasyDraft` direkt fuer Flow-Entscheidungen lesen.

Konkrete Aufgaben:
- Kleine Lint-/testbare Import-Regel oder Review-Check fuer Flow-Entscheidungen definieren.
- Erlaubte Direktreads auf Anzeige-only dokumentieren.
- UI/Admin-Modeltests fuer neue Phasen als Regression-Gate behalten.

Checks:
- `npx vitest run src/lib/online src/components/online src/components/admin`
- `npm run lint`

Risiko: mittel.

### 4. Simulation-Adaptervertrag zwischen Multiplayer und Singleplayer formalisieren

Betroffene Findings: `N061`, `N068`, `N069`, `N091`

Warum wichtig: Week-Simulation ist gruen, aber die Datenform, die vom Multiplayer in die Engine geht, ist noch kein eigenstaendig getesteter Vertrag.

Konkrete Aufgaben:
- Adapter-Input/Output-Typen als schmale Boundary definieren.
- Tests fuer Schedule, Teams, Rosters, Depth Chart, Results und Standings ueber diese Boundary ergaenzen.
- Keine Engine-Neuschreibung.

Checks:
- `npx vitest run src/lib/online src/lib/admin src/modules`
- Typecheck/Lint

Risiko: hoch.

### 5. Monolithen weiter risikoorientiert verkleinern

Betroffene Findings: `N002`, `N006`, `N007`, `N057`

Warum wichtig: Die Kernpfade sind stabiler, aber die grossen Dateien bleiben review- und regressionsanfaellig.

Konkrete Aufgaben:
- Nur reine Mapper, Validatoren und Use-Case-Funktionen extrahieren.
- Public APIs stabil halten.
- Keine Firestore-Pfade oder UX aendern.

Checks:
- `npx vitest run src/lib/online src/lib/admin src/components/admin`
- Typecheck/Lint

Risiko: mittel.

### 6. Performance-Budgets fuer Bundles und Firestore-Reads einfuehren

Betroffene Findings: `N070`-`N083`

Warum wichtig: Baselines existieren, aber ohne Budgets kann Performance unbemerkt wieder wachsen.

Konkrete Aufgaben:
- Bundle-Baseline aus `npm run build` in Budget-Script ueberfuehren.
- Firestore-Read-Baseline fuer `subscribeToLeague`, Teams, Events, Draft messen.
- Nur Low-Risk Splits/Subscriptions optimieren.

Checks:
- `npm run build`
- `npx tsc --noEmit`
- `npm run lint`

Risiko: mittel.

### 7. Savegames/Offline-E2E vertiefen

Betroffene Findings: `N101`, `N110`

Warum wichtig: Prisma-E2E ist nicht mehr infra-rot, aber der eigentliche Savegames-Offline-Flow bleibt nur oberflaechlich abgesichert.

Konkrete Aufgaben:
- Stable Seed fuer Offline Savegame erstellen.
- Browserflow fuer Laden, Speichern, Reload und Offline-Entry pruefen.
- DB-Preflight-Fehlermeldungen behalten.

Checks:
- `npm run db:up`
- `npm run prisma:migrate`
- `npm run test:e2e:seed`
- `npm run test:e2e`

Risiko: mittel.

### 8. Native Admin-/Delete-Dialoge ersetzen oder bewusst begruenden

Betroffene Findings: `N031`, `N032`, `N054`

Warum wichtig: Mutierende Admin-/Delete-Aktionen sind sicherer geworden, aber native Prompts/Confirms bleiben UX- und Audit-Schwachstellen.

Konkrete Aufgaben:
- Gefaehrliche Aktionen inventarisieren.
- Bestehende Confirm/Intent-Komponenten wiederverwenden.
- Keine neuen Admin-Features.

Checks:
- `npx vitest run src/components/admin src/lib/admin`
- Typecheck/Lint

Risiko: mittel.

### 9. Test-Fixtures konsolidieren

Betroffene Findings: `N008`, `N009`, `N011`, `N109`

Warum wichtig: Die E2E-/Unit-Abdeckung ist besser, aber Seed- und Fixture-Duplikation erhoeht Flake- und Wartungsrisiko.

Konkrete Aufgaben:
- Gemeinsame Multiplayer-Fixture-Factory fuer League, Membership, Team, Draft und Week bauen.
- E2E-Seeds unveraendert im Verhalten lassen.
- Bestehende Tests schrittweise umstellen.

Checks:
- `npx vitest run src/lib/online src/lib/admin src/components/online`
- `npm run test:e2e:multiplayer:firebase`

Risiko: niedrig bis mittel.

### 10. Report- und QA-Artefakte als lebende Wahrheit strukturieren

Betroffene Findings: `N012`, `N099`, `N112`, `N120`

Warum wichtig: Der Code ist weiter als mehrere alte Reports. Ohne klare Report-Hierarchie entsteht wieder "QA gruen, aber Report rot".

Konkrete Aufgaben:
- `docs/reports/README` um aktuelle Gate-Quelle erweitern.
- Alte Reports als ersetzt markieren statt zu loeschen.
- Neue Rechecks immer mit Check-Zeitpunkt und Commit/Worktree-Hinweis versehen.

Checks:
- `npm run lint`
- Link-/Markdown-Check, falls vorhanden

Risiko: niedrig.

## Empfehlung

- Internal MVP: Go mit bekannten Architektur-/Performance-Risiken.
- Staging QA: Go fuer lokale Firebase-/Lifecycle-E2E-Gates; mutierenden Staging-Smoke nur separat und bewusst starten.
- Production: No-Go, bis Production Preflight und Zielumgebung verifiziert sind.
