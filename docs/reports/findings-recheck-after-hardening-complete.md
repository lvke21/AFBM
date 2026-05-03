# Findings Recheck After Hardening Complete

Datum: 2026-05-03

Grundlage: aktueller Codezustand, Tests, Scripts, `docs/reports/full-project-analysis/_scored-findings.md`, Vergleich mit `docs/reports/findings-recheck-final.md`.

## Executive Summary

Nach L5/L6, G1-G3, A4-A6 und P1-P3 sind 53 von 120 Findings geloest. Das entspricht 44,2 Prozent. Gegenueber dem letzten Recheck ist der Stand messbar besser, aber nicht production-ready: Bundle-Budgets sind jetzt ein echter Gate-Teil, Events werden in der Subscription gezielter behandelt, und `release:check` bildet die lokalen Pflicht-Gates ab. Gleichzeitig bleiben Firestore-Read-Budgets fuer League Load und Draft rot, Production-Preflight ist ohne echte Zielparameter nicht validiert, und Staging-Smoke wurde in diesem Recheck nicht live gegen Staging ausgefuehrt.

Gesamtbewertung:

- Internal MVP: Go mit Risiko. Die lokalen Pflicht-Gates sind im Retry gruen; die erste `release:check`-Ausfuehrung hatte jedoch einen Vitest-Timeout in `gameplay-calibration.test.ts`.
- Staging QA: No-Go bis ein aktueller authentifizierter Staging-Smoke fuer den Ziel-Commit gruen ist.
- Production: No-Go. Production-Preflight und Staging-Nachweis sind nicht live verifiziert; Firestore-Read-Budgets bleiben fuer zentrale Flows deutlich rot.

## Check-Ergebnisse

| Check | Ergebnis | Kommentar |
| --- | --- | --- |
| `npx tsc --noEmit` | Gruen | separat ausgefuehrt |
| `npm run lint` | Gruen | separat ausgefuehrt |
| relevante Vitest-Suites | Gruen | `src/lib/online`, `src/lib/admin`, `src/components/online`, `src/components/admin`, Production-Preflight, Performance; 51 Files / 417 Tests |
| `npm run release:check` | Gruen im Retry | Required gates: Typecheck, Lint, Build, Bundle Size, Vitest, Firebase Rules, Firebase Parity, Firebase E2E |
| erster `release:check` | Rot | Vitest-Timeout in `src/modules/gameplay/application/gameplay-calibration.test.ts`; isolierter Test danach gruen |
| Skipped in `release:check` | Nicht freigegeben | Firestore Read Budget nur Report-Gate, Production Preflight braucht konkrete Parameter, Staging Smoke optional/konfigurationspflichtig |

## Statuszahlen

| Status | Anzahl |
| --- | ---: |
| GELOEST | 53 |
| TEILWEISE | 42 |
| OFFEN | 25 |
| REGRESSION | 0 |
| geloester Anteil | 44,2% |
| offene/teilweise FIX-NOW Findings | 9 |
| offene/teilweise Core-Loop-Blocker | 2 |

FIX-NOW offen/teilweise: N041, N075, N079, N088, N112, N116, N117, N119, N120.

Core-Loop-Blocker offen/teilweise: N041, N088.

## Delta zum letzten Recheck

Letzter Recheck (`findings-recheck-final.md`): 51 GELOEST, 43 TEILWEISE, 26 OFFEN, 0 REGRESSION.

Aktuell: 53 GELOEST, 42 TEILWEISE, 25 OFFEN, 0 REGRESSION.

Verbessert:

- N077: Events-Subscription nutzt lokale Events-Aktualisierung statt vollstaendiger League-Remaps fuer reine Events-Updates.
- N080: Bundle-Wachstum ist jetzt ueber `scripts/check-bundle-size.mjs`, reale Routen und `release:check` budgetiert.

Gleich geblieben, aber mit neuer Evidenz:

