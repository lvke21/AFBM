# Full Project Technical Audit

Datum: 2026-05-01

## Executive Summary

Status: Rot fuer spielbare Multiplayer-Freigabe, Gelb fuer technischen Prototyp.

Die aktuelle Codebasis ist deutlich weiter als ein Wegwerf-Prototyp: TypeScript, Lint, Build mit staging-aehnlicher Env, 802 Unit-/Integrationstests, Firebase Rules/Parity und zwei Multiplayer-E2Es laufen gruen. Der Kern-Online-Flow mit Firebase Anonymous Auth, Join, Ready-Sync und lokalem 16-Team-Fantasy-Draft ist technisch nachweisbar.

Trotzdem ist das Projekt im aktuellen Zustand keine belastbar spielbare Multiplayer-Version. Der Hauptgrund ist nicht Auth oder Draft, sondern die Spielschleife nach dem Draft: Week-Simulation ist im Multiplayer-Firebase-Pfad noch eine Platzhalter-Adminaktion, die Week-Zustand weiterschaltet, aber keine belastbaren Match-Ergebnisse, Stats, Report-Verteilung oder Spielerbelohnung erzeugt. Zusaetzlich sind die spezialisierten Simulation-QA-Gates rot.

## Test- und Build-Ergebnisse

| Gate | Ergebnis | Bewertung |
| --- | --- | --- |
| `npx tsc --noEmit` | Gruen | Keine Typfehler. |
| `npm run lint` | Gruen | ESLint ohne Fehler. |
| `npm test -- --run` | Gruen | 139 Testdateien, 802 Tests bestanden. |
| `npx playwright test e2e/multiplayer-fantasy-draft.spec.ts` | Gruen | 16-Team-Draft, 656 Picks, Reload, Guards, Week-1-Ready lokal abgedeckt. |
| `npm run test:firebase:rules` | Gruen | 15 Rules-Tests bestanden. Permission-Denied-Logs sind erwartete Negativtests. |
| `npm run test:firebase:parity` | Gruen | 3 Parity-Tests bestanden. |
| `npm run test:e2e:multiplayer:firebase` | Gruen | Firebase Auth + Firestore Emulator: zwei User, Join, Ready, Reload, Cross-User-Write-Block. |
| `npm run qa:production:test` | Rot | Production-Fingerprint-Test faellt: alle 8 Seed-Fingerprints weichen von Erwartung ab. |
| `npm run qa:simulation-balancing:test` | Rot | `medium-vs-medium.averageTotalScore = 22.31`, erwartet `>= 24`. |
| `npm run build` ohne Env | Rot erwartet | Runtime-Env-Guard blockt fehlende Secrets/Firebase-Config. |
| `npm run build` mit staging-aehnlicher Env | Gruen | Next Build erfolgreich, aber Warnung wegen Workspace Root/mehrerer Lockfiles. |

## Architektur

### Staerken

- Auth.js/OAuth ist aus produktiven User-Flows entfernt; Online nutzt Firebase Auth, Admin nutzt Firebase Custom Claims.
- Firestore Rules sind defensiv: kritische Game-State- und Admin-Pfade sind fuer Clients gesperrt.
- Admin-Actions laufen serverseitig ueber `requireAdminActionSession()` und Audit-Logging.
- Firestore-Join, Ready und Draft-Picks nutzen Transaktionen.
- Deterministische Simulation und Seed-Infrastruktur existieren.
- Runtime-Env-Guard verhindert versehentliche Production-Builds mit fehlenden Secrets oder Demo-Config.

### Kritische Schwachstellen

1. Multiplayer-Week-Simulation ist kein echtes Spielereignis
   - Lokal: `simulateOnlineLeagueWeek()` schreibt explizit `"Simulation placeholder ausgefuehrt"` und erzeugt einfache Online-Match-Resultate.
   - Firebase/Admin: `simulateWeek` schreibt nur Week-Dokumente, setzt Ready zurueck und erstellt `week_simulated_placeholder`.
   - Referenzen: `src/lib/online/online-league-service.ts:8119`, `src/lib/online/online-league-service.ts:8193`, `src/lib/admin/online-admin-actions.ts:823`, `src/lib/admin/online-admin-actions.ts:924`.
   - Auswirkung: Nach Draft/Ready fehlt der eigentliche Multiplayer-Payoff. Spieler sehen keinen belastbaren, nachvollziehbaren Spieltag.

2. Simulation-QA ist rot
   - `qa:production:test` zeigt komplett abweichende Fingerprints.
   - `qa:simulation-balancing:test` zeigt zu niedrige Gesamtpunkte im ausgeglichenen Szenario.
   - Auswirkung: Selbst wenn Week-Simulation angeschlossen wird, ist unklar, ob die Engine fachlich stabil ist oder ob Baselines bewusst aktualisiert werden muessen.

3. Firestore-Draft-State ist als hot document / grosser Blob riskant
   - Draft-State und Spielerpool werden in `settings` des League-Dokuments erzeugt.
   - Picks werden als wachsendes Array in `settings.fantasyDraft` gespeichert.
   - Referenzen: `src/lib/admin/online-admin-actions.ts:309`, `src/lib/admin/online-admin-actions.ts:953`, `src/lib/online/repositories/firebase-online-league-repository.ts:732`.
   - Auswirkung: 792 Pool-Spieler plus bis zu 656 Picks sind gefaehrlich nah an Firestore-Dokumentgroesse, teure Schreiblast, Konflikt-Hotspot und schlechte Debugbarkeit.

