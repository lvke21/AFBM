# Codebase Size Analysis

Generated: 2026-04-30T18:27:23.628Z

## Executive Summary

Die Analyse zaehlt echten Projektcode und trennt produktiven Code, Tests, Konfiguration und Dokumentation. Build-Artefakte, Dependencies, Lockfiles, Debug-Logs und generierte Reports sind ausgeschlossen.

- Analysierte Projektdateien gesamt: **733**
- Analysierte Zeilen gesamt: **189.715**
- Nicht-leere Zeilen gesamt: **170.258**
- Zeichen gesamt: **6.119.876**
- Code-Dateien nach Code-/UI-/Schema-Endungen: **633 Dateien**, **174.274 Zeilen**, **5.590.991 Zeichen**
- Produktive nicht-leere Codezeilen fuer die Schaetzung: **122.751**
- Tests separat: **163 Dateien**, **32.374 nicht-leere Zeilen**
- Dokumentation separat: **95 Dateien**, **13.572 nicht-leere Zeilen**

## Methodik

Das Script `scripts/analyze-codebase-size.mjs` laeuft rekursiv durch das Projekt und erfasst pro Datei Pfad, Dateiendung, Kategorie, Zeilen, nicht-leere Zeilen und Zeichen. Gezahlt werden relevante Projektdateien mit Endungen fuer TypeScript/JavaScript, UI/CSS, JSON/YAML/TOML-Konfiguration, Prisma/SQL/Firestore-Regeln sowie Dokumentation.

Die Arbeitszeit-Schaetzung nutzt produktive nicht-leere Codezeilen aus den Kategorien App-Code, Script, Schema/DB und Sonstiges. Tests, Konfiguration und Dokumentation werden separat ausgewiesen und nicht als produktive Basiszeilen eingerechnet.

## Ausschluesse

Ausgeschlossen sind insbesondere:

- Verzeichnisse: `.cache`, `.firebase`, `.git`, `.local`, `.next`, `.turbo`, `.vercel`, `build`, `coverage`, `dist`, `firebase-emulator-data`, `node_modules`, `playwright-report`, `reports-output`, `test-results`
- Exakte Dateien: `firebase-debug.log`, `firestore-debug.log`, `next-env.d.ts`, `package-lock.json`, `pnpm-lock.yaml`, `scripts/analyze-codebase-size.mjs`, `tsconfig.tsbuildinfo`, `yarn.lock`
- Pfad-Praefixe: `docs/reports/`

## Gesamtzahlen

| Bereich | Dateien | Zeilen | Nicht-leere Zeilen | Zeichen |
| --- | --- | --- | --- | --- |
| Gesamt analysiert | 733 | 189.715 | 170.258 | 6.119.876 |
| Code-Dateien nach Endung | 633 | 174.274 | 158.413 | 5.590.991 |
| Produktive Schaetzbasis | 462 | 135.044 | 122.751 | 4.358.113 |
| Tests | 163 | 35.704 | 32.374 | 1.092.354 |
| Konfiguration | 13 | 1.586 | 1.561 | 49.371 |
| Dokumentation | 95 | 17.381 | 13.572 | 620.038 |

## Aufteilung Nach Dateitypen

| Dateityp | Dateien | Zeilen | Nicht-leere Zeilen | Zeichen |
| --- | --- | --- | --- | --- |
| .css | 1 | 112 | 98 | 3.052 |
| .env.example | 1 | 54 | 48 | 2.334 |
| .html | 4 | 3.345 | 3.123 | 134.385 |
| .json | 5 | 1.289 | 1.289 | 39.110 |
| .md | 91 | 14.036 | 10.449 | 485.653 |
| .mjs | 5 | 384 | 325 | 10.629 |
| .prisma | 1 | 1.335 | 1.168 | 47.336 |
| .rules | 1 | 350 | 302 | 12.685 |
| .sql | 3 | 1.652 | 1.312 | 72.783 |
| .toml | 1 | 3 | 3 | 128 |
| .ts | 446 | 146.341 | 133.117 | 4.518.372 |
| .tsx | 172 | 20.755 | 18.968 | 791.749 |
| .yaml | 1 | 38 | 36 | 1.172 |
| .yml | 1 | 21 | 20 | 488 |

## Aufteilung Nach Kategorien

