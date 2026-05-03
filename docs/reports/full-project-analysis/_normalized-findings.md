# Normalized Findings aus `_raw-findings.md`

Ursprung: `docs/reports/full-project-analysis/_raw-findings.md`

Anzahl urspruenglicher Findings: 210

Anzahl nach Bereinigung: 120

Vorgehen:
- Echte Duplikate wurden zusammengefuehrt.
- Aehnliche Findings wurden gruppiert, wenn sie denselben Problembereich beschreiben.
- Fachlich unterschiedliche Hinweise blieben getrennt.
- Quellen wurden als Raw-Finding-IDs plus Reportdateien erhalten.
- Betroffene Dateien wurden vereinheitlicht, soweit aus den Reports erkennbar.

## Zusammengefuehrte Duplikate und Aehnlichkeiten

- F002, F003, F004, F087, F179, F208 -> N002
- F005, F006, F088, F195 -> N003, N004
- F007, F101, F185 -> N005
- F008, F064, F067, F193 -> N006, N053
- F009, F010, F082, F182 -> N007, N054
- F011, F012, F013, F014, F015, F016 -> N008 bis N013
- F017, F018, F019, F020 -> N014 bis N017
- F021 bis F030 -> N018 bis N027
- F031, F065, F153, F154, F155, F176, F184, F194 -> N028, N104, N105
- F033, F057 -> N030
- F034, F039 -> N031, N032
- F035, F058, F061, F062, F114 bis F117, F140, F141, F191 -> N033 bis N038, N085
- F036, F077, F119 -> N039
- F038, F059, F075, F142, F186 -> N040, N041, N087
- F041 bis F045, F163 bis F167, F192 -> N042, N097
- F046, F047 -> N043
- F048, F070, F071, F072, F108 bis F111, F121, F187 -> N044 bis N048, N086
- F052, F060 -> N049
- F053, F054 -> N050, N051
- F055, F056, F068, F069, F168 -> N052, N094, N095
- F078, F079, F080 -> N055, N056
- F081, F086, F096 bis F100, F190, F205 -> N057, N075 bis N080
- F083, F094 -> N058, N074
- F084, F085 -> N059, N060
- F089, F196 -> N061
- F090 bis F093, F189 -> N070 bis N073
- F102 bis F105 -> N081 bis N084
- F106, F107, F113, F203 -> N088, N089, N090
- F118 bis F123 -> N091 bis N093, N086, N087
- F127 bis F145, F175, F181, F202, F207 -> N100 bis N103, N106 bis N112
- F146 bis F152, F156 bis F161, F183, F188, F200, F206 -> N104 bis N110, N113 bis N116
- F162, F172, F173, F174, F178, F199, F201, F204, F209, F210 -> N094 bis N099, N117 bis N120

## Normalisierte Findings

### N001 - Codebase ist quantitativ gross
- Beschreibung: Das Repository umfasst 1093 Dateien mit 276525 Zeilen; source-nahe Dateien umfassen 632 Dateien mit 157773 Zeilen.
- Betroffene Dateien: gesamtes Repository
- Zusammengefuehrte Quellen: F001
- Quellen: `01-codebase/codebase-inventory.md`

### N002 - Online League Service ist zentraler Monolith
- Beschreibung: `online-league-service.ts` ist mit rund 8882 Zeilen ein zentraler Wartbarkeitsengpass. Die Datei mischt Online-League-Domain, Storage, Draft, Week Flow, Training, Contracts, Results, Utilities und Re-Exports.
- Betroffene Dateien: `src/lib/online/online-league-service.ts`, `src/lib/online/*`
- Zusammengefuehrte Quellen: F002, F003, F004, F087, F179, F208
- Quellen: `01-codebase/codebase-inventory.md`, `01-codebase/largest-files.md`, `04-architecture/refactoring-map.md`, `10-work-packages/02-risk-register.md`, `10-work-packages/06-next-codex-prompts.md`

### N003 - Game Engine Dateien sind sehr gross
- Beschreibung: `play-library.ts` und `match-engine.ts` haben mehrere tausend Zeilen und werden als grosse, schwer wartbare Engine-Dateien beschrieben.
- Betroffene Dateien: `src/modules/gameplay/play-library.ts`, `src/modules/gameplay/match-engine.ts`
- Zusammengefuehrte Quellen: F005, F088
- Quellen: `01-codebase/largest-files.md`, `04-architecture/game-engine-separation.md`

### N004 - `simulateMatch` ist sehr lang und schwer testbar
- Beschreibung: Die Funktion `simulateMatch` umfasst rund 2163 Zeilen und wird als lange, schwer pruefbare Simulationseinheit genannt.
- Betroffene Dateien: `src/modules/gameplay/match-engine.ts`
- Zusammengefuehrte Quellen: F006, F195
- Quellen: `01-codebase/complexity-hotspots.md`, `10-work-packages/02-risk-register.md`

### N005 - Online League Placeholder ist grosse Client-Orchestrator-Komponente
- Beschreibung: `online-league-placeholder.tsx` hat rund 1766 Zeilen und mischt UI, lokalen State, abgeleitete Daten und Action-Handler. Der Bereich wird auch als Render- und Wartbarkeitsrisiko genannt.
- Betroffene Dateien: `src/components/online/online-league-placeholder.tsx`
- Zusammengefuehrte Quellen: F007, F101, F185
- Quellen: `01-codebase/largest-files.md`, `05-performance/render-performance.md`, `10-work-packages/02-risk-register.md`

### N006 - Admin League Detail ist grosse, schwer reviewbare Komponente
- Beschreibung: `admin-league-detail.tsx` hat rund 1642 Zeilen und mischt viele Admin-Statusbereiche, Anzeigen und Aktionen.
- Betroffene Dateien: `src/components/admin/admin-league-detail.tsx`
- Zusammengefuehrte Quellen: F008, F064, F067, F193
- Quellen: `01-codebase/largest-files.md`, `03-ux/admin-flow.md`, `10-work-packages/02-risk-register.md`

### N007 - Admin Online Actions sind zu breit
- Beschreibung: `online-admin-actions.ts` hat rund 1913 Zeilen und kombiniert API-Action-Handling, Firebase-Zugriffe, League-Operationen und lange Handler wie `executeFirebaseAction`.
- Betroffene Dateien: `src/lib/admin/online-admin-actions.ts`
- Zusammengefuehrte Quellen: F009, F010, F082, F182
- Quellen: `01-codebase/largest-files.md`, `01-codebase/complexity-hotspots.md`, `04-architecture/firebase-integration.md`, `10-work-packages/02-risk-register.md`

