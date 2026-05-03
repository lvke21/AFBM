# Lifecycle/E2E Verification

Stand: 2026-05-03

Scope: Verifikation der zuletzt umgesetzten Lifecycle-Pakete L1-L4 und Browser-E2E-Pakete E1-E4. Grundlage sind aktueller Code, aktuelle Tests, lokaler Firebase-Emulator-E2E-Lauf und ein nicht-mutierender Staging-Build-Info-Fetch. Es wurden keine Produktiv-/Staging-Daten veraendert.

## Executive Summary

| Frage | Antwort | Begruendung |
| --- | --- | --- |
| Lifecycle stabil? | Nein | Es gibt ein zentrales Pure Read-Model mit Phasen und Konfliktblockern, aber UI/Admin nutzen weiterhin einzelne Parallelmodelle und Admin waehlt eine User-Perspektive statt eines globalen League-Lifecycle. |
| E2E ausreichend? | Nein | Die lokale Firebase-Emulator-Suite ist gruen und deckt die neuen Browser-Smokes ab. Fuer "ausreichend" als Release-Beweis fehlen echter Race-Test und mutierender Staging-Smoke in diesem Audit-Lauf. |
| System robust? | Nein | Ein neuer Entwickler kann weiterhin rohe Felder wie `weekStatus`, `readyForWeek`, `fantasyDraft` oder Team-Projektionen direkt lesen und damit am Lifecycle vorbei entscheiden. |

## Paketstatus Tabelle

| Paket | Status | Kommentar |
| --- | --- | --- |
| L1 Lifecycle-Inventar | FERTIG | `docs/reports/multiplayer-lifecycle-state-inventory.md` inventarisiert League, Membership, Team, Draft, Ready, Week, Simulation, Results und benennt kanonische Quellen/Projektionen. |
| L2 Lifecycle Read-Model | TEILWEISE | `src/lib/online/online-league-lifecycle.ts` definiert `normalizeOnlineCoreLifecycle`, alle geforderten Phasen und Transitionen. Es ist pure und getestet. Nicht fertig: `draftStatus=missing` in aktiver Liga kann zu `readyOpen` werden, Transitionen sind nur publiziert, nicht fuer Writes erzwungen. |
| L3 UI/Admin-Nutzung | TEILWEISE | Online App Shell, League Detail und Admin Detail nutzen das Read-Model. Nicht fertig: Admin normalisiert aus einer beliebigen User-Perspektive, einzelne UI/Admin-Stellen lesen weiterhin rohe Week-/Draft-/Ready-Felder fuer relevante Anzeige/Enablement-nahe Logik. |
| L4 Konflikttests | FERTIG | Unit-/Model-Tests decken die geforderten Konflikte ab: Week-Conflict, active Draft, invalid Roster trotz ready, Simulation Lock, Results ohne `completedWeeks`, Membership-Team-Projektion. |
| E1 GM Rejoin Browser-E2E | FERTIG | Browser-Test prueft Login, bestehende Membership, Team-Projektion, Reload, stale `lastLeagueId` und Rejoin ins gleiche Team. |
| E2 Admin Week Reload Browser-E2E | FERTIG | Browser-Test prueft Admin Login, Ready-State, Simulation, Results/Standings, Reload-Stabilitaet und blockierte Doppelsimulation. |
| E3 Concurrency/Cross-User E2E | TEILWEISE | Zwei Browser-Kontexte pruefen Join, Ready-Sync, Persistenz, Cross-User Membership/Team Writes und Admin-Gate. Es fehlt ein echter Race-Test fuer gleichzeitige Teamauswahl/Ready-Kollisionen. |
| E4 Mobile/Coming-Soon/A11y-Smoke | FERTIG | Browser-Smoke prueft MVP-Sidebar, Nicht-MVP Direct URLs, Desktop/Mobile Viewports, zentrale Button-Namen und Browser-Console-Errors. Bewusst keine volle A11y-Suite. |

## Code- und Testbelege