| Kategorie | Dateien | Zeilen | Nicht-leere Zeilen | Zeichen |
| --- | --- | --- | --- | --- |
| App-Code | 407 | 105.279 | 95.622 | 3.365.105 |
| Config | 13 | 1.586 | 1.561 | 49.371 |
| Dokumentation | 95 | 17.381 | 13.572 | 620.038 |
| Schema/DB | 7 | 3.359 | 2.800 | 133.351 |
| Script | 48 | 26.406 | 24.329 | 859.657 |
| Test-Code | 163 | 35.704 | 32.374 | 1.092.354 |

## Groesste Dateien Nach Zeilen

| # | Pfad | Kategorie | Typ | Zeilen | Nicht-leere Zeilen | Zeichen |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | src/lib/online/online-league-service.ts | App-Code | .ts | 8.860 | 7.915 | 263.367 |
| 2 | src/modules/gameplay/infrastructure/play-library.ts | App-Code | .ts | 6.970 | 6.900 | 245.423 |
| 3 | src/modules/seasons/application/simulation/match-engine.ts | App-Code | .ts | 5.217 | 4.837 | 191.480 |
| 4 | src/modules/gameplay/application/play-selection-engine.ts | App-Code | .ts | 2.769 | 2.496 | 79.442 |
| 5 | src/modules/gameplay/application/outcome-resolution-engine.ts | App-Code | .ts | 2.737 | 2.502 | 79.689 |
| 6 | scripts/simulations/qa-extended-engine-balance-suite.ts | Script | .ts | 2.571 | 2.451 | 87.412 |
| 7 | src/components/online/online-league-placeholder.tsx | App-Code | .tsx | 2.402 | 2.241 | 101.086 |
| 8 | scripts/seeds/e2e-seed.ts | Script | .ts | 1.848 | 1.783 | 44.895 |
| 9 | scripts/simulations/qa-new-engine-balance-suite.ts | Script | .ts | 1.788 | 1.687 | 58.282 |
| 10 | scripts/simulations/gameengine-rating-analysis-report.ts | Script | .ts | 1.714 | 1.614 | 52.644 |
| 11 | prisma/migrations/20260426123001_init/migration.sql | Schema/DB | .sql | 1.647 | 1.307 | 72.568 |
| 12 | src/modules/gameplay/application/play-library-service.ts | App-Code | .ts | 1.556 | 1.404 | 42.081 |
| 13 | src/components/dashboard/dashboard-model.ts | App-Code | .ts | 1.498 | 1.318 | 47.066 |
| 14 | docs/guides/user-documentation.html | Dokumentation | .html | 1.485 | 1.394 | 56.370 |
| 15 | src/modules/seasons/application/simulation/extended-season-balance-suite.ts | App-Code | .ts | 1.443 | 1.291 | 46.729 |
| 16 | scripts/simulations/qa-rating-impact-validation.ts | Script | .ts | 1.398 | 1.290 | 49.690 |
| 17 | src/components/online/online-league-detail-model.ts | App-Code | .ts | 1.388 | 1.233 | 46.144 |
| 18 | src/components/match/post-game-report-model.ts | App-Code | .ts | 1.337 | 1.164 | 44.511 |
| 19 | prisma/schema.prisma | Schema/DB | .prisma | 1.335 | 1.168 | 47.336 |
| 20 | src/modules/savegames/application/bootstrap/initial-roster.ts | App-Code | .ts | 1.310 | 1.260 | 30.244 |

## Groesste Dateien Nach Zeichen