### N008 - `MemoryStorage` Test-Fixtures sind dupliziert
- Beschreibung: `MemoryStorage`-Implementierungen kommen in 16 Testdateien vor.
- Betroffene Dateien: mehrere Testdateien
- Zusammengefuehrte Quellen: F011
- Quellen: `01-codebase/duplicated-logic-candidates.md`

### N009 - League-/GM-Testsetup ist dupliziert
- Beschreibung: League- und GM-Setup wird in mehreren Online-/Admin-Tests wiederholt.
- Betroffene Dateien: mehrere Online-/Admin-Testdateien
- Zusammengefuehrte Quellen: F012
- Quellen: `01-codebase/duplicated-logic-candidates.md`

### N010 - Server-Action-Feedback-Logik ist dupliziert
- Beschreibung: Feedback-Handling fuer Server Actions erscheint mehrfach in aehnlicher Form.
- Betroffene Dateien: mehrere Component-/Action-Dateien
- Zusammengefuehrte Quellen: F013
- Quellen: `01-codebase/duplicated-logic-candidates.md`

### N011 - Player-Seed-Mapping-Logik ist dupliziert
- Beschreibung: Player-/Seed-Mapping wird an mehreren Seed- und Online-Player-Stellen aehnlich aufgebaut.
- Betroffene Dateien: Seed-Dateien, Online-Player-Dateien
- Zusammengefuehrte Quellen: F014
- Quellen: `01-codebase/duplicated-logic-candidates.md`

### N012 - QA-Report-Rendering-Logik ist dupliziert
- Beschreibung: Report-Rendering in QA-/Dokumentationskontexten wirkt wiederholt.
- Betroffene Dateien: Docs-/Report-nahe Dateien
- Zusammengefuehrte Quellen: F015
- Quellen: `01-codebase/duplicated-logic-candidates.md`

### N013 - Admin-/Online-Statuskarten sind aehnlich implementiert
- Beschreibung: Status-Card-Logik fuer Admin und Online wirkt aehnlich und teilweise doppelt.
- Betroffene Dateien: `src/components/admin/*`, `src/components/online/*`
- Zusammengefuehrte Quellen: F016
- Quellen: `01-codebase/duplicated-logic-candidates.md`

### N014 - Viele ungenutzte Export-Kandidaten
- Beschreibung: Die Analyse nennt 556 ungenutzte Export-Kandidaten.
- Betroffene Dateien: mehrere Source-Dateien
- Zusammengefuehrte Quellen: F017
- Quellen: `01-codebase/dead-code-candidates.md`

### N015 - TODO/FIXME/HACK-Hinweise sind vorhanden
- Beschreibung: Es wurden 16 TODO/FIXME/HACK-Hinweise gefunden.
- Betroffene Dateien: mehrere Source- und Config-Dateien
- Zusammengefuehrte Quellen: F018
- Quellen: `01-codebase/dead-code-candidates.md`

### N016 - Viele `console.*`-Vorkommen
- Beschreibung: Es wurden 164 `console.*`-Vorkommen gefunden, groesstenteils in Scripts/Observability.
- Betroffene Dateien: `scripts/*`, Observability-/Debug-Dateien
- Zusammengefuehrte Quellen: F019
- Quellen: `01-codebase/dead-code-candidates.md`

### N017 - Firestore Rules enthalten offene TODOs
- Beschreibung: `firestore.rules` enthaelt TODOs zu Role Mapping und Write Strategy.
- Betroffene Dateien: `firestore.rules`
- Zusammengefuehrte Quellen: F020
- Quellen: `01-codebase/dead-code-candidates.md`

### N018 - `team.types` ist ein Kopplungshotspot
- Beschreibung: `team.types` hat 54 abhaengige Dateien.
- Betroffene Dateien: `src/types/team.types.ts`
- Zusammengefuehrte Quellen: F021
- Quellen: `01-codebase/codebase-inventory.md`

### N019 - Shared Enums sind stark gekoppelt
- Beschreibung: `shared/domain/enums` hat 43 abhaengige Dateien.
- Betroffene Dateien: `src/shared/domain/enums*`
- Zusammengefuehrte Quellen: F022
- Quellen: `01-codebase/codebase-inventory.md`

### N020 - Format-Utilities sind stark gekoppelt
- Beschreibung: Format-Helfer werden von 35 Dateien verwendet.
- Betroffene Dateien: Format-Utilities
- Zusammengefuehrte Quellen: F023
- Quellen: `01-codebase/codebase-inventory.md`

### N021 - StatusBadge ist breit verwendet
- Beschreibung: `status-badge` hat 32 abhaengige Dateien.
- Betroffene Dateien: `src/components/*status-badge*`
- Zusammengefuehrte Quellen: F024
- Quellen: `01-codebase/codebase-inventory.md`

### N022 - Session/Auth ist breit gekoppelt
- Beschreibung: `auth/session` hat 30 abhaengige Dateien.
- Betroffene Dateien: `src/lib/auth/session*`
- Zusammengefuehrte Quellen: F025
- Quellen: `01-codebase/codebase-inventory.md`

### N023 - Online League Types sind breit verwendet
- Beschreibung: `online-league-types` hat 26 abhaengige Dateien.
- Betroffene Dateien: `src/lib/online/online-league-types.ts`
- Zusammengefuehrte Quellen: F026
- Quellen: `01-codebase/codebase-inventory.md`

### N024 - SectionPanel ist breit verwendet
- Beschreibung: SectionPanel-Komponenten haben 25 abhaengige Dateien.
- Betroffene Dateien: SectionPanel-Komponenten
- Zusammengefuehrte Quellen: F027
- Quellen: `01-codebase/codebase-inventory.md`

### N025 - StatCard ist breit verwendet
- Beschreibung: StatCard-Komponenten haben 23 abhaengige Dateien.
- Betroffene Dateien: StatCard-Komponenten
- Zusammengefuehrte Quellen: F028
- Quellen: `01-codebase/codebase-inventory.md`

### N026 - Seeded RNG ist breit gekoppelt
- Beschreibung: Seeded RNG wird von 22 Dateien verwendet.
- Betroffene Dateien: Seeded RNG Utility
- Zusammengefuehrte Quellen: F029
- Quellen: `01-codebase/codebase-inventory.md`

