# Active Work Package

Quelle: `docs/reports/full-project-analysis/work-packages.md`

Status: ACTIVE

## WP-ID

WP-04

## Titel

Draft State und Pick-Transaktionen haerten

## Ziel

Draft-Picks, verfügbare Spieler, Draft-Finalisierung und Draft-UI-Status bleiben konsistent. Der Draft darf Roster-Aufbau und Ready-Übergang nicht durch doppelte Picks, falsche Teams, stale Draft-Daten oder automatische Navigation beschädigen.

Das Work Package stabilisiert den zweiten Schritt des Core Loops:

```text
Lobby -> Draft -> Ready -> Simulation -> Ergebnis
```

WP-01 hat den Einstieg in Liga/Team stabilisiert. WP-04 sorgt als nächster Schritt dafür, dass aus dieser Liga ein verlässlicher Draft-/Roster-Zustand entsteht.

## Betroffene Findings

- N044 - Draft MVP ist begrenzt
- N045 - Active Draft darf nicht automatisch Fullscreen öffnen
- N046 - Active Draft kann andere Bereiche blockierend wirken lassen
- N047 - Completed Draft braucht klare Statusdarstellung
- N048 - Draft State hat mehrere Race- und Truth-Risiken
- N086 - Draft Pick und Draft State können parallel kollidieren

## Betroffene Dateien

Voraussichtlich relevante Bereiche:

- Draft Firestore Model
- Draft Pick Logic
- Draft Finalization
- Online Draft Route
- Dashboard Navigation
- Draft UI
- Fantasy Draft Service
- Online League Repository
- Admin Draft Actions

Wahrscheinliche Codebereiche:

- `src/lib/online/fantasy-draft-service.ts`
- `src/lib/online/fantasy-draft-service.test.ts`
- `src/lib/online/fantasy-draft.test.ts`
- `src/lib/online/multiplayer-draft-logic.test.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/repositories/online-league-repository.test.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/lib/admin/online-admin-actions.test.ts`
- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/online/online-fantasy-draft-room-model.test.ts`
- `src/components/online/online-league-placeholder.tsx`
- `e2e/multiplayer-fantasy-draft.spec.ts`
- `e2e/multiplayer-firebase-fantasy-draft.spec.ts`

Die genaue Datei-Liste muss im Umsetzungsplan durch Code-Inspection bestätigt werden.

## Risiko

Hoch.

Begründung:

- Draft ist ein direkter Core-Loop-Schritt.
- Draft beeinflusst Roster, Ready-State und spätere Simulation.
- Pick-Operationen können durch Doppelklicks, parallele Requests oder stale Clients kollidieren.
- Firestore-Draft-State ist verteilt über Meta-Dokumente, Picks, verfügbare Spieler und eventuell Legacy-Felder.
- Navigation darf nicht wieder automatisch in das Draftboard springen.

## Erfolgskriterien

- Draft-Pick ist idempotent oder konfliktfest.
- Doppelter Pick desselben Spielers wird verhindert.
- Falsches Team kann nicht picken.
- Pick mit stale Draft-State wird blockiert oder sauber neu geladen.
- Available Players und Picks bleiben konsistent.
- Draft-Finalisierung erzeugt keinen widersprüchlichen Roster-/Draft-Status.
- Abgeschlossener Draft wird klar als abgeschlossen angezeigt.
- Active Draft öffnet nicht automatisch Fullscreen/Draftboard.
- Draft Route lädt nur bei explizitem Öffnen.
- Reload auf Draft und Dashboard bleibt stabil.
- Kein Auto-Redirect zum Draftboard wegen `draft.status === "active"`.

## Tests

Akzeptanztests für die spätere Umsetzung:

- Unit/Integration:
  - erster Pick funktioniert
  - doppelter Pick wird verhindert
  - falsches Team wird blockiert
  - nicht vorhandener Spieler wird abgelehnt
  - bereits gepickter Spieler bleibt unavailable
  - nächstes Team wird korrekt gesetzt
  - stale Draft-State wird sauber behandelt
  - Draft finalize setzt konsistente Statusfelder
- E2E:
  - Draft Route öffnet nur per explizitem Klick
  - Reload auf Draft bleibt stabil
  - Reload auf Dashboard öffnet kein Draftboard
  - Pick bleibt nach Reload sichtbar
- Firebase/Parity:
  - Draft Subcollections und Legacy-Draft-Daten werden konsistent gelesen
  - Firestore Pick Writes erzeugen keine doppelten Picks

## NICHT-Ziele

- Keine Week-Simulation umbauen.
- Keine Ready-State-Logik außerhalb nötiger Draft-Gates umbauen.
- Keine Firestore Rules groß refactoren.
- Keine Admin-UI umbauen, außer Draft-bezogene Status-/Action-Klarheit falls zwingend.
- Keine neue Draft-UI bauen.
- Keine Auto-Draft-Verteilung neu schreiben.
- Keine Produktionsdaten ändern.
- Keine bestehenden Manager, Memberships oder Teams verändern.
- Keine große Service-Aufteilung außerhalb Draft-Pick-/Draft-State-Scope.
