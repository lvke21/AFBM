# Codebase Refactor & Performance Workpackages

Stand: 2026-05-01

Quelle: `docs/reports/codebase-refactor-performance-analysis.md`
Ziel: AFBM kleiner, klarer, performanter und wartbarer machen, ohne Funktionalitaet zu verlieren.

## Leitlinien

- Keine Big-Bang-Refactorings.
- Erst Stabilitaet, dann Entschlackung, dann Performance.
- Multiplayer, Firebase, Simulation und Admin nur mit Tests anfassen.
- Move-only-Refactors bevorzugen, bevor Logik veraendert wird.
- Keine UI- oder Feature-Entfernung ohne separaten Action-/UX-Audit.

## Empfohlene Roadmap

1. **Stabilitaet:** AP-01 bis AP-05
2. **Client-Komplexitaet reduzieren:** AP-06 bis AP-10
3. **Multiplayer/Firebase vorsichtig modularisieren:** AP-11 bis AP-15
4. **Simulation/Game Engine entlasten:** AP-16 bis AP-18
5. **Performance/Bundles messen und optimieren:** AP-19 bis AP-21

---

## AP-01 - Testbaseline wieder gruen machen

**Ziel**
`npm run test:run` muss wieder verlaesslich gruen sein.

**Betroffene Dateien**

- `src/lib/online/fantasy-draft-service.test.ts`
- optional `vitest.config.ts`
- optional `src/lib/online/fantasy-draft-service.ts`

**Konkrete Aenderungen**

- Den 16-Team-Fantasy-Draft-Test profilieren.
- Klaeren, ob der Timeout durch Testumfang oder Algorithmus entsteht.
- Falls fachlich vertretbar: Timeout nur fuer diesen Slow-Test explizit erhoehen.
- Falls Algorithmus auffaellig ist: Hotspot isolieren und gezielt optimieren.
- Slow-Test-Kommentar oder Tag einfuehren, damit klar ist, warum er laenger laeuft.

**Nicht-Ziele**

- Keine Draft-Regeln aendern.
- Keine Roster-Verteilung aendern.
- Keine Tests entfernen.

**Risiken**

- Niedrig bis mittel. Timeout-Fix ist einfach, Algorithmus-Optimierung kann Draft-Verhalten beruehren.

**Notwendige Tests**

- `npx vitest run src/lib/online/fantasy-draft-service.test.ts`
- `npm run test:run`
- `npm run lint`
- `npx tsc --noEmit`

**Akzeptanzkriterien**

- Standard-`npm run test:run` ist gruen.
- Kompletter 16-Team-Draft-Test bleibt inhaltlich gleichwertig.
- Keine Draft-Snapshot-/Roster-Regression.

**Geschaetzter Aufwand**

- S: 0,5 bis 1 Tag

**Erwarteter Nutzen**

- Sehr hoch. Gruene Baseline fuer alle weiteren Refactors.

**Prioritaet**

- P0

---

## AP-02 - Next Workspace-Root-Warnung beheben

**Ziel**
Der Next Build soll ohne Workspace-Root-Warnung laufen und keine falschen Build-Traces erzeugen.

**Betroffene Dateien**

- `next.config.ts`
- optional Repo-/Workspace-Dokumentation
- extern: `/Users/lukashanzi/package-lock.json` nur nach expliziter Freigabe pruefen/entfernen

**Konkrete Aenderungen**

- In `next.config.ts` `outputFileTracingRoot` explizit auf Projektroot setzen.
- Alternativ Ursache des zweiten Lockfiles dokumentieren.
- Build erneut ausfuehren und Warnung verifizieren.

**Nicht-Ziele**

- Keine Abhaengigkeiten updaten.
- Kein Lockfile loeschen ohne explizite Freigabe.

**Risiken**

- Niedrig. Build-Konfiguration, aber Deployment-relevant.

**Notwendige Tests**

- `npm run build`
- `npm run lint`
- `npx tsc --noEmit`

**Akzeptanzkriterien**

- `npm run build` ohne Workspace-Root-Warnung.
- First Load JS bleibt stabil.
- App Hosting Build bleibt kompatibel.

**Geschaetzter Aufwand**

- XS: 1 bis 2 Stunden

**Erwarteter Nutzen**

- Mittel. Weniger Deployment-Risiko, sauberere Traces.

**Prioritaet**

- P0

---

## AP-03 - E2E-Preflight als klaren lokalen Workflow dokumentieren

