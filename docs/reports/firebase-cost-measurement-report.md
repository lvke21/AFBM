# Firebase Cost Measurement Report

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Status: Gruen

## Executive Summary

Firestore-Kostenrisiken sind jetzt lokal messbar. Es wurde keine produktive Aktivierung vorgenommen, keine echten Production-Daten verwendet, Prisma nicht entfernt und Auth nicht umgestellt.

Der Messlauf lief gegen den Firestore Emulator `demo-afbm` auf `127.0.0.1:8080` mit `FIRESTORE_USAGE_LOGGING=true`.

Wichtigstes Ergebnis:

- Teuerste Read-Flows: SaveGame/Dashboard Entry `115 Reads`, Next Week Return `125 Reads`, Stats Views `74 Reads`, Season Overview `39 Reads`.
- Week-Loop-State-Writes sind klein: Prepare `2`, Start `3`, Finish `3`, Advance `3`.
- Game Output + Stats Persistenz ist der zentrale Write-Risiko-Pfad: im synthetischen Minimalfall `13 Writes` bei nur `4 Drives` und `2 Player-Lines`.
- Hauptkostenfalle bleibt nicht ein einzelner Screen, sondern wiederholtes Lesen ganzer liga-/season-gescopter Collections und Stats-Aggregate-Rebuilds.

Production bleibt No-Go.

## Implementierung

Neu:

- `src/server/repositories/firestoreUsageLogger.ts`
- `scripts/firestore-usage-measure.ts`

Aktualisiert:

- `package.json`
- Firestore-Repositories mit Repository-Level Usage Logging:
  - `saveGameRepository.firestore.ts`
  - `firestoreAccess.ts`
  - `teamRepository.firestore.ts`
  - `playerRepository.firestore.ts`
  - `seasonRepository.firestore.ts`
  - `matchRepository.firestore.ts`
  - `weekMatchStateRepository.firestore.ts`
  - `gameOutputRepository.firestore.ts`
  - `statsRepository.firestore.ts`
  - `readModelRepository.firestore.ts`

Logging ist ENV-gesteuert:

```bash
FIRESTORE_USAGE_LOGGING=true
```

Es werden nur Collection, Operation, Count, Query-Label und Flow geloggt. Keine Dokumentdaten, keine Userdaten, keine Secrets.

## Messlauf

Ausgefuehrt:

```bash
npm run firebase:emulators
npm run firebase:usage:measure
npx tsc --noEmit
npm run lint
```

Das Messscript:

1. setzt den Firestore Emulator zurueck,
2. seedet die Demo-Fixture,
3. bereitet die Browser-E2E-Week-Fixture vor,
4. schaltet Usage Logging ein,
5. misst Kernflows separat.

## Gemessene Reads/Writes Pro Flow

| Flow | Reads | Writes | Deletes | Bewertung |
| --- | ---: | ---: | ---: | --- |
| SaveGame entry | 115 | 0 | 0 | Hoch |
| Team Overview | 25 | 0 | 0 | Mittel |
| Roster | 12 | 0 | 0 | Gut |
| Player Detail | 12 | 0 | 0 | Gut |
| Season Overview | 39 | 0 | 0 | Mittel bis hoch |
| Match Detail | 10 | 0 | 0 | Gut, vor Stats/Drives |
| Stats Views | 74 | 0 | 0 | Hoch |
| Reports | 3 | 0 | 0 | Gut |
| Week Prepare | 5 | 2 | 0 | Gut |
| Match Start | 6 | 3 | 0 | Gut |
| Game Finish | 7 | 3 | 0 | Gut fuer State-Finish |
| Game Output + Stats Persist | 6 | 13 | 0 | Risiko bei echten Games |
| Week Advance | 5 | 3 | 0 | Gut |
| Next Week Return | 125 | 0 | 0 | Hoch |

Gesamt im Messlauf:

```json
{
  "reads": 444,
  "writes": 24,
  "deletes": 0
}
```

## Kostenrisiken Konkret

### SaveGame Entry / Next Week Return

Problem:

