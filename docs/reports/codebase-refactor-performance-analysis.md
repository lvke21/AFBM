# Codebase Refactor & Performance Analysis

Stand: 2026-05-01

Rolle: Senior Software Architect / Performance Engineer / Refactoring Lead
Scope: Analyse des gesamten AFBM-Projekts auf Codequalitaet, Komplexitaet, Wartbarkeit, Performance, Dopplungen, Architekturgrenzen und Regression-Risiken.
Wichtig: Es wurden keine produktiven Codeaenderungen vorgenommen. Dieser Bericht ist reine Analyse.

## Executive Summary

AFBM ist funktional deutlich gewachsen: Singleplayer, Multiplayer, Firebase, Admin, Simulation, Draft, Week Flow, Savegames und QA-Skripte existieren parallel. Die Testabdeckung ist breit, Lint/Typecheck/Build laufen grundsaetzlich. Gleichzeitig ist die Codebasis an mehreren Stellen ueber die Grenze von "gewachsen" zu "schwer kontrollierbar" gerutscht.

Die groessten Risiken liegen nicht in fehlendem TypeScript oder fehlenden Tests, sondern in **zu grossen Zustands- und Service-Dateien**, **gemischten Verantwortlichkeiten** und **Client Components, die zu viel Fachlogik, Side Effects und UI in einem Modul tragen**.

Die kritischsten Hotspots:

- `src/lib/online/online-league-service.ts`: 8.977 Zeilen, 269 KB, mehr als 50 exportierte Funktionen. Enthält Domain, State Mutation, lokale Persistenz, Fantasy Draft, Contracts, Trades, Coaching, Training, Week Simulation, GM Security und Admin-artige Operationen in einem File.
- `src/components/online/online-league-placeholder.tsx`: 1.977 Zeilen Client Component. UI, Repository, lokalen Legacy-Modus, Firebase-MVP-Gates, Form State und viele Action Handler in einem Modul.
- `src/components/admin/admin-league-detail.tsx`: 1.761 Zeilen Client Component mit sehr vielen Admin-Aktionen, UI-Zuständen und API-Aufrufen.
- `src/modules/gameplay/infrastructure/play-library.ts`: 6.970 Zeilen statischer Content in einem TypeScript-Modul. Gut testbar, aber schlecht wartbar und potenziell bundle-/parse-relevant, wenn falsch importiert.
- `src/modules/seasons/application/simulation/match-engine.ts`: 5.225 Zeilen Engine-Logik mit hoher Branch-Komplexitaet.

**Gesamtstatus: Gelb mit roten Teilbereichen.**
Lint, Typecheck und Build sind gruen. Der Standard-Testlauf `npm run test:run` ist aber wegen eines 15s-Timeouts in `fantasy-draft-service.test.ts` rot. Der fokussierte Test besteht mit 30s Timeout. E2E ist lokal blockiert, weil PostgreSQL nicht erreichbar ist.

## Ausgefuehrte Checks

| Command | Ergebnis | Notiz |
| --- | --- | --- |
| `npm run lint` | Gruen | ESLint ohne Fehler. |
| `npx tsc --noEmit` | Gruen | TypeScript ohne Fehler. |
| `npm run build` | Gruen | Next Build erfolgreich. |
| `npm run test:run` | Rot | 911/912 Tests bestanden; ein 16-Team-Fantasy-Draft-Test timed bei 15s aus. |
| `npx vitest run src/lib/online/fantasy-draft-service.test.ts --testTimeout=30000` | Gruen | 5/5 Tests bestanden; kompletter Draft-Test ca. 8,1s. |
| `npm run test:e2e` | Rot / nicht ausgefuehrt | Preflight stoppt: PostgreSQL auf `localhost:5432` nicht erreichbar. |
| `npm run test:firebase:rules` | Gruen nach Escalation | In Sandbox wegen Port-Bindings blockiert, ausserhalb Sandbox 18/18 Tests bestanden. |

Build-Hinweis:

