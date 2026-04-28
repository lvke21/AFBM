# Game Loop Flow Review

## Status
Grün

## Scope
Geprüfter End-to-End-Flow:

1. Dashboard
2. Game Preview
3. Match Start
4. Live Simulation
5. Match Report
6. Rückkehr zum Dashboard / Week Advance

Geprüfte E2E-Fixture:
- Savegame: `/app/savegames/e2e-savegame-minimal`
- Match: `e2e-match-week-1`
- Flow: `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`

## Executive Summary
Der komplette Game Loop ist jetzt als zusammenhängender Manager-Flow verständlich und technisch stabil. Der wichtigste Bruch lag auf dem Dashboard: Im `PRE_WEEK`-Zustand wurde ein Roster Need als prominenteste Aktion angezeigt, obwohl der Game Loop zuerst die Wochenvorbereitung braucht. Zusätzlich waren zukünftige Game-Flow-Schritte als Links erreichbar, obwohl sie fachlich noch nicht sinnvoll waren.

Nach den Anpassungen führt die UI klarer:
- Dashboard priorisiert `Woche vorbereiten`.
- Game Preview zeigt Bedeutung des Matchups und eine eindeutige Startaktion.
- Game Center zeigt den laufenden Zustand und sperrt den Report bis zum Spielende.
- Match Report fasst das Ergebnis zusammen und bietet einen klaren Rückweg.
- Dashboard bietet danach `Naechste Woche` als nächste Aktion.

## Gefundene Flow-Probleme

### 1. Dashboard priorisierte Roster Need statt Game Loop
Status vor Fix: Rot

Problem:
- Im `PRE_WEEK`-Zustand zeigte `Next Best Action` einen Kaderbedarf wie `DT Bedarf klaeren`.
- Gleichzeitig war Game Preview gesperrt und die echte Game-Loop-Aktion lag weiter unten im Week Loop.
- Nutzer konnten dadurch glauben, sie müssten zuerst Roster Moves machen, obwohl der Spiel-Flow mit Wochenvorbereitung startet.

Fix:
- `buildDashboardAction` priorisiert jetzt bei `PRE_WEEK` die Aktion `Woche vorbereiten`.
- Die Aktion verlinkt auf `#week-loop`.
- `NextActionPanel` rendert lokale Anchor-Links als normales `<a>` statt Next-Link.

### 2. Game-Flow-Stepper bot zukünftige Schritte als aktive Links an
Status vor Fix: Gelb

Problem:
- In der Game Preview waren `Game Center` und `Game Report` als normale Links sichtbar.
- Fachlich waren sie noch nicht verfügbar.
- Das erzeugte einen Widerspruch zur Match-Control-Area, die diese Schritte korrekt sperrte.

Fix:
- `GameFlowNavigation` unterscheidet jetzt aktive, verfügbare und gesperrte Schritte.
- Zukünftige Schritte werden als deaktivierte States mit Hilfstext angezeigt:
  - `Nach Start`
  - `Nach Spielende`
  - `Review`
  - `Aktuell`

### 3. Live Simulation bot `Report Preview` vor Spielende an
Status vor Fix: Gelb

Problem:
- Im Game Center war der Report-Stepper bis Spielende gesperrt.
- Die Control-Area bot trotzdem einen aktiven Link `Report Preview`.
- Das war ein unnötiger Bruch im Flow.

Fix:
- `LiveControlPanel` zeigt vor Abschluss nur noch `Report nach Spielende` als deaktivierten Zustand.
- Erst bei abgeschlossenem Match erscheint `Finalen Report oeffnen`.

### 4. E2E-Tests waren nicht mehr auf die neue GUI ausgerichtet
Status vor Fix: Rot für Teststabilität

Problem:
- Alte Tests suchten Texte aus früheren Screens wie `Depth Chart Readiness`, `Spiel starten`, `GAME_RUNNING` oder `2026 / W2`.
- Der Week-Loop-Locator griff durch neue Copy fälschlich die Next-Best-Action statt das echte Week-Loop-Panel.