4. Service- und UI-Zentralisierung bleibt hoch
   - `src/lib/online/online-league-service.ts`: 8933 Zeilen.
   - `src/components/online/online-league-placeholder.tsx`: 2112 Zeilen.
   - `src/lib/admin/online-admin-actions.ts`: 1474 Zeilen.
   - `src/components/admin/admin-league-detail.tsx`: 1221 Zeilen.
   - Auswirkung: Jede Aenderung an Multiplayer, Training, Finance, Draft oder Admin kann Seiteneffekte in weit entfernten Bereichen ausloesen.

5. Firebase-Multiplayer hat noch lokale/unsynchronisierte Aktionen in der UI
   - Online Dashboard enthaelt zahlreiche lokale Service-Imports und zeigt fuer Firebase-Aktionen eine Meldung, dass sie nicht synchronisiert sind.
   - Referenz: `src/components/online/online-league-placeholder.tsx:5`, `src/components/online/online-league-placeholder.tsx:116`.
   - Auswirkung: Spieler koennen Oberflaechen sehen, die im Firebase-Multiplayer noch keine echte Wirkung haben. Das ist spielerisch frustrierend und technisch riskant.

6. Lokaler Backend-Fallback bleibt Default
   - Ohne Env faellt `getOnlineBackendMode()` auf `local` zurueck.
   - Referenz: `src/lib/online/online-league-repository-provider.ts:10`.
   - Auswirkung: Entwickler koennen versehentlich einen lokalen Zustand testen und glauben, Firebase sei validiert. Der Runtime-Guard faengt Staging/Production ab, aber lokale Tests bleiben zweideutig.

7. Adminzugriff ist auf Firebase Custom Claims umgestellt
   - Cookie-Token ist statisch aus Secret + fixer Message abgeleitet.
   - Referenz: `src/lib/admin/admin-claims.ts`.
   - Auswirkung: Fuer Staging akzeptabel, fuer langlebige Production fehlen Ablauf, Rotation, Rate-Limit und CSRF-Haertung.

8. Build- und Test-Infrastruktur ist noch rau
   - Next warnt wegen mehrerer Lockfiles und falscher Workspace-Root-Erkennung.
   - Firebase-Emulator-Tests brauchen lokale Port-/Network-Freigabe.
   - Legacy/Prisma-Pfade sind noch sichtbar, obwohl Staging Firestore nutzt.

## State-Quellen

- Firebase Auth: Anonymous User UID und optional verlinkter Email/Password-Account.
- Firestore: `leagues`, `memberships`, `teams`, `weeks`, `events`, `adminLogs`, `adminActionLocks`.
- LocalStorage: lokaler Backendmodus, `afbm.online.leagues`, `afbm.online.lastLeagueId`, `afbm.online.userId`, `afbm.online.username`, Expert-Mode.
- React-Komponentenstate: Hub-Suche, Join, Draft-Auswahl, Dashboard-Forms, Admin-Pending-Actions.
- Server-Cookie: `afbm.admin.session`.
- Legacy/Prisma: weiterhin fuer Singleplayer/alte lokale Datenpfade vorhanden.

## Sync-Pfade

- Online Hub laedt verfuegbare Ligen ueber Repository und subscribt im Ready-State.
- Join laeuft in Firestore ueber Transaktion: League, Membership, Team, MemberCount, Event.
- Ready-State laeuft in Firestore ueber Transaktion je User.
- Fantasy-Draft-Pick laeuft in Firestore ueber Transaktion mit Membership-, Team- und Player-Verfuegbarkeitsvalidierung.
- Admin-Actions laufen ueber API Route und serverseitige Firestore/Admin-SDK-Pfade.
- Lokaler Modus schreibt denselben Online-League-State in LocalStorage.

## Performance und Skalierung

- `/online/league/[leagueId]` hat im Build 25 kB Route Size und 275 kB First Load JS. Das ist fuer MVP akzeptabel, aber die Seite enthaelt sehr viel Feature-Oberflaeche auf einmal.
- Firestore-Draft schreibt auf dasselbe League-Dokument pro Pick. Das ist fuer genau eine Testliga tragbar, aber nicht skalierbar fuer mehrere aktive Drafts oder hohe Interaktion.
- Der Admin-Auto-Draft iteriert sequenziell ueber viele Picks. Lokal ist das schnell genug, aber Firestore-Auto-Draft bis Ende kann viele Transaktionen erzeugen.

## Sicherheit

- Positiv: keine OAuth-Abhaengigkeit, Firebase Anonymous Auth, Firestore Rules restriktiv, Admin-Actions serverseitig geschuetzt.
- Kritisch: Adminrollen sollten langfristig um Audit- und Rollenmodell erweitert werden.
- Kritisch: Admin-Action-Route akzeptiert umfangreiche Payloads und lokale State-Patches im Local-Modus. Das ist fuer lokale Tests praktisch, muss aber klar von Production-Firebase getrennt bleiben.
- Medium: Firestore Rules enthalten noch TODOs fuer finale Auth/Rollen-Mapping-Strategie.

## Fazit

Technisch ist das Projekt testbar und hat tragende Bausteine fuer Multiplayer. Es ist aber nicht als voll spielbare Multiplayer-Version freigabefaehig, weil der Draft zwar funktioniert, der eigentliche Liga-Spieltag danach aber noch nicht als echtes Multiplayer-Spielereignis umgesetzt und validiert ist. Die roten Simulation-QA-Gates verstaerken diese No-Go-Bewertung.