### N027 - Firebase Admin ist breit gekoppelt
- Beschreibung: `firebase/admin` hat 18 abhaengige Dateien und braucht klare Server-only-Grenzen.
- Betroffene Dateien: `src/lib/firebase/admin.ts`
- Zusammengefuehrte Quellen: F030
- Quellen: `01-codebase/codebase-inventory.md`

### N028 - Adminzugriff hat Claim-/UID-Allowlist-Komplexitaet
- Beschreibung: Adminmodus und Admin API koennen ueber Custom Claim oder UID-Allowlist funktionieren. Firestore Rules koennen davon abweichen. Das erzeugt UX-, Security- und Testbedarf.
- Betroffene Dateien: Admin Auth Gate, Admin Action Guard, `firestore.rules`, Admin Claims/Allowlist
- Zusammengefuehrte Quellen: F031, F065, F153, F154, F155, F176, F184, F194
- Quellen: `02-ui/buttons-and-actions.md`, `03-ux/admin-flow.md`, `08-security-and-config/security-overview.md`, `08-security-and-config/firebase-rules-analysis.md`, `10-work-packages/01-top-findings.md`, `10-work-packages/02-risk-register.md`

### N029 - Logout-Recovery muss Online-Kontext bereinigen
- Beschreibung: Logout muss lokalen Online-Kontext bereinigen, ohne Firestore-Daten zu loeschen.
- Betroffene Dateien: Savegames/Auth UI, Online Context
- Zusammengefuehrte Quellen: F032
- Quellen: `02-ui/buttons-and-actions.md`

### N030 - Offline Flow wirkt trotz Name auth-/account-gebunden
- Beschreibung: Offline-Erstellung kann deaktiviert sein oder account-gebunden wirken; der Grund muss fuer Nutzer klar sein.
- Betroffene Dateien: Savegames Screen, Auth UI
- Zusammengefuehrte Quellen: F033, F057
- Quellen: `02-ui/buttons-and-actions.md`, `03-ux/broken-or-confusing-flows.md`

### N031 - Loeschaktionen nutzen native Confirm-Dialoge
- Beschreibung: Loeschaktionen verwenden `window.confirm`, was als inkonsistente UX genannt wird.
- Betroffene Dateien: Savegames UI, Admin UI
- Zusammengefuehrte Quellen: F034
- Quellen: `02-ui/buttons-and-actions.md`

### N032 - Admin Eingaben nutzen native Prompts
- Beschreibung: Admin GM-Zuweisungen oder Eingaben verwenden native `prompt`-Dialoge.
- Betroffene Dateien: Admin League Detail
- Zusammengefuehrte Quellen: F039
- Quellen: `02-ui/buttons-and-actions.md`

### N033 - Online Join/Rejoin hat viele versteckte Abhaengigkeiten
- Beschreibung: Join/Rejoin haengt von lastLeagueId, Membership, Mirror, Team-Zuordnung und assignedUserId ab.
- Betroffene Dateien: Online Hub, Online League Services, Membership Services
- Zusammengefuehrte Quellen: F035, F058
- Quellen: `02-ui/buttons-and-actions.md`, `03-ux/broken-or-confusing-flows.md`

### N034 - Fehlende Membership kann Nutzer in Schleifen fuehren
- Beschreibung: Fehlende oder kaputte Membership kann Nutzer ohne Fortschritt zurueckfuehren oder blockieren.
- Betroffene Dateien: Online Hub, Route State, Membership Recovery
- Zusammengefuehrte Quellen: F061, F138, F191
- Quellen: `03-ux/broken-or-confusing-flows.md`, `07-tests-and-quality/missing-critical-tests.md`, `10-work-packages/02-risk-register.md`

### N035 - Fehlende Team-Zuordnung blockiert Multiplayer
- Beschreibung: Eingeloggte Nutzer ohne Team-Zuordnung landen in einem schwer erklaerbaren Zustand.
- Betroffene Dateien: Online Hub, Team Linking, Team Assignment
- Zusammengefuehrte Quellen: F062, F140, F141
- Quellen: `03-ux/multiplayer-flow.md`, `07-tests-and-quality/regression-risk-map.md`

### N036 - User-Team-Link hat mehrere Inkonsistenzstellen
- Beschreibung: Gueltiger Pfad ist uid -> membership/mirror -> teamId -> assignedUserId. Membership, Mirror, TeamId oder assignedUserId koennen fehlen oder widersprechen.
- Betroffene Dateien: `leagues/{leagueId}/memberships/{uid}`, `leagueMembers/{leagueId_uid}`, Team Documents
- Zusammengefuehrte Quellen: F114, F115, F116, F117
- Quellen: `06-data-and-state/user-team-linking.md`

### N037 - Globaler League Member Mirror ist doppelte Source of Truth
- Beschreibung: Memberships existieren unter League und als globaler Mirror; beide koennen auseinanderlaufen.
- Betroffene Dateien: `leagues/{leagueId}/memberships/{uid}`, `leagueMembers/{leagueId_uid}`
- Zusammengefuehrte Quellen: F112, F116
- Quellen: `06-data-and-state/firestore-data-model.md`, `06-data-and-state/user-team-linking.md`

### N038 - Team Assignment kann Race Conditions erzeugen
- Beschreibung: Gleichzeitige Join-/Rejoin-Aktionen koennen dazu fuehren, dass zwei Nutzer dasselbe Team beanspruchen.
- Betroffene Dateien: Join/Rejoin Team Assignment
- Zusammengefuehrte Quellen: F118, F133
- Quellen: `06-data-and-state/race-condition-risks.md`, `07-tests-and-quality/missing-critical-tests.md`

### N039 - Ready-State braucht konsistente Persistenz und Anzeige
- Beschreibung: Ready-State ist UI- und Simulation-voraussetzend. Aenderungen waehrend Simulation und fehlende Tests koennen Inkonsistenzen erzeugen.
- Betroffene Dateien: Online Dashboard, Ready State, Week Simulation
- Zusammengefuehrte Quellen: F036, F077, F119
- Quellen: `02-ui/buttons-and-actions.md`, `03-ux/week-simulation-flow.md`, `06-data-and-state/race-condition-risks.md`

### N040 - Admin Week Actions sind semantisch unklar
- Beschreibung: Woche simulieren und Woche abschliessen koennen als unterschiedliche, aber aehnliche Aktionen missverstanden werden.
- Betroffene Dateien: Admin League Detail, Admin Week UI
- Zusammengefuehrte Quellen: F038, F059
- Quellen: `02-ui/buttons-and-actions.md`, `03-ux/broken-or-confusing-flows.md`

