# Refactor AP2 Types Constants Utils Report

Datum: 2026-04-30

## Executive Summary

Status: Gruen

Es wurden ausschliesslich Types, Konstanten und reine UI-/Format-Helper aus grossen Dateien extrahiert. Es wurden keine Engine-Regeln, keine Firebase-Logik, keine UI-Struktur und keine fachlichen Abläufe geändert.

Die bestehenden Importpfade bleiben kompatibel: `src/lib/online/online-league-service.ts` re-exportiert die ausgelagerten Online-League-Types und Konstanten weiterhin.

## Geaenderte Dateien

### Neue Dateien

| Datei | Inhalt | Zeilen | Zeichen |
| --- | --- | ---: | ---: |
| `src/lib/online/online-league-types.ts` | Exportierte Multiplayer-/Online-Domain-Type-Aliases und Interfaces | 891 | 21.062 |
| `src/lib/online/online-league-constants.ts` | Online-Storage-Keys, globale Test-Liga-ID, MVP-Team-Pool | 24 | 1.484 |
| `src/components/online/online-league-dashboard-utils.ts` | Reine Dashboard-Optionen, Label-/Preview-/Format-/Warnhelper | 262 | 8.725 |

### Angepasste Dateien

| Datei | Änderung |
| --- | --- |
| `src/lib/online/online-league-service.ts` | Types und Konstanten ausgelagert, als Compatibility-Facade re-exportiert, interne Type-Imports ergänzt |
| `src/components/online/online-league-placeholder.tsx` | Trainings-/Media-/Strategy-Optionen und reine Helper in `online-league-dashboard-utils.ts` verschoben |

## Vorher/Nachher Dateigroessen

| Datei | Vorher Zeilen | Nachher Zeilen | Delta | Vorher Zeichen | Nachher Zeichen | Delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `src/lib/online/online-league-service.ts` | 8.860 | 8.048 | -812 | 263.428 | 243.400 | -20.028 |
| `src/components/online/online-league-placeholder.tsx` | 2.557 | 2.320 | -237 | 105.233 | 97.268 | -7.965 |

Hinweis: Die extrahierten Dateien enthalten bewusst dieselben Typen/Konstanten/Helper. Die Gesamt-Codezeilen sinken daher nicht stark; Ziel dieses APs war Entflechtung grosser Dateien ohne Verhalten zu ändern.

## Verschobene Exporte

### Nach `src/lib/online/online-league-types.ts`

Verschoben wurden die exportierten Online-Domain-Types von `OwnershipProfile` bis `SubmitWeeklyTrainingPlanResult`, darunter:

- League-/User-Typen: `OnlineLeague`, `OnlineLeagueUser`, `OnlineLeagueTeam`, `OnlineLeagueSettings`
- Training/Coaching: `TrainingIntensity`, `TrainingPrimaryFocus`, `WeeklyTrainingPlan`, `Coach`, `CoachingStaffProfile`
- Contracts/Cap/Trades/Draft: `OnlineContractPlayer`, `SalaryCap`, `TradeProposal`, `Prospect`, `DraftOrder`
- Finance/Stadium/Fans: `StadiumProfile`, `FanbaseProfile`, `FranchiseFinanceProfile`, `OnlineMatchdayInput`
- GM/Admin-State: `OwnershipProfile`, `GmJobSecurityScore`, `OnlineGmActivityMetrics`, `OnlineGmAdminRemovalState`
- Result-Typen: `JoinOnlineLeagueResult`, `ContractActionResult`, `TradeActionResult`, `DraftActionResult`, `CoachActionResult`

`online-league-service.ts` re-exportiert diese weiterhin via:

```ts
export type * from "./online-league-types";
```

### Nach `src/lib/online/online-league-constants.ts`

Verschoben wurden:

- `ONLINE_LEAGUES_STORAGE_KEY`
- `ONLINE_LAST_LEAGUE_ID_STORAGE_KEY`
- `GLOBAL_TEST_LEAGUE_ID`
- `ONLINE_MVP_TEAM_POOL`

`online-league-service.ts` re-exportiert diese weiterhin, damit bestehende Imports stabil bleiben.

### Nach `src/components/online/online-league-dashboard-utils.ts`

Verschoben wurden:

- `TRAINING_INTENSITIES`
- `TRAINING_PRIMARY_FOCI`
- `TRAINING_SECONDARY_FOCI`
- `TRAINING_RISK_LEVELS`
- `MEDIA_EXPECTATION_GOALS`
- `FRANCHISE_STRATEGIES`
- `EXPERT_MODE_STORAGE_KEY`
- `getTrainingIntensityLabel`
- `getTrainingFocusLabel`
- `getTrainingRiskLabel`
- `getTrainingPreview`
- `getToneClass`
- `formatContractCurrency`
- `getReleaseWarningText`
- `getExtensionWarningText`
- `getFreeAgentWarningText`
- `ContractRiskPlayer`
- `ContractRiskCap`

## Nicht Geaendert

- Keine Firebase-Repository-Logik geändert
- Keine Firestore-Pfade oder Transactions geändert
- Keine Admin-Action-Logik geändert
- Keine Game-/Simulation-Engine-Regeln geändert
- Keine UI-Texte oder Layout-Struktur geändert
- Keine produktiven Flows geändert

## Testresultate

| Befehl | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm test -- --run` | Gruen: 133 Testdateien, 771 Tests bestanden |
| `git diff --check` | Gruen |

## Bewertung

Der AP reduziert die Groesse der beiden stark betroffenen Dateien und schafft erste stabile Zielorte fuer weitere Refactors:

- `online-league-types.ts` kann kuenftig weiter in Subdomain-Typen zerlegt werden.
- `online-league-constants.ts` trennt Storage-/Seed-Konstanten vom Service.
- `online-league-dashboard-utils.ts` trennt reine UI-Hilfsfunktionen vom grossen Dashboard-Container.

Die Refactor-Sicherheit ist hoch, weil bestehende Public Imports kompatibel bleiben und die komplette Test-Suite gruen ist.

Status: Gruen
