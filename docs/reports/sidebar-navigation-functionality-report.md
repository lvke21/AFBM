# Sidebar Navigation Functionality Report

Stand: 2026-05-01

## Umfang

Geprueft wurden die sichtbaren Sidebar-Eintraege im App Shell Kontext:

- Dashboard
- Spielablauf
- Roster
- Depth Chart
- Contracts/Cap
- Development
- Team Overview
- Trade Board
- Inbox
- Finance
- League
- Draft
- Savegames

## Gepruefte Routen

| Eintrag | Offline-Route | Online-Route | Status |
| --- | --- | --- | --- |
| Dashboard | `/app/savegames/[savegameId]` | `/online/league/[leagueId]` | Funktional |
| Spielablauf | `/app/savegames/[savegameId]/game/setup` oder naechstes Match | `/online/league/[leagueId]#week-loop` | Funktional |
| Roster | `/app/savegames/[savegameId]/team/roster` | `/online/league/[leagueId]#roster` | Funktional |
| Depth Chart | `/app/savegames/[savegameId]/team/depth-chart` | `/online/league/[leagueId]#depth-chart` | Funktional |
| Contracts/Cap | `/app/savegames/[savegameId]/team/contracts` | Deaktiviert | Offline funktional, Online bewusst gesperrt |
| Development | `/app/savegames/[savegameId]/development` | Deaktiviert | Offline funktional, Online bewusst gesperrt |
| Team Overview | `/app/savegames/[savegameId]/team` | `/online/league/[leagueId]#team` | Funktional |
| Trade Board | `/app/savegames/[savegameId]/team/trades` | Deaktiviert | Offline funktional/Placeholder, Online bewusst gesperrt |
| Inbox | `/app/savegames/[savegameId]/inbox` | Deaktiviert | Offline funktional, Online bewusst gesperrt |
| Finance | `/app/savegames/[savegameId]/finance` | Deaktiviert | Offline funktional, Online bewusst gesperrt |
| League | `/app/savegames/[savegameId]/league` | `/online/league/[leagueId]#league` | Funktional |
| Draft | `/app/savegames/[savegameId]/draft` | `/online/league/[leagueId]/draft` | Funktional |
| Savegames | `/app/savegames` | `/app/savegames` | Funktional |

## Umgesetzte Fixes

### Hash-Aktivzustand fuer Online-Liga

Online-Teamnavigation nutzt bestehende Anker auf der Ligaseite (`#team`, `#roster`, `#depth-chart`, `#league`). Der aktive Zustand wurde erweitert, damit Hash-Ziele korrekt erkannt werden und das Dashboard nicht aktiv bleibt, wenn ein Online-Unterbereich per Hash ausgewaehlt ist.

Betroffene Dateien:

- `src/components/layout/navigation-model.ts`
- `src/components/layout/sidebar-navigation.tsx`
- `src/components/layout/navigation-model.test.ts`

### Keine Online-Navigation ins Leere

Die Online-Sidebar zeigte vorher auf nicht existierende Routen wie `/online/league/[leagueId]/inbox` und `/online/league/[leagueId]/game/setup`. Spielablauf fuehrt jetzt zum vorhandenen Week-Loop-Anker, die Online-Inbox bleibt gesperrt, bis eine echte Route existiert.

Betroffene Dateien:

- `src/components/layout/navigation-model.ts`
- `src/components/layout/navigation-model.test.ts`

### Kontext-Hinweis in der Sidebar

Wenn kein aktiver Spielstand, kein Manager-Team oder keine vollstaendig bereite Online-Teamnavigation vorhanden ist, zeigt die Sidebar jetzt eine klare Meldung mit CTA zu Savegames und Online Hub. Gesperrte Eintraege zeigen den Sperrgrund direkt im Eintrag.

Betroffene Datei:

- `src/components/layout/sidebar-navigation.tsx`

### Saubere Savegame-Fehlerseite

Ungueltige oder nicht zugreifbare Savegame-Routen zeigen jetzt eine route-spezifische Fehlerseite mit Rueckwegen zu Savegames und Online Hub, statt den User in eine generische Sackgasse laufen zu lassen.

Betroffene Datei:

- `src/app/app/savegames/[savegameId]/not-found.tsx`

## Placeholder-Seiten

Folgende Bereiche sind bewusst als stabile Platzhalter oder Teilfunktionen dokumentiert:

- `development/staff`: Staff/Coach-System noch nicht implementiert.
- `development/training`: Wochenfokus/Belastung vorbereitet.
- `finance/trades`: Finance-Trade-Center noch nicht nutzbar.
- Online Contracts/Cap, Finance, Trade Board und Online-Development: bewusst deaktiviert, bis das Multiplayer-Datenmodell diese Bereiche sicher traegt.

## Offene Punkte

- Online `Inbox` braucht eine eigene Route/Datenbasis, bevor sie aktiviert werden kann.
- Contracts/Cap, Finance, Trade Board und Development fuer Online brauchen eigene Multiplayer-Datenmodelle, bevor sie aktiviert werden.

## Validierung

Ausgefuehrt:

- `npx vitest run src/components/layout/navigation-model.test.ts` - gruen, 7 Tests
- `npm run lint` - gruen
- `npm run build` - gruen
- `npx tsc --noEmit` - gruen nach frischem Next-Build

Hinweis: Ein erster `npx tsc --noEmit` Lauf vor dem Build traf auf veraltete `.next/types` Eintraege. Nach `npm run build` wurden die Next-Typen neu erzeugt und der Typecheck lief erfolgreich.
