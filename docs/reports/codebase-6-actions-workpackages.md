# Codebase 6 Actions Workpackages

Stand: 2026-05-01

Quelle: `docs/reports/codebase-6-actions-analysis.md`

Leitplanken:

- Kleine, einzeln mergebare Arbeitspakete.
- Kein Big Refactor.
- Keine funktionalen Änderungen an Game Engine, Firestore Schema, Auth Logic, Week Flow oder Draft Flow.
- Security, Simulation und Multiplayer-State bleiben konservativ.

## AP1 - Verbesserung: Online-League-Datenquelle pro Route konsolidieren

### Ziel

Pro Online-League-Route soll es nur noch eine zentrale Quelle fuer User, League Snapshot, Loading- und Error-State geben. Doppelte `getCurrentUser()`-/`getLeagueById()`-/`subscribeToLeague()`-Effekte sollen entfernt werden, ohne Join, Reload, Sidebar oder Draft-Verhalten zu ändern.

### Konkrete Umsetzungsschritte

1. Neuen Hook oder Provider anlegen, z. B. `src/components/online/use-online-league-route-state.ts`.
2. Darin bestehenden Ladepfad aus `OnlineLeagueAppShell` kapseln:
   - `repository.getCurrentUser()`
   - `repository.getLeagueById(leagueId)`
   - `repository.subscribeToLeague(leagueId, ...)`
   - Cleanup per unsubscribe
3. `OnlineLeagueAppShell` so umbauen, dass es den zentralen State nutzt und den `AppShellContext` daraus erzeugt.
4. `OnlineLeaguePlaceholder` so anpassen, dass es League/User/Load/Error-State aus Props oder Context bekommt.
5. `OnlineLeagueDraftPage` erst in einem separaten kleinen Schritt auf denselben State umstellen, wenn Dashboard-Route gruen ist.
6. Noch nicht `subscribeToLeague()` splitten. Das bleibt ein spaeterer eigener Schritt.

### Betroffene Dateien

- `src/components/online/online-league-app-shell.tsx`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-draft-page.tsx`
- neu optional: `src/components/online/use-online-league-route-state.ts`
- optional: `src/app/online/league/[leagueId]/page.tsx`
- optional: `src/app/online/league/[leagueId]/draft/page.tsx`

### Nicht-Ziele

- Kein Split von Firestore Collections oder Repository-API.
- Keine Änderung an `joinLeague()`.
- Keine Änderung an Firestore Rules.
- Keine Änderung am Draft Flow oder Week Flow.
- Keine UI-Neugestaltung.

### Risiken

- Mittleres Risiko fuer Loading-/Error-State-Regressions.
- Risiko, dass Sidebar-Kontext kurzzeitig weniger Daten hat.
- Risiko, dass Draft-Seite und Dashboard unterschiedliche Datenanforderungen haben.

### Testplan

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:run`
- gezielt `src/components/online/online-league-dashboard-panels.test.tsx`
- gezielt `src/lib/online/repositories/online-league-repository.test.ts`
- Browser-QA:
  - Online Hub -> Liga laden
  - Reload auf `/online/league/[leagueId]`
  - Draft-Menue direkt oeffnen
  - Zurueck zum Dashboard

### Akzeptanzkriterien

- Auf der Dashboard-Route wird `subscribeToLeague()` nur noch einmal durch die Route gestartet.
- Dashboard, Sidebar und Draft-Link zeigen denselben League-State.
- Reload bleibt stabil.
- Kein automatischer Draftboard-Redirect wird wieder eingefuehrt.
- Bestehende Tests bleiben gruen.

### Rollback-Strategie

- Neuen Hook/Provider entfernen.
- `OnlineLeagueAppShell`, `OnlineLeaguePlaceholder` und `OnlineLeagueDraftPage` auf vorherige lokale Ladeeffekte zuruecksetzen.
- Da keine Datenmodell- oder Repository-Aenderung enthalten ist, reicht ein Code-Revert.

## AP2 - Verbesserung: Firestore Join-/Membership-Rules E2E-nah absichern

### Ziel

Den bekannten Browser-Fehler `Du hast fuer diese Online-Liga oder Aktion keine Berechtigung` im Join-/Membership-Pfad gezielt absichern, ohne Firestore Schema oder Auth Logic zu ändern.

### Konkrete Umsetzungsschritte

1. In `firestore.rules` nur null-safe Guards ergaenzen:
   - `isGlobalAdmin()` gegen fehlendes `request.auth.token.admin` absichern.
   - `leagueMembers/{leagueMemberId}` Read-Pfad so formulieren, dass fehlende/inkomplette `resource.data` nicht zu Null-Value-Rules-Fehlern fuehren.
