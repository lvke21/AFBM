# Phase 3 Implementation Plan

Quelle: `docs/reports/full-project-analysis/active-work-package.md`

Aktives Work Package: **WP-04 - Draft State und Pick-Transaktionen haerten**

Status: Plan vollstaendig

## Ziel

Draft-Picks, Available Players, Draft-Finalisierung und Draft-UI-Status bleiben konsistent. Der Draft darf Roster-Aufbau und Ready-Übergang nicht durch doppelte Picks, falsche Teams, stale Draft-Daten oder automatische Navigation beschädigen.

## Betroffene Findings

- N044 - Draft MVP ist begrenzt
- N045 - Active Draft darf nicht automatisch Fullscreen öffnen
- N046 - Active Draft kann andere Bereiche blockierend wirken lassen
- N047 - Completed Draft braucht klare Statusdarstellung
- N048 - Draft State hat mehrere Race- und Truth-Risiken
- N086 - Draft Pick und Draft State können parallel kollidieren

## Konkrete Schritte

### 1. Draft-Pick-Invarianten gegen bestehenden Code abgleichen

- Dateien ändern: keine
- Zu prüfende Dateien:
  - `src/lib/online/multiplayer-draft-logic.ts`
  - `src/lib/online/online-league-draft-service.ts`
  - `src/lib/online/fantasy-draft-service.ts`
  - `src/lib/online/online-league-service.ts`
  - `src/lib/online/repositories/firebase-online-league-repository.ts`
  - `src/lib/admin/online-admin-actions.ts`
- Betroffene Funktionen:
  - `validatePreparedMultiplayerDraftPick`
  - `getNextPreparedMultiplayerDraftState`
  - `makeFantasyDraftPick`
  - `applyFirestoreAdminAutoDraftPick`
  - lokale Admin-Actions `autoDraftNextFantasyDraft` / `autoDraftToEndFantasyDraft`
- Risiko: Niedrig, reine Analyse.
- Benötigte Tests: keine.

### 2. Gemeinsame Draft-Pick-Validierung konsequent nutzen oder spiegeln

- Dateien ändern:
  - `src/lib/online/multiplayer-draft-logic.ts`
  - `src/lib/online/repositories/firebase-online-league-repository.ts`
  - ggf. `src/lib/admin/online-admin-actions.ts`
- Betroffene Funktionen:
  - `validatePreparedMultiplayerDraftPick`
  - `FirebaseOnlineLeagueRepository.makeFantasyDraftPick`
  - `applyFirestoreAdminAutoDraftPick`
- Ziel:
  - gleiche Status-/Fehlerlogik für falsches Team, fehlenden Spieler, bereits gepickten Spieler und Roster-Limit
  - keine neue Sonderlogik in UI oder Admin-Pfad
- Risiko: Mittel. Admin-Auto-Draft darf nicht versehentlich blockiert werden.
- Benötigte Tests:
  - `src/lib/online/multiplayer-draft-logic.test.ts`
  - `src/lib/online/repositories/online-league-repository.test.ts`
  - `src/lib/admin/online-admin-actions.test.ts`

### 3. Firestore-Pick-Transaction gegen stale State und doppelte Pick-Dokumente härten

- Dateien ändern:
  - `src/lib/online/repositories/firebase-online-league-repository.ts`
- Betroffene Funktion:
  - `makeFantasyDraftPick`
- Ziel:
  - Pick-Dokument für aktuelle `pickNumber` innerhalb der Transaction lesen
  - abbrechen, wenn Pick-Dokument bereits existiert
  - abbrechen, wenn Draft-Dokument `pickNumber`, `currentTeamId`, `status` oder `draftRunId` nicht zum erwarteten Zustand passt
  - `availablePlayers/{playerId}` weiterhin als Verfügbarkeits-Lock verwenden
- Risiko: Hoch. Firestore-Transaktion ist Core-Pfad; keine Legacy-Draft-Daten brechen.
- Benötigte Tests:
  - Repository-Test für existierendes Pick-Dokument als stale/duplicate
  - Test für stale `draftRunId` falls im Snapshot vorhanden
  - bestehende Firestore-Draft-Mapping-Tests müssen grün bleiben

### 4. Admin-Auto-Draft-Pick denselben Transaktionsschutz geben

- Dateien ändern:
  - `src/lib/admin/online-admin-actions.ts`
  - `src/lib/admin/online-admin-actions.test.ts`
- Betroffene Funktion:
  - `applyFirestoreAdminAutoDraftPick`
- Ziel:
  - Pick-Dokument für `pickNumber` prüfen
  - stale Draft-State klar melden
  - keine doppelten Picks durch wiederholte Admin-Aktion
  - `availablePlayers` und `picks` bleiben synchron
- Risiko: Mittel bis hoch. Auto-Draft-To-End ruft den Einzelpick mehrfach auf; der Loop darf bei sauberem Abschluss nicht hängen.
- Benötigte Tests:
  - wiederholter Admin-Auto-Pick erzeugt keinen Duplicate Pick
  - Auto-Draft-To-End bleibt deterministisch
  - abgeschlossener Draft bleibt completed

### 5. Draft-Finalisierung auf konsistente Statusfelder prüfen

- Dateien ändern:
  - `src/lib/online/repositories/firebase-online-league-repository.ts`
  - `src/lib/admin/online-admin-actions.ts`
  - ggf. `src/lib/online/online-league-draft-service.ts`
