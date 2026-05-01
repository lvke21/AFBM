# Testability AP7: Replay Debug System Report

## Executive Summary

Status: Gruen

Ein seed-basiertes Replay-/Debug-System fuer Match-Simulationen wurde erstellt. Es kann Seed und Input serialisieren, einen Ergebnis-Fingerprint speichern, die Simulation erneut ausfuehren und Drive-Level-Schritte fuer ein Step-by-Step-Replay bereitstellen.

## Neue Dateien

- `src/modules/seasons/application/simulation/simulation-replay.service.ts`
- `src/modules/seasons/application/simulation/simulation-replay.service.test.ts`

## Funktionen

### Seed speichern

Replay-Captures speichern den Seed explizit:

- `capture.seed`
- `capture.input.simulationSeed`
- `capture.resultSummary.seed`

Beim Replay wird geprueft, dass gespeicherter Seed und Input-Seed identisch sind. Abweichungen werden als fehlerhafte Capture-Daten abgelehnt.

### Input speichern

`serializeSimulationReplayInput(context)` wandelt einen `SimulationMatchContext` in ein JSON-faehiges Objekt um:

- `scheduledAt` als ISO-String
- `injuryEndsOn` je Spieler als ISO-String oder `null`
- Teams, Roster, Gameplans und Match-Metadaten bleiben enthalten

`deserializeSimulationReplayInput(input)` rekonstruiert daraus den Engine-Input mit `Date`-Objekten.

### Simulation erneut ausfuehren

`replaySimulationCapture(capture)`:

1. validiert Capture-Version und Seed-Konsistenz
2. rekonstruiert den gespeicherten Input
3. fuehrt `generateMatchStats(context, createRng(capture.seed))` erneut aus
4. erzeugt einen neuen Ergebnis-Fingerprint
5. vergleicht `expectedFingerprint` und `actualFingerprint`

Rueckgabe:

- `matches`
- `expectedFingerprint`
- `actualFingerprint`
- `actualSummary`
- `replayedResult`
- `stepReplay`

### Fingerprint

`createSimulationResultFingerprint(result)` erstellt einen stabilen Fingerprint aus:

- normalisierten Drives
- Score
- Winner
- Team-Stats
- Player-Stats-Fingerprint

Der Fingerprint nutzt stabile Sortierung und FNV-artiges Hashing. Er ist fuer Regression/Replay gedacht, nicht als Security-Hash.

### Step-by-Step Replay

`createSimulationReplaySteps(result)` erstellt eine Drive-Level-Replay-Liste:

- sequence
- phaseLabel
- offenseTeamId
- resultType
- pointsScored
- totalYards
- turnover
- homeScore
- awayScore
- summary

Grenze: Die aktuelle Engine speichert noch keine native Snap-fuer-Snap-Historie. Das Replay ist daher Drive-level, nicht Play-by-Play auf Random-Roll-Ebene.

## Beispiel

```ts
const result = generateMatchStats(context, createRng(context.simulationSeed));
const capture = createSimulationReplayCapture(context, result);

// capture kann als JSON gespeichert werden
const restored = JSON.parse(JSON.stringify(capture));
const replay = replaySimulationCapture(restored);

if (!replay.matches) {
  console.log(replay.expectedFingerprint, replay.actualFingerprint);
}
```

## Tests

Datei:

- `src/modules/seasons/application/simulation/simulation-replay.service.test.ts`

Abgedeckt:

- Capture speichert Seed, Input, Fingerprint und Step-Replay
- Replay erzeugt identische Ergebnisse
- JSON-Storage-Roundtrip bleibt replaybar
- veraenderter Expected-Fingerprint wird als Mismatch sichtbar
- divergierender gespeicherter Seed/Input-Seed wird abgelehnt

## Debug UI

Keine Debug UI wurde eingebaut. Das Replay-System ist bewusst als Engine-/Tools-Service umgesetzt, weil kein konkreter Debug-Screen vorgegeben war. Ein UI-Badge oder Copy-Button kann spaeter auf Basis von `capture.seed` und `capture.resultFingerprint` ergaenzt werden.

## Ausgefuehrte Validierung

```bash
npx vitest run src/modules/seasons/application/simulation/simulation-replay.service.test.ts
```

Ergebnis:

- Test Files: 1 passed
- Tests: 5 passed

```bash
npx tsc --noEmit
```

Ergebnis: Gruen

```bash
npm run lint
```

Ergebnis: Gruen

```bash
npm test -- --run
```

Ergebnis:

- Test Files: 137 passed
- Tests: 787 passed
- Hinweis: Vitest meldet bestehende Node-Deprecation-Warnings fuer `punycode`; keine Testfehler.

## Bewertung

Das Replay-System verbessert die Reproduzierbarkeit von Simulationsbugs deutlich:

- Bugs koennen mit Capture JSON, Seed und Input exakt nachgestellt werden.
- Engine-Aenderungen koennen ueber Fingerprint-Mismatches sichtbar gemacht werden.
- Drive-Level-Step-Replay liefert eine schnelle Debug-Ansicht der Event-Reihenfolge.

## Naechste sinnvolle Ausbaustufen

- CLI-Script, das Capture JSON von stdin oder Datei replayt.
- Optional Debug-UI mit Seed/Fingerprint anzeigen und kopieren.
- Native Play-by-Play-Trace in der Engine, falls Random-Roll-Level-Debugging benoetigt wird.
- Persistenz von Replay-Captures bei fehlgeschlagenen QA-/E2E-Laeufen.

Status: Gruen