- `saveGameRepositoryFirestore.findByIdForUser` liest fuer die Dashboard-Shell aktuell:
  - alle Teams der Liga,
  - alle Spieler der Liga,
  - alle Matches der Liga,
  - alle Season-TeamStats.

Messwert:

- SaveGame entry: `115 Reads`
- Next Week Return: `125 Reads`

Kostenfalle:

- Skaliert direkt mit Liga- und Saisonumfang.
- Bei 32 Teams, 53 Spielern und 17 Wochen waere dieser Einstieg deutlich teurer als die Demo-Fixture.

Minimaler Fix-Vorschlag:

- SaveGame-Summary-Dokument oder schlankes Dashboard-Readmodel einfuehren:
  - `managerTeamId`
  - `currentSeasonId`
  - `currentWeekId`
  - Counts
  - Manager-Team-Summary
  - naechstes Match
- Vollstaendige Player-/Match-Listen nur auf den Zielseiten laden.

### Stats Views

Problem:

- `getStatsViews` liest alle season-scoped `teamStats` und alle season-scoped `playerStats`.

Messwert:

- `74 Reads` bei 8 Teams und 64 PlayerStats.

Kostenfalle:

- Skaliert linear mit Spielern pro Liga.
- Fuer Leaderboards ist das teuer, wenn nur Top-N angezeigt wird.

Minimaler Fix-Vorschlag:

- Top-N Readmodel-Collections pro Season:
  - `leaderboards/{seasonId}_passing`
  - `leaderboards/{seasonId}_rushing`
  - `leaderboards/{seasonId}_defense`
- Alternativ sortierbare Query mit `orderBy` + `limit`, sofern die Datenstruktur dafuer vorbereitet ist.

### Season Overview

Problem:

- Season Overview liest alle Matches der Season und alle TeamStats.

Messwert:

- `39 Reads` bei 28 Matches.

Kostenfalle:

- Fuer vollstaendige Schedules okay, aber teuer als haeufiger Dashboard-Nebenread.

Minimaler Fix-Vorschlag:

- Dashboard nur current-week und manager-team relevante Matches lesen.
- Voller Schedule bleibt auf Season/Schedule-Seite.

### Game Output + Stats Persist

Problem:

- Writes skalieren mit:
  - `1` Match Output Write
  - `D` Drive Event Writes
  - `2` Team Match Stat Writes
  - `N` Player Match Stat Writes
  - `2` Team Season Aggregate Writes
  - `N` Player Season Aggregate Writes

Messwert im Minimalfall:

- `13 Writes` bei `D=4` Drives und `N=2` Player-Lines.

Naive Formel:

```text
Writes pro Match ~= 5 + Drives + 2 * betroffene Spieler
```

Bei 18 Drives und 44 betroffenen Spielern:

```text
5 + 18 + 88 = 111 Writes pro Match
```

Zusaetzliches Read-Risiko:

- Team-Season-Aggregates lesen alle Match-TeamStats der Season.
- Player-Season-Aggregates lesen pro betroffenem Spieler dessen MatchStats der Season.
- Das ist idempotent und korrekt, kann aber bei spaeter Saison und vielen Spielern read-intensiv werden.

Minimaler Fix-Vorschlag:

- Fuer Production spaeter Delta-basierte Aggregate oder Stats-Ledger mit idempotenten Match-IDs pruefen.
- Aggregates nicht pro Spieler einzeln ueber Season-History neu lesen, sobald echte Saisonlaengen genutzt werden.

### Reports

Messwert:

- `3 Reads`

Bewertung:

- Aktuell unkritisch, weil `leagueId + createdAt + limit` genutzt wird.

Risiko:

- Post-Game-Report-Generierung ist noch kein vollstaendiger produktionsnaher Firestore-Orchestrator.

## Full Collection Reads

Keine ungescopten Full Collection Reads wurden im Messlauf gefunden.

Gefundene breite, aber gescopte Reads:

- `players where leagueId == ...`
- `matches where leagueId == ...`
- `teamStats where leagueId + seasonId + scope`
- `playerStats where leagueId + seasonId + scope`

