# Multiplayer Stabilization & GUI Review Report

## Ausgangslage

Der Online-Modus besteht aus Online Hub, Liga-Suche, Join-Flow, Online-Liga-Dashboard, lokalem Legacy-State und optionalem Firebase-Repository. Der Adminbereich verwaltet Ligen, Mitglieder, Ready-State und Week-Placeholder. Vor der Stabilisierung waren mehrere Aktionen technisch funktionsfähig, aber UI-Feedback, Fehlerzustände, gefährliche Admin-Aktionen und lokale Datenkonsistenz waren noch nicht durchgehend abgesichert.

## Geprüfte Screens

- `/online`
- `/online/league/:leagueId`
- `/admin`
- `/admin/league/:leagueId`

## Geprüfte Services

- `src/lib/online/online-league-service.ts`
- `src/lib/online/repositories/local-online-league-repository.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/types.ts`
- Online- und Admin-Komponenten unter `src/components/online` und `src/components/admin`

## Gefundene Stabilitätsprobleme

- Ungültige Liga-IDs im Join-Flow konnten nicht klar vom Legacy-Global-Test-League-Fallback getrennt werden.
- `lastLeagueId` wurde bei ungültigen Continue-Zielen nicht aktiv bereinigt.
- Online Hub Actions hatten teilweise keine Pending-States und konnten mehrfach ausgelöst werden.
- Liga-Suche hatte keinen expliziten Error-State.
- Admin-Reset und einige riskante Admin-Aktionen hatten keine Bestätigung oder kein einheitliches Fehlerfeedback.
- Debug-Tools konnten im Firebase-Modus Legacy-localStorage-State verändern und dadurch Verwirrung erzeugen.
- Lokale Online-Ligen hatten keine explizite State-Validation/Repair-Schicht für sichere Reparaturen.

## Gefundene UX-/GUI-Probleme

- User-Status zeigte pauschal "Nicht verbunden", obwohl im lokalen Testmodus ein GM-Kontext existiert.
- Join-Button war deaktiviert, ohne den Grund direkt zu erklären, wenn die Team-Identität fehlte.
- Erfolgs- und Fehlerzustände waren im Online Hub und Adminbereich nicht überall sichtbar.
- Adminbereich und Spielerbereich waren optisch ähnlich genug, dass Rolle und Kontext stärker markiert werden sollten.
- Riskante Admin-Aktionen waren nicht konsequent als riskant bzw. bestätigungspflichtig behandelt.

## Behobene Probleme

- `validateOnlineLeagueState()` ergänzt:
  - prüft ID, Status, Week/Season, maxUsers, doppelte User, doppelte Team-Zuweisung, Überbelegung, vakante Ready-Mitglieder und fehlende Team-Zuweisung.
- `repairOnlineLeagueState()` ergänzt:
  - dedupliziert lokale doppelte User sicher.
  - setzt Ready-State für vakante Mitglieder zurück.
  - normalisiert Week/Season/maxUsers/weekStatus.
- Lokale Reads/Saves reparieren sichere State-Probleme über die neue Repair-Schicht.
- Join-Flow blockiert ungültige Liga-IDs ohne neuen State zu erzeugen.
- Global Test League bleibt bewusst Legacy-kompatibel lazy erzeugbar.
- Ready-State blockiert entfernte, gefeuerten oder vakante Mitglieder.
- Admin "Alle Ready" setzt nur aktive Mitglieder ready.
- Reset setzt Week, Season, Ready-/Match-State und `lastLeagueId` sauber zurück.
- Repository-Interface ergänzt `clearLastLeagueId()`.
- Online Continue:
  - Pending-State.
  - try/catch.
  - ungültige `lastLeagueId` wird bereinigt.
  - verständliches Fehlerfeedback.
- Liga-Suche:
  - Loading/Error/Empty-State.
  - Join-Pending-State gegen Doppelklicks.
  - verständlicher Hinweis bei fehlender Team-Identität.
