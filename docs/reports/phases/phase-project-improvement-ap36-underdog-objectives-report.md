# AP36 - Underdog Gameplan Objectives

## Status

AP36: Gruen

Freigabe AP37: Ja

## Definierte Objectives

- Keep It Close: Endergebnis innerhalb des Underdog-Zielkorridors halten.
- Protect The Ball: Turnover-Limit einhalten.
- Overperform Offense: mehr Punkte erzielen als der Erwartungsboden vorgibt.
- Limit Their Offense: Favoriten-Offense unter einer Score-Schwelle halten.

Die Objectives haben jeweils maximal eine Kernbedingung und sind bewusst Score-/Stat-basiert. Es gibt keine Simulation-Buffs, keine Score-Korrektur und keine globale Underdog-Balance.

## Auswahl- und Ableitungslogik

Die Auswahl erfolgt automatisch ueber die bestehende AP33-Erwartungslogik:

- `heavy underdog`: Objectives aktiv.
- `underdog`: Objectives aktiv.
- `even`: keine Underdog Objectives.
- `favorite`: keine Underdog Objectives.

Die Zielwerte werden aus der Erwartung abgeleitet:

- Heavy Underdog: Keep It Close bis 16 Punkte, Ball Security bis 2 Turnover, Offense ab Erwartungsboden + 4, gegnerische Offense bis 28 Punkte.
- Underdog: Keep It Close bis 8 Punkte, Ball Security bis 1 Turnover, Offense ab Erwartungsboden + 4, gegnerische Offense bis 24 Punkte.

## Bewertungslogik

Jedes Objective wird nach dem Spiel als `fulfilled`, `partial` oder `missed` bewertet:

- Keep It Close: volle Erfuellung im Hauptkorridor, teilweise im erweiterten Korridor.
- Protect The Ball: volle Erfuellung bei Turnover-Limit, teilweise bei einem Turnover darueber; fehlende Stats werden sicher als teilweise/nicht voll auswertbar markiert.
- Overperform Offense: volle Erfuellung ueber Erwartung, teilweise am Erwartungsboden.
- Limit Their Offense: volle Erfuellung unter Score-Cap, teilweise bis sieben Punkte darueber.

Zusatzsignale:

- kleines Morale-Signal bei mindestens zwei Objective-Punkten.
- kleines Development-Signal je nach Anzahl erfuellter Ziele.
- Rebuild-Signal fuer AP35, wenn mindestens zwei Objectives erfuellt sind oder ein gemischter starker Teil-Erfolg entsteht.

Diese Werte sind Feedback-/Signalwerte im Report, keine direkte Match-Outcome-Beeinflussung.

## UI-Integration

Pre-Game:

- Das Preparation Panel zeigt bei Underdog- und Heavy-Underdog-Matchups automatisch die Objectives inklusive Zielwert und kurzer Bedeutung.
- Favoriten und ausgeglichene Matchups zeigen keine Underdog-Objective-Karten.

Post-Game:

- Neuer kompakter Report-Abschnitt `Underdog Objectives` direkt nach Moral Victories.
- Jede Objective-Karte zeigt Status, Ziel und kurze Erklaerung.
- `Feedback Summary` enthaelt ein kompaktes Objective-Item mit Morale-/Development-/Rebuild-Hinweis.

## Beispielspiele

- 68 OVR gegen 82 OVR, Niederlage 17:31: Keep It Close, Protect The Ball und Overperform Offense erfuellt; Limit Their Offense teilweise. Ergebnis: klares Rebuild-Signal.
- 69 OVR gegen 82 OVR, Niederlage 14:24 mit fehlenden Turnover-Stats: Score-Ziele werden ausgewertet, Protect The Ball bleibt teilweise/nicht voll auswertbar.
- 82 OVR gegen 75 OVR, Sieg 27:20: Favoritenrolle, daher keine Underdog Objectives.

## Tests

Erfolgreich ausgefuehrt:

- `npx vitest run src/modules/seasons/domain/weak-team-goals.test.ts src/components/match/game-preparation-model.test.ts src/components/match/match-report-model.test.ts`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`

Hinweis: Der erste Sandbox-Lauf von `npm run test:e2e:week-loop` scheiterte vor Teststart an `tsx` IPC-Rechten (`EPERM` auf eine Pipe unter `/var/folders/...`). Der eskalierte Lauf war erfolgreich: 1 Playwright-Test bestanden.

## Bekannte Einschraenkungen

- V1 nutzt automatische Auswahl statt manueller Objective-Wahl.
- Keine Persistenz eigener Objective-Auswahl; Objectives werden aus Matchup und finalen Matchdaten reproduzierbar abgeleitet.
- `Develop Young Core` wurde bewusst nicht umgesetzt, weil der Match Report aktuell keine belastbaren jungen-Spieler-Performance-Daten bereitstellt. Das bleibt ein guter Kandidat fuer eine spaetere, datenbasierte Erweiterung.
- AP35 bekommt ein klares Rebuild-Signal im Report/Feedback. Das Dashboard aggregiert weiterhin seine bestehenden Saison-Heuristiken und liest noch keine persistierten Objective-Ergebnisse.
