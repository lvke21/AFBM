# AP37 - Weak-Team Schedule & Streak Context

## Status

AP37: Gruen

## Definierte Metriken

- Result Streak: aktuelle Win- oder Losing-Streak aus abgeschlossenen Manager-Team-Spielen.
- Close Game Streak: aufeinanderfolgende Spiele innerhalb eines Scores.
- Blowout Avoidance: Spiele in Folge ohne Blowout-Niederlage; deutliche Niederlagen werden als Warnsignal gezeigt.
- Recent Form: Punkte pro Spiel und durchschnittliche Margin aus den letzten bis zu 5 Spielen.
- AP33/AP36 Signals: Close Games, Blowout-Vermeidung und schwache-Team-Erfolge als leichter Kontextanker.
- Schedule Difficulty: durchschnittliches Gegner-OVR der naechsten bis zu 3 Manager-Team-Spiele.

Alle Metriken lesen vorhandene Saison-, Standing-, Match- und Teamdaten. Es gibt keine Simulation- oder Balance-Aenderung.

## Streak-Logik

Die Streaks werden automatisch aus der chronologisch sortierten Match-Historie des Manager-Teams abgeleitet:

- Win Streak: letzte Spiele mit positiver Margin.
- Losing Streak: letzte Spiele mit negativer Margin.
- Close Game Streak: letzte Spiele mit `abs(margin) <= 8`.
- Blowout Avoidance: letzte Spiele mit `margin > -21`.

Der Wechsel von Losing Streak zu Win wird korrekt erkannt; fuer Post-Game-Kontext kann daraus eine Zeile wie `Ending 2-game losing streak.` entstehen. Wenn Close Games dominieren, wird diese Information priorisiert, z. B. `3rd close game in a row.`

## Schedule-Analyse

Die naechsten bis zu 3 geplanten Manager-Team-Spiele werden betrachtet. Gegner-Ratings kommen aus dem Season-Standing-Readmodel, das jetzt `overallRating` mitliefert.

Stretch-Kategorien:

- Tough Stretch: mindestens zwei kommende Gegner sind aus AP33-Sicht `underdog`/`heavy underdog` oder das durchschnittliche Gegner-OVR liegt mindestens 4 Punkte ueber dem eigenen Team.
- Winnable Stretch: mindestens zwei kommende Gegner sind aus AP33-Sicht `favorite` fuer das eigene Team oder das durchschnittliche Gegner-OVR liegt mindestens 4 Punkte darunter.
- Even Stretch: alles dazwischen.
- Unknown Stretch: wenn Team, Saison, Schedule oder Gegner-Ratings fehlen.

## UI-Integration

Dashboard / Week Panel:

- Neues Panel `Form & Schedule` auf der Savegame-Startseite.
- Zeigt Result Streak, Close Game Streak, Blowout Avoidance und Next Stretch.
- Darunter erscheinen Recent PPG, Recent Margin und AP33/AP36 Signals.

Pre-Game:

- Die Game-Setup-Seite zeigt `Schedule Context` mit `Tough Stretch`, `Winnable Stretch`, `Even Stretch` oder Fallback.
- Der Stretch wird aus denselben naechsten 3 Manager-Team-Spielen berechnet wie im Dashboard.

Post-Game:

- Der Game Report zeigt bei verfuegbarem Saisonkontext eine kurze `Form Context`-Zeile.
- Objective-Rebuild-Signale aus AP36 koennen diese Zeile ergaenzen, ohne Spielausgang oder Stats zu veraendern.

Readmodel:

- `SeasonStandingRow` enthaelt jetzt `overallRating`.
- Prisma- und Firestore-Season-Repositories liefern das Rating fuer Standing-Teams.

## Beispielverlaeufe

- Drei knappe Niederlagen in Folge: `Losing Streak 3 L`, `Close Game Streak 3`, Post-Game `3rd close game in a row.`
- Zwei Niederlagen, dann Sieg: Dashboard wechselt auf `Win Streak 1 W`; Post-Game kann `Ending 2-game losing streak.` anzeigen.
- Naechste Gegner 82, 79 und 74 OVR gegen eigenes 70 OVR: `Tough Stretch`, `78.3 avg OVR`.
- Wenige oder fehlende Spiele: Panel bleibt stabil und zeigt neutrale Fallbacks statt falscher Streaks.

## Tests

Erfolgreich ausgefuehrt:

- `npx vitest run src/components/dashboard/dashboard-model.test.ts src/components/season/season-view-model.test.ts src/components/match/match-report-model.test.ts src/components/match/game-preparation-model.test.ts src/modules/seasons/domain/weak-team-goals.test.ts`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`

Hinweis: Der erste Sandbox-Lauf von `npm run test:e2e:week-loop` scheiterte vor Teststart an `tsx` IPC-Rechten (`EPERM` auf eine Pipe unter `/var/folders/...`). Der freigegebene Lauf war erfolgreich: 1 Playwright-Test bestanden.

## Bekannte Einschraenkungen

- Schedule Difficulty nutzt Team-Overall aus dem Standing-Readmodel, keine tieferen Positions-Matchups.
- Es gibt kein neues persistiertes Streak-System; Kontext wird aus vorhandenen Daten reproduzierbar abgeleitet.
- Post-Game-Kontext priorisiert eine kurze Zeile statt langer Historientabelle.