- Next.js warnt, dass es wegen mehrerer Lockfiles die Workspace Root als `/Users/lukashanzi` statt Projektroot erkennen koennte.
- Gefunden: `/Users/lukashanzi/package-lock.json` und `/Users/lukashanzi/Documents/AFBM/package-lock.json`.
- Risiko: falsche Output File Tracing Root, groessere Build-Traces, Deployment-Ueberraschungen.

Bundle-/Build-Messwerte:

- `.next`: ca. 396 MB
- `.next/static`: ca. 2,1 MB
- `.next/server`: ca. 9,6 MB
- First Load JS:
  - `/online/league/[leagueId]`: 292 kB
  - `/app/savegames`: 289 kB
  - `/`: 289 kB
  - `/online`: 264 kB
  - `/admin`: 264 kB
  - `/admin/league/[leagueId]`: 265 kB

## Groesste Dateien

Top-Dateien nach Zeilen:

| Datei | Zeilen | Bewertung |
| --- | ---: | --- |
| `src/lib/online/online-league-service.ts` | 8.977 | Kritisch gross |
| `src/modules/gameplay/infrastructure/play-library.ts` | 6.970 | Sehr gross, Content-lastig |
| `src/modules/seasons/application/simulation/match-engine.ts` | 5.225 | Kritisch komplex |
| `src/modules/gameplay/application/play-selection-engine.ts` | 2.747 | Komplex |
| `src/modules/gameplay/application/outcome-resolution-engine.ts` | 2.715 | Komplex |
| `scripts/simulations/qa-extended-engine-balance-suite.ts` | 2.571 | Grosses QA-Skript |
| `src/components/online/online-league-placeholder.tsx` | 1.977 | Kritische Client Component |
| `src/lib/admin/online-admin-actions.ts` | 1.906 | Sehr grosse Admin-Service-Datei |
| `scripts/seeds/e2e-seed.ts` | 1.848 | Grosses Seed-Skript |
| `src/components/admin/admin-league-detail.tsx` | 1.761 | Kritische Client Component |
| `scripts/simulations/gameengine-rating-analysis-report.ts` | 1.714 | Grosses Analyse-Skript |
| `src/modules/gameplay/application/play-library-service.ts` | 1.556 | Komplex |
| `src/components/dashboard/dashboard-model.ts` | 1.498 | Grosses View Model |
| `src/components/online/online-league-detail-model.ts` | 1.451 | Grosses View Model |
| `src/modules/seasons/application/simulation/extended-season-balance-suite.ts` | 1.443 | Grosses Simulations-/QA-Modul |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | 1.391 | Firestore Hotspot |
| `src/components/match/post-game-report-model.ts` | 1.337 | Grosses View Model |
| `src/modules/savegames/application/bootstrap/initial-roster.ts` | 1.310 | Grosses Seed-/Bootstrap-Modul |
| `src/components/match/match-report-model.ts` | 1.251 | Grosses View Model |
| `src/modules/savegames/application/week-flow.service.ts` | 1.003 | Kritischer Week Flow |

Groesste Client Components:

| Datei | Zeilen | Risiko |
| --- | ---: | --- |
| `src/components/online/online-league-placeholder.tsx` | 1.977 | Sehr hoch |
| `src/components/admin/admin-league-detail.tsx` | 1.761 | Sehr hoch |
| `src/components/admin/admin-control-center.tsx` | 749 | Hoch |
| `src/components/match/live-simulation-flow.tsx` | 640 | Hoch |
| `src/components/team/roster-table.tsx` | 600 | Mittel/Hoch |
| `src/components/admin/admin-league-manager.tsx` | 586 | Hoch |
| `src/components/online/online-league-search.tsx` | 526 | Mittel/Hoch |
| `src/components/savegames/savegames-list-section.tsx` | 470 | Mittel |
| `src/components/trades/trade-board.tsx` | 423 | Mittel |
| `src/components/draft/draft-overview-screen.tsx` | 374 | Mittel |

## Komplexitaets-Indikatoren

Grobe statische Zaehler:

