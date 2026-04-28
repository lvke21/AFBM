# AP 15 - Injury System

Datum: 2026-04-26

Status: Gruen

## Ziel

Spieler koennen sich nach Match-Belastung verletzen. Das System soll nachvollziehbar, deterministisch testbar und gameplay-relevant sein, ohne ein komplexes Medical-/Reha-System oder eine Firestore-Produktivmigration einzufuehren.

## Umgesetzter Scope

Umgesetzt:

- neues Domain-Modul fuer Match-Injuries
- Injury-Risiko haengt ab von:
  - Fatigue
  - Total Snaps / Match-Belastung
  - individuellem `injuryRisk`
  - Durability, Toughness und Physical Overall
  - moderatem Positionskontakt-Faktor
- kontrollierbare RNG-Schnittstelle fuer deterministische Tests
- klare Injury-Status:
  - `HEALTHY`
  - `QUESTIONABLE`
  - `DOUBTFUL`
  - `OUT`
  - `INJURED_RESERVE`
- klare Verletzungsdauer:
  - minor: 7 Tage
  - doubtful: 10 Tage
  - out: 18 Tage
  - injured reserve: 42 Tage
- bestehender Post-Game-Condition-Pfad nutzt das neue Injury-Modul
- Spieler ohne Match-Exposure erhalten keine neue Match-Injury
- Depth-Chart-/Game-Day-Verfuegbarkeit behandelt `OUT` und `INJURED_RESERVE` als nicht verfuegbar
- Weekly Preparation setzt abgelaufene Verletzungen wieder auf `ACTIVE` / `HEALTHY` und schreibt Recovery-Historie

Nicht umgesetzt:

- keine Injury-UI
- keine Reha-, Medical-Staff- oder Contract-Systeme
- keine Firestore-Produktivmigration
- keine globale Simulation-Neuschreibung
- keine Aenderung am Auth-System

## Geaenderte Dateien

- `src/modules/players/domain/player-injury.ts`
- `src/modules/players/domain/player-injury.test.ts`
- `src/modules/seasons/application/simulation/player-condition.ts`
- `src/modules/seasons/application/simulation/depth-chart.test.ts`
- `src/modules/seasons/application/simulation/weekly-preparation.test.ts`
- `docs/reports/phases/phase-project-improvement-ap15-injury-system-report.md`

## Injury-Regeln

### Risikoformel

Das Match-Injury-Risiko wird nur berechnet, wenn ein Spieler mindestens einen Snap gespielt hat. Bei `totalSnaps <= 0` ist das Risiko `0`.

Bei Match-Exposure setzt sich das Risiko aus konservativen Faktoren zusammen:

- Basisrisiko: `0.015`
- individuellem `injuryRisk`
- Snaps als Belastungsindikator
- Fatigue oberhalb von `35`
- niedriger Durability
- niedriger Toughness
- niedrigem Physical Overall
- kleinem Positionskontakt-Faktor fuer Kontakt-/Skill-Positionen

Das Ergebnis wird zwischen `0.015` und `0.18` begrenzt. Fatigue und hohe Snaps erhoehen das Risiko spuerbar, aber nicht extrem.

### Severity und Status

Wenn der Injury-Roll trifft, entscheidet ein zweiter RNG-Roll die Schwere:

- `< 0.55`: `QUESTIONABLE`, Spieler bleibt `ACTIVE`, 7 Tage, Morale -2
- `< 0.72`: `DOUBTFUL`, Spieler wird `INJURED`, 10 Tage, Morale -5
- `< 0.88`: `OUT`, Spieler wird `INJURED`, 18 Tage, Morale -5
- `>= 0.88`: `INJURED_RESERVE`, Spieler wird `INJURED`, 42 Tage, Morale -8

Verletzungsnamen bleiben bewusst einfach und positionsnah:

- Skill: Hamstring/Ankle
- Trenches: Hand/Shoulder/Knee
- sonstige Positionen: Shoulder/Rib/Pectoral

### Availability und Recovery

Die bestehende Game-Day-Verfuegbarkeit bleibt erhalten:

- `QUESTIONABLE`: meistens aktiv, aber limitiert
- `DOUBTFUL`: deutliche Game-Day-Risk
- `OUT` und `INJURED_RESERVE`: nicht verfuegbar

Beim Wochenwechsel werden abgelaufene Verletzungen ueber `weekly-preparation` zurueckgesetzt:

- `status: ACTIVE`
- `injuryStatus: HEALTHY`
- `injuryName: null`
- `injuryEndsOn: null`
- Recovery-Historie wird geschrieben

## Tests

Gruen:

- `npx vitest run src/modules/players/domain/player-injury.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/modules/seasons/application/simulation/depth-chart.test.ts src/modules/seasons/application/simulation/weekly-preparation.test.ts`
  - 4 Testdateien / 15 Tests.
- `npx vitest run src/modules/seasons/application/simulation/fatigue-recovery.test.ts src/modules/seasons/application/simulation/match-engine.test.ts src/modules/seasons/application/season-simulation.service.test.ts src/modules/seasons/application/simulation/production-qa.test.ts src/modules/savegames/application/week-flow.service.test.ts`
  - 5 Testdateien / 32 Tests.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`
  - Seed erfolgreich.
  - Preflight erfolgreich.
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.

Hinweis: Der Browser-E2E wurde ausserhalb der Sandbox ausgefuehrt, weil `tsx` in der Sandbox keine lokale IPC-Pipe unter `/var/folders/.../T/tsx-501/*.pipe` oeffnen durfte.

## Bekannte Einschraenkungen

- Es gibt noch keine Injury-Prognose oder Medical-UI.
- Verletzungen werden nicht in Kategorien wie Reha-Phase, Medical Staff, Vertragsauswirkung oder Langzeitfolgen aufgeteilt.
- Balancewerte sind konservative Startwerte und sollten nach laengeren Saison-Simulationen kalibriert werden.
- Injury-Historie wird fuer Recovery geschrieben; ein eigener Injury-History-Event beim Eintritt der Verletzung ist noch nicht ergaenzt.
- Keine Firestore-Produktivmigration; Prisma bleibt Default.

## Bewertung

AP15 ist gruen. Das System nutzt bestehende Player-Statusfelder, integriert sich minimal in den Post-Game-Condition-Pfad und macht Fatigue/Match-Belastung gameplay-relevant, ohne AP14-Fatigue, Week-State oder Auth zu destabilisieren.

## Freigabe

AP16 ist fachlich freigegeben, wurde aber nicht gestartet.

Status: Gruen.
