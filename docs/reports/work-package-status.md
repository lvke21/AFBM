# Work Package Status

Stand: 2026-05-02 21:28 Europe/Zurich

Grundlage: aktueller Codezustand, Tests, Scripts und tatsaechlich ausgefuehrte Checks. Alte Reports wurden nicht als Wahrheitsquelle verwendet; sie sind hoechstens betroffene Dateien, wenn sie aktuell im Worktree existieren.

## Check-Ergebnisse

| Check | Ergebnis | Befund |
|---|---:|---|
| `npx tsc --noEmit` | Gruen | TypeScript kompiliert ohne Fehler. |
| `npm run lint` | Gruen | ESLint beendet mit Exit-Code 0. |
| Ausgewaehlte Vitest-Suites | Gruen | 15 Testdateien, 141 Tests: Build-Info, Week-State, Draft-State, Membership-Repository, Ready-UI, Admin-Auth, Navigation, Coming-Soon, Admin-Actions-Konfiguration, Performance. |
| `npm run build` | Gruen | Lokaler Next-Build enthaelt `ƒ /api/build-info`; Online-League First Load JS ca. 300 kB, Admin Detail ca. 273 kB. |
| Lokaler Fetch `/api/build-info` | Gruen | HTTP 200, Payload enthaelt `commit=9bd4d2cc604f`, `buildTime=2026-05-02T12:00:00.000Z`, `environment=local`, `version=0.1.0-test`. |
| Staging-Fetch `/api/build-info` | Rot | HTTP 404 auf `https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app/api/build-info`. |
| Staging-Smoke | Rot | Bricht vor Auth/Simulation am Commit-Gate ab: `/api/build-info` HTTP 404. |
| `git ls-tree 9bd4d2cc604f -- src/app/api/build-info` | Rot | Ziel-Commit enthaelt die Route nicht; die Route ist nur im dirty Worktree vorhanden. |
| `npm run db:up` | Gruen ausserhalb Sandbox | In der Sandbox EPERM auf lokalen DB-Port, ausserhalb Sandbox OK. PostgreSQL laeuft auf `127.0.0.1:5432`, DB `afbm_manager` vorhanden. |
| `npm run prisma:migrate` | Gruen ausserhalb Sandbox | Migrationen in sync, Prisma Client generiert. |
| `npm run test:e2e:seed` | Gruen ausserhalb Sandbox | Seed OK: User, Savegame, Teams, Spieler, Match, Draft-Klasse, Prospects angelegt. |
| `npm run test:e2e` | Gruen ausserhalb Sandbox | Playwright Prisma-Smoke: 1 Test bestanden. |
| `npm run test:firebase:parity` | Gruen ausserhalb Sandbox | Firestore Emulator Parity: 3 Tests bestanden. |
| `npm run test:firebase:rules` | Gruen ausserhalb Sandbox | Firestore Rules: 21 Tests bestanden, inklusive Admin-Claim und Cross-User-Ready-Block. |

## Vollstaendige Paketliste