| Datei | Funktions-/Arrow-Treffer | Branch-Treffer | Side-Effect-/IO-Treffer |
| --- | ---: | ---: | ---: |
| `online-league-service.ts` | 515 | 812 | 0 |
| `online-league-placeholder.tsx` | 62 | 132 | 9 |
| `admin-league-detail.tsx` | 81 | 185 | 14 |
| `online-admin-actions.ts` | 113 | 189 | 11 |
| `firebase-online-league-repository.ts` | 125 | 144 | 33 |
| `match-engine.ts` | 148 | 591 | 0 |
| `play-selection-engine.ts` | 79 | 385 | 1 |
| `outcome-resolution-engine.ts` | 71 | 224 | 0 |
| `dashboard-model.ts` | 112 | 182 | 0 |
| `week-flow.service.ts` | 31 | 61 | 0 |

Repository-weite Side-Effect-Indikatoren:

- `useEffect`: 52 Treffer
- `useMemo`: 46 Treffer
- `useCallback`: 8 Treffer
- `getDoc`: 47 Treffer
- `getDocs`: 13 Treffer
- `onSnapshot`: 27 Treffer
- `runTransaction`: 20 Treffer
- `setDoc`: 50 Treffer
- `updateDoc`: 18 Treffer
- `writeBatch`: 2 Treffer
- `localStorage`: 9 Treffer
- `window.confirm`: 15 Treffer
- `setTimeout`: 19 Treffer

Diese Werte sind nicht per se schlecht. Sie zeigen aber, dass Firestore-IO und Client-Side Effects breit verteilt sind und nicht nur in wenigen, klar isolierten Adaptern leben.

## Top 20 Problemstellen