- Phasen und Transitionen: `src/lib/online/online-league-lifecycle.ts:59` bis `src/lib/online/online-league-lifecycle.ts:113`.
- Phasenableitung und Konfliktblocker: `src/lib/online/online-league-lifecycle.ts:227` bis `src/lib/online/online-league-lifecycle.ts:390`.
- Lifecycle-Tests: `src/lib/online/online-league-lifecycle.test.ts:267` bis `src/lib/online/online-league-lifecycle.test.ts:573`.
- Online UI nutzt Read-Model: `src/components/online/online-league-app-shell.tsx:79` bis `src/components/online/online-league-app-shell.tsx:112` und `src/components/online/online-league-detail-model.ts`.
- Admin nutzt Read-Model, aber aus User-Perspektive: `src/components/admin/admin-league-detail.tsx:654` bis `src/components/admin/admin-league-detail.tsx:724`.
- E2E Browser-Flows: `e2e/multiplayer-firebase.spec.ts:604` bis `e2e/multiplayer-firebase.spec.ts:920`.

## Realitaetscheck

| Frage | Antwort |
| --- | --- |
| Kann ein neuer Entwickler das System brechen? | Ja. Es gibt keine harte Architekturgrenze, die neue UI/Admin-/Write-Pfade zwingt, `normalizeOnlineCoreLifecycle` zu nutzen. |
| Gibt es noch versteckte Zustaende? | Ja. `weekStatus`, `completedWeeks`, `fantasyDraft`, `readyForWeek`, Team-Projektionen und Admin-Locks existieren weiter parallel. Das Read-Model erkennt wichtige Konflikte, ersetzt diese Quellen aber nicht. |
| Gibt es Race Conditions, die nicht abgedeckt sind? | Ja. Die Browser-Suite prueft zwei Benutzer sequenziell/parallel im Flow, aber keinen echten simultanen Join auf dasselbe Team, keine gleichzeitigen Ready-Toggles und keine parallelen Admin-Simulationsstarts aus zwei Sessions. |
| Gibt es Faelle, wo UI und Backend widersprechen? | Moeglich. UI/Admin Read-Model, `getOnlineLeagueWeekReadyState`, `normalizeOnlineLeagueWeekSimulationState`, Firestore Rules und Server-Actions pruefen aehnliche Bedingungen, aber nicht aus einem gemeinsamen Guard-Artefakt. |

## Gap-Liste

| Luecke | Paket | Warum nicht erledigt | Fehlender Schritt | Risiko |
| --- | --- | --- | --- | --- |
| Aktive Liga ohne Draft-Doc kann `readyOpen` werden. | L2 | `draftStatus=missing` fuehrt nur bei nicht-aktiver Liga zu `draftPending`; der Testtitel sagt "draftPending", erwartet aber `readyOpen`. | Entscheidung festlegen: fehlender Draft in aktiver Multiplayer-Liga entweder explizit erlauben oder als `draftPending`/`blockedConflict` testen und dokumentieren. | mittel |
| Transitionen werden nicht als Guard fuer Writes erzwungen. | L2/L3 | `canTransitionOnlineCoreLifecycle` existiert, aber Writes/Actions muessen weiterhin eigene Guards nutzen. | Write-Pfade inventarisieren und pro mutierender Action dokumentieren, welcher Guard dieselbe Lifecycle-Entscheidung erzwingt. | mittel |
| Admin-Lifecycle ist nicht global. | L3 | Admin nimmt `league.users.find((user) => user.readyForWeek) ?? league.users[0]` als Perspektive. Dadurch ist der globale League-State nur naeherungsweise abgeleitet. | Separates Admin/League-Lifecycle-Read-Model ohne Current-User-Perspektive bauen oder bestehendes Input-Modell um `scope: "league"` erweitern. | mittel |
| UI liest weiterhin einzelne Parallelfelder. | L3 | App Shell berechnet `rosterReady` separat; Admin und Draft UI lesen `weekStatus`, `fantasyDraft`, `readyForWeek` fuer Anzeigen und teils Enablement-nahe Logik. | Alle verbleibenden UI-/Admin-Lesepfade klassifizieren: reine Anzeige behalten, Flow-/Enablement-Entscheidungen auf Lifecycle umstellen. | mittel |
| Konflikte werden im Read-Model blockiert, aber nicht systemweit garantiert. | L4 | Tests beweisen Read-Model-/Model-Verhalten, nicht dass jeder Server-/Repository-Pfad dieselben Konflikte hard-failt. | Fuer kritische Mutationen Tests ergaenzen: Ready, Join/Rejoin, Simulate Week, Draft Pick gegen konfliktbehaftete League-State-Fixtures. | hoch |
| Concurrency-Test ist kein echter Race-Test. | E3 | Zwei Browser-Kontexte joinen und syncen, aber ohne gleichzeitige konkurrierende Team-/Ready-/Simulation-Aktion. | E2E oder Rules/Repository-Test fuer simultanen Same-Team-Join und parallele Ready-/Admin-Simulate-Anfragen ergaenzen. | hoch |
| Staging-Smoke wurde in diesem Audit nicht mutierend ausgefuehrt. | E2/Release | `/api/build-info` ist erreichbar, aber der authentifizierte Staging Admin-Week-Flow wurde nicht erneut gestartet. | Separaten Release-Gate-Lauf mit expliziter Freigabe und erwarteter SHA `1a28d88eaaa99a182612638652d0165705ce6901` ausfuehren. | hoch |
| A11y/Mobile bleibt Smoke-Level. | E4 | Geprueft werden Button-Namen, Viewport-Overflow und Console Errors, aber keine Keyboard-Fokusreihenfolge, Landmark-Vollstaendigkeit oder Kontrast. | Spaeter kleine, gezielte Keyboard-/Focus-Smokes ergaenzen; keine volle A11y-Suite noetig fuer MVP-Gate. | niedrig |
| E2E-Stabilitaet ist noch nicht historisch bewiesen. | E1-E4 | Die Suite ist lokal gruen, aber langsam und stark an sichtbare Texte/Seeds gekoppelt. | CI-Historie beobachten, bei Flakes gezielt Test-IDs oder stabilere role/name-Assertions einfuehren. | mittel |