2. In `src/lib/firebase/firestore.rules.test.ts` einen neuen Testfall fuer den E2E-nahen Join-Pfad ergaenzen:
   - neuer eingeloggter User
   - Membership und Mirror werden geschrieben
   - eigener Mirror darf gelesen werden
   - fremder Mirror bleibt verboten
3. In `src/lib/online/repositories/firebase-online-league-repository.ts` nur pruefen, ob `joinLeague()` Membership und Mirror konsistent in derselben Transaktion schreibt.
4. Falls eine offensichtliche Reihenfolgesluecke existiert, minimal korrigieren, ohne Datenstruktur zu aendern.
5. Firebase Multiplayer E2E erneut ausfuehren.

### Betroffene Dateien

- `firestore.rules`
- `src/lib/firebase/firestore.rules.test.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- optional: `e2e/multiplayer-firebase.spec.ts` nur wenn Testvertrag nachweislich veraltet ist

### Nicht-Ziele

- Keine neue Auth-Logik.
- Keine neuen Custom Claims.
- Keine UID-Allowlist-Aenderung.
- Kein Firestore Schema Wechsel.
- Keine Lockerung fuer fremde Memberships.
- Kein UI-Fix, der Permission-Fehler versteckt.

### Risiken

- Mittleres Security-Risiko, falls Rules zu breit formuliert werden.
- E2E kann weiterhin rot bleiben, wenn eigentliche Ursache im Client-Join-Flow liegt.
- Rules-Emulator und Staging-Verhalten muessen konsistent bleiben.

### Testplan

- `npm run test:firebase:rules`
- `npm run test:firebase:parity`
- `npm run test:e2e:multiplayer:firebase`
- `npm run test:run`
- Manuelle Staging-QA:
  - neuer Firebase User joined Testliga
  - Reload erkennt Membership
  - fremder User wird geblockt

### Akzeptanzkriterien

- Rules-Test deckt eigenen Mirror-Read nach Join ab.
- Fremder Mirror-Read bleibt verboten.
- `npm run test:e2e:multiplayer:firebase` erreicht nach Join die Liga statt Permission-Fehler.
- Keine produktiven Datenpfade werden geloescht oder migriert.

### Rollback-Strategie

- Rules-Aenderung und neuen Rules-Test revertieren.
- Repository-Korrektur revertieren, falls enthalten.
- Kein Datenrollback erforderlich, da keine Schema- oder Seed-Aenderung vorgesehen ist.

## AP3 - Verbesserung: Draft-Room Renderpfad memoizieren

### Ziel

Renderarbeit im Fantasy Draft Room reduzieren, ohne Draft-Regeln, Pick-Logik oder UI-Verhalten zu ändern.

### Konkrete Umsetzungsschritte

1. In `src/components/online/online-fantasy-draft-room.tsx` `teamNameById` per `useMemo` aufbauen.
2. `availablePlayers` in `useMemo` verschieben.
3. `pickedPlayers` in `useMemo` verschieben.
4. `ownRoster` in `useMemo` verschieben.
5. `rosterCounts` in `useMemo` verschieben.
6. `getRosterCounts()` intern auf einen einzelnen Zaehllauf umstellen, statt pro Position `filter()` ueber das ganze Roster zu verwenden.
7. Keine Pagination oder Virtualisierung in diesem AP einfuehren.

### Betroffene Dateien

- `src/components/online/online-fantasy-draft-room.tsx`

### Nicht-Ziele

- Keine Änderung an `makeFantasyDraftPick`.
- Keine Änderung an Draft Order, Snake Draft oder Roster-Finalisierung.
- Keine Firestore-Subscription-Aenderung.
- Kein neues Draft-UI.
- Keine Admin-Draft-Anpassung.

### Risiken

- Niedriges Risiko fuer falsche Memo-Abhaengigkeiten.
- Niedriges Risiko, dass selected player nicht korrekt zurueckgesetzt wird, wenn `availablePlayerIds` wechselt.

### Testplan

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:run`
- gezielt `src/lib/online/fantasy-draft.test.ts`
- gezielt `src/lib/online/fantasy-draft-service.test.ts`
- Manuelle QA:
  - Position filtern
  - Overall-Sortierung wechseln
  - Spieler auswaehlen
  - Pick ausfuehren
  - fremder Pick aktualisiert Liste

### Akzeptanzkriterien

- Sichtbare Draft-Liste bleibt identisch sortiert/gefiltert.
- Eigener Roster-Zaehler bleibt korrekt.
- Ausgewaehlter Spieler wird entfernt, wenn er nicht mehr verfuegbar ist.
- Keine Tests brechen.

### Rollback-Strategie

- Die Memoization-Aenderung in einer Datei revertieren.
- Kein Daten- oder Flow-Rollback erforderlich.