**Ziel**
E2E-Smoke soll fuer Entwickler reproduzierbar startbar sein.

**Betroffene Dateien**

- `scripts/tools/e2e-preflight.mjs`
- `README.md` oder `docs/dev/*`
- optional `docs/reports/codebase-refactor-performance-analysis.md`

**Konkrete Aenderungen**

- Keine Preflight-Logik abschwaechen.
- Kurze Dev-Doku ergaenzen: DB starten, Migration, Seed, E2E.
- Optional npm Script fuer "prepare:e2e:local" vorschlagen, aber nicht zwingend bauen.

**Nicht-Ziele**

- Keine E2E-Tests umschreiben.
- Keine DB automatisch loeschen/resetten.

**Risiken**

- Niedrig.

**Notwendige Tests**

- `npm run test:e2e` nach lokal gestarteter DB
- `npm run test:e2e:seed`

**Akzeptanzkriterien**

- Ein Entwickler kann mit dokumentierten Commands E2E lokal starten.
- Preflight-Fehler bleiben klar.

**Geschaetzter Aufwand**

- XS/S: 0,25 bis 0,5 Tag

**Erwarteter Nutzen**

- Mittel. Weniger QA-Reibung.

**Prioritaet**

- P1

---

## AP-04 - Firestore Emulator Test Workflow absichern

**Ziel**
Firebase Rules/Firestore Tests sollen klar zwischen Sandbox/CI/lokalem Emulator laufen.

**Betroffene Dateien**

- `package.json`
- `firebase.json`
- `docs/dev/*`
- optional `scripts/tools/*`

**Konkrete Aenderungen**

- Dokumentieren, dass Emulator-Tests lokale Ports benoetigen.
- Optional alternative Emulator-Ports konfigurierbar machen.
- Keine Rules aendern.

**Nicht-Ziele**

- Keine Firestore Rules fachlich veraendern.
- Keine Firebase Admin Initialisierung umbauen.

**Risiken**

- Niedrig.

**Notwendige Tests**

- `npm run test:firebase:rules`
- optional `npm run test:firebase:parity`

**Akzeptanzkriterien**

- Rules-Test laeuft lokal reproduzierbar.
- Fehlermeldung bei Portproblemen ist dokumentiert.

**Geschaetzter Aufwand**

- S: 0,5 Tag

**Erwarteter Nutzen**

- Mittel.

**Prioritaet**

- P1

---

## AP-05 - Shared Seed Runtime fuer Staging/Emulator extrahieren

**Ziel**
Multiplayer-Seed-, Repair- und Finalize-Skripte teilen dieselben Sicherheitsguards und Firestore-Helfer.

**Betroffene Dateien**

- `scripts/seeds/multiplayer-test-league-reset-and-seed.ts`
- `scripts/seeds/multiplayer-test-league-reset.ts`
- `scripts/seeds/multiplayer-auto-draft-staging.ts`
- `scripts/seeds/multiplayer-repair-memberships-staging.ts`
- `scripts/seeds/multiplayer-finalize-existing-league-staging.ts`
- `scripts/seeds/multiplayer-finalize-auto-draft-staging.ts`
- `scripts/seed-online-league.ts`
- neu: `scripts/seeds/shared/*`

**Konkrete Aenderungen**

- `staging-guards.ts` fuer `CONFIRM_STAGING_SEED`, `USE_FIRESTORE_EMULATOR`, `GOOGLE_CLOUD_PROJECT`.
- `firebase-seed-env.ts` fuer Projektmodus und Admin DB.
- `multiplayer-test-league-refs.ts` fuer stabile League-ID und Collection-Pfade.
- `report-writer.ts` fuer konsistente Report-Ausgabe.
- Erst 1 bis 2 Skripte migrieren, danach Rest in Folge-PR.

**Nicht-Ziele**

- Keine Seed-Daten aendern.
- Keine produktiven Daten loeschen.
- Keine Auto-Draft-Logik aendern.

**Risiken**

- Niedrig bis mittel. Safety-Guard-Fehler waeren kritisch, daher Tests noetig.

**Notwendige Tests**

- bestehende Seed-Unit-Tests
- `npx tsc --noEmit`
- `npm run lint`
- `npx vitest run scripts/seeds/*multiplayer*.test.ts`

**Akzeptanzkriterien**