### N041 - GM-Fortschritt haengt stark vom Admin Week Flow ab
- Beschreibung: Der Wochenfortschritt im Multiplayer ist vom Admin-Simulationsflow abhaengig; fehlende oder unklare Admin-Aktion blockiert den GM-Loop.
- Betroffene Dateien: Week Flow, Admin API, Online Dashboard
- Zusammengefuehrte Quellen: F075, F142
- Quellen: `03-ux/week-simulation-flow.md`, `07-tests-and-quality/regression-risk-map.md`

### N042 - Nicht-MVP Sidebar-Features sind Coming Soon
- Beschreibung: Contracts/Cap, Development, Trade Board, Inbox und Finance sind nicht voll implementiert und werden als Coming Soon beziehungsweise Later/Freeze beschrieben.
- Betroffene Dateien: Multiplayer Sidebar, Contracts/Cap, Development, Trade Board, Inbox, Finance
- Zusammengefuehrte Quellen: F041, F042, F043, F044, F045, F163, F164, F165, F166, F167, F192
- Quellen: `02-ui/incomplete-ui-elements.md`, `09-scope-and-product/features-to-freeze.md`, `10-work-packages/02-risk-register.md`

### N043 - Offline Nebenfeatures sind unvollstaendig
- Beschreibung: Offline Finance/Trades sowie Staff/Training im Offline Development-Bereich sind nicht vollstaendig.
- Betroffene Dateien: Offline Finance/Trade UI, Offline Development UI
- Zusammengefuehrte Quellen: F046, F047
- Quellen: `02-ui/incomplete-ui-elements.md`

### N044 - Draft MVP ist begrenzt
- Beschreibung: Draft ist vorhanden, aber als MVP-begrenzt beschrieben.
- Betroffene Dateien: Draft Room, Online Draft UI
- Zusammengefuehrte Quellen: F048
- Quellen: `02-ui/incomplete-ui-elements.md`

### N045 - Active Draft darf nicht automatisch Fullscreen oeffnen
- Beschreibung: Aktiver Draft soll nicht automatisch als Fullscreen erscheinen; Nutzer sollen explizit navigieren.
- Betroffene Dateien: Online Draft Route, Dashboard Navigation
- Zusammengefuehrte Quellen: F070
- Quellen: `03-ux/draft-flow.md`

### N046 - Active Draft kann andere Bereiche blockierend wirken lassen
- Beschreibung: Bei aktivem Draft koennen Roster-/Team-Bereiche eingeschraenkt wirken, wenn die Gruende nicht klar sichtbar sind.
- Betroffene Dateien: Sidebar, Online Dashboard, Draft Flow
- Zusammengefuehrte Quellen: F071
- Quellen: `03-ux/draft-flow.md`

### N047 - Completed Draft braucht klare Statusdarstellung
- Beschreibung: Abgeschlossener Draft muss eindeutig abgeschlossen wirken, damit Nutzer nicht im Draft-Lock-Gefuehl bleiben.
- Betroffene Dateien: Draft UI, Dashboard, Sidebar Guards
- Zusammengefuehrte Quellen: F072
- Quellen: `03-ux/draft-flow.md`

### N048 - Draft State hat mehrere Race- und Truth-Risiken
- Beschreibung: Draft-Daten liegen in Subcollections, Picks, Available Players und Meta-Feldern. Stale Snapshots, Client-Write-Pfade, stale `draftRunId`-Dokumente und Pick-Doppelklicks sind dokumentierte Risiken.
- Betroffene Dateien: Draft Firestore Model, Draft Pick Logic, Draft Finalization, Roster Writes
- Zusammengefuehrte Quellen: F108, F109, F110, F111, F121, F187
- Quellen: `06-data-and-state/draft-state-analysis.md`, `06-data-and-state/race-condition-risks.md`, `10-work-packages/02-risk-register.md`

### N049 - Online Navigation mischt Hashes und Routen
- Beschreibung: Online-Sektionen werden teilweise ueber Hashes statt klare Routen angesteuert; das kann Navigation und UX verwirren.
- Betroffene Dateien: Online League UI, Online Navigation, Sidebar
- Zusammengefuehrte Quellen: F052, F060
- Quellen: `02-ui/incomplete-ui-elements.md`, `03-ux/broken-or-confusing-flows.md`

### N050 - Statuskarten erzeugen visuelle Konkurrenz
- Beschreibung: Viele farbige Statuskarten koennen visuell konkurrieren und das Scannen erschweren.
- Betroffene Dateien: Dashboard, Admin UI, Statuskarten
- Zusammengefuehrte Quellen: F053
- Quellen: `02-ui/visual-consistency.md`

### N051 - Terminologie ist inkonsistent
- Beschreibung: Begriffe wie App, Hauptmenue und Savegames werden uneinheitlich verwendet.
- Betroffene Dateien: Navigation, Savegames, Admin UI, Online UI
- Zusammengefuehrte Quellen: F054
- Quellen: `02-ui/visual-consistency.md`

### N052 - First-Time und Returning Player Einstieg sind nicht eindeutig
- Beschreibung: Neue Nutzer sehen konkurrierende Optionen; Returning Player haben keinen einheitlichen Resume-first-Pfad.
- Betroffene Dateien: Savegames Screen, Resume Flow, Online Hub
- Zusammengefuehrte Quellen: F055, F056, F068, F069
- Quellen: `03-ux/broken-or-confusing-flows.md`, `03-ux/auth-onboarding-flow.md`

### N053 - Admin UI ist ueberladen
- Beschreibung: Admin Flow enthaelt viele Schritte, Statusbereiche, Debug-Informationen und Actions. Das kann Bedienung und Verstaendnis erschweren.
- Betroffene Dateien: Admin Control Center, Admin League Detail, Debug Panels
- Zusammengefuehrte Quellen: F064, F067, F193
- Quellen: `03-ux/admin-flow.md`, `10-work-packages/02-risk-register.md`

### N054 - Admin-Aktionen koennen versehentlich datenveraendernd sein
- Beschreibung: Admin-Aktionen veraendern Daten und brauchen klare Guards, Confirm-Flows und serverseitige Absicherung.
- Betroffene Dateien: Admin League Detail, Admin Actions, Admin API
- Zusammengefuehrte Quellen: F066, F182
- Quellen: `03-ux/admin-flow.md`, `10-work-packages/02-risk-register.md`

