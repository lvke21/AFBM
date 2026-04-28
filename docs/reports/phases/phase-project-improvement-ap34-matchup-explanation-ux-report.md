# AP34 - Matchup Expectation & Post-Game Explanation UX

Status: Gruen  
Datum: 2026-04-26

## Ziel

AP34 verbessert die Verstaendlichkeit vor und nach dem Spiel: Der Spieler sieht, welches Matchup erwartet wurde, warum ein Ergebnis entstanden ist und ob das eigene Team ueber oder unter Erwartung gespielt hat. Die Umsetzung nutzt die AP33-Erwartungslogik wieder und veraendert keine Simulation, Score Engine oder Balance-Parameter.

## Umgesetzte UX-Erklaerungen

### Pre-Game Matchup Expectation

Die Spielvorbereitung zeigt jetzt:

- Staerkevergleich des eigenen Teams gegen den Gegner.
- Erwartungskategorie aus AP33: `heavy underdog`, `underdog`, `even`, `favorite`.
- erwartete Schwierigkeit.
- Zielkorridor fuer Punkte.
- kurze Anwendersprache, z. B. warum ein Underdog-Spiel schwer ist.

### Post-Game Explanation

Der Match Report enthaelt jetzt ein eigenes Panel `Matchup Expectation` mit:

- Erwartung vor dem Spiel.
- Ergebnis vs Erwartung.
- Staerkevergleich.
- kompaktem Summary-Satz.
- maximal 5 Treibern:
  - Rating / Matchup
  - Ergebnis vs Erwartung
  - Turnovers
  - On-Field Wirkung durch Yards und explosive Plays
  - Gameplan / AI

Fehlende Daten werden sicher behandelt: Alte oder noch nicht abgeschlossene Matches zeigen Fallbacks und lassen Turnover-/Produktionsgruende weg, wenn keine Stats vorhanden sind.

## Neue/geaenderte Komponenten

- `src/components/match/matchup-explanation-panel.tsx`
  - neues Report-Panel fuer Erwartung, Ergebnis und Treiber.
- `src/components/match/match-report-model.ts`
  - neuer `buildMatchupExplanationState`.
  - Wiederverwendung von AP33 `buildMoralVictoryState` und `evaluateMoralVictory`.
  - kompakte Treiberlogik fuer Rating, Resultat, Turnovers, Produktion und Gameplan.
- `src/components/match/game-preparation-model.ts`
  - Pre-Game-Modell nutzt AP33 `classifyMatchExpectation`.
- `src/components/match/game-preparation-panel.tsx`
  - neue Pre-Game-Erwartungssektion.
- `src/app/app/savegames/[savegameId]/game/report/page.tsx`
  - Report rendert `MatchupExplanationPanel` vor Moral Victories.

## Beispieltexte

- Heavy Underdog vor dem Spiel: "Klarer Underdog: Ein knappes Spiel, genug Punkte oder stabile Defense sind echte Fortschritte."
- Underdog nach knapper Niederlage: "Ueber Erwartung" mit Gruenden wie "Niederlage knapp gehalten" und "Blowout vermieden".
- Favorit nach erwartbarem Sieg: "Im Rahmen der Erwartung" ohne Moral-Victory-Bonus.
- Upset: "Klar ueber Erwartung" mit markiertem `Upset geschafft`.
- Fehlende Daten: "Vor dem Spiel zeigt diese Sektion die Erwartung; nach dem Spiel wird sie mit dem Ergebnis verglichen."

## Geaenderte Dateien

- `src/components/match/match-report-model.ts`
- `src/components/match/match-report-model.test.ts`
- `src/components/match/matchup-explanation-panel.tsx`
- `src/components/match/game-preparation-model.ts`
- `src/components/match/game-preparation-model.test.ts`
- `src/components/match/game-preparation-panel.tsx`
- `src/app/app/savegames/[savegameId]/game/report/page.tsx`
- `docs/reports/phases/phase-project-improvement-ap34-matchup-explanation-ux-report.md`

## Tests

| Command | Ergebnis |
| --- | --- |
| `npx vitest run src/modules/seasons/domain/weak-team-goals.test.ts src/components/match/match-report-model.test.ts src/components/match/game-preparation-model.test.ts` | Gruen: 3 Files, 25 Tests |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run test:e2e:week-loop` | Gruen: 1 Playwright-Test |

Hinweis: Der Week-Loop wurde ausserhalb der Sandbox ausgefuehrt, weil `tsx` in der Sandbox reproduzierbar an der lokalen IPC-Pipe scheitert.

## Bekannte Einschraenkungen

- Fatigue/Injury werden nur dann in AP34-Erklaerungen verwendet, wenn belastbare Reportdaten vorhanden sind. Aktuell werden sie nicht aus historischen Matches erraten.
- Die Gameplan-Erklaerung bleibt bewusst grob und nutzt die vorhandene AP22-Zusammenfassung; es gibt keine neue Playcalling-Analyse.
- AP34 erklaert Ergebnisse, veraendert sie aber nicht.

## Bewertung

- Matchup-Erwartung vor dem Spiel: umgesetzt.
- Ergebnis-vs-Erwartung nach dem Spiel: umgesetzt.
- Wichtigste Treiber kompakt: umgesetzt.
- Fehlende Daten sicher: umgesetzt.
- Keine Simulation-/Balance-Aenderung: eingehalten.
- Week Loop stabil: ja.

Status AP34: Gruen  
Freigabe AP35: Ja
