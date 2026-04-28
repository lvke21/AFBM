# AP 18 - UX & Feedback verbessern

Datum: 2026-04-26

Status: Gruen

## Ziel

Die UI soll Entscheidungen und Konsequenzen besser erklaeren, ohne eine neue grosse Oberflaeche oder ein Design-System-Refactoring einzufuehren.

## Umgesetzter Scope

Umgesetzt:

- Week Loop Panel erklaert jetzt kompakt:
  - Weekly Plan
  - Player Progression
  - Fatigue/Injury-Folgen
  - Gameplan/X-Factor im READY-State
  - Post-Game und Recovery beim Wochenwechsel
- Weekly-Plan-Wirkungen im Formular wurden auf die aktuellen AP14-Regeln korrigiert:
  - `RECOVERY`: Fatigue -16, Morale +3
  - `BALANCED`: Fatigue +2, Morale +0
  - `INTENSE`: Fatigue +10, Morale -2
- Match Report erhaelt eine neue `Feedback Summary`
- Report-Feedback erklaert:
  - Match-Ergebnis und Score-Margin
  - Manager-Gameplan / X-Factor
  - AI-/CPU-Gameplan-Verfuegbarkeit
  - Teamwirkung ueber Yards und Turnovers
  - Drive-Erklaerungen aus gespeicherten Drives
- fehlende Stats, Drives oder X-Factor-Daten werden ohne Crash als fehlende Daten erklaert

Nicht umgesetzt:

- keine neue grosse UI
- keine Design-System-Neuschreibung
- keine Auth-Aenderung
- keine Firestore-Produktivmigration
- keine neue Gameplay-Mechanik

## Geaenderte Dateien

- `src/components/dashboard/dashboard-model.ts`
- `src/components/dashboard/dashboard-model.test.ts`
- `src/components/dashboard/week-loop-panel.tsx`
- `src/components/match/match-report-model.ts`
- `src/components/match/match-report-model.test.ts`
- `src/components/match/match-feedback-summary.tsx`
- `src/app/app/savegames/[savegameId]/game/report/page.tsx`
- `docs/reports/phases/phase-project-improvement-ap18-ux-feedback-report.md`

## Neue Feedback-Elemente

### Dashboard / Week Loop

Neue kompakte Hinweise zeigen je nach Week State:

- was Recovery, Balanced und Intense bedeuten
- warum Development Focus wichtig ist
- wie Fatigue Readiness, Snap-Anteile und Injury-Risiko beeinflusst
- dass Gameplan/X-Factor vor Kickoff Wirkung auf Risiko und Play-Auswahl hat
- dass AI-Teams einfache Strategien aus Staerke, Matchup, Fatigue und Injuries waehlen
- was beim Post-Game-Wochenwechsel passiert

### Match Report

Neue `Feedback Summary` oberhalb der bestehenden Ursachenanalyse:

- `Match-Ergebnis`: enges Spiel, kontrollierter Abstand oder Blowout-Kontext
- `Dein Gameplan`: Manager-X-Factor in Klartext, wenn vorhanden
- `AI/Gameplan`: CPU-/AI-Plan oder Hinweis auf fehlende gespeicherte Plandaten
- Teamwirkung: Yards und Turnovers als sichtbare Ergebniswirkung
- Drive-Erklaerung: Hinweis auf Drive-Log und Warum-ist-es-passiert-Panel

## Tests

Gruen:

- `npx vitest run src/components/dashboard/dashboard-model.test.ts src/components/match/match-report-model.test.ts src/components/match/game-center-model.test.ts src/components/match/game-flow-model.test.ts`
  - 4 Testdateien / 30 Tests.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:e2e:week-loop`
  - Seed erfolgreich.
  - Preflight erfolgreich.
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.

Hinweis: Der Browser-E2E wurde ausserhalb der Sandbox ausgefuehrt, weil `tsx` in der Sandbox keine lokale IPC-Pipe unter `/var/folders/.../T/tsx-501/*.pipe` oeffnen durfte.

## Bekannte Einschraenkungen

- AI-Strategie-Archetypen werden im Report nur angezeigt, wenn belastbare Gameplan-Daten im Match Report verfuegbar sind; AP18 speichert keine neuen historischen AI-Metadaten.
- Player Progression und Recovery werden im Dashboard erklaert, aber noch nicht als eigene Verlaufstabelle visualisiert.
- Injury-Eintritt wird nicht als eigener Report-Block historisiert; vorhandene Injury-/Recovery-Daten bleiben in Team- und Player-Kontexten.
- Keine neue Visualisierung fuer lange Saisontrends.

## Bewertung

AP18 ist gruen. Die UI erklaert die wichtigsten neuen Gameplay-Systeme nun naeher am Entscheidungsort und der Match Report verbindet Ergebnis, Gameplan, AI, Teamwirkung und Drive-Erklaerung kompakter. Fehlende Daten werden bewusst als solche dargestellt statt still zu verschwinden oder Fehler zu verursachen.

## Freigabe

Kein weiteres Arbeitspaket ist definiert. Naechstes freigegebenes AP: Nein.

Status: Gruen.
