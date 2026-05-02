# Staging Release Readiness Report

Datum: 2026-05-02
Branch: `main`
Basis-Commit vor Release-Commit: `a2e37b7`

## Gesamtentscheidung

Status: **Staging-No-Go jetzt**

Begruendung:
- Alle lokalen technischen Gates sind gruen oder mit dokumentiertem Skip abgeschlossen.
- Der Arbeitsbaum ist aber weiterhin dirty und enthaelt 48 modifizierte Dateien sowie viele ungetrackte Release-Dateien.
- Ohne Release-Commit ist der Stand nicht reproduzierbar deploybar.
- Der Admin-Week-Simulation-E2E ist weiterhin uebersprungen, solange `E2E_FIREBASE_ADMIN_ID_TOKEN` fehlt.

Empfehlung: **Release-Commit erstellen, danach Staging-Go-Kandidat.**

## Git-Status Vorher

Vor der Validierung:
- 48 modifizierte getrackte Dateien.
- 45 ungetrackte Dateien.
- Keine ungetrackten temporaeren Build-Artefakte im Git-Status.

Diff-Umfang der getrackten Dateien:
- 48 Dateien geaendert.
- 2531 Zeilen hinzugefuegt.
- 1222 Zeilen entfernt.

## Git-Status Nachher

Nach Validierung:
- Der getrackte Dirty-Stand ist unveraendert.
- Es wurde nichts geloescht.
- Dieser Report wurde als neue Release-Dokumentation hinzugefuegt.

Temporare Artefakte:
- `.next/` ist durch `.gitignore` ignoriert.
- `test-results/` ist durch `.gitignore` ignoriert.
- Beide Ordner wurden nicht geloescht, weil sie nicht in den Release-Commit fallen und durch Build/E2E erneut entstehen.

## Dateiklassifizierung

### Gehoeren in den Release

Diese Dateien sind Teil der aktuellen Refactor-, Stabilitaets-, UX-, Admin-, Multiplayer- und Testbasis und sollten gemeinsam reviewed und committed werden.

#### E2E, Build und Test Tooling

| Datei | Entscheidung | Grund |
| --- | --- | --- |
| `e2e/multiplayer-smoke.spec.ts` | Release | Stabilisiert Multiplayer-E2E und dokumentiert Admin-Token-Skip |
| `e2e/navigation.spec.ts` | Release | Stabilisiert Navigationstest |
| `e2e/smoke.spec.ts` | Release | Stabilisiert Smoke-Test |
| `package.json` | Release | E2E-Scripts setzen Prisma-Testbackend explizit |
| `playwright.config.ts` | Release | E2E-Konfiguration fuer stabile lokale Runs |
| `scripts/seeds/e2e-seed.ts` | Release | Idempotenter E2E-Seed |
| `next.config.ts` | Release | Build-/Next-Konfiguration Teil des validierten Standes |

#### Firebase, Admin und Week-Simulation

| Datei | Entscheidung | Grund |
| --- | --- | --- |
| `firestore.rules` | Release | Security Rules passend zu Admin/Online-Flows |
| `src/lib/firebase/firestore.rules.test.ts` | Release | Rules-Testabdeckung |
| `src/lib/admin/online-admin-actions.ts` | Release | Admin-Actions fuer Online-Ligen |
| `src/lib/admin/online-week-simulation.ts` | Release | Week-Simulation Admin-Service |
| `src/components/admin/admin-control-center.tsx` | Release | Admin Hub Funktionalitaet |
| `src/components/admin/admin-league-detail.tsx` | Release | Ligadetail/Admin-Actions |
| `src/components/admin/admin-league-manager.tsx` | Release | Firebase-Ligen Verwaltung |
| `src/components/admin/admin-league-action-config.ts` | Release | Nicht-destruktive Admin-Action-Konfiguration |
| `src/components/admin/admin-league-detail-display.tsx` | Release | Extrahierte Display-Komponenten |

#### Savegames, Auth und Einstieg

