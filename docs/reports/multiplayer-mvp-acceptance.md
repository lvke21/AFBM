# Multiplayer MVP Acceptance

Datum: 2026-05-02  
Rolle: QA Lead / Product Owner  
Umgebung: lokale Tests, Firebase Auth/Firestore Emulator, Next.js Dev Server via Playwright

## Gesamtbewertung

**Status: Gelb**

Governance-Hinweis: Dieser Bericht bewertet die technische Multiplayer-Spielbarkeit fuer internes QA/Staging. Fuer Release-Entscheidungen gilt zusaetzlich die zentrale Gate-Definition in `docs/reports/qa-release-gates.md`. Ein technisches Gelb/Gruen in diesem Bericht ueberstimmt kein rotes UX-/Product-Gate fuer echte Spieler.

Der Multiplayer-MVP ist als Spielerflow spielbar: Join, Team-Zuweisung, Dashboard, Ready-State, Reload und Firestore-Sync funktionieren im echten Browser-Smoke gegen Firebase Emulator. Die Week-Simulation, Results, Standings und Idempotenz sind auf Service-/Admin-API-Ebene grün.

Nicht auf Grün gesetzt, weil ein vollständiger echter Admin-UI-Browserlauf mit Admin-Token in diesem Durchlauf nicht ausgeführt wurde. Der lokale Prisma-Playwright-Smoke ist außerdem durch fehlende lokale PostgreSQL-Testdatenbank blockiert.

## Getestete Commands

```bash
npx vitest run src/components/layout/navigation-model.test.ts src/components/online/online-league-route-fallback-model.test.ts src/components/online/online-league-coming-soon-model.test.ts src/components/online/online-league-route-state-model.test.ts src/components/online/online-league-detail-model.test.ts src/components/online/online-league-dashboard-panels.test.tsx src/lib/online/online-league-service.test.ts src/lib/admin/online-week-simulation.test.ts src/lib/admin/online-admin-actions.test.ts src/app/api/admin/online/actions/route.test.ts
npx tsc --noEmit
npm run lint
npm run test:e2e:multiplayer
npm run test:e2e:multiplayer:firebase
```

## Testergebnisse

| Check | Ergebnis | Bewertung |
| --- | --- | --- |
| Vitest Multiplayer/API/Navigation | 10 Dateien, 111 Tests grün | Grün |
| TypeScript | grün | Grün |
| ESLint | grün | Grün |
| Playwright Firebase Multiplayer | 1 Test grün | Grün |
| Playwright Prisma Multiplayer | blockiert: PostgreSQL `localhost:5432` nicht erreichbar | Gelb |

Hinweis: Im Firebase-Smoke erscheinen Firestore `PERMISSION_DENIED` Logs für bewusst getestete verbotene Cross-User-Writes. Das ist erwartetes Verhalten und kein Fehler.

## GM Flow

| Schritt | Ergebnis | Bewertung |
| --- | --- | --- |
| Liga öffnen | `/online`, Liga suchen und Join im Firebase-Browser-Smoke erfolgreich | Grün |
| Dashboard verstehen | Dashboard lädt mit “Was jetzt tun?”, Modus, Teamstatus und Ready-Hinweisen | Grün |
| Roster prüfen | Menü-Routing und Dashboard-Anker sind getestet; Roster-Content via Model/Render abgedeckt | Grün |
| Depth Chart öffnen | Sidebar-Route `#depth-chart` und aktive Markierung getestet | Grün |
| Ready setzen | Browser-Smoke setzt Ready und Firestore-Membership zeigt `ready=true` | Grün |
| Ergebnisse sehen | Render-/Service-Tests bestätigen gespeicherte Results nach Simulation | Grün |
| Standings sehen | Standings werden nach Reload aus gespeicherten Results korrekt ableitbar | Grün |
| Navigation testen | Direkt-/Hash-/Fallback-Routen getestet, kein 404 für bekannte Multiplayer-Menüs | Grün |
| Reload testen | Firebase Browser-Smoke bestätigt `lastLeagueId`, Reload und Weiterspielen | Grün |

## Admin Flow

| Schritt | Ergebnis | Bewertung |
| --- | --- | --- |
| Ready prüfen | `getOnlineLeagueWeekReadyState`, Admin-Preparation und Dashboard-State Tests grün | Grün |
| Woche simulieren | Admin Action/API und Week-Simulation Tests grün, doppelte Simulation blockiert | Grün |
| Ergebnisse prüfen | Match Results und Completed Week werden gespeichert und geprüft | Grün |
| nächste Woche prüfen | `currentWeek` steigt nach Simulation, Ready wird zurückgesetzt | Grün |
| echter Admin-UI-Browserlauf | in diesem Durchlauf nicht ausgeführt, da kein Admin-Token für UI-Smoke genutzt wurde | Gelb |

## Akzeptanzbefund

### Was funktioniert

- Ein GM kann online beitreten, bekommt ein eindeutiges Team und bleibt nach Reload verbunden.
- Mehrere Spieler können parallel joinen; Teams werden nicht doppelt vergeben.
- Ready-State synchronisiert live und wird in Firestore gespeichert.
- Fremde Membership-/Team-Writes werden durch Rules blockiert.
- Dashboard-Status, Next Game, Results und Standings sind konsistent.
- Week-Simulation ist serverseitig/adminseitig abgesichert:
  - blockiert bei fehlendem Ready
  - blockiert doppelte Simulation
  - speichert Results
  - aktualisiert Week-State
  - erlaubt Reload mit gespeicherten Daten
- Navigation führt nicht mehr ins Leere:
  - MVP-Menüs öffnen echte Bereiche
  - nicht-MVP-Menüs gehen auf Coming-Soon
  - alte Unterrouten werden auf sichere Fallbacks/Anker gelenkt

### Offene Gelb-Punkte

- Der echte Admin-UI-Smoke mit Admin-Token wurde nicht ausgeführt.
- Der Prisma-basierte Playwright-Smoke ist lokal nicht ausführbar, solange PostgreSQL/Test-DB fehlt.
- Firebase E2E deckt GM-Flow stark ab, aber nicht die vollständige Admin-UI-Bedienung “wie ein Admin klickt”.

## Entscheidung

**Multiplayer-Spielerlebnis MVP: Gelb, spielbar aber noch nicht vollständig produktabgenommen.**

Für ein internes Staging-/QA-Go reicht der Zustand. Für ein finales Grün braucht es noch:

1. echten Admin-UI-Browser-Smoke mit gültigem Admin-Token
2. lokale PostgreSQL-E2E-Umgebung starten oder Prisma-Smoke aus Release-Gate entfernen/ersetzen
3. optionaler manueller Staging-Test mit bestehender Testliga und echtem Admin-Account