| Paket | Status | Grund | Dateien |
|---|---|---|---|
| A1 Build-Info Route / Commit-Gate | REGRESSION | Lokal existieren Route und Test, lokaler Fetch und Build sind gruen. Realer Ziel-Commit `9bd4d2cc604f` enthaelt `src/app/api/build-info` aber nicht, Staging liefert HTTP 404. Tests sind relevant, decken aber Deployment/Commit-Inclusion nicht ab. | `src/app/api/build-info/route.ts`, `src/app/api/build-info/route.test.ts`, `scripts/staging-admin-week-smoke.ts` |
| A2 Authentifizierter Staging-Smoke | REGRESSION | Script prueft erwarteten Commit, aber aktueller Staging-Lauf ist rot am `/api/build-info`-Gate. Auth/Login, User-Team-Link, Ready-State, Admin Week Simulation und Reload wurden nicht erreicht. Tests/Scripts existieren, Staging-Verhalten ist rot. | `scripts/staging-admin-week-smoke.ts`, `docs/reports/staging-smoke-final-gate.md` |
| A3 Prisma E2E / PostgreSQL Infrastruktur | FERTIG | `db:up`, Migration, Seed und `npm run test:e2e` laufen reproduzierbar ausserhalb der Sandbox. Preflight liefert klare DB-Anweisungen statt roher Prisma-Errors. Tests/Scripts sind relevant und wurden ausgefuehrt. | `scripts/tools/db-up.mjs`, `scripts/tools/e2e-preflight.mjs`, `scripts/seeds/e2e-seed.ts`, `docs/dev/e2e-postgres-setup.md` |
| A4 Release-Gate-Matrix | FERTIG | Matrix definiert Typecheck, Lint, Vitest, Firebase Parity/E2E, Prisma E2E, Staging Smoke und Production Preflight mit Blocker-Regeln. Aktuelle Checks bestaetigen keine "QA gruen trotz Staging rot"-Aussage. Tests indirekt ueber Scripts/Checks relevant. | `docs/reports/release-gate-matrix.md`, `package.json` |
| B1 Membership / Mirror / Team Source of Truth | TEILWEISE FERTIG | Membership ist in mehreren Repository-Reads kanonisch und Konflikte werden getestet. Trotzdem existieren direkte `team.assignedUserId`-Wahrheiten weiter, z. B. `assertTeamControl` und einzelne Repository-Guards. Konflikte werden teils erkannt/geloggt, aber nicht ueberall einheitlich hard-failed oder repariert. Tests sind relevant, aber nicht vollstaendig fuer alle Read-/Write-Pfade. | `src/lib/online/repositories/firebase-online-league-repository.ts`, `src/lib/online/security/roles.ts`, `src/lib/online/repositories/online-league-repository.test.ts`, `src/components/admin/admin-control-center.tsx` |
| B2 Week Completion Source of Truth | FERTIG | `completedWeeks` ist harte kanonische Quelle; Legacy-Signale aus `weekStatus`, `lastSimulatedWeekKey`, `matchResults` und `weeks/*` werden als Konflikte erkannt. Admin-Simulation hard-failed bei Konflikten. Tests decken widerspruechliche Week-Zustaende relevant ab. | `src/lib/online/online-league-week-simulation.ts`, `src/lib/online/online-league-week-service.ts`, `src/lib/admin/online-week-simulation.ts`, `src/lib/online/online-league-week-simulation.test.ts`, `src/lib/admin/online-week-simulation.test.ts` |
| B3 Draft Source of Truth / Fallbacks | TEILWEISE FERTIG | Pick-/Available-Player-Konflikte werden validiert und Tests decken wichtige Widersprueche ab. Legacy Draft Blob/Fallbacks bleiben aber aktiv lesbar und in Admin-/Repository-Pfaden genutzt. Quellen sind auditierbarer, aber noch nicht auf eindeutige kanonische Docs begrenzt. Tests sind relevant, aber Fallback-Grenzen bleiben offen. | `src/lib/online/multiplayer-draft-logic.ts`, `src/lib/online/types.ts`, `src/lib/online/repositories/firebase-online-league-repository.ts`, `src/lib/admin/online-admin-actions.ts`, `src/lib/online/fantasy-draft-service.test.ts`, `src/lib/online/multiplayer-draft-logic.test.ts` |
| B4 Ready-State / Simulation Readiness | FERTIG | Ready blockiert No-Team, No-Roster, unspielbares Roster, ungueltige Depth Chart, aktiven Draft, Simulation und abgeschlossene Woche. UI zeigt konkrete Blockertexte. Tests sind relevant fuer Service und ViewModel. | `src/lib/online/online-league-week-service.ts`, `src/lib/online/online-league-week-service.test.ts`, `src/components/online/online-league-detail-model.ts`, `src/components/online/online-league-detail-model.test.ts` |
| C1 `online-league-service.ts` verkleinern | TEILWEISE FERTIG | Es gibt extrahierte Week-/Lifecycle-/Depth-Chart-Helper, aber `online-league-service.ts` ist mit 8899 Zeilen weiterhin ein Monolith und enthaelt viele Verantwortlichkeiten. Tests existieren, zeigen Verhalten, aber nicht echte Entkopplung. | `src/lib/online/online-league-service.ts`, `src/lib/online/online-league-lifecycle.ts`, `src/lib/online/online-league-week-service.ts`, `src/lib/online/online-depth-chart-service.ts`, `src/lib/online/online-league-service.test.ts` |
| C2 Firebase Repository Split | TEILWEISE FERTIG | Mapper wurden extrahiert, aber `firebase-online-league-repository.ts` hat weiterhin 1389 Zeilen und buendelt Reads, Writes, Subscriptions, Draft- und Ready-Logik. Public API wirkt stabil, Strukturziel ist nur teilweise erreicht. Tests sind relevant, aber nicht ausreichend als Architekturabschluss. | `src/lib/online/repositories/firebase-online-league-repository.ts`, `src/lib/online/repositories/firebase-online-league-mappers.ts`, `src/lib/online/repositories/online-league-repository.test.ts` |
| C3 Admin Actions Split / Guards / Audit | TEILWEISE FERTIG | Es gibt Guard-/Simulation-/Draft-Use-Case-Module und Audit-Events. `online-admin-actions.ts` bleibt mit 1837 Zeilen breit und buendelt Simulation, Repair, Seed/Reset, Debug und Mutationen. Guard/Confirm/Audit/Env-Schutz sind nicht einheitlich fuer alle mutierenden Actions belegbar. Tests existieren, aber nicht flaechenvollstaendig. | `src/lib/admin/online-admin-actions.ts`, `src/lib/admin/online-week-simulation.ts`, `src/lib/admin/online-admin-draft-use-cases.ts`, `src/lib/admin/online-admin-actions.test.ts`, `src/lib/admin/online-week-simulation.test.ts` |
| C4 Grosse Client-Komponenten reduzieren | TEILWEISE FERTIG | ViewModels/Display-Module existieren, aber `online-league-placeholder.tsx` hat 1735 Zeilen und `admin-league-detail.tsx` 1656 Zeilen. State, Handler und Derived Data sind reduziert, aber weiterhin stark gemischt. Tests sind relevant fuer Modelle, nicht fuer volle Komplexitaetsreduktion. | `src/components/online/online-league-placeholder.tsx`, `src/components/online/online-league-placeholder-model.ts`, `src/components/admin/admin-league-detail.tsx`, `src/components/admin/admin-league-detail-model.ts`, `src/components/admin/admin-league-detail-display.tsx` |
| D1 Admin-Security Modell | TEILWEISE FERTIG | UI/API erlauben Custom Claim oder UID-Allowlist, Firestore Rules erlauben fuer globale Admin-Dokumente nur `request.auth.token.admin == true`. Rules-Tests sind gruen, kodieren aber genau diese Abweichung. Admin-Sicherheit ist dokumentiert/getestet, aber nicht konsistent vereinheitlicht. | `src/lib/admin/admin-auth-model.ts`, `src/lib/admin/admin-claims.ts`, `src/components/admin/admin-auth-gate.tsx`, `src/components/auth/use-firebase-admin-access.ts`, `firestore.rules`, `src/lib/firebase/firestore.rules.test.ts` |
| D2 Nicht-MVP Scope / Navigation | FERTIG | Online-Hauptnavigation blendet Contracts/Cap, Development, Training, Trades, Inbox und Finance aus; Direct URLs landen auf Coming-Soon. Advanced lokale Aktionen sind in Firebase-MVP ausgeblendet. Tests sind relevant fuer Navigation und Direct URLs. | `src/components/layout/navigation-model.ts`, `src/components/layout/navigation-model.test.ts`, `src/components/online/online-league-coming-soon-model.ts`, `src/components/online/online-league-route-fallback-model.ts`, `src/components/online/online-league-placeholder.tsx` |
| D3 Admin UI Action-Struktur | FERTIG | Admin-Detail gruppiert Overview, Simulation, Repair und Debug sichtbar; mutierende Aktionen haben Beschreibungen und kritische Simulation hat Confirm/Preconditions. Action-Konfiguration ist getestet. | `src/components/admin/admin-league-action-config.ts`, `src/components/admin/admin-league-action-config.test.ts`, `src/components/admin/admin-league-detail.tsx`, `src/components/admin/admin-control-center.tsx` |
| D4 Performance Baseline / Low-Risk Optimierung | TEILWEISE FERTIG | Build-Messung und Baseline existieren; `subscribeToLeague` nutzt Coalescing. Es fehlen aber automatisierte Budgets, echte Firestore-Read-Zaehlungen pro Route und ein wiederholbarer Performance-Check in CI. Tests fuer Observability/Coalescing sind relevant, aber nicht ausreichend als Performance-Gate. | `docs/reports/performance-baseline.md`, `src/lib/online/sync-guards.ts`, `src/lib/online/repositories/firebase-online-league-repository.ts`, `src/lib/observability/performance.ts`, `src/lib/observability/performance.test.ts` |
| D5 UX Copy / Glossar / Debug Copy | FERTIG | Glossar fuer Liga, Team, Manager, Woche, Simulation und Draft existiert. Auth-Debug ist auf Dev/Admin begrenzt; Admin-Debug bleibt im Admin-Bereich. Component-Tests wurden mit ausgefuehrt. | `src/components/online/online-glossary.tsx`, `src/components/auth/firebase-email-auth-panel.tsx`, `src/components/admin/admin-control-center.tsx`, `src/components/savegames/savegames-admin-link.tsx` |
| D6 Code Hygiene Triage | FERTIG | TODO/FIXME/HACK sind im produktiven Suchraum bereinigt oder klassifiziert; verbleibender Treffer ist der Analyse-Regex selbst. Console-Logging ist als produktives Logging klassifiziert, nicht blind entfernt. Lint/Typecheck sind gruen. | `docs/reports/code-hygiene-triage.md`, `scripts/analysis/codebase-metrics.mjs`, `src/lib/online/repositories/firebase-online-league-repository.ts`, `src/lib/audit/security-audit-log.ts` |