| Datei | Entscheidung | Grund |
| --- | --- | --- |
| `src/app/api/savegames/route.ts` | Release | Savegame API Anpassungen |
| `src/app/api/savegames/[savegameId]/route.ts` | Release | Savegame Detail API Anpassungen |
| `src/app/app/savegames/page.tsx` | Release | Zentraler Einstieg/Savegames UX |
| `src/app/app/savegames/[savegameId]/not-found.tsx` | Release | Sauberer Missing-Savegame-Zustand |
| `src/components/auth/firebase-email-auth-panel.tsx` | Release | Auth UI Status |
| `src/components/auth/online-auth-gate.tsx` | Release | Online/Auth Gate |
| `src/components/auth/savegames-auth-state-status.tsx` | Release | Savegames Auth State |
| `src/components/auth/use-firebase-admin-access.ts` | Release | Admin-Zugriff Helper |
| `src/components/savegames/savegames-admin-link.tsx` | Release | Adminmodus Einstieg |
| `src/components/savegames/savegames-list-section.tsx` | Release | Funktionale Savegames-Liste |
| `src/components/savegames/savegames-online-link.tsx` | Release | Online Einstieg |
| `src/components/ui/create-savegame-form.tsx` | Release | Offline-Spielstand Formularvalidierung |
| `src/modules/savegames/application/savegame-command.service.ts` | Release | Savegame Commands |
| `src/modules/savegames/infrastructure/savegame.repository.ts` | Release | Savegame Persistenz |
| `src/server/repositories/saveGameRepository.firestore.ts` | Release | Firestore Savegame Repository |

#### Navigation und GUI-Sicherheit

| Datei | Entscheidung | Grund |
| --- | --- | --- |
| `src/components/layout/navigation-model.ts` | Release | Kontextabhaengige Navigation |
| `src/components/layout/navigation-model.test.ts` | Release | Navigationstests |
| `src/components/layout/sidebar-navigation.tsx` | Release | Sidebar Guards und States |

#### Online, Multiplayer und Draft

| Datei | Entscheidung | Grund |
| --- | --- | --- |
| `src/components/online/online-fantasy-draft-room.tsx` | Release | Draft Room Memoization/Performance |
| `src/components/online/online-fantasy-draft-room-model.ts` | Release | Extrahierte Draft-Ableitungen |
| `src/components/online/online-fantasy-draft-room-model.test.ts` | Release | Tests fuer Draft-Ableitungen |
| `src/components/online/online-firebase-mvp-action-guard.ts` | Release | Online MVP Action Guard |
| `src/components/online/online-league-app-shell.tsx` | Release | Online League Shell |
| `src/components/online/online-league-dashboard-panels.tsx` | Release | Dashboard Panels |
| `src/components/online/online-league-detail-model.ts` | Release | Online Detail View Model |
| `src/components/online/online-league-draft-page.tsx` | Release | Draft Route ohne Auto-Redirect Verhalten |
| `src/components/online/online-league-overview-sections.tsx` | Release | Overview Sections |
| `src/components/online/online-league-placeholder.tsx` | Release | Online Hub/League Placeholder nach Handler-Extraktion |
| `src/components/online/online-league-route-state.tsx` | Release | Zentraler Online Route State |
| `src/components/online/online-league-route-state-model.ts` | Release | Route-State Modell/Guards |
| `src/components/online/online-league-route-state-model.test.ts` | Release | Tests fuer Route-State Modell |
| `src/components/online/online-league-search.tsx` | Release | Liga suchen/joinen |
| `src/components/online/online-user-status.tsx` | Release | Online User Status |
| `src/components/online/use-online-league-placeholder-actions.ts` | Release | Extrahierte Online Placeholder Handler |
| `src/lib/online/auth/online-auth.ts` | Release | Online Auth Utilities |
| `src/lib/online/auth/online-auth.test.ts` | Release | Online Auth Tests |
| `src/lib/online/fantasy-draft-service.test.ts` | Release | Draft Service Testanpassung |
| `src/lib/online/multiplayer-draft-logic.ts` | Release | Draft Logik Stabilisierung |
| `src/lib/online/online-league-contract-queries.ts` | Release | Extrahierte Contract Read Queries |
| `src/lib/online/online-league-metrics.ts` | Release | Extrahierte Metrics/Read Helper |
| `src/lib/online/online-league-service.ts` | Release | Service-Entlastung und kompatible API |
| `src/lib/online/online-league-types.ts` | Release | Online League Types |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | Release | Firebase Repository Stabilisierung |
| `src/lib/online/repositories/online-league-repository.test.ts` | Release | Repository Tests |
| `src/lib/online/sync-guards.ts` | Release | Sync Guards |
| `src/lib/online/types.ts` | Release | Online Types |

#### Dokumentation und Reports

Alle ungetrackten Dateien unter `docs/reports/*.md` gehoeren in den Release, weil sie die AP-Serie, UX-/QA-Audits, Refactor-Entscheidungen und Rollout-Bewertung nachvollziehbar machen.

Wichtige neue Reports:
- `docs/reports/final-refactor-evaluation.md`
- `docs/reports/refactor-regression-report.md`
- `docs/reports/gui-functionality-final-check.md`
- `docs/reports/controlled-production-rollout-report.md`
- `docs/reports/staging-release-readiness-report.md`

### Gehoeren nicht in den Release