- N002: `online-league-service.ts` ist weiter geschnitten, bleibt mit 7695 Zeilen aber ein Monolith.
- N007: `online-admin-actions.ts` ist auf 1253 Zeilen reduziert und nutzt weitere Use-Case-Module, bleibt aber zentrale Koordinationsdatei.
- N112: `release:check` ist im Retry gruen, zeigt aber durch den ersten Vitest-Timeout weiterhin Gate-Stabilitaetsrisiko.

## Findings-Tabelle

| Finding | Status | Begruendung / Code- und Testbezug |
| --- | --- | --- |
| N001 | OFFEN | Repository ist weiter breit; keine vollstaendige vertikale Modulgrenze fuer Online-Domain. |
| N002 | TEILWEISE | `src/lib/online/online-league-service.ts` auf 7695 Zeilen reduziert, aber weiterhin sehr gross; Online-Tests gruen. |
| N003 | OFFEN | Savegame-/Domain-Grenzen bleiben nicht vollstaendig modularisiert. |
| N004 | OFFEN | UI/Datenzugriff bleibt in einigen Bereichen gekoppelt. |
| N005 | TEILWEISE | Online-Komponenten haben View-Model-Tests, aber grosse Client-Flows bleiben komplex. |
| N006 | TEILWEISE | Admin-Komponenten nutzen Modelle/Configs, aber nicht vollstaendig zerlegt. |
| N007 | TEILWEISE | `online-admin-actions.ts` auf 1253 Zeilen reduziert, Use-Cases existieren, zentrale Datei bleibt breit. |
| N008 | OFFEN | Vollstaendige Admin-Service-Grenze fehlt. |
| N009 | OFFEN | Savegame-/Online-Cross-Cutting-Struktur nicht abschliessend bereinigt. |
| N010 | OFFEN | Domain-Abhaengigkeiten bleiben breit. |
| N011 | OFFEN | Keine klare Gesamtarchitektur als enforcebarer Standard. |
| N012 | OFFEN | Import-/Layer-Grenzen werden nicht durchgehend erzwungen. |
| N013 | OFFEN | Shared Types bleiben breit genutzt. |
| N014 | TEILWEISE | Hygiene triagiert, aber nicht vollstaendig automatisiert. |
| N015 | GELOEST | Sichere ungenutzte Artefakte wurden entfernt bzw. eingeordnet. |
| N016 | TEILWEISE | Console/Debug-Policy verbessert, aber nicht komplett enforcebar. |
| N017 | GELOEST | Staging Build-Info-Route existiert mit Test. |
| N018 | OFFEN | Vollstaendige Deploy-Automation fuer Staging nicht lokal beweisbar. |
| N019 | OFFEN | Production-Rollout bleibt manuell/parametrierungsabhaengig. |
| N020 | OFFEN | Keine vollstaendige Release-Orchestrierung ueber alle Umgebungen. |
| N021 | OFFEN | Rollback-/Recovery-Gate nicht belastbar nachgewiesen. |
| N022 | TEILWEISE | Release-Matrix und `release:check` existieren, aber Staging/Production bleiben optional. |
| N023 | TEILWEISE | E2E/Smoke sind besser abgebildet, aber Staging-Live-Nachweis fehlt. |
| N024 | OFFEN | Kein Production-Smoke-Nachweis. |
| N025 | OFFEN | Keine vollstaendige Daten-Migration-/Rollback-Story. |
| N026 | OFFEN | Observability fuer Release/Runtime bleibt begrenzt. |
| N027 | TEILWEISE | Admin-Auth-Dokumentation/Tests vorhanden, Bootstrap-Ausnahme bleibt heikel. |
| N028 | GELOEST | Admin Custom-Claim-Modell ist kanonisch getestet. |
| N029 | GELOEST | Firestore Rules Admin-Allow/Block Tests vorhanden. |
| N030 | TEILWEISE | UID-Allowlist nur Bootstrap/Hinweis, aber Governance-Risiko bleibt. |
| N031 | OFFEN | Secrets-/Runtime-Konfig nicht vollstaendig auditiert. |
| N032 | OFFEN | Production-Secret-Handling nicht live geprueft. |
| N033 | GELOEST | Build-Info-Endpoint liefert Commit/Build/Env mit Test. |
| N034 | GELOEST | Staging-Smoke kann erwarteten Commit pruefen, Route vorhanden. |
| N035 | GELOEST | Commit-Gate wird nicht bypassed. |
| N036 | GELOEST | Membership als User-Team-Wahrheit etabliert. |
| N037 | GELOEST | Mirror-/Team-Projektionskonflikte werden erkannt/getestet. |
| N038 | GELOEST | Join/Ready-Flows nutzen Membership-orientierte Guards. |
| N039 | GELOEST | Ready-State prueft Simulation-Readiness-Blocker. |
| N040 | GELOEST | Admin UI trennt gefaehrliche Aktionen besser. |
| N041 | TEILWEISE | Ready/Core-Loop ist getestet, aber parallele Lifecycle-Felder existieren weiter als Persistenz. |
| N042 | GELOEST | Nicht-MVP-Bereiche sind als Coming Soon/Scope begrenzt. |
| N043 | TEILWEISE | Direkte URLs sind getestet, aber Scope bleibt in Routen sichtbar. |
| N044 | TEILWEISE | Navigation priorisiert Core Loop, Rest-Scope bleibt wartbar zu pruefen. |
| N045 | GELOEST | Draft-Picks haben kanonische Pick-Docs. |
| N046 | GELOEST | Available-Player-Konflikte werden validiert. |
| N047 | TEILWEISE | Legacy-Draft-Fallbacks sind begrenzt, aber nicht vollstaendig entfernt. |
| N048 | GELOEST | Draft Source-of-Truth-Tests decken zentrale Konflikte. |
| N049 | TEILWEISE | Draft-Admin-Lesepfade bleiben teilweise legacy-kompatibel. |
| N050 | TEILWEISE | Copy/Glossar verbessert, aber technische Texte bleiben in Debug/Admin. |
| N051 | GELOEST | Debug-Copy wird besser auf Admin/Dev begrenzt. |
| N052 | TEILWEISE | UI-Polish/A11y nicht vollstaendig abgedeckt. |
| N053 | GELOEST | Redundante Admin-Aktionen sind strukturiert/benannt. |
| N054 | TEILWEISE | Admin Mutationen haben Guards/Audit, zentrale Koordination bleibt breit. |
| N055 | OFFEN | Vollstaendige Admin-Audit-Auswertung fehlt. |
| N056 | TEILWEISE | Grosse Client-Komponenten reduziert, aber nicht vollstaendig klein. |
| N057 | GELOEST | Repository-Facade ist klein und nach Queries/Commands/Subscriptions getrennt. |
| N058 | TEILWEISE | Mapper/Repository-Tests vorhanden, aber breite Online-Facade bleibt. |
| N059 | TEILWEISE | Subscribe-Flows verbessert, aber nicht vollstaendig granular. |
| N060 | OFFEN | Vollstaendige Repository-Performance-Grenze fehlt. |
| N061 | GELOEST | Simulation Adapter Contract dokumentiert und validiert. |
| N062 | GELOEST | Admin Action Konfiguration getestet. |
| N063 | GELOEST | MVP-Scope fuer Navigation begrenzt. |
| N064 | TEILWEISE | Training/Side-Features bleiben teilweise sichtbar/kompatibel. |
| N065 | GELOEST | Terminologie konsistenter und Tests angepasst. |
| N066 | TEILWEISE | UI-Statuscopy nicht vollstaendig vereinheitlicht. |
| N067 | GELOEST | Ready blockiert No-Team/No-Roster/Depth/Draft/Simulation/Completed. |
| N068 | GELOEST | Blockertexte sind in UI-Modellen getestet. |
| N069 | GELOEST | Simulation-Readiness ist nicht nur GM-Absicht. |
| N070 | TEILWEISE | Online-Bundle gemessen und budgetiert, aber nicht kleiner gemacht. |
| N071 | TEILWEISE | Draft-Bundle gemessen und budgetiert, aber weiterhin gross. |
| N072 | TEILWEISE | Admin-Bundle gemessen und budgetiert, aber weiterhin gross. |
| N073 | TEILWEISE | Savegames/route bundles bleiben beobachtet, nicht final optimiert. |
| N074 | OFFEN | Keine dauerhafte Bundle-Historie/Trend-Auswertung. |
| N075 | TEILWEISE | Repository split + Event-Optimierung, aber Read-Budget fuer League/Draft bleibt rot. |
| N076 | TEILWEISE | Dashboard-Read-Budget ist ok, Lobby/Fanout bleibt Risiko. |
| N077 | GELOEST | Event-Subscription aktualisiert Events gezielt statt jeden Event-Snapshot voll zu remappen. |
| N078 | OFFEN | Keine Kosten-/Read-Alerting-Automation. |
| N079 | TEILWEISE | `firestore-read-budget.md` misst rot: League Load 516, Draft 505 Reads. |
| N080 | GELOEST | Bundle-Budget-Script und `release:check` blocken reale Routen. |
| N081 | TEILWEISE | Low-risk Perf-Fixes vorhanden, aber keine groessere Query-Reduktion. |
| N082 | OFFEN | Keine echte Lazy-/Code-Split-Strategie fuer schwere Routen. |
| N083 | TEILWEISE | Performance-Baselines dokumentiert, aber Budgets nicht alle enforcebar. |
| N084 | OFFEN | Production-Performance-SLOs fehlen. |
| N085 | GELOEST | Week Completion nutzt `completedWeeks` kanonisch. |
| N086 | GELOEST | Draft Inkonsistenzen hard-failen in Tests. |
| N087 | GELOEST | Simulation-Contract blockiert ungueltige Daten. |
| N088 | TEILWEISE | Lifecycle Read-Model zentralisiert Entscheidungen, persistente Parallelfelder bleiben Projektionen. |
| N089 | GELOEST | Zentrales Lifecycle Read-Model existiert und wird getestet. |
| N090 | GELOEST | Widerspruechliche Week-Stati werden blockiert. |
| N091 | GELOEST | Week Simulation nutzt Lifecycle-/Progress-Adapter statt Rohfeld-Phase-Builder. |
| N092 | TEILWEISE | Admin Use-Cases extrahiert, zentrale Sicherheitskoordination bleibt weiter zu reduzieren. |
| N093 | GELOEST | Admin Week Simulation + Reload E2E vorhanden. |
| N094 | TEILWEISE | Concurrency ist getestet, aber Race-Abdeckung bleibt begrenzt auf vorhandene Seeds/Flows. |
| N095 | GELOEST | GM Rejoin Browser-E2E vorhanden. |
| N096 | GELOEST | Admin UI gruppiert gefaehrliche Aktionen. |
| N097 | GELOEST | Nicht-MVP Direct URLs landen auf Coming Soon. |
| N098 | TEILWEISE | Mobile/A11y Smoke vorhanden, keine vollstaendige A11y-Suite. |
| N099 | TEILWEISE | Console-Error-Smoke vorhanden, aber keine flaechenhafte Browser-Konsole-Governance. |
| N100 | GELOEST | Prisma/E2E-Preflight dokumentiert/verbessert. |
| N101 | GELOEST | DB-Kette ist reproduzierbarer dokumentiert. |
| N102 | GELOEST | Fehlende PostgreSQL-Infrastruktur fuehrt zu klareren Hinweisen. |
| N103 | GELOEST | Staging Build-Info/Commit-Gate ist scriptseitig vorhanden. |
| N104 | GELOEST | GM Rejoin Browser-Test existiert. |
| N105 | GELOEST | Admin Week Reload Browser-Test existiert. |
| N106 | GELOEST | Simulation invalid-data E2E ist vorhanden. |
| N107 | GELOEST | Admin Security Parity Tests vorhanden. |
| N108 | GELOEST | Sidebar/Coming-Soon Browser-Smoke vorhanden. |
| N109 | TEILWEISE | E2E-Stabilitaet ist besser, aber Laufzeit/Flake-Risiko bleibt. |
| N110 | TEILWEISE | Browser-E2E deckt zentrale Flows, aber nicht alle Edge-/Race-Faelle. |
| N111 | GELOEST | Mobile/A11y Smoke vorhanden. |
| N112 | GELOEST | `release:check` aggregiert Pflicht-Gates; erster Retry-Flake bleibt als Risiko dokumentiert. |
| N113 | GELOEST | Firebase Rules Tests gruen. |
| N114 | GELOEST | Firebase Parity Gate ist Teil von `release:check`. |
| N115 | GELOEST | Build-Info-Test und Route vorhanden. |
| N116 | TEILWEISE | Staging Smoke ist optional im Release-Check; kein Live-Staging-Lauf in diesem Recheck. |
| N117 | OFFEN | Production Preflight nicht mit echten `--project`, `--backend`, `--git-commit` verifiziert. |
| N118 | GELOEST | Bundle Size Gate ist repariert und blockierend. |
| N119 | TEILWEISE | Admin Bootstrap-Ausnahme bleibt Governance-/Security-Risiko. |
| N120 | TEILWEISE | Report-Governance existiert, aber alte/stale Reports bleiben und brauchen Pflege nach jedem Audit. |

