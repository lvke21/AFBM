# AP26 - Long-Term Fatigue Accumulation Rebalance

Status: Gruen  
Datum: 2026-04-26

## Ziel

AP26 stabilisiert Long-Term-Fatigue ueber mehrere Wochen, ohne Score Engine, Roster/Prestige oder Injury-Ratenformeln zu veraendern. Fatigue soll relevant bleiben, aber Spieler und Teams sollen nicht dauerhaft bei 99 festkleben.

## Gefundene Snowball-Ursache

Der bisherige Match-Fatigue-Zuwachs wurde bei sehr hoher bestehender Fatigue nahezu linear weiter addiert. Dadurch konnten Starter nach wiederholter hoher Last schnell wieder an die Obergrenze laufen. Recovery war vorhanden, aber Post-Match-Spitzen dominierten die Langzeitverteilung.

Zusaetzlich hatten klare Gewinner zu wenig Wear-and-Tear. In langen Suiten konnten Dauersieger mit stabiler Leistung weiter dominieren, waehrend Verlierer trotz Recovery kaum Ergebnisspielraum bekamen.

## Umsetzung

Geaendert wurden nur Fatigue-/Condition-Pfade:

- Match-Fatigue-Soft-Cap:
  - ab 55 Fatigue reduzierte Zuwachsrate
  - ab 70 staerker reduzierte Zuwachsrate
  - ab 85 deutliche Diminishing Returns
  - oberhalb 92 zusaetzliche Soft-Cap-Kompression

- Recovery bleibt plan- und statusbasiert:
  - bestehende High-Fatigue-Recovery bleibt erhalten
  - Recovery-Plan bleibt durch Weekly-Plan-Logik klar wertvoll
  - Intense bleibt ueber Weekly-Plan weiterhin riskanter

- Front-Runner-Load:
  - Starter in klar gewonnenen Spielen erhalten +2 Match-Fatigue, wenn sie viel gespielt haben
  - Ziel: Dauersieger tragen etwas mehr saisonale Last
  - keine direkte Score-Engine-Aenderung

Nicht geaendert:

- Score Engine / Drive Outcome
- Roster-/Prestige-Kalibrierung
- Injury-Ratenformel
- AI/Gameplan
- Auth/Firestore/Prisma

## Vorher/Nachher Kennzahlen

Vergleichsbasis: AP25 Full Extended Suite mit 2.016 Spielen.

| Metrik | Vor AP26 | Nach AP26 |
| --- | ---: | ---: |
| Fatigue Median | 70 | 63 |
| Fatigue P90 | 99 | 94 |
| Avg Margin | 38.26 | 38.22 |
| Blowout Rate | 77.8% | 77.1% |
| Close Game Rate | 10.2% | 10.5% |
| Injury Rate | 0.878 | 0.874 |
| Severe Injury Rate | 0.112 | 0.112 |

AP26 senkt Fatigue sichtbar, ohne Injury Rate zu erhoehen. Die Blowout-Verbesserung ist klein, aber in die richtige Richtung. Das bestaetigt AP28/AP25: Fatigue ist ein Verstaerker, nicht die alleinige Hauptursache.

## Szenario-Hinweise

- Equal-vs-Equal bleibt gesund: Avg Margin 6.72, Blowout Rate 1.6%, Close Rate 61.9%.
- Medium-vs-Medium bleibt auffaellig: Avg Margin 42.79, Blowout Rate 94.8%.
- Strong/Weak-Mismatches bleiben sehr deutlich.

Bewertung: AP26 stabilisiert den Konditionsverlauf, aber die verbleibenden Blowouts liegen vor allem in Profil-/Gameplan-/Underdog-Resilienz und nicht mehr in eskalierender Fatigue.

## Tests

- `npx vitest run src/modules/seasons/application/simulation/fatigue-recovery.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts src/modules/players/domain/player-injury.test.ts src/modules/savegames/domain/weekly-plan.test.ts`
- `npx tsx scripts/simulations/qa-extended-season-balance-suite.ts`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`

Alle finalen Checks sind gruen.

## Bekannte Einschraenkungen

- Blowouts bleiben hoch, trotz leichtem Rueckgang.
- Fatigue P90 ist nicht mehr bei 99, aber mit 94 weiterhin hoch genug, um strategisch relevant zu bleiben.
- Medium-vs-Medium-Snowballing ist weiterhin ein separates Balance-Problem.

## Ergebnis

Status AP26: Gruen  
Freigabe AP27: Ja