## Zahlen

- FERTIG: 8
- TEILWEISE: 8
- IN ARBEIT: 0
- NICHT BEGONNEN: 0
- REGRESSIONEN: 2

## Offene Rote Gates

| Gate | Status | Blockiert | Ursache |
|---|---|---|---|
| Staging Smoke | Rot | Staging, Production | `/api/build-info` ist auf Staging HTTP 404; Ziel-Commit `9bd4d2cc604f` enthaelt die Route nicht. |
| Production Preflight | Nicht in diesem Audit voll verifiziert | Production | Kein aktueller erfolgreicher Production-App-Hosting-Preflight mit verifizierten Production-IDs in diesem Lauf. |
| Firestore Production Cutover | Nicht freigegeben | Production-Firestore | Emulator Rules/Parity sind gruen, ersetzen aber keine produktionsnahe Auth-/Backfill-/Monitoring-/Kosten-Verifikation. |

## Alle offenen Arbeitspakete

Sortierung: erst Staging/Production-Blocker, dann Core-Loop-Risiko, dann Architektur/Wartbarkeit, dann Performance.

### A1 - Build-Info Route / Commit-Gate

- Status: REGRESSION
- Warum nicht fertig: Lokal funktioniert `/api/build-info`, aber der erwartete Ziel-Commit `9bd4d2cc604f` enthaelt die Route nicht und Staging liefert 404.
- Was fehlt: Route und Test muessen in einen neuen Release-Commit; App Hosting Build Env muss Commit/Build-Time setzen; Staging muss diesen neuen Commit deployen; Smoke muss gegen den neuen Commit laufen.
- Fehlende/rote Checks: Staging-Fetch und Staging-Smoke rot. Kein Commit-Inclusion-Test/Gate verhindert, dass die Route nur untracked im Worktree liegt.
- Risiko: hoch

