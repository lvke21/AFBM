# Performance Overview

## Ziel der Analyse

Diese Analyse bewertet Performance-Risiken im aktuellen AFBM-Codezustand. Fokus sind React/Next.js Rendering, Firestore-Reads/Writes, Bundle- und Build-Risiken, teure Berechnungen, Simulationen und grosse Listen.

Es wurden keine Optimierungen umgesetzt und keine produktiven Daten veraendert.

## Untersuchte Bereiche

- `src/components/online/*`
- `src/components/admin/*`
- `src/components/team/*`
- `src/components/dashboard/*`
- `src/lib/online/*`
- `src/lib/admin/*`
- `src/modules/gameplay/*`
- `src/modules/seasons/*`
- `.next` Build-Artefakte, soweit lokal vorhanden
- `package.json`
- bestehende Performance- und Refactor-Reports

## Analyse-Commands

- `find src -type f -name '*.ts' -o -name '*.tsx'`
- `rg "useMemo|useCallback|useEffect|useState|memo\\(" src/components src/app -n`
- `rg "onSnapshot|getDoc|getDocs|setDoc|updateDoc|runTransaction|writeBatch|deleteDoc" src/lib src/server src/app scripts -n`
- `rg "dynamic\\(|next/dynamic|React\\.lazy|import\\(" src -n`
- `find .next/static/chunks -type f -name '*.js' -exec wc -c {} +`
- lokale Zeilen-/Hook-/Firestore-Metriken per read-only Node-Auswertung

## Wichtigste Metriken

- TypeScript/TSX-Dateien im `src`-Baum: ca. 630.
- Groesster Service: `src/lib/online/online-league-service.ts` mit ca. 8.882 Zeilen.
- Groesste Engine-/Datenmodule:
  - `src/modules/gameplay/infrastructure/play-library.ts`: ca. 6.971 Zeilen.
  - `src/modules/seasons/application/simulation/match-engine.ts`: ca. 5.226 Zeilen.
  - `src/modules/gameplay/application/play-selection-engine.ts`: ca. 2.748 Zeilen.
  - `src/modules/gameplay/application/outcome-resolution-engine.ts`: ca. 2.716 Zeilen.
- Groesste Client-Komponenten:
  - `src/components/online/online-league-placeholder.tsx`: ca. 1.766 Zeilen, 22 `useState`, 3 `useEffect`.
  - `src/components/admin/admin-league-detail.tsx`: ca. 1.642 Zeilen, 11 `useState`, 2 `useEffect`, 2 `useMemo`.
  - `src/components/team/depth-chart-view.tsx`: ca. 755 Zeilen.
  - `src/components/admin/admin-control-center.tsx`: ca. 748 Zeilen.
  - `src/components/team/roster-table.tsx`: ca. 601 Zeilen.
- Firestore-Hotspot:
  - `src/lib/online/repositories/firebase-online-league-repository.ts`: breite Listener und Snapshot-Mapping.
- Lokale `.next`-Artefakte:
  - `.next`: ca. 748 MB.
  - `.next/static`: ca. 41 MB.
  - `.next/server`: ca. 28 MB.
  - Raw Chunk-Artefakte zeigen sehr grosse Routenwerte. Diese Werte sind nicht automatisch ein frischer, komprimierter Produktionswert und muessen mit einem sauberen `npm run build` bzw. Bundle Analyzer verifiziert werden.

## Top 10 Performance-Risiken

