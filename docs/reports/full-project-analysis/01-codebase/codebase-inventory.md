# Codebase Inventory

Stand: 2026-05-02

## Ziel der Analyse

Quantitative und qualitative Bestandsaufnahme der AFBM-Codebase mit Fokus auf Groesse, Verantwortlichkeiten, Kopplung, Duplikate, Dead-Code-Kandidaten und Wartbarkeitsrisiken.

## Methode

Verwendetes Read-only-Script:

```bash
node scripts/analysis/codebase-metrics.mjs --compact
```

Das Script liest Dateien nur aus und veraendert keine Produktivdaten. Ausgeschlossen wurden generierte oder externe Artefakte wie `.git`, `.next`, `node_modules`, `coverage`, `firebase-emulator-data`, `playwright-report`, `reports-output`, `test-results`, `dist`, `build`, `package-lock.json`, `docs/reports/full-project-analysis/` und typische Binary-/Map-/Lock-Dateien.

Wichtig: Dead-Code- und Duplikat-Erkennung ist heuristisch. Treffer sind Kandidaten und muessen vor Loeschungen per TypeScript, Tests und Importgraph geprueft werden.

## Inventar

| Kategorie | Dateien | Zeilen |
|---|---:|---:|
| UI / TSX / Components | 285 | 51.564 |
| Logic / Lib / Server / Modules | 308 | 102.847 |
| App Routes | 39 | 3.362 |
| Other, Docs, Scripts, Config | 461 | 118.752 |
| Gesamt | 1.093 | 276.525 |

Source-nahe Dateien (`src` plus App-Routes/Logic/UI) machen ca. 632 Dateien und 157.773 Zeilen aus. Die groesste Wartungslast liegt klar in `src/lib/online`, `src/modules/gameplay`, `src/modules/seasons` und einigen grossen Client-Komponenten.

## Wichtigste 10 Findings

1. `src/lib/online/online-league-service.ts` ist mit 8.882 Zeilen der groesste Source-Hotspot und mischt weiterhin Online-League-Domain, Storage, Draft, Week Flow, Training, Contracts, Results und Utility-Logik.
2. Die Game-/Simulationsebene ist sehr gross: `play-library.ts` mit 6.971 Zeilen und `match-engine.ts` mit 5.226 Zeilen sind No-Go-Bereiche fuer unsichere Refactors.
3. `simulateMatch` in `match-engine.ts` wird heuristisch als 2.163-Zeilen-Funktion erkannt. Das ist der groesste Komplexitaetsblock.
4. Grosse Client-Komponenten bleiben Wartungsrisiken: `online-league-placeholder.tsx` 1.766 Zeilen, `admin-league-detail.tsx` 1.642 Zeilen, `admin-league-manager.tsx` als 516-Zeilen-Komponente.
5. Admin-Firebase-Logik ist konzentriert in `src/lib/admin/online-admin-actions.ts` mit 1.913 Zeilen und zwei sehr grossen Action-Funktionen. Das ist releasekritisch, weil API, Guarding und Writes nah beieinander liegen.
6. Tests in `src/lib/online/*.test.ts` duplizieren eine `MemoryStorage`-Fixture in 16 Dateien. Das ist ein risikoarmer Quick Win.
7. Mehrere Route-/Server-Actions duplizieren Error-Feedback/Redirect-Patterns, besonders `development/actions.ts` und `team/actions.ts`.
8. Die Kopplung ist sichtbar: `team.types` hat 54 interne Dependents, `shared/domain/enums` 43, `format` 35, `status-badge` 32, `auth/session` 30. Aenderungen dort brauchen breite Regressionstests.
9. `console.*` kommt 164-mal vor, aber ueberwiegend in Scripts/Smoke/Seeds. In `src` sind die Vorkommen eher bewusstes Observability-/Warn-Logging, sollten aber klassifiziert werden.
10. Das Script findet 556 ungenutzte Export-Kandidaten. Viele sind Typen, Route-Exports oder Test-/Script-APIs und duerfen nicht blind entfernt werden.

## Top 10 Refactoring-Kandidaten