### A2 - Authentifizierter Staging-Smoke

- Status: REGRESSION
- Warum nicht fertig: Smoke-Script ist vorhanden, erreicht aber Auth/Login und Week-Simulation nicht, weil das Commit-Gate rot ist.
- Was fehlt: A1 fixen/deployen; danach Smoke voll ausfuehren und Auth/Login, User-Team-Link, Ready-State, Admin Week Simulation, Results/Standings Reload belegen.
- Fehlende/rote Checks: `npm run staging:smoke:admin-week` rot mit `/api/build-info returned HTTP 404`.
- Risiko: hoch

### D1 - Admin-Security Modell

- Status: TEILWEISE FERTIG
- Warum nicht fertig: UI/API Admin-Modell akzeptiert UID-Allowlist, Firestore Rules fuer globale Admin-Dokumente akzeptieren nur Custom Claim. Das kann zu UI-Go/API-Go, aber Firestore-Deny fuehren.
- Was fehlt: Ein autoritatives Admin-Modell definieren; UID-Allowlist entweder nur als UI-Hinweis/Bootstrap-Tool behandeln oder in Rules/Server-Guards konsistent und zeitlich begrenzt abbilden; Tests entsprechend angleichen.
- Fehlende/rote Checks: Keine roten Tests, aber Rules-Tests und Admin-Auth-Tests belegen unterschiedliche Wahrheiten.
- Risiko: hoch

### B1 - Membership / Mirror / Team Source of Truth

- Status: TEILWEISE FERTIG
- Warum nicht fertig: Membership ist oft kanonisch, aber Team-Felder und Mirror beeinflussen weiterhin einzelne Guards/Reads.
- Was fehlt: Alle direkten `assignedUserId`-Wahrheitspruefungen in Reads/Writes finden; Membership als einzige Entscheidungsquelle verwenden; Team/Mirror nur Projection-Checks; einheitliche Hard-Fail- oder Repair-Policy fuer Konflikte.
- Fehlende/rote Checks: Tests fuer einige Konflikte existieren, aber nicht fuer alle Write-/Guard-Pfade wie Team-Control.
- Risiko: hoch

### B3 - Draft Source of Truth / Fallbacks

- Status: TEILWEISE FERTIG
- Warum nicht fertig: Draft-Integritaet ist deutlich besser, aber Legacy Blob/Fallbacks bleiben aktive Lesepfade.
- Was fehlt: Pick Docs als kanonische Picks festziehen; Available-Player-Docs als kanonische Verfuegbarkeit festziehen; Legacy nur Migration/Read-Only mit Hard-Warning; Admin- und Repository-Fallbacks reduzieren.
- Fehlende/rote Checks: Tests decken Widersprueche ab, aber nicht das komplette Abschalten/Begrenzen von Legacy-Fallbacks.
- Risiko: mittel bis hoch

### C1 - `online-league-service.ts` verkleinern

- Status: TEILWEISE FERTIG
- Warum nicht fertig: 8899 Zeilen bleiben ein faktischer Monolith.
- Was fehlt: Weitere reine Mapper, Validatoren und Derived-State-Helper extrahieren; public Verhalten unveraendert halten; Zeilenzahl und Verantwortlichkeiten messbar reduzieren.
- Fehlende/rote Checks: Keine roten Tests, aber keine Architektur-Metrik belegt Abschluss.
- Risiko: mittel

### C2 - Firebase Repository Split

- Status: TEILWEISE FERTIG
- Warum nicht fertig: Repository-Datei buendelt weiter Queries, Commands, Subscriptions und Domain-Use-Cases.
- Was fehlt: Read-/Write-/Subscription-Module mit unveraenderter Public API; Mapper weiter isolieren; Tests fuer Join/Ready/Draft/Week nach Split laufen lassen.
- Fehlende/rote Checks: Tests gruen, aber Strukturziel nicht erreicht.
- Risiko: mittel