## Statusuebersicht

### Lifecycle

| Status | Anzahl | Pakete |
| --- | ---: | --- |
| FERTIG | 2 | L1, L4 |
| TEILWEISE | 2 | L2, L3 |
| OFFEN | 0 | - |

### E2E

| Status | Anzahl | Pakete |
| --- | ---: | --- |
| FERTIG | 3 | E1, E2, E4 |
| TEILWEISE | 1 | E3 |
| OFFEN | 0 | - |

## Ausgefuehrte Checks

| Check | Ergebnis | Hinweis |
| --- | --- | --- |
| `npx tsc --noEmit` | Gruen | Keine TypeScript-Fehler. |
| `npm run lint` | Gruen | ESLint ohne Befund. |
| `npx vitest run src/lib/online/online-league-lifecycle.test.ts src/components/online/online-league-detail-model.test.ts src/components/admin/admin-league-detail-model.test.ts src/components/online/online-league-dashboard-panels.test.tsx` | Gruen | 4 Testdateien, 53 Tests. |
| `npm run test:e2e:multiplayer:firebase` | Gruen | 6 Browser-Tests passed im Firebase Emulator. |
| `curl -sS -i https://afbm-staging-backend--afbm-staging.europe-west4.hosted.app/api/build-info` | Gruen | HTTP 200; Commit `1a28d88eaaa99a182612638652d0165705ce6901`, Revision `afbm-staging-backend-build-2026-05-02-007`, Environment `staging`. |
| Mutierender Staging-Smoke | Nicht ausgefuehrt | Bewusst nicht gestartet, weil dieser Audit keine Staging-Daten veraendern sollte und kein expliziter Ziel-Smoke-Commit fuer eine neue Simulation freigegeben wurde. |

## Empfehlung

MUSS noch gemacht werden:

1. Globales Admin/League-Lifecycle-Modell ohne beliebige User-Perspektive definieren.
2. Write-Pfade gegen dieselben Lifecycle-Konflikte absichern oder die bestehenden Guards explizit als aequivalent testen.
3. Echten Concurrency-Race-Test fuer Team-Join/Ready/Admin-Simulation ergaenzen.
4. Mutierenden Staging-Smoke in einem separaten Gate-Lauf gegen Commit `1a28d88eaaa99a182612638652d0165705ce6901` ausfuehren.

Kann spaeter:

1. A11y von Smoke-Level auf fokussierte Keyboard-/Focus-Pruefungen erweitern.
2. E2E-Selektoren weiter stabilisieren, falls CI-Historie Flakes zeigt.
3. Persistierte Lifecycle-Phase oder formale State-Machine-Library evaluieren; aktuell reicht ein Pure Read-Model fuer MVP-Verifikation, nicht fuer Production-Robustheit.
