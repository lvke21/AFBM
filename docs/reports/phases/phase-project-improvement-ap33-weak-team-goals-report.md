# AP33 - Weak-Team Season Goals & Moral Victories

Status: Gruen  
Datum: 2026-04-26

## Ziel

Schwache Teams sollen auch bei realistischen Niederlagen Fortschritt und Erfolgsmomente erkennen koennen. AP33 veraendert keine Simulationsergebnisse, keine Score Engine und keine Balance-Parameter. Die Umsetzung bewertet und erklaert Spiele aus Sicht des managerkontrollierten Teams.

## Definierte Erwartungslogik

Die Match-Erwartung wird aus der Rating-Differenz des managerkontrollierten Teams gegen den Gegner abgeleitet:

| Kategorie | Rating-Differenz | Erwartung |
| --- | ---: | --- |
| `heavy underdog` | <= -11 | knappe Niederlage, Punkte erzielen oder Defense stabilisieren zaehlt als Erfolg |
| `underdog` | -10 bis -4 | Spiel lange offen halten und Fehler begrenzen |
| `even` | -3 bis +3 | Turnovers, Red Zone und einzelne Drives entscheiden |
| `favorite` | >= +4 | kontrolliertes Spiel ohne vermeidbare Fehler |

Zusätzlich erzeugt die Logik dynamische Season Goals je Kategorie, z. B. Blowouts vermeiden, mehr Punkte als erwartet erzielen, enge Spiele erreichen oder einen staerkeren Gegner schlagen.

## Implementierte Moral Victories

Moral Victories werden nur als Bewertung/Feedback erzeugt:

- Knappe Niederlage als Underdog.
- Mehr Punkte als erwartet.
- Defense haelt staerkeren Gegner bei maximal 24 Punkten.
- Blowout als Underdog vermieden.
- Turnover-Bilanz als Underdog mindestens ausgeglichen.
- Upset gegen ein klar besseres Team.

Leichte Reward-Hinweise werden im Report ausgewiesen:

- Moral Victory: kleiner Morale-/Development-Hinweis.
- Upset: staerkerer, aber weiterhin kleiner Morale-/Development-Hinweis.
- Favorite-Wins oder erwartbare Ergebnisse bekommen keinen Bonus-Hinweis.

Diese Hinweise sind bewusst Report-/Feedback-Daten. Es gibt keinen Fake-Buff, keine Score-Korrektur und keine automatische Staerkeverschiebung.

## Beispiele

- `69 OVR` gegen `82 OVR`, Niederlage `17:24`: `heavy underdog`, Moral Victory durch knappe Niederlage, mehr Punkte als erwartet, Defense-Stabilitaet und Blowout-Vermeidung.
- `82 OVR` gegen `70 OVR`, Sieg `24:21`: `favorite`, erwartbares Ergebnis, kein Bonus-Hinweis.
- `69 OVR` gegen `82 OVR`, Sieg `23:20`: `upset`, klar markierter Erfolgsmoment.

## UI-Aenderungen

- Neuer Post-Game-Abschnitt `Moral Victories` im Match Report.
- Anzeige von Erwartung vs Ergebnis.
- Anzeige der erkannten Erfolgsmomente.
- Anzeige dynamischer Season Goals.
- `Feedback Summary` markiert Moral Victory/Upset farblich und fasst Reward-Hinweise kompakt zusammen.

## Geaenderte Dateien

- `src/modules/seasons/domain/weak-team-goals.ts`
- `src/modules/seasons/domain/weak-team-goals.test.ts`
- `src/components/match/match-report-model.ts`
- `src/components/match/match-report-model.test.ts`
- `src/components/match/match-feedback-summary.tsx`
- `src/components/match/moral-victory-panel.tsx`
- `src/app/app/savegames/[savegameId]/game/report/page.tsx`
- `docs/reports/phases/phase-project-improvement-ap33-weak-team-goals-report.md`

## Tests

| Command | Ergebnis |
| --- | --- |
| `npx vitest run src/modules/seasons/domain/weak-team-goals.test.ts src/components/match/match-report-model.test.ts` | Gruen: 2 Files, 18 Tests |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npx vitest run src/modules/seasons/application/simulation/match-engine.test.ts` | Gruen: 1 File, 12 Tests |
| `npm run test:e2e:week-loop` | Gruen: 1 Playwright-Test |

Hinweis: Der erste Sandboxlauf von `npm run test:e2e:week-loop` scheiterte an `tsx` IPC `EPERM`; der gleiche Command lief ausserhalb der Sandbox erfolgreich durch.

## Bewertung

- Erwartungslogik: umgesetzt.
- Moral Victories: umgesetzt.
- Season Goals: umgesetzt.
- UI/Report: umgesetzt.
- Keine Match-Outcome-Aenderung: eingehalten, keine Simulation-/Balance-Dateien geaendert.
- Week Loop: gruen.

Status AP33: Gruen  
Freigabe AP34: Ja