| # | Pfad | Kategorie | Typ | Zeilen | Nicht-leere Zeilen | Zeichen |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | src/lib/online/online-league-service.ts | App-Code | .ts | 8.860 | 7.915 | 263.367 |
| 2 | src/modules/gameplay/infrastructure/play-library.ts | App-Code | .ts | 6.970 | 6.900 | 245.423 |
| 3 | src/modules/seasons/application/simulation/match-engine.ts | App-Code | .ts | 5.217 | 4.837 | 191.480 |
| 4 | src/components/online/online-league-placeholder.tsx | App-Code | .tsx | 2.402 | 2.241 | 101.086 |
| 5 | scripts/simulations/qa-extended-engine-balance-suite.ts | Script | .ts | 2.571 | 2.451 | 87.412 |
| 6 | src/modules/gameplay/application/outcome-resolution-engine.ts | App-Code | .ts | 2.737 | 2.502 | 79.689 |
| 7 | src/modules/gameplay/application/play-selection-engine.ts | App-Code | .ts | 2.769 | 2.496 | 79.442 |
| 8 | prisma/migrations/20260426123001_init/migration.sql | Schema/DB | .sql | 1.647 | 1.307 | 72.568 |
| 9 | scripts/simulations/qa-new-engine-balance-suite.ts | Script | .ts | 1.788 | 1.687 | 58.282 |
| 10 | docs/guides/user-documentation.html | Dokumentation | .html | 1.485 | 1.394 | 56.370 |
| 11 | scripts/simulations/gameengine-rating-analysis-report.ts | Script | .ts | 1.714 | 1.614 | 52.644 |
| 12 | scripts/simulations/qa-rating-impact-validation.ts | Script | .ts | 1.398 | 1.290 | 49.690 |
| 13 | prisma/schema.prisma | Schema/DB | .prisma | 1.335 | 1.168 | 47.336 |
| 14 | src/components/dashboard/dashboard-model.ts | App-Code | .ts | 1.498 | 1.318 | 47.066 |
| 15 | src/modules/seasons/application/simulation/extended-season-balance-suite.ts | App-Code | .ts | 1.443 | 1.291 | 46.729 |
| 16 | src/components/online/online-league-detail-model.ts | App-Code | .ts | 1.388 | 1.233 | 46.144 |
| 17 | scripts/seeds/e2e-seed.ts | Script | .ts | 1.848 | 1.783 | 44.895 |
| 18 | src/components/match/post-game-report-model.ts | App-Code | .ts | 1.337 | 1.164 | 44.511 |
| 19 | src/modules/gameplay/application/play-library-service.ts | App-Code | .ts | 1.556 | 1.404 | 42.081 |
| 20 | src/components/match/match-report-model.ts | App-Code | .ts | 1.251 | 1.083 | 42.046 |

## Arbeitsstunden-Schaetzung

Basis fuer die Rechnung: **122.751 produktive nicht-leere Codezeilen**. Die Zahlen sind Naeherungen, keine exakte Rekonstruktion tatsaechlicher Arbeit.

| Szenario | Produktivitaet | Geschaetzte Stunden |
| --- | --- | --- |
| Schnell umgesetzt / viel Boilerplate | 80-140 produktive Zeilen pro Stunde | 877-1.534 h |
| Normaler professioneller Entwicklungsprozess | 40-80 produktive Zeilen pro Stunde | 1.534-3.069 h |
| Komplexe App mit Tests, Debugging, Refactoring, UI-Iterationen | 15-40 produktive Zeilen pro Stunde | 3.069-8.183 h |

Aus technischer Sicht spricht die Codebasis eher fuer das komplexe Szenario: Es gibt eine umfangreiche Next/Firebase-App, Offline- und Online-Flows, Game- und Saison-Simulation, Firestore/Prisma-Migrationspfade, Admin- und Auth-Migrationen, E2E-/Firebase-Tests sowie viele QA- und Seed-Scripte. Unter Einrechnung von Debugging, Refactoring, UI-Iteration und Integrationsaufwand ist eine vorsichtige Delivery-Spanne von **3.069-9.820 Stunden** plausibel.

## Belastbarkeit Der Schaetzung

Die Messung der Dateien, Zeilen und Zeichen ist reproduzierbar, solange die Ausschlussliste stabil bleibt. Die Arbeitszeit ist deutlich weniger belastbar: Produktivitaet haengt stark von Vorwissen, vorhandenen Templates, KI-Unterstuetzung, Datenmodell-Klarheit, Testanforderungen und Anzahl der Iterationen ab. Die Schaetzung eignet sich deshalb als Groessenordnung, nicht als abrechenbare Wahrheit.

## Fazit

Die Codebasis ist groesser als ein reines CRUD-Projekt, weil sie fachliche Game-Logik, Simulation, mehrere Persistenzpfade, Firebase-Integration und eine breite Testsuite kombiniert. Fuer eine Einzelperson ist der realistische Aufwand am ehesten im komplexen Szenario anzusetzen; Dokumentation und Reports sollten dabei separat bewertet werden.
