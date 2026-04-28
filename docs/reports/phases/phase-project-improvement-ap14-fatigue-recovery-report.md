# AP 14 - Fatigue & Recovery vertiefen

Datum: 2026-04-26

Status: Gruen

## Ziel

Training, Spiele und Recovery sollen spuerbare, aber kontrollierte Auswirkungen auf Spielerleistung und Week-Entscheidungen haben. AP14 erweitert Fatigue/Recovery ohne neue Injury-Logik, ohne globale Simulation-Neuschreibung und ohne Firestore-Produktivmigration.

## Umgesetzter Scope

Umgesetzt:

- zentrales Fatigue-/Recovery-Regelmodul
- erweiterte Match-Belastung nach Snaps, Starter-Status und Positionslast
- staerkere Recovery fuer stark ermuedete, gesunde aktive Spieler
- Weekly Plan aus AP10 wirkt nun klarer:
  - Recovery senkt Fatigue deutlich
  - Balanced erzeugt moderate Trainingslast
  - Intense erzeugt klare Fatigue-Kosten
- Fatigue beeinflusst Game-Day-Readiness und Snap-Anteile moderat
- bestehende Match-Engine-Readiness verwendet die neuen Multiplikatoren automatisch
- Tests fuer Belastung, Recovery, Weekly-Plan-Unterschiede, Performance-Einfluss und Grenzen

Nicht umgesetzt:

- keine neue Injury-Logik
- keine neue Persistenz fuer Fatigue-Verlauf
- keine UI-Erweiterung
- keine Firestore-Produktivmigration
- keine globale Simulation-Neuschreibung

## Geaenderte Dateien

- `src/modules/seasons/application/simulation/fatigue-recovery.ts`
- `src/modules/seasons/application/simulation/fatigue-recovery.test.ts`
- `src/modules/seasons/application/simulation/player-condition.ts`
- `src/modules/seasons/application/simulation/player-condition.test.ts`
- `src/modules/seasons/application/simulation/depth-chart.ts`
- `src/modules/seasons/application/simulation/depth-chart.test.ts`
- `src/modules/savegames/domain/weekly-plan.ts`
- `src/modules/savegames/domain/weekly-plan.test.ts`
- `src/modules/savegames/application/week-flow.service.test.ts`
- `docs/reports/phases/phase-project-improvement-ap14-fatigue-recovery-report.md`

## Fatigue-/Recovery-Regeln

### Match-Belastung

Match-Fatigue entsteht aus:

- Total Snaps
- Starter-Status
- Positionslast:
  - Skill-/Perimeter-Positionen wie RB, WR, CB, LB/Safety bekommen leicht mehr Belastung
  - Trench-Positionen bekommen kleine Zusatzlast
- High-Usage-Schwelle:
  - ab 40 Snaps leichte Zusatzlast
  - ab 55 Snaps hoehere Zusatzlast

Die Match-Fatigue ist pro Spiel auf maximal 18 Punkte begrenzt und bei 99 gedeckelt.

### Training und Weekly Plan

Weekly Plan wirkt vor der Woche auf das managerkontrollierte Team:

- `RECOVERY`: Fatigue -16, Morale +3
- `BALANCED`: Fatigue +2, Morale +0
- `INTENSE`: Fatigue +10, Morale -2
- Offense/Defense Opponent Focus gibt weiterhin einen kleinen Morale-Bonus von +1

Damit ist Recovery spuerbar wertvoll, Balanced nicht mehr reine kostenlose Erholung und Intense eine bewusste Belastungsentscheidung.

### Recovery-Abbau

Weekly Recovery nutzt weiter die bestehenden Statusregeln, ergaenzt aber:

- Fatigue ab 55: +3 Recovery-Bonus
- Fatigue ab 75: +5 Recovery-Bonus
- gesunde aktive Spieler: +2 Recovery-Bonus
- Untergrenze Fatigue: 0
- Morale bleibt zwischen 20 und 99

### Performance-Einfluss

Fatigue erzeugt moderate Game-Day-Multiplikatoren:

- Fatigue bis 35: keine Readiness-Strafe
- Fatigue ueber 35: schrittweise Readiness-Strafe
- Fatigue ueber 45: schrittweise Snap-Strafe
- harte Untergrenzen:
  - Readiness-Multiplikator mindestens 0.82
  - Snap-Multiplikator mindestens 0.78

Diese Multiplikatoren werden mit bestehenden Injury-/Availability-Multiplikatoren kombiniert. Fatigue kann Spieler also sichtbar bremsen, aber nicht allein komplett aus dem Spiel nehmen.

## Tests

Gruen:

- `npx vitest run src/modules/seasons/application/simulation/fatigue-recovery.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/seasons/application/simulation/depth-chart.test.ts src/modules/savegames/domain/weekly-plan.test.ts src/modules/savegames/application/week-flow.service.test.ts`
  - 5 Testdateien / 23 Tests.
- `npx tsc --noEmit`
- `npm run lint`
- `npx vitest run src/modules/seasons/application/simulation/fatigue-recovery.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/seasons/application/simulation/depth-chart.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/season-simulation.service.test.ts src/modules/seasons/application/simulation/production-qa.test.ts src/modules/savegames/domain/weekly-plan.test.ts src/modules/savegames/application/week-flow.service.test.ts`
  - 8 Testdateien / 43 Tests.
- `npm run test:e2e:week-loop`
  - Seed erfolgreich.
  - Preflight erfolgreich.
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.

## Bekannte Einschraenkungen

- Fatigue-Verlauf wird nicht historisiert.
- UI zeigt keine eigene Fatigue-Prognose fuer Weekly Plan.
- Fatigue beeinflusst Performance moderat ueber bestehende Readiness-/Snap-Mechanik; keine positionsspezifische Micro-Engine wurde gebaut.
- Injury-Risiko nutzt bestehende Logik weiter und wurde nicht als AP14-Ziel erweitert.
- Balancewerte sind konservative Startwerte und sollten nach laengeren Saison-Simulationen kalibriert werden.

## Bewertung

AP14 ist gruen. Fatigue und Recovery haben jetzt klare strategische Konsequenzen: Intense Training kostet Spieltagsfrische, Recovery ist spuerbar wertvoll, Match-Belastung akkumuliert kontrolliert und hohe Fatigue wirkt moderat auf Leistung und Snap-Anteile.

## Freigabe

AP15 ist fachlich freigegeben, wurde aber nicht gestartet.

Status: Gruen.