Fix:
- E2E-Tests nutzen jetzt den stabilen Anker `#week-loop`.
- Assertions wurden auf aktuelle UI-Copy angepasst:
  - `Can This Match Start?`
  - `Match starten`
  - `GAME RUNNING`
  - `2026 · Woche 2`
- Dashboard-Link im Report wird gezielt im `main`-Bereich geprüft.

## Verbesserungen

### Dashboard
- Next Best Action ist jetzt Game-Loop-orientiert.
- `Woche vorbereiten` erklärt klar den Zweck: Weekly Plan, Gegnerfokus, Development Focus.
- Quick Action `Week Flow` zeigt `Open` statt irreführend `Ready`.

### Game Preview
- Stepper macht sichtbar, dass der User im aktuellen Schritt ist.
- `Game Center` und `Game Report` sind vor Start/Abschluss sichtbar, aber gesperrt.
- Match-Control bleibt die klare primäre Aktion.

### Live Simulation
- Report-Übergang ist nicht mehr vorzeitig aktiv.
- Live-Screen bleibt auf Situation, Score-Eingabe und Abschluss fokussiert.
- Fallbacks für fehlende Drive-Daten bleiben klar markiert.

### Match Report
- Final Score, Fallback-Stats, Key Moments, Team Impact und Next Step bleiben stabil.
- Der Screen führt per `Dashboard` oder `Naechste Woche laden` aus dem Post-Game-Zustand heraus.

## Browser-/E2E-Review

Manueller Browser-Flow per Playwright:
- Dashboard `PRE_WEEK`
- Week vorbereiten
- Game Preview öffnen
- Match starten
- Live Simulation öffnen
- Score `24:17` setzen
- Spiel abschließen
- Match Report prüfen
- Zurück zum Dashboard
- Week Advance prüfen

Finale Screenshot-Artefakte:
- `/tmp/afbm-game-loop-final-01-dashboard-pre.png`
- `/tmp/afbm-game-loop-final-02-preview.png`
- `/tmp/afbm-game-loop-final-03-live.png`
- `/tmp/afbm-game-loop-final-04-report.png`
- `/tmp/afbm-game-loop-final-05-dashboard-post.png`

## Testresultate
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün
- `npx vitest run src/components/dashboard/dashboard-model.test.ts src/components/match/game-flow-model.test.ts src/components/match/live-simulation-model.test.ts src/components/match/post-game-report-model.test.ts src/components/onboarding/onboarding-model.test.ts`
  - Ergebnis: Grün, 5 Testdateien, 42 Tests
- `E2E_REUSE_SERVER=true npx playwright test e2e/first-10-minutes.spec.ts --workers=1`
  - Ergebnis: Grün, 1 Test
- `E2E_REUSE_SERVER=true npx playwright test e2e/week-loop.spec.ts --workers=1`
  - Ergebnis: Grün, 1 Test

## Verbleibende Risiken
- Der globale Onboarding-Coach kann beim ersten Laden Inhalte verdecken oder eine andere Erstaktion empfehlen. Für den Flow-Review wurde er geschlossen; das bleibt ein separates Onboarding-/Shell-Thema.
- Die E2E-Fixture enthält keine persistierten Drive-Daten, Teamstats oder Player-Leader. Die GUI markiert diese Daten sauber als Fallback.
- Die Live Simulation nutzt aktuell manuelle Score-Finalisierung. Das ist bestehender Flow-Zustand und wurde nicht in Richtung Game Engine erweitert.
- Die mobile App Shell zeigt weiterhin die Sidebar vor dem Screen-Inhalt. Das ist ein screenübergreifendes Layout-Thema.

## Statusprüfung
- Start im Dashboard klar: Ja
- Wechsel zu Game Preview logisch: Ja
- Match Start eindeutig: Ja
- Live Simulation verständlich: Ja, mit markierten Daten-Fallbacks
- Match Report sinnvoll: Ja
- Rückkehr / Week Advance klar: Ja
- Keine Game Engine Änderungen: Ja
- Keine neuen großen Features: Ja
- Keine neuen Screens: Ja

Status: Grün
