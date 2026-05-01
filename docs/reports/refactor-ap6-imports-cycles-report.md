# Refactor AP6: Imports And Cycles Report

Status: Gruen

## Executive Summary

AP6 bereinigt Importgrenzen nach den Refactoring-APs ohne Logik- oder UI-Aenderungen. Der Fokus lag auf zwei Stellen:

- Online/Admin-Dateien importieren Konstanten und Typen nicht mehr unnoetig aus dem grossen `online-league-service`.
- Season-Simulation-Infrastruktur importiert Engine-Typen und pure Engine-Helfer jetzt einheitlich ueber klare Modul-Alias-Pfade statt ueber relative Grenzspruenge.

TypeScript, ESLint und ein lokaler Importgraph-Cycle-Check sind gruen.

## Gepruefte Bereiche

- kaputte Imports nach AP4-Dateiverschiebungen
- Deep Imports auf alte `application/simulation/*` Adapterpfade
- zyklische lokale Abhaengigkeiten
- breite Barrel Exports
- Importgrenzen zwischen UI, Online-Domain, Admin und Season-Simulation

## Geaenderte Imports

### Online/Admin Typen Und Konstanten

Diese Dateien importieren Storage-Keys, Team-Pool-Konstanten oder reine Typen nun aus den schmalen Modulen:

| Datei | Vorher | Nachher |
| --- | --- | --- |
| `src/lib/admin/local-admin-browser-state.ts` | `@/lib/online/online-league-service` | `@/lib/online/online-league-constants` |
| `src/lib/admin/local-admin-storage.ts` | `@/lib/online/online-league-service` | `@/lib/online/online-league-constants` |
| `src/app/api/admin/online/actions/route.test.ts` | `@/lib/online/online-league-service` | `@/lib/online/online-league-constants` |
| `src/components/online/online-continue-model.ts` | `@/lib/online/online-league-service` | `@/lib/online/online-league-types` |
| `src/components/online/online-league-search-model.ts` | `@/lib/online/online-league-service` | `@/lib/online/online-league-types` |
| `src/components/online/online-league-search.tsx` | `@/lib/online/online-league-service` fuer Typ | `@/lib/online/online-league-types` |
| `src/components/online/online-league-dashboard-utils.ts` | `@/lib/online/online-league-service` fuer Typen | `@/lib/online/online-league-types` |
| `src/components/online/online-league-detail-model.test.ts` | Service fuer Konstante + Typ | `online-league-constants` + `online-league-types` |
| `src/components/online/online-league-search-model.test.ts` | Service fuer Konstante + Typ | `online-league-constants` + `online-league-types` |
| `src/components/online/online-continue-model.test.ts` | Service fuer Konstante + Typ | `online-league-constants` + `online-league-types` |

Ergebnis: Reine UI-/Test-/Storage-Helfer ziehen nicht mehr den grossen Online-League-Service in ihre Importkette, wenn sie nur Datenformen oder Storage-Keys brauchen.

### Season Simulation Infrastruktur

Die AP4-Adapter unter `src/modules/seasons/infrastructure/simulation` importieren Engine-Typen und pure Engine-Helfer jetzt ueber `@/modules/seasons/application/simulation/*`:

| Datei | Importgrenze |
| --- | --- |
| `match-context.ts` | `simulation.types`, `simulation-random` |
| `weekly-preparation.ts` | `player-condition` |
| `playoff-scheduling.ts` | `engine-state-machine` |
| `player-development.ts` | `simulation.types` |
| `match-result-persistence.ts` | `player-condition`, `simulation-random`, `simulation.types` |
| `simulation-api.service.ts` | `match-engine`, `simulation.types` |

Ergebnis: Die Grenze ist lesbarer: Infrastruktur-Adapter haengen von der Engine ab, die Engine haengt nicht von Infrastruktur ab.

## Kaputte Imports

Keine kaputten Imports gefunden.

Pruefung:

- `npx tsc --noEmit`: erfolgreich
- gezielte Suche nach alten AP4-Pfaden:
  - keine Imports auf `application/simulation/match-context`
  - keine Imports auf `application/simulation/match-result-persistence`
  - keine Imports auf `application/simulation/player-development`
  - keine Imports auf `application/simulation/playoff-scheduling`
  - keine Imports auf `application/simulation/simulation-api.service`
  - keine Imports auf `application/simulation/stat-anchors`
  - keine Imports auf `application/simulation/weekly-preparation`

## Dependency Cycle Check

Es ist kein dediziertes Cycle-Tool wie Madge oder Dependency Cruiser im Projekt installiert.

Stattdessen wurde ein lokaler Node-Importgraph-Check fuer `src` ausgefuehrt:

- analysierte Dateien: 557
- aufgeloeste lokale Imports: relative Imports und `@/` Alias-Imports
- gefundene Zyklen: 0

Ergebnis:

```json
{
  "files": 557,
  "cycles": 0,
  "examples": []
}
```

## Barrel Exports

Gefunden, aber in AP6 bewusst nicht geaendert:

- `src/modules/gameplay/application/index.ts`
- `src/modules/gameplay/domain/index.ts`
- `src/modules/gameplay/infrastructure/index.ts`
- `src/modules/teams/application/team-management.service.ts`
- `src/server/repositories/index.ts`

Bewertung:

- Die Gameplay-Barrels sind breit, werden im aktuellen produktiven Code aber nicht als Hauptimportpfad genutzt. Die bestehenden Imports gehen groesstenteils direkt auf konkrete Engine-/Domain-Dateien.
- `team-management.service.ts` wirkt als bestehende Application-Facade fuer Routen und Actions.
- `server/repositories/index.ts` ist eine bewusste Backend-Facade fuer Data-Backend-Auswahl.

Keine Aenderung, weil das Entfernen oder Umschneiden dieser Barrels in diesem AP mehr Call-Sites beruehren wuerde und ueber reine Import-Hygiene hinausginge.

## Verbleibende Bewusste Deep Imports

- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-detail-model.ts`
- `src/lib/admin/online-admin-actions.ts`

Diese Dateien importieren weiterhin aus `online-league-service`, weil sie echte Service-Funktionen nutzen. Reine Typ-/Konstanten-Abhaengigkeiten wurden dagegen bereinigt.

## Validierung

| Befehl | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| lokaler Node Importgraph Cycle Check | Gruen, 557 Dateien / 0 Zyklen |

## Fazit

AP6 reduziert unnoetige Abhaengigkeiten auf grosse Service-Module und macht die AP4-Engine/Infrastruktur-Grenze klarer lesbar. Es wurden keine Logik-, UI-, Route-, Firebase-, Sync- oder Engine-Verhaltensaenderungen vorgenommen.

Status: Gruen