- Betroffene Funktionen:
  - `getNextFantasyDraftState`
  - `getNextAdminDraftState`
  - Finalisierung in `makeFantasyDraftPick`
  - Finalisierung in `applyFirestoreAdminAutoDraftPick`
- Ziel:
  - `draft.status = completed`
  - `currentTeamId = ""`
  - `completedAt` gesetzt
  - League `status/currentWeek/currentSeason` passend
  - Legacy-Felder werden entfernt, ohne Subcollection-State zu verlieren
  - Roster/Depth Chart pro Team wird nur aus eindeutigen Picks gebaut
- Risiko: Hoch. Finalisierung beeinflusst Roster und Ready-Übergang.
- Benötigte Tests:
  - Draft finalize erzeugt volle Roster
  - keine doppelten Spieler im Roster
  - completed Draft bleibt nach Reload sichtbar

### 6. Draft-UI und Dashboard-Gates gegen Auto-Redirect und falsche Sperren prüfen

- Dateien ändern:
  - `src/components/online/online-league-draft-page.tsx`
  - `src/components/online/online-league-dashboard-panels.tsx`
  - `src/components/online/online-league-detail-model.ts`
  - `src/components/online/online-league-app-shell.tsx`
  - ggf. `src/components/online/online-league-route-fallback-model.ts`
- Betroffene Logik:
  - Draft Status Panel
  - Dashboard Draft-Hinweise
  - Route-Fallbacks für Draft-Unterseiten
  - Sidebar/Gates, die Draft-State lesen
- Ziel:
  - Dashboard bleibt Dashboard bei aktivem Draft
  - Draft öffnet nur über explizite Route/Button
  - completed Draft wirkt abgeschlossen, nicht kaputt
  - andere Bereiche zeigen klare Draft-Gates statt leerer/gesperrter Zustände
- Risiko: Mittel. Keine große UI-Änderung, nur Guard-/Statuslogik.
- Benötigte Tests:
  - Component/Model Tests für active/completed Draft
  - E2E: Reload Dashboard öffnet kein Draftboard
  - E2E: Klick auf Draft öffnet Draft Route

### 7. Client-Pick-Handling gegen Doppelklick absichern

- Dateien ändern:
  - `src/components/online/online-league-draft-page.tsx`
  - ggf. `src/components/online/online-fantasy-draft-room.tsx`
- Betroffene Funktionen:
  - `handlePickPlayer`
  - Pick-Button Pending-State
- Ziel:
  - Doppelklick sendet nicht zwei Pick-Requests
  - stale Result zeigt verständliche Warnung
  - erfolgreiche Picks aktualisieren lokalen League-State
- Risiko: Niedrig bis mittel. UI-Verhalten darf nicht anders wirken, nur robuster.
- Benötigte Tests:
  - wenn vorhanden Component-Test für Pending Pick
  - E2E Draft Pick bleibt nach Reload sichtbar

### 8. Tests gezielt erweitern

- Dateien ändern:
  - `src/lib/online/multiplayer-draft-logic.test.ts`
  - `src/lib/online/repositories/online-league-repository.test.ts`
  - `src/lib/admin/online-admin-actions.test.ts`
  - `src/components/online/online-fantasy-draft-room-model.test.ts`
  - ggf. `src/components/online/online-league-dashboard-panels.test.tsx`
- Testfälle:
  - erster Pick funktioniert
  - doppelter Pick wird verhindert
  - falsches Team wird blockiert
  - nicht vorhandener Spieler wird abgelehnt
  - bereits gepickter Spieler bleibt unavailable
  - nächstes Team wird korrekt gesetzt
  - stale Draft-State wird sauber behandelt
  - Draft finalize setzt konsistente Statusfelder
  - completed Draft zeigt abgeschlossenen Status

### 9. Relevante E2E-Flows ausführen

- Dateien ändern: keine
- Commands:
  - `DATA_BACKEND=prisma npm run test:e2e:draft`
  - `npm run test:e2e:multiplayer`
  - optional, falls Emulator stabil verfügbar: `npm run test:e2e:multiplayer:firebase:draft`
- Risiko: Mittel. Lokale E2E-Umgebung ist bekannt fragil; Environment-Probleme getrennt dokumentieren.

### 10. Preflight nach Umsetzung ausführen und berichten

- Dateien ändern:
  - späterer Verification-/Regression-Report
- Commands:
  - `npx tsc --noEmit`
  - `npm run lint`
  - relevante Vitest Tests
  - `npm test`, falls Änderungen breit sind
  - `npm run build`, falls UI-/Route-Dateien geändert wurden
  - relevante E2E-Flows aus Schritt 9
- Risiko: Niedrig.

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

## Offene Punkte vor Umsetzung

- Es ist zu prüfen, ob `getNextFantasyDraftState` und `getNextAdminDraftState` zusammengeführt werden können, ohne Verhalten zu ändern. Falls Risiko besteht, bleiben beide getrennt.
- Firestore-Transaction-Tests für echte parallele Writes sind eventuell nur emulatorgestützt sinnvoll. Falls lokal nicht stabil, zunächst Unit-/Repository-Abdeckung plus Dokumentation.
- Die bestehende lokale E2E-Draft-Command-Umgebung braucht in dieser Workspace-Konfiguration explizit `DATA_BACKEND=prisma`.