### C3 - Admin Actions Split / Guards / Audit

- Status: TEILWEISE FERTIG
- Warum nicht fertig: `online-admin-actions.ts` bleibt breit und nicht alle mutierenden Actions haben konsistent belegte Guard/Confirm/Intent/Audit/Env-Schutz-Kette.
- Was fehlt: Simulation, Repair, Seed/Reset, Debug und Mutationen in klaren Use-Case-Dateien trennen; einheitliche Guard-Helfer erzwingen; Tests fuer kritische Mutationen erweitern.
- Fehlende/rote Checks: Bestehende Tests gruen, aber nicht flaechenvollstaendig fuer alle mutierenden Actions.
- Risiko: mittel

### C4 - Grosse Client-Komponenten reduzieren

- Status: TEILWEISE FERTIG
- Warum nicht fertig: Die beiden Fokus-Komponenten bleiben mit 1735 und 1656 Zeilen gross und mischen weiterhin UI, Handler und Derived Data.
- Was fehlt: Weitere sichere Display-Komponenten und Action-Hooks extrahieren; UX unveraendert lassen; Modelltests behalten/erweitern.
- Fehlende/rote Checks: Modelltests gruen, aber keine Komplexitaets-/Renderabdeckung fuer alle extrahierten Pfade.
- Risiko: mittel

### D4 - Performance Baseline / Low-Risk Optimierung

- Status: TEILWEISE FERTIG
- Warum nicht fertig: Baseline ist vorhanden, aber kein automatisiertes Performance-Gate und keine belastbaren Firestore-Read-Messungen pro User-Flow.
- Was fehlt: Bundle-Budgets oder Vergleichsscript; Firestore-Read-Zaehler fuer League/Draft/Admin/Savegames; reproduzierbarer Messlauf in CI oder Release-Check.
- Fehlende/rote Checks: `npm run build` gruen, Observability-Tests gruen; Read-Baseline nicht automatisch verifiziert.
- Risiko: niedrig bis mittel

## Direkte Prompt-Vorlagen

### Prompt A1

Rolle:
Release Engineer / Next.js App Hosting Specialist

Ziel:
`/api/build-info` muss im Release-Commit und auf Staging verfuegbar sein; der Smoke darf nicht mehr mit HTTP 404 am Commit-Gate scheitern.

Fokus:
Der aktuelle Ziel-Commit `9bd4d2cc604f` enthaelt `src/app/api/build-info` nicht, obwohl die Route lokal im dirty Worktree existiert. Staging liefert HTTP 404.

Konkrete Aufgaben:
1. Stelle sicher, dass `src/app/api/build-info/route.ts` und `src/app/api/build-info/route.test.ts` versioniert sind.
2. Erzeuge oder dokumentiere den neuen Release-Commit, der die Route wirklich enthaelt.
3. Stelle sicher, dass App Hosting beim Build mindestens Commit SHA, Build Time, Environment und Version/Revision setzt.
4. Ergaenze ein Script- oder CI-Gate, das `git ls-tree <release-sha> -- src/app/api/build-info` prueft.
5. Fuehre lokalen Build und lokalen Fetch gegen `/api/build-info` aus.
6. Fuehre den Staging-Fetch gegen `/api/build-info` nach Deploy aus.

Nicht tun:
- Keine Smoke-Bypaesse einbauen.
- Nicht weiter `9bd4d2cc604f` als Staging-Go deklarieren, solange dieser Commit die Route nicht enthaelt.
- Keine unrelated Refactors.

Checks:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `curl -sS -i http://127.0.0.1:<port>/api/build-info`
- `curl -sS -i https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app/api/build-info`
- `git ls-tree --name-only <release-sha> -- src/app/api/build-info`

Output:
- Neuer Release-Commit
- Build-Info-Payload lokal und Staging
- Ursache des vorherigen 404
- Staging Go/No-Go

### Prompt A2

Rolle:
Release Engineer / Staging QA Owner

Ziel:
Der authentifizierte Staging-Smoke fuer den aktuell deployed Release-Commit muss gruen sein.

Fokus:
Der Smoke bricht aktuell vor Auth/Login am Build-Info-Commit-Gate ab, weil Staging `/api/build-info` als HTTP 404 liefert.

Konkrete Aufgaben:
1. Warte, bis A1 deployed ist und `/api/build-info` auf Staging den neuen Release-Commit liefert.
2. Fuehre den Smoke mit `--expected-commit <neuer-release-sha>` aus.
3. Pruefe und dokumentiere Auth/Login, User-Team-Link, Ready-State, Admin Week Simulation, Results/Standings Reload.
4. Falls rot: Ursache exakt isolieren und nur Staging-/Smoke-/Gate-bezogene Probleme beheben.
5. Aktualisiere den Staging-Smoke-Report mit Datum, Commit, Command und Ergebnis.

