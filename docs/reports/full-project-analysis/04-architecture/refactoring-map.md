# Refactoring Map

Stand: 2026-05-02

## Ziel der Analyse

Priorisierte Refactoring-Reihenfolge fuer Architekturverbesserungen ohne Funktionsverlust, ohne Big-Bang und ohne riskante Aenderungen an Engine, Firebase Schema oder Multiplayer Week/Draft Flow.

## Untersuchte Dateien/Bereiche

- `src/lib/online/online-league-service.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/components/online/*`
- `src/components/admin/*`
- `src/modules/*`
- `src/server/repositories/*`

## Leitprinzipien

1. Erst Grenzen sichern, dann Logik bewegen.
2. Erst read-only und pure Helper extrahieren, dann Commands.
3. Firebase Schema nicht nebenbei veraendern.
4. Engine nicht ohne Golden-Master-Tests anfassen.
5. Public APIs kompatibel halten, bis Aufrufer migriert sind.
6. Jede Refactor-Stufe braucht Typecheck, Lint, Build und fokussierte Tests.

## Empfohlene Refactoring-Reihenfolge

### Phase 1: Architektur-Sicherungen

Ziel: verhindern, dass Kopplung wieder zunimmt.

Konkrete Schritte:

- Import-Policy-Test einfuehren:
  - `src/modules/**` darf nicht `src/components/**` importieren.
  - `src/components/**` darf nicht `src/lib/firebase/admin` importieren.
  - `src/modules/**/domain` darf nicht `application` oder `infrastructure` importieren.
- Bestehende Boundary-Verletzungen als bekannte Ausnahmen dokumentieren oder sofort entfernen.
- Online-Barrel-Importe in neuen Code verbieten.

Risiko: niedrig.

Nutzen: hoch fuer zukuenftige Refactors.

### Phase 2: UI-Modelle aus Application Services loesen

Betroffene Dateien:

- `src/modules/teams/application/team-roster.service.ts`
- `src/modules/teams/application/team-trade.service.ts`
- `src/lib/actions/decision-effects.ts`
- `src/components/player/player-value-model.ts`
- `src/components/trades/trade-model.ts`

Konkrete Schritte:

- Reine Player-Value-/Trade-Bewertungslogik in Domain/Application-Modul verschieben.
- Komponenten importieren danach aus Domain statt umgekehrt.

Risiko: niedrig/mittel.

Nutzen: klare Layer-Richtung.

### Phase 3: Online-Service weiter schneiden

Betroffene Datei:

- `src/lib/online/online-league-service.ts`

Konkrete Reihenfolge:

1. Read-only Query Helper.
2. Metrics/Labels, sofern nicht UI-Copy.
3. Contract/Cap Queries.
4. Draft pure Helpers.
5. Week pure Helpers.

Nicht zuerst bewegen:

- Join/Rejoin
- Ready-State Writes
- Draft Pick Writes
- Week Simulation Writes
- Reset/Repair/Storage Side Effects

Risiko: mittel.

Nutzen: sehr hoch.

### Phase 4: Firebase Repository aufteilen

Betroffene Datei:

- `src/lib/online/repositories/firebase-online-league-repository.ts`

Konkrete Zielmodule:

```text
firebase-league-refs.ts
firebase-league-mappers.ts
firebase-league-queries.ts
firebase-league-commands.ts
firebase-league-subscriptions.ts
firebase-membership-consistency.ts
firebase-draft-mappers.ts
```

Start mit Mappern und read-only Queries.

Risiko: mittel/hoch.

Nutzen: hoch fuer Kosten, Tests, Wartbarkeit.

### Phase 5: Admin Command Handler splitten

Betroffene Datei:

- `src/lib/admin/online-admin-actions.ts`

Zielstruktur:

```text
online-admin-actions.ts         -> Dispatcher/API Contract
admin-league-commands.ts        -> create/delete/reset/list/get
admin-week-commands.ts          -> simulateWeek, locks, completion
admin-draft-commands.ts         -> draft init/start/auto/reset
admin-gm-commands.ts            -> warn/remove/vacant/missed week
admin-debug-commands.ts         -> clearly dev/staging only
```

Guard und Actor-Validierung bleiben zentral.

Risiko: mittel/hoch.

Nutzen: hoch.

### Phase 6: Client-Orchestratoren weiter zerlegen

Betroffene Dateien:

- `src/components/online/online-league-placeholder.tsx`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/online/online-league-search.tsx`

Sichere Extraktionen:

- reine Display Panels
- lokale UI-Hooks fuer Formular-/Feedback-State
- derived data Helper
- Debug Panels

Noch nicht verschieben:

- Confirm-/destructive Action Logik
- komplexe async Handler ohne Tests
- Membership/Route-State Kernlogik

Risiko: mittel.

Nutzen: mittel/hoch.

### Phase 7: Subscription Strategy

Ziel: nicht jede Online-View braucht jeden Live-Datenbereich.

Moegliche Profile:

```text
dashboard: league + own membership + teams + current week summary
draft: league + own membership + teams + draft + picks + available players
admin: league + teams + memberships + week + debug
roster: league + own team + roster/depth chart
```

Risiko: hoch, weil Datenverfuegbarkeit UI betrifft.

Nutzen: sehr hoch fuer Firestore-Kosten.

### Phase 8: Engine-Refactor vorbereiten

Nur Vorbereitung:

- Engine-Port-Dokument.
- Golden-Master-Snapshots.
- Determinismus-Testmatrix.
- Performance-Budget.

Keine Logikbewegung vor Testbasis.

Risiko: aktuell hoch, nach Vorbereitung mittel.

## No-Go-Bereiche ohne starke Tests

- `src/modules/seasons/application/simulation/match-engine.ts`
- `src/modules/gameplay/application/play-selection-engine.ts`
- `src/modules/gameplay/application/outcome-resolution-engine.ts`
- `src/modules/savegames/application/week-flow.service.ts`
- `src/lib/admin/online-admin-actions.ts` Week Simulation Branch
- `src/lib/online/repositories/firebase-online-league-repository.ts` Join/Rejoin Transactions
- Draft Pick Transaction / Roster Assignment

## Akzeptanzkriterien je Refactor

- Keine UI-Verhaltensaenderung ohne explizites Ticket.
- `npx tsc --noEmit` gruen.
- `npm run lint` gruen.
- `npm run build` gruen.
- Fokussierte Unit-Tests fuer betroffene Domain.
- Bei Multiplayer/Firebase: `npm run test:firebase:parity` oder passender Firebase-Test.
- Bei Navigation/UI: relevantes E2E-Smoke.

## Risiken

- Kleine Schnitte koennen durch grosse Barrels unsichtbar Runtime-Abhaengigkeiten behalten.
- Zu fruehe Subscription-Optimierung kann Edge-States verstecken.
- Admin-Splits koennen Guard-Duplizierung erzeugen.
- Engine-Refactor kann Balance veraendern, auch wenn TypeScript gruen bleibt.

## Empfehlungen

Die naechsten drei Schritte sollten sein:

1. Boundary-Policy plus Entfernung der Application-zu-Component-Imports.
2. Weitere direkte Fachmodul-Imports statt `online-league-service`.
3. Firebase Repository Mapper/Normalizer extrahieren, ohne Transactions zu aendern.

## Offene Fragen

- Soll Architektur-Policy als Test, ESLint-Regel oder leichtes Script umgesetzt werden?
- Welche Online-Subdomain wird zuerst als echtes Modul stabilisiert: Draft, Week oder Membership?
- Wer ist fachlicher Owner fuer Admin Debug Actions vs. Produkt-Admin-Actions?
