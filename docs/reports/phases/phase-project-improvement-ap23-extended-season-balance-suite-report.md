# AP23 - Extended Season Balance Suite

## Status

AP23 ist Gruen. Es wurde eine reproduzierbare Langzeit-Balance-Suite erstellt, ausgefuehrt und dokumentiert. Es wurden keine Gameplay-Parameter geaendert. Ein naechstes Arbeitspaket ist aktuell nicht definiert.

## Suite-Aufbau

- Neues QA-Modul: `runExtendedSeasonBalanceSuite`.
- Neues Script: `scripts/simulations/qa-extended-season-balance-suite.ts`.
- Standardlauf:
  - 18 Saisons
  - 14 Wochen pro Saison
  - 8 Matchups pro Woche
  - 2.016 Spiele gesamt
- Teamprofile:
  - 2 starke Teams
  - 2 mittlere Teams
  - 2 schwache Teams
  - 2 gleich starke Teams
- Der Lauf nutzt deterministische Seeds und einen stabilen Output-Fingerprint.
- Fatigue, Recovery und Injuries werden zwischen Wochen fortgeschrieben.
- Weekly Development Focus wird fuer XP-Auswertung gesetzt und Progression-XP wird gemessen.
- AI-Archetypes werden pro Team/Spiel ausgewertet.

## Getestete Szenarien

| Szenario | Spiele |
| --- | ---: |
| `equal-vs-equal` | 252 |
| `equal-vs-weak` | 252 |
| `medium-vs-medium` | 252 |
| `medium-vs-strong` | 252 |
| `strong-vs-medium` | 252 |
| `strong-vs-weak` | 252 |
| `weak-vs-equal` | 252 |
| `weak-vs-strong` | 252 |

## Wichtigste Kennzahlen

| Metrik | Wert |
| --- | ---: |
| Spiele | 2.016 |
| Avg Score | 47.21 |
| Score StdDev | 13.56 |
| Avg Margin | 45.76 |
| Blowout Rate | 0.933 |
| Close Game Rate | 0.017 |
| Injury Rate | 0.835 pro Spiel |
| Schwere Injuries | 0.104 pro Spiel |
| Fatigue P10 / Median / P90 | 4 / 70 / 99 |
| Avg Progression XP | 50.25 |

Fingerprint:

`2016#47.21#45.76#0.835#0.104#equal-vs-equal:50.28:0.933|equal-vs-weak:49.1:0.754|medium-vs-medium:42.9:0.905|medium-vs-strong:45.99:0.802|strong-vs-medium:45.33:0.806|strong-vs-weak:46.69:0.897|weak-vs-equal:50.54:0.774|weak-vs-strong:46.84:0.813#BALANCED_MATCHUP:1768:0.499|FAVORITE_CONTROL:1132:0.562|UNDERDOG_VARIANCE:1132:0.433`

## AI-/Gameplan-Ergebnisse

| Archetype | Team-Spiele | Winrate | Avg Score |
| --- | ---: | ---: | ---: |
| `BALANCED_MATCHUP` | 1.768 | 0.499 | 23.96 |
| `FAVORITE_CONTROL` | 1.132 | 0.562 | 27.23 |
| `UNDERDOG_VARIANCE` | 1.132 | 0.433 | 19.42 |

Die AI-Archetypes werden reproduzierbar erfasst und zeigen erkennbare Ergebnisunterschiede. `FAVORITE_CONTROL` erzielt erwartbar die beste Winrate, `UNDERDOG_VARIANCE` liegt niedriger, bleibt aber nicht bei 0%.

## Balance-Befunde

- Die Suite laeuft technisch stabil und reproduzierbar.
- Injury-Rate wirkt nach AP20 deutlich kontrollierter: 0.835 neue Injuries pro Spiel, 0.104 schwere Injuries pro Spiel.
- Progression-XP wird erfasst und liegt im Langzeitmittel bei 50.25 XP.
- Fatigue entwickelt sich sehr hoch: Median 70, P90 99. Recovery ist vorhanden, aber Long-Term-Belastung bleibt ein klares Beobachtungsthema.
- Der kritischste Befund ist die sehr hohe Blowout Rate von 93.3% bei nur 1.7% engen Spielen. AP23 aendert absichtlich keine Parameter, markiert dies aber als prioritaeres Folge-Balancing-Thema.

## Geaenderte Dateien

- `src/modules/seasons/application/simulation/extended-season-balance-suite.ts`
- `src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts`
- `scripts/simulations/qa-extended-season-balance-suite.ts`
- `docs/reports/simulations/extended-season-balance-results.html`
- `docs/reports/simulations/extended-season-balance-results.json`
- `docs/reports/phases/phase-project-improvement-ap23-extended-season-balance-suite-report.md`

## Tests und Ergebnisse

| Command | Ergebnis |
| --- | --- |
| `npx vitest run src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts` | Gruen: 1 File, 2 Tests |
| `npx vitest run src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts src/modules/seasons/application/simulation/simulation-balancing.test.ts src/modules/seasons/application/simulation/production-qa.test.ts` | Gruen: 3 Files, 8 Tests |
| `npx tsx scripts/simulations/qa-extended-season-balance-suite.ts` | Gruen: 2.016 Spiele, HTML/JSON erzeugt |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run test:e2e:week-loop` | Gruen ausserhalb der Sandbox: 1 Playwright-Test bestanden |

## Ergebnisdateien

- `docs/reports/simulations/extended-season-balance-results.html`
- `docs/reports/simulations/extended-season-balance-results.json`

## Bekannte Einschraenkungen

- Die Suite ist synthetisch und nutzt definierte Profilteams statt echter laufender Liga-Savegames.
- Progression wird als XP-Verteilung gemessen; Attribute werden in der QA-Suite nicht dauerhaft mutiert.
- Die hohe Blowout Rate ist ein Analyseergebnis, nicht in AP23 behoben.
- Firestore, Auth und Prisma-Architektur wurden nicht veraendert.

## Freigabe

AP23 ist Gruen. Es ist kein weiteres Arbeitspaket definiert; naechstes freigegebenes AP: Nein.