Nicht tun:
- Keine Smoke-Schritte ueberspringen, wenn der Ziel-Commit nicht verifiziert ist.
- Keine produktiven Secrets in Reports schreiben.
- Keine Feature- oder Domain-Refactors.

Checks:
- `CONFIRM_STAGING_SMOKE=true GOOGLE_CLOUD_PROJECT=afbm-staging npm run staging:smoke:admin-week -- --league-id afbm-multiplayer-test-league --expected-commit <neuer-release-sha>`
- `npx tsc --noEmit`
- `npm run lint`

Output:
- Smoke Ergebnis Gruen/Rot
- Gepruefter Commit
- Auth/Login Status
- User-Team-Link Status
- Ready-State Status
- Admin Week Simulation Status
- Results/Standings Reload Status
- Blocker
- Staging Go/No-Go

### Prompt D1

Rolle:
Senior Security Engineer

Ziel:
Admin-Rechte muessen zwischen UI, Server/API und Firestore Rules ein konsistentes, dokumentiertes Modell haben.

Fokus:
UI/API erlauben Custom Claim oder UID-Allowlist; Firestore Rules fuer globale Admin-Dokumente erlauben nur Custom Claim. Tests sind gruen, aber kodieren unterschiedliche Wahrheiten.

Konkrete Aufgaben:
1. Definiere die kanonische Admin-Wahrheit: Custom Claim only oder Custom Claim plus klar befristete UID-Bootstrap-Policy.
2. Gleiche `admin-auth-model`, `admin-claims`, UI-Gates und Firestore Rules auf diese Wahrheit ab.
3. Stelle sicher, dass UID-Allowlist nicht still UI-Zugriff suggeriert, wenn Rules/API spaeter blockieren.
4. Erweitere Tests fuer Admin erlaubt, Nicht-Admin blockiert, UID-Allowlist-Verhalten und Cross-User-Write-Block.
5. Dokumentiere verbleibende Bootstrap-/Production-Risiken ohne Secrets.

Nicht tun:
- Keine Production-Secrets verwenden.
- Keine Firestore-Regeln lockern, ohne Tests.
- Keine Admin-Features hinzufuegen.

Checks:
- `npm run test:firebase:rules`
- `npm run test:firebase:parity`
- `npx vitest run src/lib/admin src/components/admin src/components/auth`
- `npx tsc --noEmit`
- `npm run lint`

Output:
- Kanonisches Admin-Auth-Modell
- Geaenderte Gates/Rules
- Tests
- Offene Sicherheitsrisiken
- Status

### Prompt B1

Rolle:
Senior Multiplayer State Engineer

Ziel:
Membership muss die einzige kanonische Quelle fuer User-Team-Zuordnung sein; Mirror und Team-Felder duerfen nur Projektionen sein.

Fokus:
Es gibt bereits Membership-Konflikttests, aber direkte `team.assignedUserId`-Entscheidungen bleiben in Guards/Repository-Pfaden aktiv.

Konkrete Aufgaben:
1. Suche alle Read-/Write-/Guard-Pfade, die `assignedUserId`, Mirror oder Team-Status als Wahrheit nutzen.
2. Ersetze Entscheidungslogik durch aktive Membership als kanonische Quelle.
3. Nutze Team/Mirror nur zur Projection-Validierung.
4. Definiere einheitliches Verhalten bei Konflikten: Hard-Fail oder explizite sichere Repair-Action.
5. Ergaenze Tests fuer Membership ungleich Mirror, Membership ungleich Team, stale Team-Control und Repair/Hard-Fail.

Nicht tun:
- Keine Datenmigration ohne expliziten Report.
- Keine stille Normalisierung von Konflikten.
- Keine UX- oder Feature-Aenderungen.

Checks:
- `npx vitest run src/lib/online src/components/online`
- `npx tsc --noEmit`
- `npm run lint`

Output:
- Kanonische User-Team-Regel
- Geaenderte Read-/Write-/Repair-Pfade
- Tests
- Restrisiken

### Prompt B3

Rolle:
Senior Multiplayer Draft Engineer

Ziel:
Draft State muss aus klaren kanonischen Quellen entstehen und Legacy-Fallbacks duerfen keine gleichwertige Wahrheit mehr sein.

Fokus:
Draft-Integritaet ist getestet, aber Legacy Draft Blob und Fallbacks sind weiterhin aktive Lesepfade in Repository/Admin-Logik.

Konkrete Aufgaben:
1. Definiere Pick Docs als kanonische Quelle fuer Picks.
2. Definiere Available-Player-Docs als kanonische Quelle fuer Verfuegbarkeit.
3. Begrenze Legacy Blob/Fallbacks auf Migration oder explizite Read-Only-Kompatibilitaet mit Hard-Warnings.
4. Entferne oder isoliere Fallbacks in `firebase-online-league-repository`, `online-admin-actions` und `types`.
5. Ergaenze Tests fuer Pick Doc vorhanden/Draft Doc widerspricht, Player available aber gepickt, Draft completed aber Picks fehlen, Legacy-Fallback inkonsistent.