## AP4 - Code-Verkleinerung: Lokale Online-Actions aus `OnlineLeaguePlaceholder` herausziehen

### Ziel

`OnlineLeaguePlaceholder` verkleinern, indem lokale Expert-/Offline-Action-Handler ausgelagert werden. Verhalten bleibt gleich: Firebase-MVP-Actions zeigen weiterhin keine Fake-Erfolgsmeldung.

### Konkrete Umsetzungsschritte

1. Kleine Hilfsfunktion fuer Firebase-MVP-Guard anlegen, z. B. `src/components/online/online-firebase-mvp-action-guard.ts`.
2. Wiederholte Branches `repository.mode === "firebase"` in lokalen Action-Handlern durch diese Hilfsfunktion ersetzen.
3. Erst danach optional einen Hook `useLocalOnlineLeagueActions` extrahieren.
4. Maximal 3-5 Handler pro PR auslagern, z. B. zuerst:
   - Franchise Strategy
   - Training
   - Stadium Pricing
5. Keine JSX-Panels im ersten Schritt verschieben, wenn dadurch Props stark wachsen.
6. Nach jedem kleinen Schritt Tests laufen lassen.

### Betroffene Dateien

- `src/components/online/online-league-placeholder.tsx`
- neu optional: `src/components/online/online-firebase-mvp-action-guard.ts`
- neu optional: `src/components/online/use-local-online-league-actions.ts`

### Nicht-Ziele

- Keine neue Firebase-Implementierung fuer lokale Actions.
- Keine Entfernung lokaler Expert-Mode-Funktionalitaet.
- Keine Aenderung an League Storage.
- Kein Umbau der Dashboard-UI.
- Keine Änderung an Join/Load.

### Risiken

- Mittleres Risiko durch viele Feedback-States.
- Props/Hook-Schnittstelle kann zu breit werden, wenn zu viel auf einmal extrahiert wird.
- Lokaler Modus kann regressieren, wenn Handler-Kontext fehlt.

### Testplan

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:run`
- Manuelle lokale QA:
  - Expert Mode an/aus
  - Training speichern
  - Strategy speichern
  - Pricing speichern
- Manuelle Firebase-QA:
  - gleiche Buttons zeigen weiterhin Nicht-synchronisiert-Meldung
  - keine lokalen Ersatzdaten werden geschrieben

### Akzeptanzkriterien

- `OnlineLeaguePlaceholder` verliert klar sichtbare Wiederholung.
- Firebase-MVP-Message bleibt wortgleich oder fachlich gleich.
- Lokaler Modus funktioniert fuer extrahierte Actions weiter.
- Keine Action wird entfernt.

### Rollback-Strategie

- Neue Guard-/Hook-Datei entfernen.
- Extrahierte Handler in `OnlineLeaguePlaceholder` zurueckkopieren.
- Keine Datenmigration oder Reset noetig.

## AP5 - Code-Verkleinerung: Admin-Action-Boilerplate konfigurativ reduzieren

### Ziel

Wiederholte Admin-Action-Handler und GM-Tabellenbuttons in `AdminLeagueDetail` reduzieren, ohne Admin API, Admin Guard oder mutierende Semantik zu aendern.

### Konkrete Umsetzungsschritte

1. Nur nicht-destruktive ligaweite Actions zuerst konfigurieren:
   - `refresh-league`
   - `set-all-ready`
   - `start-league`
2. Kleine Config-Datei anlegen, z. B. `src/components/admin/admin-league-action-config.ts`.
3. Einen generischen Action-Runner in `AdminLeagueDetail` weiterverwenden, keine neue API-Schicht.
4. Destruktive oder Confirm-basierte Aktionen vorerst nicht anfassen:
   - Reset Draft
   - Auto-Draft to End
   - GM entfernen
   - Team vakant setzen
5. In einem zweiten Mini-PR eine Komponente `AdminGmActionsCell` nur fuer lokale GM-Zeilenbuttons extrahieren.

### Betroffene Dateien

- `src/components/admin/admin-league-detail.tsx`
- neu optional: `src/components/admin/admin-league-action-config.ts`
- neu optional: `src/components/admin/admin-gm-actions-cell.tsx`

### Nicht-Ziele

- Keine Admin-API-Aenderung.
- Keine Admin-Guard-Aenderung.
- Keine neuen Admin-Rechte.
- Keine Firestore Rules Aenderung.
- Keine neue Simulation oder Week-Abschluss-Logik.
- Keine Entfernung von Confirm Dialogen.

### Risiken

- Mittleres Risiko, dass falsche Action-ID/API-Action gemappt wird.
- Risiko bei Confirm-Aktionen, daher explizit nicht im ersten Schritt enthalten.
- UI kann kleine Text-/Pending-State-Unterschiede bekommen, wenn nicht sauber gemappt.

### Testplan

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:run`
- gezielt `src/app/api/admin/online/actions/route.test.ts`
- gezielt `src/lib/admin/online-admin-actions.test.ts`
- Manuelle Admin-QA:
  - Liga aktualisieren
  - Alle Ready setzen
  - Liga starten, falls Voraussetzungen fehlen: klare Fehlermeldung
  - Confirm-basierte Aktionen bleiben unveraendert