| Rang | Datei/Bereich | Grund | Risiko | Empfohlene Richtung |
|---:|---|---|---|---|
| 1 | `src/lib/online/online-league-service.ts` | Groesse, viele Verantwortlichkeiten, zentrale Online-Kopplung | Hoch | Nur read-only Helper und Fachmodule schrittweise abtrennen |
| 2 | `src/components/online/online-league-placeholder.tsx` | Sehr grosse Client-Komponente, UI/State/Actions gemischt | Mittel | Lokale derived data und Handler weiter in Hooks/Helpers auslagern |
| 3 | `src/components/admin/admin-league-detail.tsx` | Sehr grosse Admin-UI mit Mutation/Debug/Display | Mittel/Hoch | Nur reine Display-Sektionen weiter extrahieren |
| 4 | `src/lib/admin/online-admin-actions.ts` | Admin API, Firebase Writes, lokale Actions in einem Modul | Hoch | Action-Gruppen mit identischem API-Vertrag trennen |
| 5 | `src/modules/seasons/application/simulation/match-engine.ts` | Sehr lange Engine-Funktionen | Hoch | Erst Golden-Master/Determinismus-Tests, dann reine Berechnungen isolieren |
| 6 | `src/modules/gameplay/infrastructure/play-library.ts` | Sehr grosse Daten-/Regeldatei | Mittel | Datenstruktur generierbar machen oder in fachliche Bloecke teilen |
| 7 | `src/lib/online/*.test.ts` Fixtures | `MemoryStorage` und League-Fixtures dupliziert | Niedrig | Gemeinsame Test-Fixture in `src/lib/online/test-helpers` |
| 8 | `src/app/app/savegames/[savegameId]/team/actions.ts` | Wiederholte Redirect-/Feedback-Fehlerpfade | Niedrig/Mittel | Gemeinsamen Action-Feedback-Wrapper verwenden |
| 9 | `src/components/dashboard/dashboard-model.ts` | 1.499 Zeilen Modell-/Copy-/State-Mix | Mittel | Domain-spezifische Modellgruppen trennen |
| 10 | `src/lib/online/repositories/firebase-online-league-repository.ts` | 1.468 Zeilen Firebase Repository, hoher Datenfluss-Einfluss | Hoch | Keine Schema-Aenderung; nur read-only Mapper/normalizer extrahieren |

## Risiken

- Grosse Module sind nicht nur "zu lang", sondern enthalten produktionskritische Spiellogik, Firebase Writes und Multiplayer-State.
- Heuristische Dead-Code-Treffer koennen falsch positiv sein, besonders bei Next.js Route-Dateien, server actions, TypeScript-Typen und dynamischen Imports.
- Die Testbasis ist breit, aber nicht jede UI-/Firebase-Kombination ist lokal voll reproduzierbar.

## Empfehlungen

1. Erst risikoarme Test-Fixture-Duplikate entfernen.
2. Danach grosse Client-Komponenten weiter in reine Display- und derived-data-Bloecke aufteilen.
3. Firebase-/Admin-/Week-Flow nur mit fokussierten Tests und ohne Schema-Aenderung anfassen.
4. Engine-Refactors erst nach stabilen Determinismus- und Regressionstests.
5. `online-league-service.ts` weiter inkrementell schneiden, aber API-kompatibel halten.

## Offene Fragen

- Welche Exporte sind bewusst oeffentliche Modul-APIs, obwohl sie aktuell nur intern oder gar nicht referenziert sind?
- Soll es eine zentrale Test-Fixture-Bibliothek fuer Online-League-Tests geben?
- Welche generated/report Dateien sollen dauerhaft versioniert bleiben?
- Welche `console.*`-Logs sind gewollte Observability und welche nur Debug-Reste?

## Naechste Arbeitspakete

- AP-CB1: Gemeinsame `MemoryStorage`- und Online-Test-Fixtures extrahieren.
- AP-CB2: `online-league-placeholder.tsx` weiter um 2-3 read-only derived helpers entlasten.
- AP-CB3: `admin-league-detail.tsx` weitere reine Anzeige-Sektionen extrahieren.
- AP-CB4: Dead-Code-Kandidaten compiler- und testgestuetzt pruefen.
- AP-CB5: Kopplungs-Hotspots mit Change-Risk-Matrix versehen.