### N055 - Zwei Architekturmodelle laufen parallel
- Beschreibung: `src/modules/*` und `src/lib/online/*` folgen unterschiedlichen Strukturen. Offline wirkt sauberer getrennt als Online.
- Betroffene Dateien: `src/modules/*`, `src/lib/online/*`
- Zusammengefuehrte Quellen: F078, F079
- Quellen: `04-architecture/architecture-overview.md`

### N056 - Multiplayer UI, State und Persistence sind eng gekoppelt
- Beschreibung: Multiplayer UI, Route-State, Client Repository, Domain und Legacy Local State sind stark miteinander verwoben.
- Betroffene Dateien: `src/components/online/*`, `src/lib/online/*`
- Zusammengefuehrte Quellen: F080
- Quellen: `04-architecture/module-boundaries.md`

### N057 - Firebase Online Repository ist zu breit
- Beschreibung: Das Firebase Repository vereint Mapper, Queries, Commands, Subscriptions und breite Listener.
- Betroffene Dateien: Firebase Online Repository, Online League Repository
- Zusammengefuehrte Quellen: F081, F086
- Quellen: `04-architecture/firebase-integration.md`

### N058 - Firebase Admin darf nicht in Client Bundles gelangen
- Beschreibung: Firebase Admin/Client-Trennung ist kritisch. Barrel-Imports oder falsche Runtime-Imports koennen `firebase-admin` in Client-Bundles ziehen.
- Betroffene Dateien: `src/lib/firebase/admin.ts`, Admin/Auth Imports, Firebase Imports
- Zusammengefuehrte Quellen: F083, F094
- Quellen: `04-architecture/frontend-backend-separation.md`, `05-performance/bundle-and-build-analysis.md`

### N059 - UI importiert Domain- und Application-Typen breit
- Beschreibung: UI-Komponenten greifen breit auf Domain- und Application-Typen zu.
- Betroffene Dateien: `src/components/*`, `src/modules/*`, `src/lib/online/*`
- Zusammengefuehrte Quellen: F084
- Quellen: `04-architecture/frontend-backend-separation.md`

### N060 - Application Services importieren UI-Modelle
- Beschreibung: Einige Application Services haben UI-Modell-Abhaengigkeiten.
- Betroffene Dateien: `team-roster.service`, `team-trade.service`, `decision-effects`
- Zusammengefuehrte Quellen: F085
- Quellen: `04-architecture/frontend-backend-separation.md`

### N061 - Singleplayer und Multiplayer nutzen unterschiedliche Simulationsdaten
- Beschreibung: Reports nennen eine semantische Luecke zwischen Singleplayer- und Multiplayer-Simulationsdaten sowie Local/Firebase-Parity-Risiken.
- Betroffene Dateien: Game Engine, Online Simulation Adapter, Online Services, Local/Firebase Adapters
- Zusammengefuehrte Quellen: F089, F196
- Quellen: `04-architecture/game-engine-separation.md`, `10-work-packages/02-risk-register.md`

### N062 - Admin `Details verwalten` und `Oeffnen` sind redundant
- Beschreibung: In der Admin-Ligenliste wirken `Details verwalten` und `Oeffnen` gleich oder sehr aehnlich.
- Betroffene Dateien: Admin League Manager
- Zusammengefuehrte Quellen: F040
- Quellen: `02-ui/buttons-and-actions.md`

### N063 - Firebase Multiplayer Training ist nur eingeschraenkt
- Beschreibung: Training im Firebase Multiplayer-Kontext ist nur eingeschraenkt oder read-only.
- Betroffene Dateien: Online Training UI
- Zusammengefuehrte Quellen: F049
- Quellen: `02-ui/incomplete-ui-elements.md`

### N064 - Admin Draft Status ist nur ein Hinweisbereich
- Beschreibung: Admin Draft Status hat keine tiefe Detailfunktion und bleibt ein Hinweisbereich.
- Betroffene Dateien: Admin League Detail
- Zusammengefuehrte Quellen: F050
- Quellen: `02-ui/incomplete-ui-elements.md`

### N065 - Auth Debug ist technisch formuliert
- Beschreibung: Auth Debug zeigt technische Informationen, die fuer Nutzer erklaerungsbeduerftig sein koennen.
- Betroffene Dateien: Auth Debug UI, Admin Debug UI
- Zusammengefuehrte Quellen: F051, F171
- Quellen: `02-ui/incomplete-ui-elements.md`, `09-scope-and-product/features-to-remove-or-hide.md`

### N066 - Dashboard kann ueberladen wirken
- Beschreibung: Das Multiplayer Dashboard zeigt viele Informationen und kann schwer scannbar sein.
- Betroffene Dateien: Online Dashboard
- Zusammengefuehrte Quellen: F063
- Quellen: `03-ux/multiplayer-flow.md`

### N067 - Team Management braucht klare No-Team- und No-Roster-Zustaende
- Beschreibung: Team Management bricht ohne Team oder Roster-Daten und braucht erklaerende Zustaende.
- Betroffene Dateien: Team Overview, Roster, Depth Chart
- Zusammengefuehrte Quellen: F073, F074
- Quellen: `03-ux/team-management-flow.md`

### N068 - Week Simulation braucht gueltigen Schedule
- Beschreibung: Ohne gueltigen Schedule kann keine Woche simuliert werden.
- Betroffene Dateien: Week Simulation, League Schedule
- Zusammengefuehrte Quellen: F076, F124
- Quellen: `03-ux/week-simulation-flow.md`, `06-data-and-state/week-state-analysis.md`

### N069 - Week Simulation braucht vorhandene Teams
- Beschreibung: Fehlende Teams blockieren Week Simulation.
- Betroffene Dateien: Week Simulation, Teams
- Zusammengefuehrte Quellen: F125
- Quellen: `06-data-and-state/week-state-analysis.md`

### N070 - Online League Route Bundle ist gross
- Beschreibung: `/online/league/[leagueId]` wird mit rund 295 kB als grosses Route-Bundle genannt.
- Betroffene Dateien: Online League Route
- Zusammengefuehrte Quellen: F090
- Quellen: `05-performance/bundle-and-build-analysis.md`

### N071 - Online Draft Route Bundle ist gross
- Beschreibung: `/online/league/[leagueId]/draft` wird mit rund 277 kB als grosses Route-Bundle genannt.
- Betroffene Dateien: Online Draft Route
- Zusammengefuehrte Quellen: F091
- Quellen: `05-performance/bundle-and-build-analysis.md`

