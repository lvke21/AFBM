# Recommended Roadmap

## Roadmap-Prinzip

Erst Stabilitaet, dann Scope-Schnitt, dann Datenmodell/Architektur, dann Performance, dann Production.

Keine neuen Features vor gruenem Multiplayer-Core.

## Phase 0: Release-Gates reparieren

Ziel:

- Tests und Staging-Smokes muessen wieder verlaessliche Entscheidungssignale liefern.

Arbeit:

1. Prisma-E2E lokal/CI reproduzierbar machen.
2. Authenticated Staging Admin Week Smoke automatisieren.
3. Firebase Emulator E2E als separates Gate dokumentieren.
4. QA-Command-Report als aktuelles Release-Gate nutzen.

Go-Kriterium:

- `tsc`, `lint`, `vitest`, `build`, `firebase:parity`, `e2e:smoke`, `e2e:multiplayer`, Staging Admin Week Smoke gruen oder sauber begruendet.

## Phase 1: Multiplayer Core stabilisieren

Ziel:

- Join/Rejoin, Team-Link, Ready, Week Simulation, Results/Standings und Reload sind verifiziert.

Arbeit:

1. Rejoin/Recovery entlooppen.
2. User-Team-Link Invarianten testen.
3. Ready -> Sim -> Results/Standings -> Reload E2E/API-Smoke.
4. Concurrent Join/Ready/Simulate Tests.
5. Admin UI Week Smoke.

Go-Kriterium:

- Ein echter GM und ein Admin koennen den Loop auf Staging verifizieren.

## Phase 2: Scope reduzieren

Ziel:

- Spieler sieht nur, was fuer das Multiplayer-MVP Sinn macht.

Arbeit:

1. Contracts/Cap, Development, Trade Board, Inbox, Finance aus Hauptnavigation nehmen oder in "Spaeter" gruppieren.
2. Admin als Utility reduzieren.
3. Redundante Admin-Actions entfernen/umbenennen.
4. Dashboard auf eine naechste Aktion fokussieren.

Go-Kriterium:

- Keine sichtbare aktive Aktion fuehrt zu einem halben Feature.

## Phase 3: State Machine und Datenkonsistenz

Ziel:

- Statusfelder und UI-Sperren folgen zentralen Invarianten.

Arbeit:

1. League/Draft/User-Team/Week State Machine als reine Helper.
2. Validation fuer inkonsistente Zustandskombinationen.
3. Admin/Route-State nutzt dieselben Helper.
4. Tests fuer missing membership, broken team, draft active, roster_ready, simulated/failed.

Go-Kriterium:

- UI und Admin API treffen dieselbe Entscheidung bei identischem State.

## Phase 4: Firebase Performance und Kosten

Ziel:

- Firestore Reads und Client-Re-Renders werden messbar und reduzierbar.

Arbeit:

1. Development Read Metrics fuer `subscribeToLeague()`.
2. Subscription-Profile planen: core, draft, week, admin.
3. Draft-Daten nur laden, wo relevant.
4. Lobby Summary Reads reduzieren.

Go-Kriterium:

- Reads pro Route sind bekannt und haben Budgets.

## Phase 5: Architektur-Refactor klein schneiden

Ziel:

- Online-/Admin-Monolithen werden wartbarer, ohne Verhalten zu aendern.

Arbeit:

1. Test-Fixtures deduplizieren.
2. `online-league-service.ts` read-only Helper weiter extrahieren.
3. Firebase Repository Mapper/Queries/Subscriptions trennen.
4. Admin Actions in Aktionsgruppen splitten, Guard zentral halten.
5. Grosse Client-Orchestratoren weiter in Display-Komponenten/Hooks schneiden.

Go-Kriterium:

- Keine API-Breaks, alle Multiplayer-/Admin-/E2E-Gates gruen.

## Phase 6: Production Readiness

Ziel:

- Production Deployment sicher vorbereiten.

Arbeit:

1. Production-Projekt-ID und Backend-ID verifizieren.
2. Separate Production-App-Hosting-Konfiguration.
3. Admin Claim/UID-Allowlist Entscheidung abschliessen.
4. Rollback-Runbook mit echter Revision/Backend-ID ergaenzen.
5. Nicht-destruktiver Production Smoke Plan.

Go-Kriterium:

- Production Preflight gruen, Staging gruen, keine geratenen IDs, explizite Freigabe.

## Empfohlene Reihenfolge der Arbeitspakete

1. WP-01 E2E/Staging Smoke stabilisieren.
2. WP-02 Multiplayer Rejoin/User-Team-Link haerten.
3. WP-03 Week Simulation Reload absichern.
4. WP-04 Nicht-MVP Navigation reduzieren.
5. WP-05 Admin Flow vereinfachen.
6. WP-06 State Machine Helper einfuehren.
7. WP-07 Firestore Read Metrics.
8. WP-08 Online-Service/Firebase Repository inkrementell schneiden.
9. WP-09 Security/Admin Claims harmonisieren.
10. WP-10 Production Access und Config vorbereiten.

## Was bewusst spaeter kommt

- Contracts/Cap.
- Development.
- Trades.
- Inbox.
- Finance.
- Engine-Refactors.
- Firestore Results/Standings Normalisierung.
- Simulation Job System.