| # | Datei | Problem | Risiko | Verbesserung |
| ---: | --- | --- | --- | --- |
| 1 | `src/lib/online/online-league-service.ts` | God Module fuer Online-Domain, lokale Persistenz, Draft, Week, Trades, Contracts, Coaching, Training, GM Security. | Hoch | In Subdomains splitten: league-core, draft, roster, contracts, trades, training, finance, week, gm-security. |
| 2 | `src/components/online/online-league-placeholder.tsx` | 1.977 Zeilen Client UI + Actions + Repository + Legacy/Firebase-Gates. | Hoch | Container/Presenter splitten, Action Hooks extrahieren, Firebase-MVP-Gates in Capability-Modell. |
| 3 | `src/components/admin/admin-league-detail.tsx` | Admin-Detailseite als riesiges Action-Center mit vielen Side Effects. | Hoch | Tabs/Sections mit dedizierten Hooks: Overview, Week, Draft, GMs, Debug. |
| 4 | `src/modules/gameplay/infrastructure/play-library.ts` | 6.970 Zeilen statischer Play-Content in TS. | Mittel/Hoch | Data-only JSON/TS chunks nach Offense/Defense/Special splitten, Lazy-Validierung im Service. |
| 5 | `src/modules/seasons/application/simulation/match-engine.ts` | 5.225 Zeilen Engine mit hoher Branch-Komplexitaet. | Hoch | Engine in Drive, Play, Clock, Scoring, Penalty/Injury, Stats Reducer zerlegen. |
| 6 | `src/modules/gameplay/application/play-selection-engine.ts` | Sehr komplexe Auswahlheuristik + Presnap-Struktur + Situation Logic. | Hoch | Strategie-Scorer, Filter, Tendency, Down/Distance-Regeln trennen. |
| 7 | `src/modules/gameplay/application/outcome-resolution-engine.ts` | Outcome-Resolving, Rating-Skalen und Randomness eng verflochten. | Hoch | Pure Probability Model, Resolver und Telemetrie trennen. |
| 8 | `src/lib/admin/online-admin-actions.ts` | Admin API/Actions, Firestore Writes, Draft/Week-Finalisierung in einem grossen Modul. | Hoch | Command-Handler pro Action + gemeinsames Result/Error-Mapping. |
| 9 | `src/lib/online/repositories/firebase-online-league-repository.ts` | Firestore Reads, Writes, Membership Repair, Join, Subscriptions, Mapping in einem Repository. | Hoch | ReadRepository, WriteRepository, MembershipRepairService, FirestoreMapper trennen. |
| 10 | `src/components/admin/admin-control-center.tsx` | UI, Admin Claim Debug, Hub Actions, League Selection und Week Commands kombiniert. | Mittel/Hoch | AdminHubState Hook und kleine Panels. |
| 11 | `src/components/admin/admin-league-manager.tsx` | Formular, Firebase-Listen, lokale Admin-Debugs und destructive Actions in einem Client-Modul. | Mittel/Hoch | CreateForm, LeagueList, LocalTools, FirebaseTools trennen. |
| 12 | `src/components/online/online-league-search.tsx` | Suche, Team-Identity Wizard, Join/Rejoin, Error Recovery und Subscription in einem Component. | Mittel/Hoch | SearchResults, TeamIdentityStep, JoinController extrahieren. |
| 13 | `src/components/savegames/savegames-list-section.tsx` | Client Fetch, Details, Delete, Resume, Feedback und LocalStorage in einem Component. | Mittel | `useSavegamesList` Hook + Karten-Komponenten. |
| 14 | `src/components/team/depth-chart-view.tsx` | Grosse interaktive Team-Ansicht, potentiell viele Berechnungen im Renderpfad. | Mittel | View Model memoizen, Positionsgruppen/Rows extrahieren. |
| 15 | `src/components/team/roster-table.tsx` | Grosse Tabelle mit Filter-/Sortier-/UI-Logik. | Mittel | Filter/Sort Model auslagern, Virtualisierung ab groesseren Rostern pruefen. |
| 16 | `src/components/dashboard/dashboard-model.ts` | Dashboard View Model sehr gross und potenziell schwer zu erweitern. | Mittel | Panelspezifische View Models splitten. |
| 17 | `src/components/online/online-league-detail-model.ts` | Grosses Online-Dashboard-ViewModel mit vielen Zustandsfaellen. | Mittel/Hoch | Phase-spezifische Models: draft, roster, week, membership, standings. |
| 18 | `src/modules/savegames/application/week-flow.service.ts` | Kritischer Singleplayer Week Flow mit Persistence und Simulation nahe beieinander. | Hoch | Transaction orchestration, simulation invocation und post-week reducers trennen. |
| 19 | `scripts/seeds/*multiplayer*.ts` | Viele Seed-/Finalize-/Repair-Skripte mit aehnlichen Guards, Firestore-Zugriffen, Reports. | Mittel | Shared seed runtime: env guard, project mode, league refs, validation, report writer. |
| 20 | `next.config.ts` / Repo root | Build warnt wegen falscher Workspace-Root-Erkennung durch zweites Lockfile. | Mittel | `outputFileTracingRoot` explizit setzen oder fremdes Lockfile entfernen/klaeren. |

## Top 10 Performance-Risiken

| # | Risiko | Betroffene Stellen | Einschaetzung | Empfehlung |
| ---: | --- | --- | --- | --- |
| 1 | Zu grosse Client Bundles fuer Online/Admin | `/online/league/[leagueId]` 292 kB, `/admin` 264 kB | Hoch | Client Components splitten, Action Panels lazy laden. |
| 2 | Riesen-Client-Components verursachen breite Re-Renders | `online-league-placeholder.tsx`, `admin-league-detail.tsx` | Hoch | State nach Bereich trennen, Child Panels memoizen. |
| 3 | Voller Fantasy Draft Test braucht >15s im Standardlauf | `fantasy-draft-service.test.ts` | Mittel/Hoch | Algorithmus profilieren; Testtimeout nur als Zwischenloesung. |
| 4 | Firestore Subscriptions breit verteilt | 27 `onSnapshot` Treffer | Mittel/Hoch | Subscription Layer konsolidieren, Leaks/Mehrfachabos testen. |
| 5 | Firestore Einzelreads koennen Read-Amplification erzeugen | 47 `getDoc`, 13 `getDocs` Treffer | Mittel/Hoch | Batch-/aggregierte Reads fuer League Dashboard und Admin Detail pruefen. |
| 6 | Statische Play Library als grosses TS-Modul | `play-library.ts` 245 KB | Mittel | Daten splitten, Service Import-Pfade kontrollieren. |
| 7 | Grosse Tabellen ohne Virtualisierung | Roster, Depth Chart, Online Player Pools | Mittel | Virtualisierung oder Pagination ab Schwellwert. |
| 8 | Teure Simulations-/Balancing-Suiten in normalem Testkontext | Calibration/Testlaeufe >6s bis 15s | Mittel | Slow Tests taggen, separate QA-Testgruppe. |
| 9 | Build Trace sehr gross | `.next` 396 MB | Mittel | Next root warning beheben, Trace-Inhalte pruefen. |
| 10 | `setTimeout`/imperative UI-Fokus verstreut | 19 Treffer | Niedrig/Mittel | Fokus-/Highlight-Utility zentralisieren, Tests fuer Timing vermeiden. |

