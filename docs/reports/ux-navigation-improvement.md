# UX Navigation Improvement Report

Stand: 2026-05-01

## Ziel

Die Sidebar soll logisch und kontextabhaengig wirken:

- Ohne Savegame keine lange Liste kaputter Ziele.
- Ohne Team bleiben Team-Bereiche sichtbar gesperrt und erklaert.
- Aktive Bereiche sind eindeutig markiert.
- Fallback fuehrt immer zur Savegames-Auswahl.

## Neue Sidebar-Logik

### Kein Savegame / keine Online-Liga

Die Sidebar zeigt nur noch den sinnvollen Fallback:

- `Dashboard` -> `/app/savegames`

Dazu erscheint der Kontext-Hinweis:

- kein aktiver Spielstand oder Online-Liga geladen
- CTA `Savegames`
- CTA `Online Hub`

Dadurch sieht der User nicht mehr Roster, Depth Chart, Finance oder Draft ohne Kontext.

### Savegame vorhanden, aber kein Manager-Team

Team-relevante Bereiche bleiben sichtbar, aber gesperrt:

- Roster
- Depth Chart
- Contracts/Cap
- Team Overview
- Trade Board
- Finance

Der Sperrgrund ist direkt sichtbar, z. B. `Kein Manager-Team`.

### Online-Liga mit aktivem Draft

Der Week-/Spielablauf-Link wird gesperrt, solange der Draft aktiv ist:

- `Spielablauf` -> disabled mit `Draft läuft`
- `Draft` bleibt erreichbar
- Team-/Rosterbereiche bleiben entsprechend Draft/Roster-State gesperrt

### Aktiver Zustand

Die bestehende Active-State-Logik bleibt erhalten:

- echte Routen werden per Pathname erkannt
- Online-Anker wie `#roster` oder `#depth-chart` werden per Hash erkannt
- aktiver Eintrag bekommt visuelle Markierung und `aria-current`

## State-basierte Navigation

| Zustand | Sichtbar/aktiv | Gesperrt | Fallback |
| --- | --- | --- | --- |
| Kein Savegame/keine Online-Liga | Dashboard | alle kontextlosen Fachbereiche ausgeblendet | `/app/savegames` |
| Offline Savegame + Team | alle Offline-Hauptbereiche | keine Kernbereiche | Savegames |
| Offline Savegame ohne Team | Dashboard, Spielablauf, Savegames | Team/Roster/Finance/Trade | Savegames |
| Online Draft aktiv | Dashboard, Draft, Savegames, Liga-Kontext | Spielablauf, Team/Roster | Online Hub/Savegames |
| Online Roster nicht bereit | Dashboard, Draft, Liga-Kontext | Team/Roster/Depth | Online Hub/Savegames |
| Online Roster bereit | Dashboard, Week Loop, Team/Roster/Depth, Draft | Online-only nicht implementierte Bereiche | Online Hub/Savegames |

## Keine Navigation ins Leere

- Dashboard ohne Kontext fuehrt nicht mehr nach `/app`, sondern direkt nach `/app/savegames`.
- Online-Spielablauf wird waehrend aktivem Draft nicht als Week-Loop-Link angeboten.
- Online-Inbox und Online-Development bleiben bewusst gesperrt, bis echte Routen/Datenmodelle existieren.

## Geaenderte Dateien

- `src/components/layout/navigation-model.ts`
- `src/components/layout/sidebar-navigation.tsx`
- `src/components/layout/navigation-model.test.ts`
- `docs/reports/ux-navigation-improvement.md`

## Offene Punkte

- Disabled Eintraege sind weiterhin nicht fokussierbare `span`-Elemente. Fuer vollstaendige Keyboard-UX waere ein eigenes disabled button/link pattern sinnvoll.
- Online-Anker koennten spaeter durch echte Tabs oder Routen ersetzt werden, sobald die Multiplayer-Seitenstruktur stabil ist.
