# Decision Feedback Extension Report

## Status
Grün

## Ziel
Das Dashboard zeigt nicht mehr nur abgeleitete Empfehlungen und einen UI-Fixture-Platzhalter, sondern echte zuletzt gespeicherte Nutzeraktionen aus dem Team-Kontext.

## Umgesetzte Erweiterung

### Decision Feedback Historie
- `DecisionFeedbackArea` kann jetzt echte Action-History anzeigen.
- Angezeigte Aktionen stammen aus bestehenden `PlayerHistoryEvent`-Einträgen.
- Berücksichtigt werden:
  - `DEPTH_CHART` fuer Lineup- und Slot-Änderungen
  - `SIGNING` fuer Roster-Erweiterungen
  - `RELEASE` fuer Spieler-Entlassungen
- Wenn keine echten Aktionen vorhanden sind, bleibt ein klar markierter Empty-/Fixture-State sichtbar.

### Dashboard Daten
- `TeamDetail` wurde um `recentDecisionEvents` erweitert.
- Die Team-Query lädt die letzten acht relevanten Decision Events.
- Firestore-Mapping liefert einen stabilen leeren Fallback.
- Bestehende Actions mussten nicht neu erfunden werden, weil Lineup, Signing und Release bereits Player-History schreiben.

### Bewertung
- Einfache Bewertung pro Event:
  - `SIGNING` → positiv
  - `RELEASE` → positiv bei sichtbaren Cap Savings, sonst neutral
  - `DEPTH_CHART` → positiv bei Promotion in höheren Slot, negativ bei Inactive/IR, sonst neutral
- Die Bewertung ist bewusst leichtgewichtig und dient der Sichtbarkeit, nicht einer neuen Engine-Logik.

### UI
- Dashboard-Badge wechselt von `Derived + Fixture` auf `Derived + History`, sobald echte Aktionen vorhanden sind.
- Action-History-Karten werden mit Source `Action` markiert.
- Impact-Badges bleiben `positive`, `neutral`, `negative`.

## Geänderte Dateien
- `src/components/dashboard/dashboard-model.ts`
- `src/components/dashboard/dashboard-model.test.ts`
- `src/components/dashboard/decision-feedback-area.tsx`
- `src/modules/teams/domain/team.types.ts`
- `src/modules/teams/application/team-query.service.ts`
- `src/modules/teams/infrastructure/team.repository.ts`
- `src/server/repositories/firestoreRepositoryMappers.ts`
- Test-Fixtures:
  - `src/components/finance/finance-model.test.ts`
  - `src/components/inbox/inbox-model.test.ts`
  - `src/components/match/game-preview-model.test.ts`

## Tests
- `npx vitest run src/components/dashboard/dashboard-model.test.ts src/components/finance/finance-model.test.ts src/components/inbox/inbox-model.test.ts src/components/match/game-preview-model.test.ts src/components/team/depth-chart-model.test.ts src/modules/teams/application/team-roster.service.test.ts 'src/app/app/savegames/[savegameId]/team/actions.test.ts'`
  - Ergebnis: Grün, 7 Testdateien, 74 Tests
- `npx tsc --noEmit`
  - Ergebnis: Grün
- `npm run lint`
  - Ergebnis: Grün
- `curl -I -b /tmp/afbm-decision-feedback-cookies.txt http://127.0.0.1:3101/app/savegames/e2e-savegame-minimal`
  - Ergebnis: Grün, authentifiziert via `/api/e2e/dev-login`, HTTP 200

## Offene Punkte
- Trade-Aktionen schreiben aktuell keine `PlayerHistoryEvent`-Einträge und erscheinen deshalb noch nicht als Dashboard-Historie.
- Es gibt keine neue dedizierte Decision-Event-Tabelle; die Lösung nutzt bewusst die bestehende Player-History.
- Die Bewertung bleibt heuristisch und leichtgewichtig.

## Statusprüfung
- Letzte Aktionen sichtbar: Ja
- Lineup-Änderungen sichtbar: Ja
- Spieler entlassen sichtbar: Ja
- Roster verändern sichtbar: Ja, über Signings und vorhandene Roster-History
- Positive / neutrale / negative Bewertung vorhanden: Ja
- Keine Game Engine Änderungen: Ja
- Keine komplexe neue Persistenzlogik: Ja

Status: Grün
