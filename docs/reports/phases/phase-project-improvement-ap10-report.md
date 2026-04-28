# AP 10 - Weekly Decision Layer: Training, Recovery, Development Focus

Datum: 2026-04-26

Status: Gruen

## Ziel

Vor jeder Woche soll der Manager eine kleine, verstaendliche Wochenentscheidung treffen koennen. Die erste Version bleibt bewusst konservativ und wirkt nur klein auf Fatigue, Morale und Development Focus.

## Scope

Umgesetzt:

- Weekly-Plan-Domainmodell mit Recovery, Balanced und Intense
- Opponent Focus mit Balanced, Offense Prep und Defense Prep
- begrenzte Development-Focus-Auswahl bis maximal drei Spieler
- UI im Week Loop Panel vor `Woche vorbereiten`
- serverseitige Normalisierung und Validierung der Form-Werte
- kleine Manager-Team-Effekte beim Prepare-Step:
  - Recovery: Fatigue -8, Morale +2
  - Balanced: Fatigue -3, Morale +1
  - Intense: Fatigue +4, Morale -1
  - Offense/Defense Prep: zusaetzlich Morale +1
- Development-Focus-Auswahl nutzt das bestehende `developmentFocus`-Feld auf Roster-Profilen

Nicht umgesetzt:

- keine neue Trainingssimulation
- keine neuen Prisma-Tabellen oder Migrationen
- keine Firestore-Produktivaktivierung
- keine Aenderung an Auth
- keine Aenderung an Game Engine oder Week-State-Fachlogik ausser dem Prepare-Input

## Umsetzung

Geaendert:

- `src/modules/savegames/domain/weekly-plan.ts`
- `src/modules/savegames/domain/weekly-plan.test.ts`
- `src/modules/savegames/application/week-flow.service.ts`
- `src/modules/savegames/application/week-flow.service.test.ts`
- `src/app/app/savegames/[savegameId]/week-actions.ts`
- `src/app/app/savegames/[savegameId]/page.tsx`
- `src/components/dashboard/week-loop-panel.tsx`
- `docs/reports/phases/phase-project-improvement-ap10-report.md`

Details:

- Der Weekly Plan wird beim Prepare-Submit uebergeben und serverseitig normalisiert.
- Ungueltige oder fehlende Werte fallen auf Balanced/Balanced zurueck.
- Development-Focus-IDs werden dedupliziert und auf drei Spieler begrenzt.
- Der Server setzt den Development Focus nur fuer Spieler des managerkontrollierten Teams.
- Die Week-State-Transition bleibt unveraendert `PRE_WEEK -> READY`.

## Tests

Gruen:

- `npx tsc --noEmit`
- `npm run lint`
- `npx vitest run src/modules/savegames/domain/weekly-plan.test.ts src/modules/savegames/application/week-flow.service.test.ts src/modules/savegames/application/weekly-player-development.service.test.ts src/modules/seasons/application/simulation/player-condition.test.ts src/components/dashboard/dashboard-model.test.ts`
  - 5 Testdateien / 25 Tests.
- `npx firebase emulators:exec --only firestore --project demo-afbm "npm run test:firebase:week-state"`
  - 1 Testdatei / 8 Tests.
- `npm run test:e2e:week-loop`
  - Browser-E2E durchlaeuft `PRE_WEEK -> READY -> GAME_RUNNING -> POST_GAME -> PRE_WEEK`.
  - Der Prepare-Step verarbeitet den Weekly Plan erfolgreich.

## Bewertung

AP10 ist gruen. Der Week Loop hat jetzt eine echte Wochenentscheidung mit sichtbaren Trade-offs, ohne neue Persistenzkomplexitaet und ohne Balance-Risiko durch starke Effekte.

## Bekannte Einschraenkungen

- Der Weekly Plan ist eine erste kleine Version und wird nicht als eigener Verlauf gespeichert.
- Opponent Focus wirkt in dieser Version nur als kleiner Morale-Impuls, nicht als eigener Match-Engine-Modifikator.
- Development Focus nutzt die bestehende Roster-Focus-Mechanik und ist bewusst auf drei Spieler begrenzt.

## Freigabe

Das naechste offene Arbeitspaket ist freigegeben und wird gemaess Sequenz gestartet.

Status: Gruen.