### N072 - Admin Route Bundle ist gross
- Beschreibung: `/admin` wird mit rund 264 kB als grosses Route-Bundle genannt.
- Betroffene Dateien: Admin Route
- Zusammengefuehrte Quellen: F092
- Quellen: `05-performance/bundle-and-build-analysis.md`

### N073 - Savegames Route Bundle ist gross
- Beschreibung: `/app/savegames` wird mit rund 289 kB als grosses Route-Bundle genannt.
- Betroffene Dateien: Savegames Route
- Zusammengefuehrte Quellen: F093
- Quellen: `05-performance/bundle-and-build-analysis.md`

### N074 - Wenige dynamische Imports
- Beschreibung: Reports nennen wenige dynamische Imports als moegliche Bundle-Optimierungsstelle.
- Betroffene Dateien: grosse Client-Komponenten
- Zusammengefuehrte Quellen: F095
- Quellen: `05-performance/bundle-and-build-analysis.md`

### N075 - `subscribeToLeague` liest zu viele Datenbereiche
- Beschreibung: `subscribeToLeague` liest League, Memberships, Teams, Events, Draft Main, Picks und Available Players in einem breiten Subscription-Kontext.
- Betroffene Dateien: `src/lib/online/online-league-service.ts`, Online Dashboard
- Zusammengefuehrte Quellen: F096, F097, F205
- Quellen: `05-performance/firestore-read-write-performance.md`, `10-work-packages/05-work-packages.md`

### N076 - Lobby-/Teamreads koennen N+1 erzeugen
- Beschreibung: Lobby- und Teamdaten koennen mehrere einzelne Firestore Reads verursachen.
- Betroffene Dateien: Online Hub, League Repository
- Zusammengefuehrte Quellen: F098
- Quellen: `05-performance/firestore-read-write-performance.md`

### N077 - Events werden breit reloadet
- Beschreibung: Events erscheinen als Datenbereich, der im Subscription-Kontext breit gelesen wird.
- Betroffene Dateien: Online League Events
- Zusammengefuehrte Quellen: F099
- Quellen: `05-performance/firestore-read-write-performance.md`

### N078 - League Document kann stark wachsen
- Beschreibung: Schedule, MatchResults, Standings und CompletedWeeks koennen das League-Dokument stark wachsen lassen.
- Betroffene Dateien: Firestore League Document
- Zusammengefuehrte Quellen: F100, F190
- Quellen: `05-performance/firestore-read-write-performance.md`, `10-work-packages/02-risk-register.md`

### N079 - Firestore Reads/Writes sind Kostenrisiko
- Beschreibung: Breite Listener, wachsende Dokumente und Fanout werden als Firestore-Kostenrisiko genannt.
- Betroffene Dateien: Firestore Subscriptions, League Document, Online Repository
- Zusammengefuehrte Quellen: F190, F205
- Quellen: `10-work-packages/02-risk-register.md`, `10-work-packages/05-work-packages.md`

### N080 - Route-Bundles koennen weiter wachsen
- Beschreibung: Grosse Route-Bundles werden als langfristiges Bundle-Wachstumsrisiko genannt.
- Betroffene Dateien: Online, Draft, Admin, Savegames Routes
- Zusammengefuehrte Quellen: F189
- Quellen: `10-work-packages/02-risk-register.md`

### N081 - Online Detail Models berechnen mehrfach
- Beschreibung: Online Detail Models nutzen wiederholt map/filter/sort und abgeleitete Berechnungen.
- Betroffene Dateien: Online Detail Model Helpers
- Zusammengefuehrte Quellen: F102
- Quellen: `05-performance/expensive-computations.md`

### N082 - Standings-Fallback scannt Results
- Beschreibung: Standings-Fallback berechnet Daten aus Results und kann bei wachsenden Daten teurer werden.
- Betroffene Dateien: Standings/Results Helpers
- Zusammengefuehrte Quellen: F103
- Quellen: `05-performance/expensive-computations.md`

### N083 - Draft Room sortiert gesamten Spielerpool
- Beschreibung: Available-Players-Ableitung sortiert den gesamten Spielerpool.
- Betroffene Dateien: `src/components/online/online-fantasy-draft-room.tsx`
- Zusammengefuehrte Quellen: F104
- Quellen: `05-performance/expensive-computations.md`

### N084 - Roster-/Depth-Listen sind nicht breit virtualisiert
- Beschreibung: Roster/Depth Chart sind fuer 53 Spieler akzeptabel, bei groesseren Listen aber ein Performance-Risiko.
- Betroffene Dateien: Roster UI, Depth Chart UI
- Zusammengefuehrte Quellen: F105
- Quellen: `05-performance/render-performance.md`

### N085 - Stale `lastLeagueId` kann Nutzer blockieren
- Beschreibung: Lokaler `lastLeagueId` State kann auf eine ungueltige oder nicht mehr zugaengliche Liga zeigen.
- Betroffene Dateien: LocalStorage, Online Hub
- Zusammengefuehrte Quellen: F122
- Quellen: `06-data-and-state/race-condition-risks.md`

### N086 - Draft Pick und Draft State koennen parallel kollidieren
- Beschreibung: Draft Pick Doppelklicks und parallele Pick Requests sind als Race Conditions dokumentiert.
- Betroffene Dateien: Draft Pick Logic, Draft Services
- Zusammengefuehrte Quellen: F121, F187
- Quellen: `06-data-and-state/race-condition-risks.md`, `10-work-packages/02-risk-register.md`

### N087 - Week Simulation kann doppelt oder parallel laufen
- Beschreibung: Zwei Admins oder parallele Requests koennen dieselbe Woche simulieren, wenn Locks/Guards nicht greifen.
- Betroffene Dateien: Week Simulation, Admin API, Week Simulation Lock
- Zusammengefuehrte Quellen: F120, F186
- Quellen: `06-data-and-state/race-condition-risks.md`, `10-work-packages/02-risk-register.md`

### N088 - Multiplayer hat viele parallele Statusfelder
- Beschreibung: League status, weekStatus, draft status, membership ready, team status, mirror status, lock status, lastSimulatedWeekKey, completedWeeks und matchResults existieren parallel.
- Betroffene Dateien: Firestore League/Membership/Team/Draft/Week State
- Zusammengefuehrte Quellen: F106, F180
- Quellen: `06-data-and-state/state-model-overview.md`, `10-work-packages/02-risk-register.md`