- Migrierte Skripte haben identisches Verhalten.
- Staging-Guard blockiert Production/Unknown Projects weiterhin.
- Emulator- und Staging-Commands bleiben dokumentiert.

**Geschaetzter Aufwand**

- M: 1 bis 2 Tage

**Erwarteter Nutzen**

- Hoch. Reduziert Staging-Risiko und Dopplungen.

**Prioritaet**

- P1

---

## AP-06 - Admin Action Runner zentralisieren

**Ziel**
Admin-Pending-, Notice-, Bearer-Token- und Error-Mapping-Logik nicht in mehreren Komponenten wiederholen.

**Betroffene Dateien**

- `src/components/admin/admin-control-center.tsx`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/admin/admin-league-manager.tsx`
- `src/lib/admin/admin-api-client.ts`
- neu: `src/components/admin/use-admin-action-runner.ts`

**Konkrete Aenderungen**

- Hook `useAdminActionRunner` erstellen.
- Einheitliches Result/Error-Handling.
- Bestehende UI-Texte beibehalten.
- Zunaechst nur in `admin-control-center.tsx` verwenden; Detailseite spaeter.

**Nicht-Ziele**

- Keine Admin API aendern.
- Keine Berechtigungslogik aendern.
- Keine Admin-Actions entfernen.

**Risiken**

- Niedrig bis mittel.

**Notwendige Tests**

- Admin API Route Tests
- relevante Admin-Komponententests, falls vorhanden
- `npm run lint`
- `npx tsc --noEmit`

**Akzeptanzkriterien**

- Admin-Actions verhalten sich sichtbar identisch.
- Pending und Fehler bleiben korrekt.
- Kein Admin-Passwort-Flow kehrt zurueck.

**Geschaetzter Aufwand**

- S/M: 1 Tag

**Erwarteter Nutzen**

- Mittel/Hoch.

**Prioritaet**

- P1

---

## AP-07 - Online League Dashboard: State Hook extrahieren

**Ziel**
`online-league-placeholder.tsx` von Fetch-/Subscription-/Load-State entlasten.

**Betroffene Dateien**

- `src/components/online/online-league-placeholder.tsx`
- neu: `src/components/online/use-online-league-state.ts`
- optional Test: `src/components/online/use-online-league-state.test.ts`

**Konkrete Aenderungen**

- League Loading, currentUser, subscribe/unsubscribe, retry, search-again in Hook verschieben.
- UI-Komponente bekommt fertigen State und Callbacks.
- Keine Action-Handler fuer Training/Draft/Contracts in diesem AP bewegen.

**Nicht-Ziele**

- Keine Online-Fachlogik aendern.
- Keine Repository-Methoden aendern.
- Keine UI umgestalten.

**Risiken**

- Mittel. Online/Firebase Flow ist empfindlich.

**Notwendige Tests**

- `src/lib/online/repositories/online-league-repository.test.ts`
- `src/components/online/online-league-detail-model.test.ts`
- `src/components/online/online-league-dashboard-panels.test.tsx`
- `npm run lint`
- `npx tsc --noEmit`
- manueller Smoke: Online Hub -> Liga laden -> Reload

**Akzeptanzkriterien**

- Datei `online-league-placeholder.tsx` wird merklich kleiner.
- Reload und Permission-Recovery funktionieren unveraendert.
- Keine neuen Firestore Reads durch doppelte Subscriptions.

**Geschaetzter Aufwand**

- M: 1 bis 2 Tage

**Erwarteter Nutzen**

- Hoch.

**Prioritaet**

- P1

---

## AP-08 - Online League Dashboard: Action Hooks extrahieren

**Ziel**
Action-Handler fuer Ready, Training, Contracts, Trades, Coaching, Draft und Feedback aus der grossen Online-Komponente loesen.

**Betroffene Dateien**

- `src/components/online/online-league-placeholder.tsx`
- neu: `src/components/online/use-online-league-actions.ts`
- optional: `src/components/online/online-league-action-feedback.tsx`

**Konkrete Aenderungen**

- Action-Handler in Hook gruppieren.
- Feedback-State pro Action-Familie kapseln.
- Firebase-MVP-Legacy-Blocker als Capability pruefen.
- Erst Readiness/Ready Action extrahieren, dann weitere Familien in Folge-Commits.

**Nicht-Ziele**

- Keine Fachlogik veraendern.
- Keine lokalen Legacy-Actions entfernen.
- Kein neues UI.

**Risiken**

- Mittel/Hoch, wegen vieler Actions.

**Notwendige Tests**

- Online Service Tests
- Online Dashboard Panel Tests
- Multiplayer Smoke, falls verfuegbar
- `npm run lint`
- `npx tsc --noEmit`

**Akzeptanzkriterien**

- Sichtbares Verhalten unveraendert.
- Keine Action verliert Feedback.
- Firebase-MVP blockiert weiterhin unsynchronisierte lokale Writes.

**Geschaetzter Aufwand**

- M/L: 2 bis 3 Tage

**Erwarteter Nutzen**

- Sehr hoch.

**Prioritaet**

- P2

---

## AP-09 - Admin League Detail in Sektionen zerlegen

**Ziel**
`admin-league-detail.tsx` kleiner und testbarer machen.

**Betroffene Dateien**

- `src/components/admin/admin-league-detail.tsx`
- neu:
  - `admin-league-overview-section.tsx`
  - `admin-week-section.tsx`
  - `admin-draft-section.tsx`
  - `admin-gm-section.tsx`
  - `admin-debug-section.tsx`

**Konkrete Aenderungen**

- Nur UI-Sektionen extrahieren.
- Bestehende Action-Handler zunaechst in Parent belassen.
- Props typisieren.
- Keine Layout-Neuerfindung.

**Nicht-Ziele**

- Keine Admin Actions aendern.
- Keine API aendern.
- Keine destruktiven Aktionen entfernen.

**Risiken**

- Mittel.

**Notwendige Tests**

- `src/app/api/admin/online/actions/route.test.ts`
- `src/lib/admin/online-admin-actions.test.ts`
- `npm run lint`
- `npx tsc --noEmit`
- manueller Smoke: `/admin/league/[leagueId]`

**Akzeptanzkriterien**

- Detailseite sieht gleich aus.
- Datei `admin-league-detail.tsx` deutlich kleiner.
- Alle Buttons bleiben erreichbar und gegated.

**Geschaetzter Aufwand**

- M: 1 bis 2 Tage

**Erwarteter Nutzen**

- Hoch.

**Prioritaet**

- P2

---

## AP-10 - Savegames List Hook extrahieren

**Ziel**
Savegames UI von Client Fetch, Delete, Details und LocalStorage entkoppeln.

**Betroffene Dateien**

- `src/components/savegames/savegames-list-section.tsx`
- neu: `src/components/savegames/use-savegames-list.ts`
- optional: `savegame-card.tsx`, `savegame-details-panel.tsx`

**Konkrete Aenderungen**

- Fetch-/Delete-/Details-State in Hook.
- Cards und Details als kleine Komponenten.
- Bestehendes Verhalten beibehalten.

**Nicht-Ziele**

- Keine Savegame API aendern.
- Keine Loeschregeln aendern.
- Kein neues Resume-Feature.

**Risiken**

- Niedrig/Mittel.

**Notwendige Tests**

- Savegames API Tests, falls vorhanden
- `npm run lint`
- `npx tsc --noEmit`
- manueller Smoke: Savegames laden, Details, Fortsetzen, Loeschen disabled/confirm

**Akzeptanzkriterien**

- UI unveraendert.
- `savegames-list-section.tsx` kleiner.
- Fehler-/Loading-/Empty-State bleibt vorhanden.

**Geschaetzter Aufwand**

- S/M: 1 Tag

**Erwarteter Nutzen**

- Mittel.

**Prioritaet**

- P2

---

## AP-11 - Online Capability Model einfuehren

**Ziel**
UI soll nicht ueberall direkt `repository.mode === "firebase"` pruefen.

**Betroffene Dateien**

- `src/lib/online/online-league-repository-provider.ts`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-search.tsx`
- `src/lib/online/multiplayer-firebase-mvp-actions.ts`
- neu: `src/lib/online/online-capabilities.ts`

