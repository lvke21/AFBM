# AP27 - Underdog & Comeback Resilience Tuning

Status: Gruen  
Datum: 2026-04-26

## Ziel

AP27 senkt extreme Margins durch mehr Widerstandsfaehigkeit fuer Underdogs und klar zurueckliegende Teams. Favoriten sollen weiterhin klar beguenstigt bleiben, aber Spiele sollen seltener in Winner-Take-All-Verlaeufe kippen.

Nicht geaendert wurden:

- Roster-/Prestige-Kalibrierung
- Fatigue-Parameter
- Injury-Rate
- AI-Engine
- Firestore/Auth/Prisma

## Gefundene Ursache

AP25 und AP26 haben Score-Volatilitaet und Long-Term-Fatigue bereits messbar entschaerft. Die AP28-/AP26-Daten zeigten aber weiterhin, dass Blowouts vor allem dadurch entstehen, dass Favoriten nach Fuehrung stabil weiter punkten, waehrend der Verlierer haeufig bei sehr niedrigen Scores bleibt.

Die vorhandenen AI-/Gameplan-Daten wurden in der Drive-Auswertung nur begrenzt als situativer Konter genutzt. Underdogs mit Rueckstand hatten zu wenig offensive Stabilisierung, waehrend fuehrende Favoriten nicht stark genug gedrosselt wurden.

## Umsetzung

Geaendert wurde nur die Match-Drive-Auswertung in `src/modules/seasons/application/simulation/match-engine.ts`.

Neue Mechanik:

- Underdog-Comeback-Boost:
  - aktiv nur bei Rating-Nachteil ab 6 Punkten
  - aktiv nur bei Rueckstand ab 7 Punkten
  - aktiv nur in der regulaeren Spielphase, nicht in den letzten 120 Sekunden
  - beeinflusst Pass Yards, Rush Yards und Drive Quality moderat
  - aggressive X-Factor/Gameplan-Auswahl erhoeht den Boost leicht

- Fuehrenden-Throttle:
  - fuehrende Teams werden bei klarer Fuehrung weiter leicht gedrosselt
  - Rating-Favoriten erhalten zusaetzliche Drosselung, wenn sie bereits fuehren

- Risiko-Balance:
  - Underdogs erhalten einen kleinen Turnover-Stabilisator
  - aggressive/HUNT_TURNOVERS-Plans behalten ein erhoehtes Risiko

Die Formel bleibt bewusst klein und deterministisch testbar. Sie greift nicht in Roster, Injury, Fatigue oder AI-Auswahl ein.

## Vorher/Nachher Kennzahlen

Vergleichsbasis: AP26 Full Extended Suite mit 2.016 Spielen.

| Metrik | Vor AP27 | Nach AP27 |
| --- | ---: | ---: |
| Avg Margin | 38.22 | 36.42 |
| Blowout Rate | 77.1% | 75.0% |
| Close Game Rate | 10.5% | 11.0% |
| Loser Score <= 7 | 80.6% | 77.5% |
| Winner Score >= 42 | 58.5% | 56.3% |
| Fatigue Median | 63 | 63 |
| Fatigue P90 | 94 | 94 |
| Injury Rate | 0.874 | 0.875 |
| Severe Injury Rate | 0.112 | 0.112 |

Bewertung: AP27 senkt Margins und Blowouts messbar, ohne Fatigue oder Injuries neu zu kalibrieren. Der Effekt ist bewusst moderat, weil Favoritenvorteile nicht kuenstlich neutralisiert werden sollen.

## Szenarien

Gezielter AP27-Batch mit 120 Spielen je Szenario:

| Szenario | Avg Margin | Blowout Rate | Close Rate | Loser <= 7 | Favoriten-Winrate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Equal vs Equal | 6.23 | 0.0% | 66.7% | 32.5% | 41.7% |
| Medium vs Medium | 8.36 | 5.0% | 58.3% | 29.2% | 66.7% |
| Strong vs Weak | 29.05 | 75.8% | 0.0% | 34.2% | 100.0% |

Full Extended Suite nach AP27:

- Equal-vs-Equal bleibt gesund: Avg Margin 6.93, Blowout Rate 2.0%, Close Rate 63.9%.
- Strong/Weak bleibt klar favoritenlastig: Favoriten gewinnen nahezu alle Spiele.
- UNDERDOG_VARIANCE gewinnt weiterhin selten, steigt aber leicht auf 0.9% Winrate.

Damit bleibt Strong-vs-Weak kein Coinflip, waehrend niedrige Loser-Scores etwas seltener werden.

## Tests

- `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts src/modules/gameplay/domain/ai-team-strategy.test.ts`
- `npx vitest run src/modules/seasons/application/simulation/production-qa.test.ts`
- `npx vitest run src/modules/seasons/application/simulation/production-qa.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/simulation/extended-season-balance-suite.test.ts src/modules/gameplay/domain/ai-team-strategy.test.ts src/modules/seasons/application/simulation/fatigue-recovery.test.ts src/modules/seasons/application/simulation/player-condition.test.ts`
- `npx tsx scripts/simulations/qa-extended-season-balance-suite.ts`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`

Alle finalen Checks sind gruen.

## Bekannte Einschraenkungen

- Blowout Rate bleibt mit 75.0% weiterhin hoch.
- Medium-vs-Medium ist in der Full Extended Suite weiterhin auffaellig und duerfte ein separates Teamprofil-/Saisonfortschreibungsproblem enthalten.
- Underdog-Resilience ist bewusst konservativ; sie verhindert keine klaren Mismatches.
- Weitere Balance-Arbeit sollte auf Medium-vs-Medium-Snowballing, Winner-Score-Spikes und saisonale Teamprofil-Drift fokussieren.

## Ergebnis

Status AP27: Gruen  
Freigabe weiterer APs: Nein, nicht gestartet