Nicht tun:
- Keine neue Draft-Funktionalitaet.
- Keine Firestore-Pfade aendern, ausser zwingend dokumentiert.
- Keine stille Reparatur widerspruechlicher Draft-Daten.

Checks:
- `npx vitest run src/lib/online/fantasy-draft-service.test.ts src/lib/online/multiplayer-draft-logic.test.ts src/lib/online/repositories/online-league-repository.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

Output:
- Draft Source-of-Truth-Regeln
- Reduzierte Fallbacks
- Tests
- Status Gruen/Rot

### Prompt C1

Rolle:
Senior TypeScript Architect

Ziel:
`online-league-service.ts` weiter messbar verkleinern, ohne Verhalten zu aendern.

Fokus:
Die Datei hat aktuell 8899 Zeilen. Es gibt Extraktionen, aber der Service bleibt ein Monolith.

Konkrete Aufgaben:
1. Analysiere Verantwortlichkeiten in `online-league-service.ts`.
2. Extrahiere nur sichere reine Bereiche: Mapper, Validatoren, Derived-State-Helper, kleine Use-Cases.
3. Halte Firestore-/Storage-Semantik unveraendert.
4. Miss vorher/nachher Zeilen und Import-Grenzen.
5. Fuehre Online-Service-Tests aus und erweitere nur dort, wo Extraktion Risiko erzeugt.

Nicht tun:
- Keine Feature-Aenderungen.
- Keine Firestore-Pfad- oder Persistenz-Aenderungen.
- Keine grossen opportunistischen Refactors.

Checks:
- `npx vitest run src/lib/online`
- `npx tsc --noEmit`
- `npm run lint`
- `wc -l src/lib/online/online-league-service.ts`

Output:
- Extrahierte Module
- Entfernte Zeilen aus `online-league-service.ts`
- Verhalten unveraendert?
- Status

### Prompt C2

Rolle:
Senior Firebase Architect

Ziel:
`firebase-online-league-repository.ts` nach Reads, Writes, Subscriptions und Mappern trennen, ohne Public API und Firestore-Pfade zu brechen.

Fokus:
Die Datei hat aktuell 1389 Zeilen und buendelt Query-, Command-, Subscription-, Draft- und Ready-Logik.

Konkrete Aufgaben:
1. Schneide zuerst reine Mapper/Reader heraus, falls noch im Repository.
2. Extrahiere Query-Funktionen in ein Read-Modul.
3. Extrahiere Commands/Writes in ein Write-Modul.
4. Extrahiere Subscriptions in ein Subscription-Modul.
5. Behalte `FirebaseOnlineLeagueRepository` als kompatible Fassade, falls noetig.
6. Tests fuer Join/Ready/Draft/Week unveraendert gruen halten.

Nicht tun:
- Keine Firestore-Pfade aendern.
- Keine Datenmigration.
- Keine Public-API-Aenderung ohne explizite Dokumentation.

Checks:
- `npx vitest run src/lib/online/repositories src/lib/online`
- `npx tsc --noEmit`
- `npm run lint`
- `wc -l src/lib/online/repositories/firebase-online-league-repository.ts`

Output:
- Neue Modulstruktur
- Unveraenderte Public API oder dokumentierte Aenderung
- Tests
- Restrisiken

### Prompt C3

Rolle:
Senior Backend Engineer / Admin Architecture

Ziel:
`online-admin-actions.ts` soll mutierende Admin-Use-Cases klar trennen und Guards/Audit/Env-Schutz konsistent erzwingen.

Fokus:
Die Datei hat aktuell 1837 Zeilen und buendelt Simulation, Repair, Seed/Reset, Debug und Mutationen.

Konkrete Aufgaben:
1. Inventarisiere alle mutierenden Admin Actions.
2. Extrahiere Simulation, Repair, Seed/Reset, Debug und Draft-Mutationen in klar benannte Use-Case-Dateien.
3. Erstelle einen gemeinsamen Guard-/Intent-/Audit-Wrapper fuer mutierende Actions.
4. Stelle sicher, dass gefaehrliche Actions Umgebungsschutz und Confirm/Intent haben.
5. Erweitere Tests fuer kritische Mutationen und Audit-Events.

Nicht tun:
- Keine neue Admin-Funktionalitaet.
- Keine Staging/Production-Secrets verwenden.
- Keine Client-UX-Aenderung ausser noetige Labels/Fehlertexte.

Checks:
- `npx vitest run src/lib/admin`
- `npx tsc --noEmit`
- `npm run lint`
- `wc -l src/lib/admin/online-admin-actions.ts`

Output:
- Neue Admin-Use-Case-Struktur
- Sicherheitsguards
- Audit-Abdeckung
- Tests
- Status

### Prompt C4

Rolle:
Senior Frontend Architect

Ziel:
`online-league-placeholder.tsx` und `admin-league-detail.tsx` sollen weniger State, Handler und Derived Data mischen, ohne UX-Aenderung.

Fokus:
Die Dateien haben aktuell 1735 bzw. 1656 Zeilen. Es gibt ViewModels/Display-Module, aber die Komponenten bleiben gross.

Konkrete Aufgaben:
1. Analysiere State, Handler, Derived Data und reine Display-Bloecke.
2. Extrahiere nur sichere ViewModels, Action Hooks und reine Display-Komponenten.
3. Behalte visuelle Struktur, Texte und Interaktionen unveraendert.
4. Erweitere Tests fuer extrahierte Modelle/Hooks, falls Risiko entsteht.
5. Miss vorher/nachher Zeilen und Verantwortlichkeiten.

Nicht tun:
- Keine UX-Aenderung.
- Keine neuen Features.
- Keine gleichzeitige Domain-Refaktorierung.

Checks:
- `npx vitest run src/components/online src/components/admin`
- `npx tsc --noEmit`
- `npm run lint`
- `wc -l src/components/online/online-league-placeholder.tsx src/components/admin/admin-league-detail.tsx`

Output:
- Extrahierte Komponenten/Hooks
- Reduzierte Komplexitaet
- Tests
- Status

### Prompt D4

Rolle:
Performance Engineer

Ziel:
Performance-Findings muessen reproduzierbar gemessen und als Release-Check nutzbar werden.

Fokus:
Es gibt Build-Baseline und Coalescing, aber keine automatisierten Budgets und keine belastbaren Firestore-Read-Zaehler pro Flow.

Konkrete Aufgaben:
1. Ergaenze ein reproduzierbares Bundle-Analyse-Script fuer Online League, Draft, Admin und Savegames.
2. Messe Firestore Reads fuer `subscribeToLeague`, Events, Teams und Draft im Emulator oder mit instrumentiertem Repository.
3. Aktualisiere `docs/reports/performance-baseline.md` mit echten Messwerten, nicht nur qualitativer Einschaetzung.
4. Definiere Top-5-Risiken und naechste Arbeitspakete.
5. Setze nur Low-Risk-Optimierungen um, die durch Messung belegt sind.

Nicht tun:
- Keine grossen Refactors.
- Keine ungemessenen Performance-Behauptungen.
- Keine UX-Degradation fuer kleinere Bundles.

Checks:
- `npm run build`
- `npx vitest run src/lib/observability src/lib/online/sync-guards.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