**Konkrete Aenderungen**

- Capability-Objekt definieren:
  - `canUseLocalLegacyActions`
  - `canWriteTrainingPlan`
  - `canClaimVacantTeam`
  - `canUseFirebaseMemberships`
  - `canRunSyncedLeagueActions`
- Bestehende Mode Checks schrittweise ersetzen.

**Nicht-Ziele**

- Keine Aktionen freischalten.
- Keine Firebase Rules aendern.
- Keine UI gross umbauen.

**Risiken**

- Mittel.

**Notwendige Tests**

- `src/lib/online/multiplayer-firebase-mvp-actions.test.ts`
- Online Service Tests
- Online UI Smoke
- `npm run lint`
- `npx tsc --noEmit`

**Akzeptanzkriterien**

- Firebase-MVP zeigt weiterhin nur sichere Aktionen.
- Local Legacy bleibt lokal nutzbar.
- Weniger direkte `repository.mode` Checks in UI.

**Geschaetzter Aufwand**

- M: 1 bis 2 Tage

**Erwarteter Nutzen**

- Hoch.

**Prioritaet**

- P2

---

## AP-12 - Membership Consistency Service extrahieren

**Ziel**
Membership-, Mirror- und Team-Zuordnungslogik zentralisieren.

**Betroffene Dateien**

- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `scripts/seeds/multiplayer-repair-memberships-staging.ts`
- `scripts/seeds/multiplayer-finalize-existing-league-staging.ts`
- neu: `src/lib/online/membership-consistency.ts`

**Konkrete Aenderungen**

- Pure Funktionen extrahieren:
  - Membership validieren
  - Mirror-Fallback bewerten
  - Team-Assignment-Konsistenz pruefen
  - Repair-Plan erzeugen
- Repository verwendet diese Funktionen.
- Skripte koennen spaeter denselben Plan nutzen.

**Nicht-Ziele**

- Keine Firestore Writes im neuen Pure-Service.
- Keine Manager-Zuordnung veraendern.
- Keine Datenmigration.

**Risiken**

- Mittel/Hoch, weil Login/Rejoin betroffen ist.

**Notwendige Tests**

- `src/lib/online/repositories/online-league-repository.test.ts`
- neue Unit-Tests fuer Consistency Service
- Membership Repair Script Tests
- Firebase Rules Tests optional

**Akzeptanzkriterien**

- Bestehende Rejoin-/Membership-Tests bleiben gruen.
- Pure Service deckt fehlenden Mirror, fehlendes Team, falsche User-ID ab.
- Repository-Code wird kleiner.

**Geschaetzter Aufwand**

- M: 2 Tage

**Erwarteter Nutzen**

- Hoch.

**Prioritaet**

- P2

---

## AP-13 - Firebase Repository Mapper auslagern

**Ziel**
Firestore-Dokument-Mapping von Read/Write-Operationen trennen.

**Betroffene Dateien**

- `src/lib/online/repositories/firebase-online-league-repository.ts`
- neu:
  - `firebase-online-league-mappers.ts`
  - `firebase-online-league-paths.ts`

**Konkrete Aenderungen**

- Pfad-/Ref-Builder extrahieren.
- Doc -> Domain Mapper extrahieren.
- Domain -> Firestore Payload Mapper extrahieren.
- Keine Query-/Transaction-Logik veraendern.

**Nicht-Ziele**

- Keine Collection-Struktur aendern.
- Keine Firestore Rules aendern.
- Keine Join-/Repair-Logik aendern.

**Risiken**

- Mittel.

**Notwendige Tests**

- Repository Tests
- Firebase Rules Tests
- `npm run lint`
- `npx tsc --noEmit`

**Akzeptanzkriterien**

- Repository verhaelt sich identisch.
- Mapper sind separat unit-testbar.
- Firestore Pfade sind zentral sichtbar.

**Geschaetzter Aufwand**

- M: 1 bis 2 Tage

**Erwarteter Nutzen**

- Hoch.

**Prioritaet**

- P3

---

## AP-14 - Online League Service Move-only Split: Draft

**Ziel**
Ersten sicheren Split aus `online-league-service.ts` durchfuehren, ohne Logik zu aendern.

**Betroffene Dateien**

- `src/lib/online/online-league-service.ts`
- neu: `src/lib/online/online-draft-service.ts`
- betroffene Tests:
  - `src/lib/online/fantasy-draft.test.ts`
  - `src/lib/online/fantasy-draft-service.test.ts`
  - `src/lib/online/multiplayer-draft-logic.test.ts`

**Konkrete Aenderungen**

- Draft-nahe Funktionen move-only auslagern:
  - Fantasy Draft State
  - Pick Logic
  - Available Players
  - Roster Build Helpers
- Re-export aus `online-league-service.ts` fuer Kompatibilitaet.
- Keine Import-Migration im ersten Schritt erzwingen.

**Nicht-Ziele**

- Keine Draftlogik aendern.
- Keine Performance-Optimierung im gleichen AP.
- Keine UI-Aenderung.