Keine eindeutig nicht releaserelevanten Git-Dateien gefunden.

Hinweis: Vor dem Commit sollte trotzdem ein menschlicher Review der grossen UI-Dateien erfolgen, insbesondere:
- `src/components/admin/admin-control-center.tsx`
- `src/components/savegames/savegames-list-section.tsx`
- `src/components/online/online-fantasy-draft-room.tsx`
- `src/lib/online/repositories/firebase-online-league-repository.ts`

### Temporaer / Artefakte

| Pfad | Entscheidung | Grund |
| --- | --- | --- |
| `.next/` | Ignoriert, nicht committen | Next.js Build-Artefakt |
| `test-results/` | Ignoriert, nicht committen | Playwright Ergebnis-Artefakte |
| `playwright-report/` | Ignoriert, nicht committen | Playwright HTML Report, falls erzeugt |
| `firestore-debug.log` | Ignoriert ueber `*.log`, nicht committen | Firestore Emulator Log |

Es wurden keine Artefakte geloescht.

## Ausgefuehrte Commands

| Command | Ergebnis |
| --- | --- |
| `git status --short --untracked-files=all` | Dirty Worktree bestaetigt |
| `git diff --stat` | 48 getrackte Dateien, 2531 Insertions, 1222 Deletions |
| `git diff --name-status` | Modifizierte getrackte Dateien aufgenommen |
| `git ls-files --others --exclude-standard` | Ungetrackte Release-Dateien aufgenommen |
| `git diff --check` | Gruen, keine Whitespace-Fehler |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run build` | Gruen |
| `npm run test:firebase:parity` | Gruen, 1 Testdatei / 3 Tests bestanden |
| `npm run test:e2e` | Gruen, 1 Test bestanden |
| `npm run test:e2e:navigation` | Gruen, 1 Test bestanden |
| `npm run test:e2e:multiplayer` | Gelb/Gruen, 3 bestanden / 1 uebersprungen |

## Testergebnisse

### Gruen

- TypeScript kompiliert.
- ESLint bestanden.
- Production Build erfolgreich.
- Firestore-Parity gegen Emulator bestanden.
- Smoke-E2E bestanden.
- Navigation-E2E bestanden.
- Multiplayer Join/Ready/Confirm-Dialog E2E bestanden.
- E2E-Seed lief idempotent mit stabilen IDs.

### Gelb

- `npm run test:e2e:multiplayer` ueberspringt den Admin-Week-Simulationstest, wenn `E2E_FIREBASE_ADMIN_ID_TOKEN` fehlt.
- Dieser Skip blockiert nicht den lokalen Exit-Code, muss aber vor Staging-Freigabe mit echtem Admin-Token oder manuellem Staging-Smoke abgedeckt werden.

## Release-Commit-Empfehlung

Empfohlener naechster Schritt:

1. Alle oben als Release klassifizierten Dateien reviewen.
2. Keine temporaeren Artefakte committen.
3. Einen einzelnen reproduzierbaren Staging-Release-Commit erstellen.
4. Suggested commit message:

```text
Prepare refactored multiplayer staging release
```

Vor dem Commit erneut pruefen:

```bash
git status --short --untracked-files=all
git diff --check
```

Nach dem Commit erneut ausfuehren:

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run test:firebase:parity
npm run test:e2e
npm run test:e2e:navigation
npm run test:e2e:multiplayer
```

## Staging-Smoke nach Commit

Vor Produktion verpflichtend auf Firebase App Hosting Staging:

1. Login / User State funktioniert.
2. Liga kann geladen werden.
3. Team ist korrekt zugewiesen.
4. Draft UI laedt ohne Errors.
5. Ready-State funktioniert.
6. Admin kann Woche simulieren.
7. Ergebnisse und Standings werden nach Reload korrekt angezeigt.

## Risiken

1. Kein Release-Commit vorhanden, daher noch nicht reproduzierbar deploybar.
2. Admin Week Simulation nicht automatisiert mit echtem Admin-Token validiert.
3. Viele grosse UI- und Online-Dateien sind im Release enthalten; Review ist Pflicht.
4. Firebase/Firestore-Regeln und Repository-Code sind im Release enthalten; Staging-Smoke muss echte Datenpfade pruefen.
5. Produktion bleibt blockiert, bis Staging-Smoke abgeschlossen ist.

## Finale Bewertung

**Staging-No-Go jetzt**, weil noch kein sauberer Release-Commit existiert.

**Staging-Go nach Commit**, sofern:
- exakt dieser validierte Stand committed wird,
- der Admin-Simulationspfad mit Token oder manuell auf Staging geprueft wird,
- keine neuen Dirty-Changes nach dem Commit entstehen.
