# Next Codex Prompts

## Naechste 5 Prompts in empfohlener Reihenfolge

### Prompt 1: E2E und Staging Smoke stabilisieren

```text
Rolle: Senior QA/DevOps Engineer

Aufgabe:
Setze WP-01 aus docs/reports/full-project-analysis/10-work-packages/05-work-packages.md um.

Ziel:
E2E- und Staging-Smoke-Gates sollen reproduzierbar sein.

Pruefe:
- package.json
- playwright.config.ts
- scripts/tools/e2e-preflight.mjs
- scripts/seeds/e2e-seed.ts
- scripts/staging-admin-week-smoke.ts
- docs/reports/full-project-analysis/07-tests-and-quality/*

Anforderungen:
- Keine Produktlogik aendern.
- Keine Production.
- Keine Secrets committen.
- Prisma-E2E-Voraussetzungen klar automatisieren oder dokumentieren.
- Staging-Smoke ohne manuelle Token-Kopie ausfuehrbar machen, wenn Env-Secrets gesetzt sind.

Führe aus:
- npx tsc --noEmit
- npm run lint
- npm test -- --run
- npm run test:e2e
- npm run test:e2e:multiplayer
- npm run test:firebase:parity
- Staging Smoke falls Secrets verfuegbar

Output:
- geaenderte Dateien
- Gates vorher/nachher
- verbleibende externe Blocker
- Status Gruen/Gelb/Rot
```

### Prompt 2: Rejoin und User-Team-Link haerten

```text
Rolle: Senior Multiplayer Firebase Engineer

Aufgabe:
Setze WP-02 aus docs/reports/full-project-analysis/10-work-packages/05-work-packages.md um.

Ziel:
Ein eingeloggter User muss zuverlaessig wieder in sein Team kommen.

Pruefe:
- src/lib/online/repositories/firebase-online-league-repository.ts
- src/components/online/online-league-route-state.tsx
- src/components/online/online-league-route-state-model.ts
- src/components/online/online-league-search.tsx
- src/lib/online/online-league-storage.ts
- firestore.rules

Anforderungen:
- Gueltige Membership-Invarianten zentralisieren.
- Missing Membership / Missing Team Recovery entlooppen.
- Falsche User-ID weiterhin blockieren.
- Keine Firestore-Schema-Aenderung.
- Keine automatische Team-Uebernahme ohne klare Invariante.

Tests:
- Route-State Model Tests
- Online Repository Tests
- Firestore Rules Tests
- Multiplayer E2E falls verfuegbar

Output:
- gefixte Rejoin-Zustaende
- Tests
- Risiken
- Status Gruen/Gelb/Rot
```

### Prompt 3: Week Simulation Reload absichern

```text
Rolle: Senior Fullstack Simulation QA Engineer

Aufgabe:
Setze WP-03 aus docs/reports/full-project-analysis/10-work-packages/05-work-packages.md um.

Ziel:
Ready -> Admin Simulation -> Results/Standings -> Reload muss stabil und nachweisbar sein.

Pruefe:
- src/lib/admin/online-week-simulation.ts
- src/lib/admin/online-admin-actions.ts
- src/app/api/admin/online/actions/route.ts
- src/components/admin/admin-league-detail.tsx
- src/lib/online/online-league-week-simulation.ts
- scripts/staging-admin-week-smoke.ts

Anforderungen:
- Keine neue Simulation Engine.
- Keine Playoff-Logik.
- Keine Datenmodellmigration.
- Doppelte Simulation blockieren.
- Results/Standings nach Reload pruefen.
- Fehlerfall darf currentWeek nicht erhoehen.

Tests:
- Admin route tests
- online-week-simulation tests
- online-admin-actions tests
- Staging admin-week smoke falls Secrets verfuegbar

Output:
- abgesicherter Datenfluss
- Fehlercodes
- Tests
- Status Gruen/Gelb/Rot
```

### Prompt 4: Multiplayer Navigation auf MVP reduzieren

```text
Rolle: Senior Product Frontend Engineer

Aufgabe:
Setze WP-04 aus docs/reports/full-project-analysis/10-work-packages/05-work-packages.md um.

Ziel:
Multiplayer-Spieler sehen nur aktive MVP-Bereiche oder klar gruppierte Spaeter-Bereiche.

Pruefe:
- src/components/layout/navigation-model.ts
- src/components/layout/sidebar-navigation.tsx
- src/components/online/online-league-coming-soon-model.ts
- src/app/online/league/[leagueId]/coming-soon/[feature]/page.tsx

Anforderungen:
- Keine Backend-Aenderungen.
- Keine neuen Features.
- Core-Menue: Dashboard, Spielablauf, Roster, Depth Chart, Team Overview, League, Draft, Savegames.
- Contracts/Cap, Development, Trade Board, Inbox, Finance nicht gleichrangig als aktive MVP-Punkte.
- Direkt-URLs zeigen weiterhin sauberes Coming Soon.
- Keine 404s.

Tests:
- navigation-model.test.ts
- online-league-coming-soon-model.test.ts
- E2E Navigation falls verfuegbar

Output:
- neue Navigation
- versteckte/gruppierte Features
- Tests
- Status Gruen/Gelb/Rot
```

### Prompt 5: Admin Flow vereinfachen

```text
Rolle: Senior Admin UX/Safety Engineer

Aufgabe:
Setze WP-05 aus docs/reports/full-project-analysis/10-work-packages/05-work-packages.md um.

Ziel:
Admin ist ein sicheres Betriebspanel, kein verwirrender Spielmodus.

Pruefe:
- src/components/admin/admin-control-center.tsx
- src/components/admin/admin-league-manager.tsx
- src/components/admin/admin-league-detail.tsx
- src/components/admin/admin-league-action-config.ts

Anforderungen:
- Keine Admin-Sicherheitslogik abschwaechen.
- Keine neuen Admin-Actions.
- Redundante Actions Oeffnen/Details verwalten klaeren.
- Woche simulieren vs Woche abschliessen semantisch bereinigen.
- Kritische Aktionen klar beschreiben und bestaetigen.
- Keine Fake-Erfolgsmeldungen.

Tests:
- relevante Admin Tests
- Admin route tests
- tsc
- lint

Output:
- vereinfachter Admin Flow
- entfernte/umbenannte irrefuehrende Actions
- Tests
- Status Gruen/Gelb/Rot
```

## Danach

Wenn diese fuenf Prompts erledigt und gruen sind:

1. WP-06 State Machine Helper.
2. WP-07 Firestore Read Metrics.
3. WP-08 Online-Service/Firebase Repository schrittweise schneiden.
4. WP-09 Admin Claims/Rules harmonisieren.
5. WP-10 Production Access verifizieren.