**Risiken**

- Mittel/Hoch, aber durch Move-only begrenzbar.

**Notwendige Tests**

- Draft Tests
- Online League Service Tests
- `npm run test:run`
- `npm run lint`
- `npx tsc --noEmit`

**Akzeptanzkriterien**

- Alle Draft-Tests gruen.
- Public Imports bleiben kompatibel.
- `online-league-service.ts` schrumpft messbar.

**Geschaetzter Aufwand**

- M: 1 bis 2 Tage

**Erwarteter Nutzen**

- Hoch.

**Prioritaet**

- P3

---

## AP-15 - Online League Service Move-only Split: Contracts/Finance

**Ziel**
Contracts, Salary Cap, Free Agency, Stadium/Fans/Finance aus dem Online-Monolithen loesen.

**Betroffene Dateien**

- `src/lib/online/online-league-service.ts`
- neu:
  - `online-contracts-service.ts`
  - `online-finance-service.ts`
  - `online-free-agency-service.ts`

**Konkrete Aenderungen**

- Funktionen move-only auslagern.
- Re-exports beibehalten.
- Tests unveraendert lassen.

**Nicht-Ziele**

- Keine Salary-Cap-Regeln aendern.
- Keine Fan-/Finance-Berechnung aendern.
- Keine UI-Aenderung.

**Risiken**

- Mittel.

**Notwendige Tests**

- `src/lib/online/contracts-salary-cap.test.ts`
- `src/lib/online/stadium-fans-finance.test.ts`
- `src/lib/online/online-league-service.test.ts`
- `npm run test:run`

**Akzeptanzkriterien**

- Tests gruen.
- Monolith schrumpft weiter.
- Re-export-Kompatibilitaet erhalten.

**Geschaetzter Aufwand**

- M: 1 bis 2 Tage

**Erwarteter Nutzen**

- Hoch.

**Prioritaet**

- P3

---

## AP-16 - Match Engine Boundary Map erstellen

**Ziel**
Vor Engine-Refactors eine Karte der Verantwortlichkeiten und sichere Schnittpunkte erstellen.

**Betroffene Dateien**

- `src/modules/seasons/application/simulation/match-engine.ts`
- `src/modules/gameplay/application/outcome-resolution-engine.ts`
- `src/modules/gameplay/application/play-selection-engine.ts`
- Dokumentation: `docs/reports/match-engine-refactor-boundary-map.md`

**Konkrete Aenderungen**

- Noch keine Codeaenderung.
- Funktionen und Datenfluesse kartieren:
  - Clock
  - Drive State
  - Play Call
  - Outcome
  - Stats
  - Injuries/Fatigue
  - Persistence Boundary
- Kleine Move-only-Kandidaten markieren.

**Nicht-Ziele**

- Keine Engine-Logik aendern.
- Keine Balancing-Parameter aendern.

**Risiken**

- Niedrig.

**Notwendige Tests**

- Keine neuen Tests zwingend.
- Bericht pruefen.

**Akzeptanzkriterien**

- Klare No-Go- und Safe-Move-Zonen dokumentiert.
- Refactor-Reihenfolge fuer Engine definiert.

**Geschaetzter Aufwand**

- S: 0,5 bis 1 Tag

**Erwarteter Nutzen**

- Mittel/Hoch.

**Prioritaet**

- P3

---

## AP-17 - Play Library Content splitten

**Ziel**
`play-library.ts` in kleinere Content-Module aufteilen, ohne Play-Definitionen zu aendern.

**Betroffene Dateien**

- `src/modules/gameplay/infrastructure/play-library.ts`
- neu:
  - `play-library/offense.ts`
  - `play-library/defense.ts`
  - `play-library/special-teams.ts`
  - optional `play-library/shared-builders.ts`

**Konkrete Aenderungen**

- Data-only Split nach Kategorien.
- `PLAY_LIBRARY_CATALOG` bleibt als aggregierter Export erhalten.
- Validierungstests beibehalten.

**Nicht-Ziele**

- Keine Play-Inhalte aendern.
- Keine Engine-Anbindung aendern.
- Keine Lazy-Loading-Optimierung in diesem AP.

**Risiken**

- Mittel. Content-Vollstaendigkeit muss exakt bleiben.

**Notwendige Tests**

- `src/modules/gameplay/application/play-library-service.test.ts`
- `src/modules/gameplay/application/pre-snap-legality-engine.test.ts`
- `src/modules/gameplay/application/play-selection-engine.test.ts`
- `npm run test:run`

