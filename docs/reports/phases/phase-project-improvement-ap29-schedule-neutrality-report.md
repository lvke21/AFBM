# AP29 - Extended Suite Schedule Neutrality & Strength-of-Schedule Diagnostics

Status: Gruen  
Datum: 2026-04-26

## Ziel

AP29 macht die Extended Balance Suite als Balance-Messinstrument fairer und aussagekraeftiger. Es wurden keine Gameplay-, Score-, Fatigue-, Injury- oder Rating-Parameter veraendert. Der Scope liegt ausschliesslich in Suite-/QA-Struktur und Reporting.

## Alter Schedule

Der bisherige Legacy-Schedule nutzte pro Woche feste Paarungen:

- STR1 gegen WEK1 und MED1
- STR2 gegen WEK2 und MED2
- MED1 gegen MED2 und STR1
- MED2 gegen MED1 und STR2
- WEK1 gegen STR1 und EQL1
- WEK2 gegen STR2 und EQL2
- EQL1 gegen EQL2 und WEK1
- EQL2 gegen EQL1 und WEK2

Dadurch spielten Teams zwar gleich viele Spiele, aber nur gegen zwei feste Gegner. Die Strength-of-Schedule war stark verzerrt.

| Team | Rating | Gegner | Avg Gegner-Rating | Rating Delta |
| --- | ---: | --- | ---: | ---: |
| STR1 | 84 | WEK1, MED1 | 72.00 | +12.00 |
| STR2 | 82 | WEK2, MED2 | 72.00 | +10.00 |
| MED1 | 76 | MED2, STR1 | 79.50 | -3.50 |
| MED2 | 75 | MED1, STR2 | 79.00 | -4.00 |
| WEK1 | 68 | STR1, EQL1 | 79.00 | -11.00 |
| WEK2 | 69 | STR2, EQL2 | 78.00 | -9.00 |
| EQL1 | 74 | EQL2, WEK1 | 71.00 | +3.00 |
| EQL2 | 74 | EQL1, WEK2 | 71.50 | +2.50 |

Legacy-Fairness:

| Metrik | Wert |
| --- | ---: |
| Games | 2.016 |
| Games pro Team | 504 |
| Games-per-Team Spread | 0 |
| Avg-Opponent-Rating Spread | 8.50 |
| Gegner pro Team | 2 |
| Matchups pro Paar | 252 |

Die Extremwerte waren strukturell erklaerbar: MED2 spielte 252-mal gegen STR2 und 252-mal gegen MED1 und ging 0-503.

## Neue Schedule-Struktur

Die Suite unterstuetzt jetzt Schedule-Varianten:

- `balanced-rotation` als neuer Default
- `round-robin`
- `randomized`
- `legacy` fuer Vorher/Nachher-Vergleiche

`balanced-rotation` nutzt eine Round-Robin-Rotation ueber alle 8 Teams. Jede Mannschaft spielt in 14 Wochen zweimal gegen jedes andere Team. Home/Away ist ausgeglichen.

Neue Diagnosen im Suite-Output:

- Schedule-Variante und Seed
- Strength-of-Schedule pro Team
- durchschnittliche Gegnerstaerke
- Rating-Delta pro Team
- Home/Away-Verteilung
- Gegnerprofil-Verteilung
- Team-vs-Team-Matchup-Verteilung
- Fairness-Kennzahlen fuer Games pro Team und Matchup-Paare

## Neuer Balanced-Run

Default-Lauf nach AP29: 18 Saisons, 14 Wochen, `balanced-rotation`.

| Metrik | Legacy | Balanced Rotation |
| --- | ---: | ---: |
| Games | 2.016 | 1.008 |
| Games pro Team | 504 | 252 |
| Games-per-Team Spread | 0 | 0 |
| Avg-Opponent-Rating Spread | 8.50 | 2.29 |
| Matchup-Paar Minimum | 252 | 36 |
| Matchup-Paar Maximum | 252 | 36 |
| Avg Margin | 36.42 | 27.03 |
| Blowout Rate | 75.0% | 53.2% |
| Close Game Rate | 11.0% | 18.5% |

Balanced Rotation reduziert die Schedule-Verzerrung deutlich. Die Suite spielt weniger Gesamtspiele, weil jedes Team nun einmal pro Woche spielt statt zweimal. Dadurch sind die Ergebnisse strukturell realistischer und weniger durch Doppelbelastung verzerrt.

## Strength-of-Schedule nach AP29