### N089 - Zentrale Online State Machine fehlt
- Beschreibung: Online State ist implizit und verteilt. Eine formale State Machine wird als fehlend dokumentiert.
- Betroffene Dateien: Online State, Route State, Week/Draft/Ready Services
- Zusammengefuehrte Quellen: F107, F203
- Quellen: `06-data-and-state/state-machine-recommendation.md`, `10-work-packages/05-work-packages.md`

### N090 - Week Status hat doppelte Wahrheit
- Beschreibung: Week Status, completedWeeks, lastSimulatedWeek und Results koennen auseinanderlaufen.
- Betroffene Dateien: League Week Fields, Results, Standings
- Zusammengefuehrte Quellen: F113
- Quellen: `06-data-and-state/week-state-analysis.md`

### N091 - `currentWeek` darf nur nach erfolgreicher Simulation steigen
- Beschreibung: `currentWeek`-Advance muss erst nach erfolgreicher Simulation erfolgen.
- Betroffene Dateien: Week Simulation Service
- Zusammengefuehrte Quellen: F126
- Quellen: `06-data-and-state/week-state-analysis.md`

### N092 - Admin-/Repair-Scripts koennen Multiplayer-State veraendern
- Beschreibung: Repair- und Seed-Scripts koennen Firestore-Testdaten veraendern und sind als Konsistenzrisiko dokumentiert.
- Betroffene Dateien: `scripts/*`, `scripts/seeds/*`, Firestore Testdaten
- Zusammengefuehrte Quellen: F123, F157, F188
- Quellen: `06-data-and-state/race-condition-risks.md`, `08-security-and-config/security-overview.md`, `10-work-packages/02-risk-register.md`

### N093 - Ready waehrend Simulation ist Race-Risiko
- Beschreibung: Ready-State kann parallel zu Simulation geaendert werden.
- Betroffene Dateien: Ready State, Week Simulation
- Zusammengefuehrte Quellen: F119
- Quellen: `06-data-and-state/race-condition-risks.md`

### N094 - Core Loop ist dokumentiert, aber eng
- Beschreibung: Der dokumentierte Multiplayer Core Loop ist Join/Rejoin -> Team -> Roster/Depth -> Ready -> Admin Sim -> Results/Standings -> Next Week.
- Betroffene Dateien: Multiplayer Flow, Online Dashboard, Admin Week
- Zusammengefuehrte Quellen: F162
- Quellen: `09-scope-and-product/playable-core-loop.md`

### N095 - Adminmodus ist fuer normale Spieler zu prominent
- Beschreibung: Admin kann als zu prominenter Einstiegspunkt fuer Nicht-Admins wirken.
- Betroffene Dateien: Savegames Screen, Admin CTA
- Zusammengefuehrte Quellen: F168
- Quellen: `09-scope-and-product/features-to-remove-or-hide.md`

### N096 - Redundante Admin Actions konkurrieren sichtbar
- Beschreibung: Redundante Admin-Aktionen sollten nicht als gleichwertige aktive Pfade konkurrieren.
- Betroffene Dateien: Admin UI
- Zusammengefuehrte Quellen: F169, F199
- Quellen: `09-scope-and-product/features-to-remove-or-hide.md`, `10-work-packages/03-decision-log.md`

### N097 - Nicht-MVP-Features duerfen nicht aktiv konkurrieren
- Beschreibung: Nicht-MVP-Features sollen nicht als gleichwertige aktive Pfade wirken; sichtbare Coming-Soon-Bereiche koennen unfertig wirken.
- Betroffene Dateien: Sidebar, Savegames, Product Scope, Coming-Soon Screens
- Zusammengefuehrte Quellen: F174, F192, F199
- Quellen: `10-work-packages/01-top-findings.md`, `10-work-packages/02-risk-register.md`, `10-work-packages/03-decision-log.md`

### N098 - MVP-Zustand ist Gelb
- Beschreibung: Produktanalyse bewertet den MVP-Zustand als spielbar, aber nicht fertig/poliert.
- Betroffene Dateien: Multiplayer MVP
- Zusammengefuehrte Quellen: F172
- Quellen: `09-scope-and-product/mvp-definition.md`

### N099 - Multiplayer Acceptance und UX-Audit widersprechen sich
- Beschreibung: Die Synthese nennt einen Widerspruch zwischen Akzeptanzstatus und UX-Skepsis.
- Betroffene Dateien: UX Reports, QA Reports
- Zusammengefuehrte Quellen: F173
- Quellen: `10-work-packages/01-top-findings.md`

### N100 - Vitest Suite ist vorhanden und umfangreich
- Beschreibung: Test-Inventar nennt 158 Vitest-Dateien mit 936 Tests.
- Betroffene Dateien: Test Suite
- Zusammengefuehrte Quellen: F127
- Quellen: `07-tests-and-quality/test-inventory.md`

### N101 - E2E scheitert lokal an DB-Verbindung
- Beschreibung: `npm run test:e2e` schlug vor Browserstart wegen `localhost:5432` DB-Verbindung fehl.
- Betroffene Dateien: E2E Setup, DB/Test Config
- Zusammengefuehrte Quellen: F128
- Quellen: `07-tests-and-quality/qa-command-results.md`

### N102 - Firebase Parity braucht Emulator-Portbindung
- Beschreibung: Firebase Parity ist gruen, benoetigt aber Emulator-/Portbinding-Kontext.
- Betroffene Dateien: Firebase Parity Tests, Firebase Emulator
- Zusammengefuehrte Quellen: F129
- Quellen: `07-tests-and-quality/qa-command-results.md`

### N103 - Authentifizierter Staging Smoke fehlt als bestaetigtes Gate
- Beschreibung: Authentifizierter Staging-Smoke wird als fehlender kritischer Release-Test genannt.
- Betroffene Dateien: Staging Smoke Scripts, Auth/Admin Flow
- Zusammengefuehrte Quellen: F130
- Quellen: `07-tests-and-quality/missing-critical-tests.md`

### N104 - Multiplayer GM Rejoin Browser-Test fehlt
- Beschreibung: Browserbasierter GM-Rejoin-Test ist als kritische Luecke dokumentiert.
- Betroffene Dateien: Online Hub, E2E Tests
- Zusammengefuehrte Quellen: F131
- Quellen: `07-tests-and-quality/missing-critical-tests.md`

### N105 - Admin Week E2E Reload-Test fehlt
- Beschreibung: Admin Week Simulation mit Results/Standings Reload ist als fehlender Test dokumentiert.
- Betroffene Dateien: Admin Week UI/API, E2E Tests
- Zusammengefuehrte Quellen: F132
- Quellen: `07-tests-and-quality/missing-critical-tests.md`