**Akzeptanzkriterien**

- Play-Anzahl und IDs unveraendert.
- Tests fuer Placeholder/Completeness bleiben gruen.
- Hauptdatei deutlich kleiner.

**Geschaetzter Aufwand**

- M: 1 bis 2 Tage

**Erwarteter Nutzen**

- Mittel/Hoch.

**Prioritaet**

- P3

---

## AP-18 - Week Flow Boundary fuer Singleplayer/Multiplayer definieren

**Ziel**
Doppelte Week-Simulation und divergierende Statuswerte vermeiden.

**Betroffene Dateien**

- `src/modules/savegames/application/week-flow.service.ts`
- `src/lib/online/online-league-week-simulation.ts`
- `src/lib/admin/online-week-simulation.ts`
- `src/lib/admin/online-admin-actions.ts`
- Dokumentation: `docs/reports/week-flow-boundary-report.md`

**Konkrete Aenderungen**

- Zuerst Dokumentation der Statuswerte und Transaktionsgrenzen.
- Danach kleine pure Helper fuer Status-Normalisierung vorschlagen.
- Keine direkte Simulation-Aenderung im ersten AP.

**Nicht-Ziele**

- Keine Week-Logik umbauen.
- Keine Firestore Writes veraendern.
- Keine Simulation Engine aendern.

**Risiken**

- Niedrig fuer Analyse, hoch fuer spaetere Umsetzung.

**Notwendige Tests**

- keine fuer reine Analyse
- spaeter: Week Flow Tests, Online Week Simulation Tests, Admin Action Tests

**Akzeptanzkriterien**

- Klare Grenzen: Singleplayer, Multiplayer, Admin.
- Liste inkompatibler Statuswerte und Korrekturplan.

**Geschaetzter Aufwand**

- S: 1 Tag

**Erwarteter Nutzen**

- Hoch.

**Prioritaet**

- P3

---

## AP-19 - Bundle Analyzer und Performance Budget einfuehren

**Ziel**
Bundle-Groessen sichtbar und regressionsfaehig machen.

**Betroffene Dateien**

- `package.json`
- `next.config.ts`
- optional neue Dev Dependency fuer Bundle Analyzer
- `docs/reports/*`

**Konkrete Aenderungen**

- Bundle-Analyzer Script einfuehren.
- Baseline fuer First Load JS dokumentieren.
- Warnschwellen definieren:
  - Online League Detail
  - Admin
  - Savegames

**Nicht-Ziele**

- Keine Optimierungen im gleichen AP.
- Keine Dependencies ohne Review, falls Bundle Analyzer neu installiert werden muss.

**Risiken**

- Niedrig/Mittel.

**Notwendige Tests**

- `npm run build`
- neues Analyse-Script

**Akzeptanzkriterien**

- Bundle-Bericht reproduzierbar.
- Baseline-Werte dokumentiert.
- Keine Build-Verschlechterung.

**Geschaetzter Aufwand**

- S: 0,5 bis 1 Tag

**Erwarteter Nutzen**

- Mittel/Hoch.

**Prioritaet**

- P2

---

## AP-20 - Tabellen-Performance fuer Roster/Draft pruefen

**Ziel**
Grosse Roster-, Draft- und Player-Listen auf Renderkosten pruefen und gezielt optimieren.

**Betroffene Dateien**