Bewertung:

- Technisch keine Full Collection Reads.
- Produktseitig trotzdem Kostenrisiko, weil sie liga-/season-breit lesen.

## Indexbewertung

Vorhandene/benoetigte Indexbereiche aus den gemessenen Queries:

- `reports`: `leagueId + createdAt`
- `matches`: `leagueId + seasonId`, `leagueId + weekId`, `leagueId + seasonId + weekId + status`
- `players`: `leagueId + roster.teamId`
- `teamStats`: `leagueId + seasonId + scope`, `leagueId + matchId + scope`, `teamId`
- `playerStats`: `leagueId + seasonId + scope`, `leagueId + seasonId + playerId + scope`, `leagueId + matchId + scope`

Keine fehlenden Indexe wurden im Emulator-Messlauf als Blocker sichtbar. Fuer Preview/Staging sollte der Lauf gegen deployte Staging-Indexes wiederholt werden.

## Saison-Schaetzung

Demo-Saison:

- 7 Wochen
- 28 Matches
- 8 Teams
- 64 Spieler

State-only Week Loop pro Manager-Match:

- Prepare + Start + Finish + Advance: `23 Reads`, `11 Writes`

Mit Game Output + Stats Minimalpersistenz:

- plus `6 Reads`, `13 Writes`
- zusammen etwa `29 Reads`, `24 Writes` fuer einen vollstaendigen gemessenen Match-Loop

Saison grob bei 28 Matches mit Minimalpersistenz:

- Match Start + Finish + Output/Stats pro Match: ca. `19 Reads`, `19 Writes`
- Prepare/Advance pro Woche: ca. `10 Reads`, `5 Writes`
- Grob: `~602 Reads`, `~567 Writes`

Realistische Saison mit vollen Player-Lines:

- deutlich hoeher, weil Writes pro Match ungefaehr `5 + Drives + 2 * betroffene Spieler` sind.
- Bei 28 Matches, 18 Drives und 44 betroffenen Spielern: grob `~3.100 Game/Stats Writes` nur fuer Game Output + Stats, ohne Reports und Zusatzaggregate.

## Optimierungsvorschlaege

Kurzfristig:

- Dashboard/SaveGame-Entry verschlanken.
- Next Week Return nicht erneut alle Spieler und alle Matches laden.
- Stats Views auf Top-N oder paginierte Views begrenzen.
- Repository-Level Usage Logging in Preview/Staging eingeschaltet lassen, aber nur fuer Testlaeufe.

Mittelfristig:

- Dashboard Summary Readmodel.
- Current-week Match Summary Readmodel.
- Leaderboard Readmodels.
- Stats-Aggregate-Delta statt vollstaendiger Rebuild pro betroffenem Spieler.
- Post-Game-Orchestrator, der State, Output, Stats und Reports in klaren Kostenbudgets schreibt.

Nicht empfohlen als Sofortmassnahme:

- Grosse Architektur-Umbauten ohne Preview/Staging-Messdaten.
- Production-Firestore-Aktivierung.
- Prisma-Removal.

## Tests

Ausgefuehrt:

- `npx tsc --noEmit`: Gruen
- `npm run lint`: Gruen
- `npm run firebase:usage:measure`: Gruen

Hinweis:

- `npx firebase --version` wurde in frueheren Checks mit Version `15.15.0` erkannt, kann lokal aber wegen Firebase-Tools configstore Update-Check mit Exit 2 enden. Das ist kein Produktionszugriff.
- Der Messlauf nutzt nur Emulator-Daten.

## Statuspruefung

| Frage | Ergebnis |
| --- | --- |
| Reads/Writes pro Kernflow sichtbar? | Ja |
| Kostenrisiken konkret benannt? | Ja |
| Full Collection Reads erkannt? | Ja: keine ungescopten, aber breite liga-/season-gescopte Reads |
| Optimierungsvorschlaege vorhanden? | Ja |
| Keine Production-Daten verwendet? | Ja |
| Tests gruen oder Einschraenkungen dokumentiert? | Ja |

Status: Gruen