## Top verbleibende Risiken

1. Firestore Read Budget rot: League Load 516 Reads und Draft 505 Reads ueberschreiten die dokumentierte Budgetlogik deutlich (`docs/reports/firestore-read-budget.md`).
2. Staging QA nicht aktuell bewiesen: `release:check` skippt Staging Smoke ohne explizite Konfiguration; kein Live-Staging-Smoke in diesem Recheck.
3. Production nicht freigegeben: `production:preflight:apphosting` braucht echte Zielparameter; dieser Audit hat keine Production-Umgebung verifiziert.
4. Core-Loop State bleibt strukturell riskant: Lifecycle ist Entscheidungsschicht, aber Rohfelder wie `weekStatus`, `completedWeeks`, `matchResults`, `fantasyDraft.status` existieren weiter als Projektionen.
5. Architektur-Schulden bleiben gross: `online-league-service.ts` und `online-admin-actions.ts` sind reduziert, aber weiterhin grosse Koordinatoren.
6. E2E/Gate-Stabilitaet: Der erste `release:check` lief wegen Vitest-Timeout rot; Retry war gruen. Das ist kein Funktionsfehler, aber ein Delivery-Risiko.

## Empfehlungen

- Als naechstes Firestore Read Budget fuer Draft/League Load von Report-Gate zu enforcebarem Gate weiterentwickeln, erst nach Reduktion der 500+ Read-Hotspots.
- Staging-Smoke fuer den aktuellen Ziel-Commit live ausfuehren und Ergebnis in Report-Governance als aktuelle Wahrheit verlinken.
- Production Preflight mit echten Zielparametern ausfuehren und Ergebnis separat dokumentieren.
- Lifecycle Guard weiter als Schutz fuer neue Flow-Entscheidungen pflegen; Rohfelder duerfen nur Anzeige/Projektion bleiben.
- A4/A5 weiter inkrementell schneiden, aber nicht als Release-Blocker behandeln, solange Public API und Gates stabil bleiben.