Output:
- Bundle-/Read-Baseline
- Top 5 Performance-Risiken
- Umgesetzte Low-Risk-Optimierungen
- Konkrete naechste Arbeitspakete

## Fake-Fortschritt / teilweise geloest trotz Fertig-Wirkung

| Paket | Warum wirkt es fertig? | Warum ist es nicht fertig? |
|---|---|---|
| A1 | Route, Test, lokaler Fetch und lokaler Build sind gruen. | Route ist nicht im Ziel-Commit `9bd4d2cc604f`; Staging bleibt HTTP 404. |
| A2 | Smoke-Script hat Commit-Gate und erwarteten Commit-Parameter. | Der reale Smoke ist rot und erreicht die eigentlichen Auth-/Week-Schritte nicht. |
| B1 | Membership-Konflikttests und Repository-Checks existieren. | Direkte Team-Felder bleiben in Guards/Reads eine Entscheidungsquelle. |
| B3 | Draft-Konflikte werden erkannt und getestet. | Legacy Blob/Fallbacks bleiben aktive Quellen statt klar begrenzte Migration. |
| C1 | Einige Helper wurden extrahiert. | Der Service ist mit 8899 Zeilen weiterhin monolithisch. |
| C2 | Mapper wurden ausgelagert. | Repository buendelt weiter Reads, Writes, Subscriptions und Domain-Logik. |
| C3 | Es gibt Simulation-/Draft-Use-Cases und Guards. | Zentrale Admin-Actions-Datei bleibt sehr gross und Guard/Audit ist nicht flaechenvollstaendig belegt. |
| C4 | ViewModels und Display-Komponenten existieren. | Fokus-Komponenten bleiben sehr gross und mischen weiter Verantwortlichkeiten. |
| D1 | Rules- und Admin-Auth-Tests sind gruen. | Die gruenen Tests beweisen unterschiedliche Admin-Wahrheiten statt Konsistenz. |
| D4 | Baseline-Report und Coalescing existieren. | Es fehlt ein automatisiertes, reproduzierbares Performance-Gate mit Read-Zaehlern. |

## Kurzfazit

Lokale technische Gates sind stark: Typecheck, Lint, Build, relevante Vitest-Suites, Prisma E2E, Firebase Rules und Firebase Parity sind gruen. Staging und Production bleiben trotzdem No-Go, weil der Ziel-Commit die Build-Info-Route nicht enthaelt und Staging `/api/build-info` weiterhin mit HTTP 404 beantwortet.