## Top 10 Entschlackungs-Chancen

| # | Chance | Nutzen | Risiko |
| ---: | --- | --- | --- |
| 1 | `online-league-service.ts` in fachliche Module splitten | Sehr hoch | Hoch |
| 2 | Online Dashboard Container/Presenter trennen | Sehr hoch | Mittel/Hoch |
| 3 | Admin Detailseite in Tabs/Feature-Komponenten zerlegen | Hoch | Mittel |
| 4 | Gemeinsamen Seed-/Staging-Guard extrahieren | Hoch | Niedrig/Mittel |
| 5 | Firestore Repository Mapper und Membership Repair auslagern | Hoch | Mittel/Hoch |
| 6 | Play Library nach Kategorien splitten | Mittel/Hoch | Mittel |
| 7 | `window.confirm` durch zentrales Confirm-Pattern ersetzen | Mittel | Niedrig |
| 8 | Savegames List Hook extrahieren | Mittel | Niedrig |
| 9 | Slow Tests markieren und Performance-Budget setzen | Mittel | Niedrig |
| 10 | Next output root explizit konfigurieren | Mittel | Niedrig |

## Doppelte oder sehr aehnliche Logik

### Seed-/Staging Guards

Viele Skripte wiederholen:

- `CONFIRM_STAGING_SEED`
- `USE_FIRESTORE_EMULATOR`
- `GOOGLE_CLOUD_PROJECT`
- Testleague-ID
- Firestore Admin Initialisierung
- Report-/Validation-Ausgabe

Betroffene Dateien:

- `scripts/seeds/multiplayer-test-league-reset-and-seed.ts`
- `scripts/seeds/multiplayer-auto-draft-staging.ts`
- `scripts/seeds/multiplayer-repair-memberships-staging.ts`
- `scripts/seeds/multiplayer-finalize-existing-league-staging.ts`
- `scripts/seeds/multiplayer-finalize-auto-draft-staging.ts`
- `scripts/seed-online-league.ts`

Empfehlung: `scripts/seeds/shared/staging-seed-runtime.ts` mit Guards, Admin DB, safe logging, report helpers.

### Online Membership / Team Repair

Membership-Validierung, Mirror-Fallback und Team-Zuordnung tauchen in Repository, Admin Repair Scripts und Tests aehnlich auf.

Empfehlung: einen gemeinsamen `online-membership-consistency.ts` Service schaffen, der sowohl Repository als auch Repair-Skripte verwendet.

### Online Local vs Firebase Mode

Viele UI-Komponenten fragen `repository.mode === "firebase"` oder zeigen lokale Legacy-Actions anders.

Empfehlung: Capability-Objekt statt Mode-Checks im UI:

```ts
capabilities = {
  canWriteTrainingPlan,
  canUseLocalLegacyActions,
  canRunFirebaseAdminActions,
  canClaimVacantTeam,
}
```

### Admin Actions

Admin Hub, Admin Detail und Admin League Manager haben aehnliche Pending-/Notice-/Bearer-Token-/Action-Patterns.

Empfehlung: `useAdminActionRunner` plus typed command definitions.