- Online Dashboard:
  - Ready-Aktion mit Pending-State, Erfolg und Fehlerfeedback.
  - Ready-Button zeigt die aktuelle Week statt hart "Woche 1".
- Online User Status:
  - zeigt jetzt "Lokaler Testmodus · GM" oder "Verbunden · GM".
- Admin League Manager:
  - Create/Delete/Reset mit try/catch und Pending-State.
  - Delete/Reset/LocalStorage Reset/Alle Ligen löschen mit Confirm Dialog.
  - Firebase-Modus deaktiviert lokale Debug-Tools, damit Backend- und Legacy-State nicht vermischt werden.
  - Feedback unterscheidet Erfolg und Warnung.
- Admin League Detail:
  - zentrale `runAdminAction()`-Absicherung.
  - Pending-State gegen doppelte Admin-Aktionen.
  - Confirm Dialog für Spieler entfernen, GM entfernen, Team vakant setzen und Woche simulieren.
  - verständliches Fehlerfeedback.

## Bewusst nicht behobene Punkte

- Kein kompletter UI-Redesign-Pass. Die Änderungen bleiben gezielt auf Verständlichkeit, Fehlerzustände und sichere Bedienbarkeit beschränkt.
- Keine neue Game-Engine- oder echte Multiplayer-Simulation. Week-Simulation bleibt Placeholder.
- Keine Cloud-Function-Härtung für alle Admin-Commands in diesem Paket. Client-Repository-Guards und Firebase Rules bleiben MVP-Backbone; produktive Admin-Commands sollten serverseitig finalisiert werden.
- Kein dediziertes `test:e2e:multiplayer`, weil das Script im Projekt aktuell nicht existiert.

## Geänderte Dateien

- `src/lib/online/online-league-service.ts`
- `src/lib/online/types.ts`
- `src/lib/online/repositories/local-online-league-repository.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/components/online/online-continue-button.tsx`
- `src/components/online/online-league-search.tsx`
- `src/components/online/online-user-status.tsx`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/admin/admin-league-manager.tsx`
- `src/components/admin/admin-league-detail.tsx`
- `src/lib/online/online-league-service.test.ts`
- `docs/reports/multiplayer-stabilization-gui-review-report.md`
- `docs/reports/multiplayer-gui-issue-list.md`

## Tests und Ergebnisse

- `npm run lint`: bestanden.
- `npx tsc --noEmit`: bestanden.
- `npm test -- --run`: bestanden, 125 Test Files / 723 Tests.
- `npm run test:firebase:parity`: bestanden.
- `npm run test:e2e`: nicht ausgeführt bis Browser-Test, Preflight blockiert wegen fehlender PostgreSQL-DB auf `localhost:5432`.
- `node scripts/e2e-preflight.mjs`: blockiert wegen fehlender PostgreSQL-DB auf `localhost:5432`.
- `npm run test:e2e:multiplayer`: nicht vorhanden.

## Verbleibende Risiken

- Echte Multi-User-Race-Conditions bei Admin-Commands sind erst vollständig belastbar, wenn kritische Aktionen serverseitig über Admin SDK oder Cloud Functions laufen.
- Firebase- und Local-Repository sind getrennt, aber lokale Debug-Tools bleiben bewusst nur für Legacy/Development erhalten.
- E2E-Absicherung kann erst vollständig grün werden, wenn die lokale Datenbankumgebung verfügbar ist.
- Realtime-GUI wurde code-seitig geprüft, aber nicht per Zwei-Browser-E2E validiert, weil kein Multiplayer-E2E-Script vorhanden ist.

## Go/No-Go Einschätzung

Go für den nächsten lokalen Multiplayer-Test im Local- und Firebase-MVP-Modus.

No-Go für produktive Multiplayer-Freigabe, solange dedizierte Multiplayer-E2E-Tests, serverseitige Admin-Commands und echte Week-Simulation noch fehlen.
