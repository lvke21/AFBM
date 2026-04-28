# AP35 - Rebuild Progression Milestones

Status: Gruen  
Datum: 2026-04-26

## Ziel

AP35 macht langfristigen Fortschritt sichtbar, besonders fuer schwache Teams. Es wurden keine Simulation-, Score- oder Balance-Regeln geaendert. Die Umsetzung nutzt bestehende Team-, Saison-, Match- und Spieler-Read-Models.

## Definierte Milestones

- Erstes knappes Spiel erreicht: mindestens ein Match innerhalb von 8 Punkten.
- Offense-Trend steigt: Punkte pro Spiel im aktuellen Rolling Window liegen mindestens 2 PPG ueber dem Vergleichsfenster.
- Blowouts reduziert: die letzten Spiele enthalten weniger 21+-Punkte-Spiele als der vorherige Abschnitt.
- Junger Kern mit Upside: mindestens ein Spieler bis 24 Jahre mit mindestens +6 Potenzial gegen aktuelles OVR.
- Ueber Erwartung gespielt: Close Loss, Blowout-Vermeidung mit schwachem Team oder Sieg mit schwachem Team als AP33-kompatibles Rebuild-Signal.

## Tracking-Logik

- Rolling Window: letzte bis zu 5 abgeschlossene Manager-Team-Spiele.
- Vergleichsfenster: die 5 Spiele davor, sobald genug Daten vorhanden sind.
- Saisonverlauf: alle abgeschlossenen Manager-Team-Spiele fuer Close Games, Blowouts, Siege, Niederlagen und Rebuild-Signale.
- Young-Core-Auswertung: vorhandene Team-Spieler aus dem Dashboard-Read-Model, keine neue Speicherung.
- Keine permanenten globalen Werte und keine neue Progression-Architektur.

## UI-Komponenten

- Neues Dashboard-Panel `Rebuild Progress`.
- Kennzahlen:
  - Team Overall
  - Recent PPG
  - Close Games
  - Blowouts
  - Young Upside
- Milestone-Karten mit Status:
  - `Erreicht`
  - `Im Aufbau`
  - `Noch offen`

## Beispielverlaeufe

- Schwaches Team `70 OVR`, erstes Spiel 7:35, danach 17:24, 21:20 und 24:20:
  - Close Game erreicht.
  - Rebuild-Signal erkannt.
  - Recent PPG sichtbar.
  - Junger Spieler `Kai Rivers` mit +14 Upside als Young-Core-Fortschritt sichtbar.
- Nur ein 3:31-Spiel:
  - Offense-Trend und Blowout-Reduktion bleiben `Noch offen`, weil kein Vergleichsfenster existiert.
  - Kein falsches positives Trend-Signal.

## Geaenderte Dateien

- `src/components/dashboard/dashboard-model.ts`
- `src/components/dashboard/dashboard-model.test.ts`
- `src/components/dashboard/rebuild-progress-panel.tsx`
- `src/app/app/savegames/[savegameId]/page.tsx`
- `docs/reports/phases/phase-project-improvement-ap35-rebuild-milestones-report.md`

## Tests

| Command | Ergebnis |
| --- | --- |
| `npx vitest run src/components/dashboard/dashboard-model.test.ts` | Gruen: 1 File, 14 Tests |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm run test:e2e:week-loop` | Gruen: 1 Playwright-Test |

Hinweis: Der Week-Loop wurde ausserhalb der Sandbox ausgefuehrt, weil `tsx` in der Sandbox reproduzierbar an der lokalen IPC-Pipe scheitert.

## Bekannte Einschraenkungen

- Team-Overall-Entwicklung wird aktuell als momentaner OVR angezeigt, nicht als historische OVR-Zeitreihe, weil keine permanente OVR-Historie eingefuehrt wurde.
- Upset-Erfolge werden im Dashboard nur aus vorhandenen Match-/Teamdaten approximiert. Detaillierte AP33-Moral-Victory-Informationen bleiben im Match Report.
- Das Panel ist bewusst kompakt und erklaert Fortschritt, ohne neue Gameplay- oder Balance-Systeme zu bauen.

## Bewertung

- Rebuild-Metriken definiert: ja.
- Milestones umgesetzt: ja.
- Rolling-Window-Tracking umgesetzt: ja.
- UI im Dashboard umgesetzt: ja.
- AP33-Verbindung ueber Moral-Victory/Rebuild-Signale: ja.
- Keine Simulation-/Balance-Aenderung: eingehalten.
- Week Loop stabil: ja.

Status AP35: Gruen  
Freigabe AP36: Ja