- `src/components/team/roster-table.tsx`
- `src/components/team/depth-chart-view.tsx`
- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/free-agency/free-agent-board.tsx`

**Konkrete Aenderungen**

- Erst messen: Renderzeiten und Listenlaengen.
- Filter/Sortierlogik in pure View Models auslagern.
- Memoisierung dort einfuehren, wo Inputs stabil sind.
- Virtualisierung nur bei nachgewiesenem Bedarf.

**Nicht-Ziele**

- Keine Tabellen neu designen.
- Keine Player-/Roster-Daten aendern.

**Risiken**

- Mittel.

**Notwendige Tests**

- bestehende Team/Roster/Draft Tests
- manuelle Smoke-Tests auf Roster und Draft
- `npm run build`

**Akzeptanzkriterien**

- Keine UI-Regression.
- Nachweisbare Reduktion teurer Renderberechnungen.
- Keine schlechtere Bundle-Groesse durch unnoetige Libraries.

**Geschaetzter Aufwand**

- M: 1 bis 2 Tage

**Erwarteter Nutzen**

- Mittel.

**Prioritaet**

- P4

---

## AP-21 - Firestore Read/Subscription Budget dokumentieren

**Ziel**
Unnoetige Reads/Writes und doppelte Subscriptions in Online/Admin sichtbar machen.

**Betroffene Dateien**

- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/components/online/online-league-app-shell.tsx`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/admin/*`
- Dokumentation: `docs/reports/firestore-read-write-budget.md`

**Konkrete Aenderungen**

- Instrumentierung oder manuelle Zaehlliste fuer Hauptflows:
  - Online Hub Search
  - Join/Rejoin
  - Online League Reload
  - Admin League List
  - Admin Week Simulation
- Doppelte Subscriptions suchen.
- Budget pro Flow definieren.

**Nicht-Ziele**

- Keine Repository-Optimierung im ersten Schritt.
- Keine Firestore Rules aendern.

**Risiken**

- Niedrig.

**Notwendige Tests**

- Online Repository Tests
- Firebase Rules Tests optional
- manuelle Messung mit Emulator

**Akzeptanzkriterien**

- Budget-Dokument vorhanden.
- Top Read-Amplification-Kandidaten benannt.
- Folge-APs ableitbar.

**Geschaetzter Aufwand**

- S/M: 1 Tag

**Erwarteter Nutzen**

- Hoch fuer Firebase-Kosten und Performance.

**Prioritaet**

- P2

---

## Priorisierte Umsetzung

| Reihenfolge | AP | Grund |
| ---: | --- | --- |
| 1 | AP-01 | Gruene Testbaseline ist Voraussetzung fuer Refactors. |
| 2 | AP-02 | Build-Warnung ist klein, deploymentrelevant und schnell loesbar. |
| 3 | AP-05 | Reduziert Staging-/Firebase-Risiko ohne Gameplay-Logik. |
| 4 | AP-06 | Kleiner Einstieg in Admin-Entschlackung. |
| 5 | AP-07 | Groesster Online-Client-Hotspot, aber noch begrenzter Scope. |
| 6 | AP-10 | Niedrigrisiko-Client-Entkopplung. |
| 7 | AP-11 | Bereitet Online-Entschlackung sicher vor. |
| 8 | AP-12 | Macht Rejoin/Membership robuster und wiederverwendbar. |
| 9 | AP-09 | Admin Detailseite wird wartbarer. |
| 10 | AP-19 | Bundle-Messung vor Performance-Tuning. |
| 11 | AP-21 | Firestore-Kosten sichtbar machen. |
| 12 | AP-14 | Erster Online-Domain-Split, nachdem Baseline stabil ist. |
| 13 | AP-15 | Zweiter Online-Domain-Split. |
| 14 | AP-13 | Firebase Repository weiter entkoppeln. |
| 15 | AP-16 | Engine-Refactor vorbereiten, ohne Risiko. |
| 16 | AP-18 | Week-Boundary dokumentieren. |
| 17 | AP-17 | Play Library entlasten. |
| 18 | AP-20 | Tabellen gezielt nach Messung optimieren. |
| 19 | AP-08 | Viele Online-Actions extrahieren, erst nach Hook/Capabilities. |
| 20 | AP-03 | Kann parallel laufen, aber blockiert Refactor nicht. |
| 21 | AP-04 | Kann parallel laufen, besonders fuer Firebase-Teams wichtig. |

## No-Go fuer alle Arbeitspakete

- Keine Funktionalitaet entfernen.
- Keine produktiven Daten oder Seeds loeschen.
- Keine Firestore Rules ohne Rules-Test.
- Keine Simulation Engine ohne Regression-/Determinismus-Tests.
- Keine Multiplayer-Membership- oder Team-Zuordnung ohne Repository- und Repair-Tests.
- Keine Admin-Sicherheitslogik abschwaechen.
- Keine UI-Actions verstecken oder loeschen, ohne separaten UX-/Action-Audit.

## Zusammenfassung

Die Refactoring-Arbeit sollte mit kleinen, beweisbaren Schritten starten. Der beste erste Sprint ist:

1. AP-01 Testbaseline reparieren.
2. AP-02 Build-Warnung beheben.
3. AP-05 Shared Seed Runtime extrahieren.
4. AP-07 Online League State Hook extrahieren.

Damit wird das Projekt stabiler, ohne die empfindlichsten Fachsysteme sofort umzubauen.