| Rang | Risiko | Betroffene Dateien | Bewertung |
| --- | --- | --- | --- |
| 1 | `subscribeToLeague()` ist weiter sehr breit und haengt League Meta, Memberships, Teams, Events, Draft State, Draft Picks und Available Players an eine gemeinsame Route-Subscription. | `src/lib/online/repositories/firebase-online-league-repository.ts` | Hoch |
| 2 | Jeder Listener-Impuls triggert ein vollstaendiges `getSnapshot()` mit mehreren `getDoc/getDocs` Reads. Das kann Firestore-Kosten und UI-Latenz vervielfachen. | `firebase-online-league-repository.ts` | Hoch |
| 3 | Grosse Client-Orchestratoren mischen UI, lokale States, Derived Data und Action-Handler. Das erhoeht Re-Render-Flache und Wartungsrisiko. | `online-league-placeholder.tsx`, `admin-league-detail.tsx` | Hoch |
| 4 | Online-Detail-Modelle berechnen viele Maps, Sorts, Filter und Statuslabels aus grossen League-Objekten. Bei jedem League-Objektwechsel kann viel Arbeit entstehen. | `online-league-detail-model.ts`, `dashboard-model.ts` | Mittel-Hoch |
| 5 | Frontend nutzt kaum `next/dynamic` oder `React.lazy` fuer selten genutzte schwere Panels. Admin-, Online- und Savegame-Routen koennen mehr Code laden als noetig. | `src/components/admin/*`, `src/components/online/*`, `src/app/*` | Mittel-Hoch |
| 6 | Roster-, Depth-Chart- und Admin-Listen sind meist nicht virtualisiert. Aktuelle Roster-Groesse ist moderat, aber Spielerpool-, Admin- und Draft-Views koennen wachsen. | `roster-table.tsx`, `depth-chart-view.tsx`, `admin-league-detail.tsx` | Mittel |
| 7 | Firestore-Dokumente tragen groessere Arrays wie `matchResults`, `standings`, `completedWeeks`, `schedule` und Draft-Daten. Das beguenstigt grosse Payloads und Hot-Document-Writes. | `src/lib/online/*`, `src/lib/admin/online-admin-actions.ts` | Mittel-Hoch |
| 8 | Simulation und Play-Library sind sehr gross. Sie laufen ueberwiegend serverseitig, bleiben aber ein Bundle-/Import-Risiko, falls versehentlich in Client-Grenzen importiert. | `src/modules/gameplay/*`, `src/modules/seasons/*` | Mittel |
| 9 | Einige Ableitungen scannen Ergebnisse/Standings fallback-basiert statt immer vorbereitete Maps zu verwenden. Das ist korrekt, aber fuer haeufiges Rendering unguenstig. | `online-league-app-shell.tsx`, `online-league-detail-model.ts` | Mittel |
| 10 | Performance-Messung ist noch nicht als Gate institutionalisiert. Es gibt lokale Befunde, aber keine stabile Bundle-Budget- oder Firestore-Read-Metrik in CI. | Build/Test-Infrastruktur | Mittel |

## Was bereits verbessert wurde

- Online-Route-State wurde zentralisiert. Dadurch sind fruehere doppelte Route-Subscriptions deutlich entschaerft.
- Draft Room nutzt Virtualisierung und memoized Derived Data.
- Mehrere Refactor-Arbeiten haben Client-Imports aus grossen Services reduziert.
- E2E- und Seed-Stabilisierung reduziert indirekt Performance-Risiko, weil Regressionsmessung verlaesslicher wird.

## Quick Wins

1. `toOnlineLeagueDetailState(league, currentUser)` in `online-league-placeholder.tsx` konsequent per `useMemo` absichern, falls noch nicht der Fall.
2. `getTeamRecordLabel`/Standings-Fallback in `online-league-app-shell.tsx` in eine memoized Map auslagern.
3. Admin-Debug- und seltene Admin-Panels nur rendern, wenn sie sichtbar sind.
4. In `subscribeToLeague()` einfache Read-/Emit-Debug-Metriken im Development-Modus einfuehren.
5. Draft-spezifische Listener nicht auf Dashboard-Routen abonnieren, wenn Draft abgeschlossen ist und die View keine Live-Draft-Daten braucht.
6. Grosse Derived Maps wie `teamsById`, `playersById`, `standingsByTeamId` zentral in View-Model-Helpern erzeugen und wiederverwenden.
7. Bundle-Analyse als optionales npm Script dokumentieren, ohne neue schwere Toolchain zu erzwingen.
8. `roster-table.tsx` und `depth-chart-view.tsx` mit stabilen Props und memoized Model-Funktionen absichern, bevor Virtualisierung noetig wird.

## Groessere Performance-Arbeitspakete

1. Subscription-Profile fuer Online-League-Routen einfuehren.
2. Firestore-Lesemodell fuer Results, Schedule, Standings und Draft-Daten granularisieren.
3. Grosse Client-Komponenten weiter in Container, Display-Komponenten und Action-Hooks zerlegen.
4. Bundle-Budget und Bundle-Analyzer in den Release-Prozess aufnehmen.
5. Simulationsergebnisse als serverseitigen Job-/Statusfluss modellieren, um UI-Thread und doppelte Admin-Klicks sauber zu entkoppeln.

## Gesamtbewertung

Status: Gelb.

Die App ist nach den Refactors stabiler als vorher, aber Performance-Risiken liegen weiter in wenigen breiten Knoten: `subscribeToLeague()`, grosse Client-Orchestratoren, grosse Derived-State-Modelle und fehlende Bundle-/Read-Budgets. Das sind keine akuten Showstopper fuer kleine Staging-Tests, aber sie sind echte Skalierungs- und Kostenrisiken fuer breitere Multiplayer-Nutzung.
