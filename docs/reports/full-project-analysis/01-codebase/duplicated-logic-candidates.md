# Duplicated Logic Candidates

Stand: 2026-05-02

## Ziel der Analyse

Kandidaten fuer doppelte oder sehr aehnliche Logik finden, die zukuenftig Wartungskosten und inkonsistente Fixes verursacht. Keine der Stellen wurde geaendert.

## Methode

Das Analyse-Script sucht normalisierte 8-Zeilen-Bloecke in `src/**/*.ts(x)`. Strings und lange IDs werden abstrahiert. Ergebnis ist eine Heuristik: Test-Fixtures und bewusst aehnliche Mapper erscheinen ebenfalls als Treffer.

## Kandidaten

| Kandidat | Treffer | Dateien | Problem | Empfehlung | Risiko |
|---|---:|---:|---|---|---|
| Online-Test `MemoryStorage` | 16 | 16 | Identische lokale Storage-Fake-Klasse in vielen `src/lib/online/*.test.ts` Dateien | Gemeinsame Test-Fixture `src/lib/online/test-helpers/memory-storage.ts` | Niedrig |
| Online-Test League/GM Setup | 10 | 10 | Wiederholtes Erzeugen einer Testliga mit `BERLIN_WOLVES`, User und Storage | Gemeinsamen `createOnlineTestLeagueFixture` Helper einfuehren | Niedrig |
| Server-Action Error Redirects | 6 | 2 | `try/catch` mit `buildActionFeedbackHref`/Redirect-Feedback wiederholt in Development- und Team-Actions | Kleinen Action-Feedback-Wrapper pruefen | Mittel |
| Player Seed Mapping | 5 | 5 | Wiederholtes Mapping von Seed-Player-Feldern in Tests und Simulation-API | Gemeinsamen Test-/Adapter-Mapper extrahieren, falls Typen identisch sind | Mittel |
| Simulation QA Report Rendering | mehrere | Scripts | Aehnliche HTML-/Markdown-Renderer in `scripts/simulations/*` | Nur vereinheitlichen, wenn Reports weiter aktiv gepflegt werden | Niedrig |
| Admin/Online Status Cards | manuell sichtbar | mehrere UI-Dateien | Aehnliche Status-/Metric-Cards in Admin und Online Dashboard | Erst Design-System-Nutzen klaeren; nicht automatisch extrahieren | Mittel |

## Konkrete Fundstellen

### 1. Online-Test `MemoryStorage`

Beispiele:

- `src/lib/online/coaching-system.test.ts`
- `src/lib/online/contracts-salary-cap.test.ts`
- `src/lib/online/fantasy-draft-service.test.ts`
- `src/lib/online/fantasy-draft.test.ts`
- `src/lib/online/franchise-strategy.test.ts`
- `src/lib/online/gm-job-security.test.ts`
- `src/lib/online/media-expectations.test.ts`
- `src/lib/online/online-league-schedule.test.ts`

Bewertung: klarer Quick Win. Diese Duplikation ist testseitig, risikoarm und senkt kuenftige Testpflege.

### 2. Online-Test League/GM Setup

Beispiele:

- `src/lib/online/coaching-system.test.ts`
- `src/lib/online/contracts-salary-cap.test.ts`
- `src/lib/online/franchise-strategy.test.ts`
- `src/lib/online/media-expectations.test.ts`
- `src/lib/online/player-development.test.ts`
- `src/lib/online/scouting-draft.test.ts`
- `src/lib/online/stadium-fans-finance.test.ts`
- `src/lib/online/team-chemistry-system.test.ts`

Bewertung: ebenfalls risikoarm, solange der Helper nur Testdaten erstellt und keine Produktivlogik einfuehrt.

### 3. Server-Action Error Feedback

Beispiele:

- `src/app/app/savegames/[savegameId]/development/actions.ts`
- `src/app/app/savegames/[savegameId]/team/actions.ts`

Bewertung: fachlich relevanter als Test-Fixtures. Vor Extraktion muss geprueft werden, ob alle Redirect-Ziele, Titles, Effects und Impact-Texte wirklich gleich behandelt werden duerfen.

### 4. Player Seed Mapping

Beispiele:

- `src/modules/savegames/application/savegame-snapshot.test.ts`
- `src/modules/seasons/application/simulation/depth-chart.test.ts`
- `src/modules/seasons/application/simulation/match-engine.test.ts`
- `src/modules/seasons/application/simulation/production-qa-suite.ts`
- `src/modules/seasons/infrastructure/simulation/simulation-api.service.ts`

Bewertung: moeglicher guter Mapper-Kandidat, aber vorsichtig. Produktiv- und Testdaten-Mapping duerfen nicht versehentlich gekoppelt werden, wenn unterschiedliche Defaults gewollt sind.

## Risiken

- Normalisierte Blocksuche findet Folgezeilen desselben Blocks mehrfach. Die Trefferzahl beschreibt deshalb eher Cluster-Staerke als exakte Anzahl einzigartiger Duplikate.
- Aehnliche Tests koennen absichtlich lokal lesbar gehalten sein. Extraktion darf Tests nicht schwerer lesbar machen.
- UI-Duplikate koennen bewusst wegen unterschiedlicher Semantik getrennt sein.

## Empfehlungen

1. Zuerst Online-Test-Fixtures vereinheitlichen.
2. Danach Error-Redirect-Patterns nur mit kleinem Wrapper und Snapshot/Action-Tests.
3. Player Mapper erst nach Typvergleich und Simulation-Regressionscheck.
4. UI-Duplikate nur extrahieren, wenn Props klein bleiben.

## Naechste Arbeitspakete

- AP-DUP1: `MemoryStorage` Test-Fixture extrahieren.
- AP-DUP2: Online-League-Test-Setup helperisieren.
- AP-DUP3: Action-Feedback-Duplikate pruefen und bei Gleichheit kapseln.
