# Training System GM Coach Instructions Report

## Neue Datenmodelle

Der lokale Online-MVP erweitert `OnlineLeagueUser` rückwärtskompatibel um:

- `CoachingStaffProfile`
  - Coach-Namen für Head Coach, OC, DC, Special Teams, Strength und Development.
  - Ratings: `offenseTraining`, `defenseTraining`, `playerDevelopment`, `injuryPrevention`, `discipline`, `motivation`, `gamePreparation`, `adaptability`.
- `WeeklyTrainingPlan`
  - `intensity`, `primaryFocus`, optionaler `secondaryFocus`, `riskTolerance`, `youngPlayerPriority`, `veteranMaintenance`, Notes, Submitter und Quelle.
  - Quelle ist `gm_submitted` oder `auto_default`.
- `TrainingOutcome`
  - Development-, Fatigue-, InjuryRisk-, Chemistry- und Preparation-Werte.
  - Coach Execution Rating, Risk Events und betroffene Spielergruppen.
- `TrainingAffectedPlayer`
  - Im MVP werden ohne echte Online-Roster zwei Gruppen modelliert: `Young Player Core` und `Veteran Core`.
  - Dadurch bleibt die Integration testbar, ohne Singleplayer-Roster oder Game Engine anzufassen.

Bestehende lokale Ligen erhalten Coaching Staff, leere Training Plans und leere Outcomes beim Laden automatisch.

## Trainingsoptionen

Intensity:

- `light`
- `normal`
- `hard`
- `extreme`

Primary Focus:

- `offense`
- `defense`
- `balanced`
- `conditioning`
- `recovery`
- `player_development`
- `team_chemistry`

Secondary Focus:

- `passing_game`
- `running_game`
- `pass_protection`
- `pass_rush`
- `run_defense`
- `coverage`
- `turnovers`
- `red_zone`
- `two_minute_drill`
- `special_teams`

Risk Tolerance:

- `low`
- `medium`
- `high`

## Berechnungslogik

Coaches begrenzen die Effektivität. Für jedes Outcome wird ein `coachExecutionRating` aus Fokus-relevantem Coaching Rating, Game Preparation, Discipline, Adaptability und Motivation berechnet.

Trainingseffekte:

- Development steigt moderat mit Intensität, Coach Execution und Young Player Priority.
- `player_development` verstärkt langfristige Entwicklung, besonders für junge Spieler.
- `hard` und `extreme` erhöhen Fatigue und InjuryRisk.
- `recovery` senkt Fatigue und InjuryRisk, bringt aber kaum Preparation/Development.
- `team_chemistry` erhöht Chemistry.
- `extreme` kann Chemistry senken und erzeugt Risk Events.
- Preparation Bonus ist klein, temporär und aktuell nur vorbereitet, nicht hart in die Game Engine injiziert.

## Week-Flow-Integration

Der bestehende lokale Admin-Button `Woche simulieren` ruft vor dem Matchday-Placeholder pro aktiver Franchise `generateOnlineTrainingOutcome()` auf.

Wenn für Team/Woche kein Plan existiert:

- Es wird automatisch ein `normal / balanced` Plan erzeugt.
- Die Plan-Quelle ist `auto_default`.
- Der Week Flow wird nicht blockiert.

Wenn bereits ein Outcome für Team/Woche existiert:

- Es wird kein zweites Outcome erzeugt.
- Dadurch bleibt die Berechnung idempotent.

## UI-Verhalten

GM UI:

- Neuer Training-Bereich im Online Liga Dashboard.
- GM kann Intensität, Hauptfokus, Nebenfokus, Risiko-Level, Young Player Priority, Veteran Maintenance und Notes setzen.
- UI zeigt erwarteten Effekt, Risiko-Hinweis, Coach-Kommentar und letzte Trainingsergebnisse.

Admin UI:

- Neue Training-Status-Tabelle in der Liga-Detailseite.
- Admin sieht pro Team, ob ein Plan gesetzt wurde, wann die letzte Aktivität war und welches letzte Outcome existiert.
- Admin kann den aktuellen Wochenplan zurücksetzen.

## Auto-Training

Auto-Training nutzt:

- `intensity: normal`
- `primaryFocus: balanced`
- `riskTolerance: medium`
- `youngPlayerPriority: 50`
- `veteranMaintenance: 50`
- `source: auto_default`

Inaktive GMs werden dadurch nicht bestraft. Sie erhalten aber auch keinen Spezialfokus.

## Events / Logs

Neue Events:

- `training_plan_submitted`
- `training_plan_auto_defaulted`
- `training_outcome_generated`
- `training_fatigue_changed`
- `training_chemistry_changed`
- `training_injury_risk_changed`
- `training_preparation_bonus_applied`

## Tests

Neue Tests in `src/lib/online/training-system.test.ts` validieren:

- Default TrainingPlan wird erzeugt.
- GM kann Plan speichern.
- Ungültige Intensität wird abgelehnt.
- Hard Training erzeugt mehr Fatigue als Normal Training.
- Recovery reduziert Fatigue.
- Player Development verbessert junge Spieler stärker.
- Guter Coach verbessert Outcome.
- Extreme Training erhöht InjuryRisk.
- Kein Trainingsplan blockiert Week Flow nicht.
- TrainingOutcome wird pro Team/Woche nur einmal erzeugt.

## Offene Punkte

- Keine Coach-Hiring-Mechanik.
- Keine echte Practice-Minute-Simulation.
- Keine Einzelübungen pro Spieler.
- Keine echten Verletzungen durch Training.
- Preparation Bonus wird vorbereitet, aber nicht aggressiv in die Game Engine eingebunden.
- Echte Online-Roster-Zuordnung fehlt noch; MVP nutzt Spielergruppen.
- Bei Firebase/Backend-Migration muss Outcome-Generierung transaktional abgesichert werden.