### Akzeptanzkriterien

- Nicht-destruktive Actions funktionieren wie vorher.
- Pending-State und Feedback bleiben erhalten.
- Destruktive Actions bleiben unveraendert.
- `AdminLeagueDetail` wird kleiner oder zumindest klarer segmentiert.

### Rollback-Strategie

- Config-Datei entfernen.
- Einzelne Handler in `AdminLeagueDetail` wieder explizit einsetzen.
- Da API und Datenmodell unveraendert bleiben, reicht Code-Revert.

## AP6 - Code-Verkleinerung: Online-Service Importflaeche in Client Components reduzieren

### Ziel

Den 8977-LOC-Monolith `online-league-service.ts` nicht mehr als generelles Import-Barrel fuer Client Components verwenden. Zuerst nur Imports bereinigen, keine Business-Logik verschieben.

### Konkrete Umsetzungsschritte

1. Import-Audit fuer Client Components ausfuehren:
   - `rg "online-league-service" src/components src/app`
2. `OnlineFantasyDraftRoom` als ersten kleinen Kandidaten umstellen:
   - Typen aus `online-league-types.ts`
   - Draft-Konstanten aus `online-league-draft-service.ts`
3. Danach einzelne Admin-/Online-Komponenten pruefen:
   - Wenn nur Typen importiert werden, auf `online-league-types.ts` umstellen.
   - Wenn Runtime-Funktionen gebraucht werden, unveraendert lassen.
4. Keine fachlichen Module aus `online-league-service.ts` verschieben.
5. Nach jedem Dateiwechsel Build und Tests laufen lassen.

### Betroffene Dateien

- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/admin/admin-league-manager.tsx`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-detail-model.ts`
- `src/lib/online/online-league-service.ts` nur beobachten, nicht direkt splitten
- `src/lib/online/online-league-types.ts`
- `src/lib/online/online-league-draft-service.ts`

### Nicht-Ziele

- Kein Split von `online-league-service.ts` in diesem AP.
- Keine Aenderung an Business Actions.
- Keine Aenderung an Draft-/Week-/Simulation-Flow.
- Keine Bundle-Optimierung mit Dynamic Imports.
- Keine Entfernung von Re-Exports, solange Abhaengigkeiten existieren.

### Risiken

- Niedrig bis mittel, weil Importpfade geaendert werden.
- Risiko von versehentlichen Runtime-/Type-only-Verwechslungen.
- Bundle-Gewinn kann im ersten Schritt klein sein, weil andere Imports den Monolith weiterhin ziehen.

### Testplan

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run test:run`
- gezielt:
  - `src/lib/online/fantasy-draft.test.ts`
  - `src/lib/online/fantasy-draft-service.test.ts`
  - `src/components/online/online-league-dashboard-panels.test.tsx`

### Akzeptanzkriterien

- Mindestens eine Client Component importiert nicht mehr unnoetig aus `online-league-service.ts`.
- Keine Runtime-Funktion wird verschoben.
- Build bleibt gruen.
- Tests bleiben gruen.
- `online-league-service.ts` bleibt API-kompatibel.

### Rollback-Strategie

- Importpfade in betroffenen Dateien auf `online-league-service.ts` zuruecksetzen.
- Keine Daten- oder API-Aenderung, daher reiner Code-Revert.

## Reihenfolge

Empfohlene Reihenfolge:

1. **AP2** - aktueller E2E-/Permission-Blocker hat Vorrang.
2. **AP1** - danach Online-League-State stabilisieren und doppelte Subscriptions reduzieren.
3. **AP3** - risikoarme Draft-Room-Performance.
4. **AP4** - Placeholder schrittweise verkleinern.
5. **AP5** - Admin-Detail-Boilerplate reduzieren.
6. **AP6** - Importflaeche des Online-Monolithen langsam abbauen.

## Gemeinsame Definition of Done

Jedes AP ist erst abgeschlossen, wenn:

- Codeaenderung klein und reviewbar ist.
- No-Go-Bereiche nicht beruehrt wurden.
- benoetigte Tests laut AP gelaufen sind.
- bei roten Tests eine klare Blocker-Notiz existiert.
- keine produktiven Daten, Seeds oder Firestore-Strukturen migriert wurden.

Status: **Plan erstellt**.