| Team | Rating | Games | Home | Away | Avg Gegner-Rating | Rating Delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| STR1 | 84 | 252 | 126 | 126 | 74.00 | +10.00 |
| STR2 | 82 | 252 | 126 | 126 | 74.29 | +7.71 |
| MED1 | 76 | 252 | 126 | 126 | 75.14 | +0.86 |
| MED2 | 75 | 252 | 126 | 126 | 75.29 | -0.29 |
| WEK1 | 68 | 252 | 126 | 126 | 76.29 | -8.29 |
| WEK2 | 69 | 252 | 126 | 126 | 76.14 | -7.14 |
| EQL1 | 74 | 252 | 126 | 126 | 75.43 | -1.43 |
| EQL2 | 74 | 252 | 126 | 126 | 75.43 | -1.43 |

Jedes Team spielt jedes andere Team 36-mal. Es gibt keine festen Zwei-Gegner-Pfade mehr.

## Ergebnisvergleich Teams

| Team | Legacy Winrate | Balanced Winrate | Bewertung |
| --- | ---: | ---: | --- |
| STR1 | 98.0% | 95.5% | weiterhin dominant |
| STR2 | 100.0% | 88.9% | nicht mehr ungeschlagen |
| MED1 | 52.8% | 64.0% | profitiert von fairem Schedule |
| MED2 | 0.0% | 28.3% | 0-503-Ausreisser entfernt |
| WEK1 | 0.0% | 5.0% | schwach, aber nicht mehr komplett sieglos |
| WEK2 | 0.0% | 5.8% | schwach, aber nicht mehr komplett sieglos |
| EQL1 | 82.7% | 55.0% | alte Schedule-Bevorzugung entfernt |
| EQL2 | 71.7% | 56.7% | alte Schedule-Bevorzugung entfernt |

## Szenario-Befunde

Balanced Rotation macht die Suite aussagekraeftiger:

- Equal-vs-Equal bleibt gesund: 0.0% Blowouts, 69.4% Close Rate.
- Strong-vs-Strong bleibt gesund: 0.0% Blowouts, 69.4% Close Rate.
- Weak-vs-Weak bleibt gesund: 0.0% Blowouts, 86.1% Close Rate.
- Medium-vs-Medium verbessert sich stark, bleibt aber auffaellig: 47.2% Blowouts und 100% Favorite Winrate im 36-Spiele-Sample.
- Strong-vs-Weak bleibt plausibel dominant: 100% Blowouts, 100% Favorite Winrate.

Damit zeigt AP29: Ein grosser Teil der Full-Suite-Verzerrung kam aus dem Schedule. Ein separater Near-Peer-Rating-Befund bleibt aber bestehen.

## Weitere Schedule-Varianten

Kurzer Kontrolllauf mit 2 Saisons und 7 Wochen:

| Variante | Games | SoS Spread | Games Spread | Min/Max Paar | Avg Margin | Blowout |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| round-robin | 56 | 2.29 | 0 | 2 / 2 | 20.84 | 39.3% |
| randomized | 56 | 4.71 | 0 | 1 / 5 | 17.75 | 30.4% |

`round-robin` ist exakt gleichmaessig. `randomized` ist reproduzierbar, aber bewusst weniger gleichmaessig und eher fuer Seed-Sensitivitaetslaeufe geeignet.

## Tests

- `npx vitest run src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts`
- `npx tsx scripts/simulations/qa-extended-season-balance-suite.ts`
- Legacy-vs-Balanced-Vergleich per `runExtendedSeasonBalanceSuite({ scheduleVariant })`
- Round-Robin-/Randomized-Kontrolllauf per `runExtendedSeasonBalanceSuite({ scheduleVariant })`
- `npx tsc --noEmit`
- `npm run lint`

## Geaenderte Dateien

- `src/modules/seasons/application/simulation/extended-season-balance-suite.ts`
- `src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts`
- `scripts/simulations/qa-extended-season-balance-suite.ts`
- `docs/reports/simulations/extended-season-balance-results.json`
- `docs/reports/simulations/extended-season-balance-results.html`
- `docs/reports/phases/phase-project-improvement-ap29-schedule-neutrality-report.md`

## Bewertung

AP29 ist Gruen:

- Strength-of-Schedule ist sichtbar und deutlich ausgeglichener.
- Jedes Team hat gleiche Spielzahl und ausgeglichene Home/Away-Verteilung.
- Jedes Paar tritt im Default-Run gleich oft gegeneinander an.
- Der MED2-Extremausreisser verschwindet: 0-503 wird zu 71-180.
- Die Balance-Daten sind aussagekraeftiger, weil sie nicht mehr von festen Zwei-Gegner-Pfaden dominiert werden.

Bekannte Einschraenkung: Medium-vs-Medium bleibt auch im fairen Schedule auffaellig. Das ist jetzt sauberer als separates Near-Peer-Rating-/Drive-Outcome-Thema isoliert.

Status AP29: Gruen