## Architekturprobleme

### 1. Online Domain ist kein klares Modul

`online-league-service.ts` ist faktisch eine Online-Monolith-Datei. Sie exportiert League Creation, Draft, Stadium, Fan Mood, Contracts, Free Agency, Scouting, Trades, Coaching, Training, GM Security, Readiness, Week Simulation und Admin-artige Mutationen. Das ist kurzfristig praktisch, langfristig aber gefaehrlich.

Konsequenz:

- Aenderungen an einem Feature koennen Seiteneffekte in anderen Features erzeugen.
- Imports ziehen zu viel fachlichen Kontext mit.
- Tests werden grob und langsam.
- Ownership ist unklar.

### 2. Client Components tragen zu viel Fachlogik

`online-league-placeholder.tsx`, `admin-league-detail.tsx`, `admin-control-center.tsx`, `admin-league-manager.tsx` und `online-league-search.tsx` enthalten UI, async Actions, State Machines, Error Recovery, env mode checks und Fachentscheidungen.

Konsequenz:

- Re-Renders sind schwer kontrollierbar.
- Testbarkeit leidet.
- UI-Aenderungen koennen Fachlogik brechen.

### 3. Singleplayer und Multiplayer teilen Konzepte, aber nicht konsequent Grenzen

Es gibt Singleplayer Week Flow, Multiplayer Week Simulation, Online Game Simulation, Admin Week Actions und lokale Online-Simulation. Die Modelle sind kompatibel genug, aber nicht klar genug geschichtet.

Konsequenz:

- Risiko von doppelter Simulation.
- Unterschiedliche Statuswerte und Readiness-Regeln.
- UI muss viele Sonderfaelle kennen.

### 4. Persistence ist teilweise zu nah an Domain Actions

Firestore Repository, Admin Actions und Seed Scripts enthalten Mapping, Validation, Repair und Write-Logik eng beieinander. Prisma-Seite ist besser modularisiert, aber auch dort sind Week Flow und Simulation kritisch.

Konsequenz:

- Datenmodell-Aenderungen sind riskant.
- Firestore Reads/Writes sind schwer zu budgetieren.
- Repair-Pfade koennen ungewollt Fachlogik duplizieren.

## Dead Code / Legacy Code / ungenutzte Bereiche

Ohne dediziertes Dead-Code-Tool ist keine harte Loeschliste seriös. Statische Hinweise:

- Viele lokale Legacy-Online-Actions existieren weiter, werden im Firebase-MVP aber bewusst ausgeblendet.
- `online-league-placeholder.tsx` importiert zahlreiche lokale Action-Funktionen, obwohl Firebase-MVP viele davon blockiert.
- `src/lib/online/multiplayer-firebase-mvp-actions.test.ts` dokumentiert explizit versteckte Legacy-/Local-only Actions.
- Admin Detail enthaelt Development/Test-Aktionen wie Draft Reset, Auto-Draft bis Ende und GM-Kontrollen.
- Next Build zeigt viele 200-B-Routen, die vermutlich Platzhalter-/Wrapper-Routen sind.

Empfehlung:

- Nicht loeschen ohne UI-Action-Audit und Tests.
- Erst eine `legacy-local-online` Boundary definieren.
- Danach nicht genutzte UI-Einstiege entfernen oder hinter Dev Flags halten.

## Testabdeckung und Regression-Risiken

Positiv:

- 164 Testdateien.
- 912 Vitest-Tests im Standardlauf erkannt.
- Sehr breite Domain-Testabdeckung in Gameplay, Simulation, Online, Admin, Firebase Rules und Savegames.
- Firestore Rules Test laeuft erfolgreich mit Emulator.
- Lint/Typecheck/Build sind gruen.

Risiken:

- `npm run test:run` ist aktuell nicht gruen, weil ein kompletter Fantasy-Draft-Test in 15s timed out.
- E2E-Smoke ist lokal nicht lauffaehig, wenn PostgreSQL nicht gestartet ist.
- Firebase Tests brauchen Emulator-Portzugriff; in Sandbox schlagen sie ohne Escalation fehl.
- Nur 37 Komponententests bei 135 TSX-Komponenten. Viele grosse Client Components sind vermutlich eher indirekt als direkt getestet.
- Nur 1 API Route Test wurde unter `src/app` als `route.test.ts` gezaehlt, obwohl viele API Routes existieren.
- Performance-Regressionen sind nur punktuell abgedeckt; Draft-Timeout zeigt fehlende Performance-Budgets.

## Konkrete Refactoring-Empfehlungen

| Prio | Massnahme | Risiko | Nutzen | Hinweise |
| ---: | --- | --- | --- | --- |
| 1 | `online-league-service.ts` in Subdomain-Module splitten | Hoch | Sehr hoch | Erst nur Move-only Refactor mit Barrel-Exports, keine Logik aendern. |
| 2 | `online-league-placeholder.tsx` in Container + Panels + Hooks zerlegen | Mittel/Hoch | Sehr hoch | Mit Snapshot-/Interaction-Tests absichern. |
| 3 | Admin Detail in Feature-Sektionen zerlegen | Mittel | Hoch | Actions zentral lassen, UI Panels trennen. |
| 4 | Firestore Repository in Read/Write/Mapper/MembershipRepair trennen | Mittel/Hoch | Hoch | Keine Rules- oder Datenmodell-Aenderung im gleichen Schritt. |
| 5 | Seed Runtime fuer Staging/Emulator extrahieren | Niedrig/Mittel | Hoch | Geringes Risiko, reduziert viele Dopplungen. |
| 6 | Next `outputFileTracingRoot` explizit setzen | Niedrig | Mittel | Vor Deployment testen; behebt Build-Warnung. |
| 7 | Slow Tests taggen und Performance-Budget einfuehren | Niedrig | Mittel/Hoch | Default-Testlauf muss wieder gruen werden. |
| 8 | Play Library in Daten-Chunks splitten | Mittel | Mittel/Hoch | Tests fuer Vollstaendigkeit beibehalten. |
| 9 | Online/Admin Capability-Modell statt Mode-Checks | Mittel | Mittel/Hoch | Verringert UI-Sonderfaelle. |
| 10 | Confirm-/Pending-/Notice-Patterns zentralisieren | Niedrig | Mittel | Hilft Admin UX und Testbarkeit. |

## Empfohlene Reihenfolge

### Phase 1: Stabilisieren ohne Fachlogik-Risiko

1. Default-Testlauf gruen machen: Draft-Test timeout/Performance adressieren.
2. Next Workspace-Root-Warnung beheben.
3. Shared Seed Runtime extrahieren.
4. `useAdminActionRunner` / Confirm Pattern extrahieren.

### Phase 2: Client-Komplexitaet reduzieren

5. `online-league-placeholder.tsx` in Container + Panels splitten.
6. `admin-league-detail.tsx` in Tabs/Sektionen splitten.
7. `online-league-search.tsx` in Search, TeamIdentity und JoinController splitten.
8. Savegames List Hook extrahieren.

### Phase 3: Domain-Grenzen schaerfen

9. `online-league-service.ts` per Move-only in Subdomain-Module zerlegen.
10. Firestore Repository in Mapper/Reads/Writes/Membership Repair zerlegen.
11. Multiplayer Week Simulation, Local Online Simulation und Admin Week Action klar schichten.

### Phase 4: Performance und Bundle

12. Bundle Analyzer einfuehren.
13. Route-level Lazy Loading fuer Admin/Online Panels pruefen.
14. Roster/Draft/Player Tabellen mit Virtualisierung oder Pagination ausstatten.
15. Play Library Content splitten.

## No-Go-Bereiche ohne Tests

Diese Bereiche duerfen nicht ohne gezielte Tests und Review geaendert werden:

- `src/modules/seasons/application/simulation/match-engine.ts`
- `src/modules/gameplay/application/outcome-resolution-engine.ts`
- `src/modules/gameplay/application/play-selection-engine.ts`
- `src/modules/savegames/application/week-flow.service.ts`
- `src/lib/online/online-league-service.ts`
- `src/lib/online/fantasy-draft-service.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/admin/online-week-simulation.ts`
- `firestore.rules`
- alle Multiplayer Seed-/Repair-/Finalize-Skripte gegen Staging
- Admin Auth Guard und Admin API Guard

No-Go-Regeln:

- Keine gleichzeitige Refaktorierung von Domainlogik und Datenmodell.
- Keine UI-Entfernung ohne Action-Audit.
- Keine Firestore Writes ohne Emulator-Test.
- Keine Simulation-Aenderung ohne Regression-/Determinismus-Tests.
- Keine Admin-Aktionsaenderung ohne 401/403/Success/Error-Tests.

## Top 3 Massnahmen zuerst

### 1. `npm run test:run` wieder gruen machen

Warum zuerst:

- Ein Refactoring-Projekt braucht eine gruene Baseline.
- Der aktuelle Timeout zeigt reales Performance-Risiko im Fantasy-Draft.

Empfohlene Umsetzung:

- Draft-Test mit Profiling messen.
- Algorithmische Hotspots pruefen.
- Falls fachlich okay: Testtimeout explizit fuer diesen Slow-Test setzen und Slow-Test-Gruppe markieren.

Risiko: Niedrig/Mittel
Nutzen: Sehr hoch

### 2. `online-league-placeholder.tsx` zerlegen

Warum:

- Groesste Client-Komponente und direkt im kritischsten UX-Flow.
- Reduziert Re-Render-Risiken und macht Online-MVP besser testbar.

Empfohlene Zielstruktur:

- `OnlineLeaguePageContainer`
- `useOnlineLeagueState`
- `useOnlineLeagueActions`
- `OnlineLeagueOverviewPanel`
- `OnlineLeagueWeekPanel`
- `OnlineLeagueRosterPanel`
- `OnlineLeagueFeedbackPanel`
- Legacy/Firebase Capability Gate als eigener Service

Risiko: Mittel/Hoch
Nutzen: Sehr hoch

### 3. Shared Seed/Admin Runtime extrahieren

Warum:

- Viele Skripte duplizieren Safety Guards und Firestore-Zugriffsmuster.
- Geringeres Risiko als sofortiger Domain-Split.
- Verbessert Staging-Sicherheit und Wartbarkeit schnell.

Empfohlene Zielstruktur:

- `scripts/seeds/shared/firebase-seed-env.ts`
- `scripts/seeds/shared/staging-guards.ts`
- `scripts/seeds/shared/multiplayer-test-league-refs.ts`
- `scripts/seeds/shared/report-writer.ts`

Risiko: Niedrig/Mittel
Nutzen: Hoch

## Status

**Architekturstatus: Gelb mit roten Hotspots**
**Validierungsstatus: Gelb/Rot**

Begruendung:

- Gruen: Lint, Typecheck, Build, fokussierter Draft-Test mit hoeherem Timeout, Firestore Rules Test.
- Rot: Standard-`npm run test:run` ist nicht gruen; E2E-Smoke ist lokal wegen fehlender PostgreSQL-DB blockiert.
- Gelb: Die Architektur ist funktional, aber mehrere Kernmodule sind zu gross und zu stark gekoppelt.

## Schlussurteil

AFBM ist nicht in einem Zustand, in dem man "einfach Features weiter oben drauf stapeln" sollte. Die Basis funktioniert, aber die naechsten groesseren Multiplayer-, Simulation- oder Admin-Features werden mit hoher Wahrscheinlichkeit Regressions- und Performancekosten erzeugen, wenn die Hotspots nicht vorher entschlackt werden.

Die richtige Strategie ist kein Big-Bang-Refactor. Die richtige Strategie ist:

1. Testbaseline stabilisieren.
2. Grosse Client-Komponenten in Container/Panels/Hooks zerlegen.
3. Online-Domain danach per Move-only Refactor modularisieren.

Damit bleibt Funktionalitaet erhalten, waehrend Wartbarkeit und Performance schrittweise besser werden.