### N106 - Tests fuer parallele Multiplayer-Aktionen fehlen
- Beschreibung: Tests fuer parallele Join-, Ready-, Draft- und Week-Simulation-Aktionen fehlen.
- Betroffene Dateien: Join, Ready, Draft, Week Simulation
- Zusammengefuehrte Quellen: F133
- Quellen: `07-tests-and-quality/missing-critical-tests.md`

### N107 - Firestore Rules Tests fuer Admin fehlen
- Beschreibung: Rules-Tests fuer UID-Allowlist versus Custom Claims fehlen.
- Betroffene Dateien: `firestore.rules`, Admin Auth
- Zusammengefuehrte Quellen: F134
- Quellen: `07-tests-and-quality/missing-critical-tests.md`

### N108 - Sidebar/Coming-Soon Browser-Test fehlt
- Beschreibung: Vollstaendige Browserabdeckung fuer Sidebar und Coming-Soon-Seiten fehlt.
- Betroffene Dateien: Sidebar, Placeholder Screens
- Zusammengefuehrte Quellen: F135
- Quellen: `07-tests-and-quality/missing-critical-tests.md`

### N109 - Seed/Reset Emulator-Integration fehlt
- Beschreibung: Seed- und Reset-Integration mit Emulator ist als Testluecke dokumentiert.
- Betroffene Dateien: Seed Scripts, Firebase Emulator Tests
- Zusammengefuehrte Quellen: F136
- Quellen: `07-tests-and-quality/missing-critical-tests.md`

### N110 - Savegames Offline Flow mit DB ist nicht ausreichend getestet
- Beschreibung: Savegames/Offline Flow mit Datenbank ist als Testluecke dokumentiert.
- Betroffene Dateien: Savegames Flow, E2E/Integration Tests
- Zusammengefuehrte Quellen: F137
- Quellen: `07-tests-and-quality/missing-critical-tests.md`

### N111 - A11y/Mobile Smoke fehlt
- Beschreibung: Accessibility- und Mobile-Smoke-Abdeckung fehlt.
- Betroffene Dateien: UI/E2E Tests
- Zusammengefuehrte Quellen: F139, F197
- Quellen: `07-tests-and-quality/missing-critical-tests.md`, `10-work-packages/02-risk-register.md`

### N112 - QA-Gruen und E2E-Rot widersprechen sich
- Beschreibung: Die Synthese nennt Widerspruch zwischen lokalen gruenen Checks und fehlgeschlagenen oder fragilen E2E-Flows.
- Betroffene Dateien: QA Reports, E2E Tests
- Zusammengefuehrte Quellen: F175, F181, F202, F207
- Quellen: `10-work-packages/01-top-findings.md`, `10-work-packages/02-risk-register.md`, `10-work-packages/04-recommended-roadmap.md`, `10-work-packages/05-work-packages.md`

### N113 - Env-Dateien existieren lokal und muessen ignoriert bleiben
- Beschreibung: `.env` und `.env.local` existieren lokal, sind aber ignoriert. Secret-Handling bleibt Kontrollbereich.
- Betroffene Dateien: `.env`, `.env.local`, `.gitignore`
- Zusammengefuehrte Quellen: F146
- Quellen: `08-security-and-config/env-and-config-analysis.md`

### N114 - Public Firebase API Key kommt in Config/Scripts vor
- Beschreibung: Firebase API Key erscheint in stagingnaher Config/Scripts; als public key, aber weiter zu beachten.
- Betroffene Dateien: Firebase Config/Scripts
- Zusammengefuehrte Quellen: F147
- Quellen: `08-security-and-config/secrets-handling.md`

### N115 - Runtime Guards schuetzen Umgebungen
- Beschreibung: Guards blockieren Emulator/Preview Flags ausserhalb lokaler Umgebung und Demo-Projekte in Production.
- Betroffene Dateien: Env Guard/Config Scripts
- Zusammengefuehrte Quellen: F148
- Quellen: `08-security-and-config/env-and-config-analysis.md`

### N116 - Production Firestore kann per Flag aktiviert werden
- Beschreibung: Production Firestore kann explizit per Flag aktiviert werden und bleibt ein Schutz-/Risikopunkt.
- Betroffene Dateien: Env Config, Firebase Config
- Zusammengefuehrte Quellen: F149
- Quellen: `08-security-and-config/env-and-config-analysis.md`

### N117 - Production App Hosting Ziel ist nicht verifiziert
- Beschreibung: `apphosting.yaml` ist staging-spezifisch; Production-Projekt, Backend-ID und Firebase-Aliase sind nicht verifiziert.
- Betroffene Dateien: `apphosting.yaml`, `.firebaserc`, Deployment Config/Reports
- Zusammengefuehrte Quellen: F150, F151, F152, F183, F200, F206
- Quellen: `08-security-and-config/deployment-risk-analysis.md`, `08-security-and-config/staging-production-separation.md`, `10-work-packages/02-risk-register.md`, `10-work-packages/03-decision-log.md`, `10-work-packages/05-work-packages.md`

### N118 - Staging Smoke kann an IAM `signJwt` scheitern
- Beschreibung: Staging Smoke braucht unter bestimmten Wegen `iam.serviceAccounts.signJwt`.
- Betroffene Dateien: Smoke Scripts, IAM Config
- Zusammengefuehrte Quellen: F156
- Quellen: `08-security-and-config/deployment-risk-analysis.md`

### N119 - Firestore Rules sind komplex und clientseitig restriktiv
- Beschreibung: Firestore Rules sind komplex, default-deny, verbieten Client Writes weitgehend und brauchen Tests fuer kritische Pfade wie Draft-Finalisierung.
- Betroffene Dateien: `firestore.rules`, Admin API, Online API, Draft Finalization
- Zusammengefuehrte Quellen: F159, F160, F161
- Quellen: `08-security-and-config/firebase-rules-analysis.md`

### N120 - Dokumentation und Reports koennen stale werden
- Beschreibung: Viele Reports und teilweise alte Admin-Code-Dokumentation koennen veralten und widerspruechliche Aussagen behalten.
- Betroffene Dateien: `docs/reports/*`
- Zusammengefuehrte Quellen: F158, F177, F198
- Quellen: `08-security-and-config/security-overview.md`, `10-work-packages/01-top-findings.md`, `10-work-packages/02-risk-register.md`
