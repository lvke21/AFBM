# Top Findings

## 1. Das Produkt ist breiter sichtbar als spielbar

Spieler sehen viele klassische Franchise-Manager-Bereiche. Stabil ist aber vor allem der Multiplayer-Core-Loop. Dieser Widerspruch erzeugt UX-Schulden und QA-Flaeche.

Betroffene Bereiche:

- Sidebar Navigation
- Online Dashboard
- Admin Hub
- Coming-Soon Bereiche

Entscheidung:

- Nicht-MVP-Features einfrieren und aus Hauptnavigation reduzieren.

## 2. Der Multiplayer-Core ist gelb spielbar

Join, Team-Zuweisung, Dashboard, Ready-State, Reload, Results/Standings und Admin Week Simulation sind service-/stagingnah vorhanden. Vollstaendiger Admin-UI-Browser-Smoke und lokale E2E-Reproduzierbarkeit fehlen aber.

Entscheidung:

- Core Loop zuerst mit echten E2E-/Staging-Smokes absichern.

## 3. Online-Service und Firebase Repository sind zentrale Hotspots

`online-league-service.ts` und `firebase-online-league-repository.ts` koppeln Domain, State, Repository, Draft, Week, Mapper, Subscriptions und lokale Fallbacks.

Risiko:

- Kleine Aenderungen koennen Join, Draft, Ready, Dashboard und Admin gleichzeitig brechen.

Entscheidung:

- Nur kleine API-kompatible Schnitte; keine Big-Bang-Refactors.

## 4. `subscribeToLeague()` liest zu breit

Dashboard- und Draft-Kontexte werden ueber breite League-Snapshots versorgt. Listener-Events fuehren erneut zu vollen Snapshot-Reads.

Risiko:

- Kosten, Re-Renders, stale State und Race Conditions.

Entscheidung:

- Read-Metriken und Subscription-Profile einfuehren.

## 5. User-Team-Linking ist die wichtigste Konsistenzgrenze

Gueltiger Multiplayer-Zugriff haengt an:

- Firebase UID
- League Membership
- globalem `leagueMembers` Mirror
- Team `assignedUserId`/`managerUserId`
- LocalStorage/Route-State

Risiko:

- "Benutzer ist nicht verbunden" trotz Login.

Entscheidung:

- Rejoin/Repair und Invarianten zuerst testen und haerten.

## 6. Week State braucht eine explizite State Machine

Aktuell existieren mehrere Statusfelder:

- `league.status`
- `weekStatus`
- `draft.status`
- `completedWeeks`
- `lastSimulatedWeekKey`
- ready flags
- simulation locks/results/standings

Risiko:

- UI-Sperren und Admin-Blocker bei widerspruechlichen Kombinationen.

Entscheidung:

- State Machine als Code-Helper/Validator schrittweise einfuehren.

## 7. Testbasis ist stark, aber E2E-Infrastruktur ist fragil

Vitest/Build/Typecheck/Lint sind gruen. E2E scheitert lokal vor Browserstart, wenn PostgreSQL nicht laeuft. Staging-Smoke braucht echte Secrets/Token/IAM.

Entscheidung:

- E2E/Smoke Infrastruktur stabilisieren, bevor Production-Go.

## 8. Security ist defensiv, aber Admin-Modell ist nicht ganz einheitlich

Admin API erlaubt Custom Claim oder UID-Allowlist. Firestore Rules erlauben globale Adminrechte nur ueber Custom Claim.

Risiko:

- Admin-Verhalten wirkt unterschiedlich je nach Zugriffspfad.

Entscheidung:

- Kurzfristig dokumentieren; mittelfristig Claims-only oder bewusst API-only-Adminmodell.

## 9. Production-Ziel ist nicht verifiziert

Staging ist konkret. Production-Projekt-ID und App-Hosting-Backend-ID sind nicht verifiziert; `apphosting.yaml` ist staging-orientiert.

Entscheidung:

- Production bleibt No-Go. Keine geratenen IDs.

## 10. Engine ist gut abgeschirmt, aber No-Go fuer schnelle Refactors

Game Engine und Simulation sind gross, aber stark getestet. Sie sollten nicht angefasst werden, solange Multiplayer-Core, E2E und Scope noch gelb sind.

Entscheidung:

- Engine nur nach Golden-Master-/Determinismus-Schutz refactoren.

## Widersprueche zwischen Reports

| Widerspruch | Synthese |
| --- | --- |
| Multiplayer Acceptance sagt "spielbar Gelb"; UX Auditor sagt "nicht als echtes Spieler-MVP". | Beides stimmt: technisch intern spielbar, produktseitig noch nicht intuitiv/releasefaehig. |
| UI-Inventar sagt Coming-Soon ist OK; Scope-Report sagt Hauptnavigation ist zu breit. | Coming-Soon ist funktional korrekt, aber Produktflaeche sollte trotzdem reduziert werden. |
| QA sagt lokale Gates gruen; E2E sagt lokal rot. | Unit/Build gruen, Browser-E2E nicht self-contained. |
| Security sagt Admin API sicher; Rules-Analyse sagt Admin-Modell divergiert. | API ist serverseitig sicher, aber Rules und API haben unterschiedliche Adminquellen. |
| Production Guide beschreibt Vorbereitung; Deployment Report sagt Production No-Go. | Vorbereitung ist vorhanden, Zielumgebung ist nicht verifiziert. |
| Performance sagt aktuell tragbar; Firebase Analyse sagt langfristig teuer. | Kleine Staging-Liga ok, Skalierung nicht abgesichert. |

## Harte Schlussfolgerung

Das Projekt braucht keinen Feature-Schub. Es braucht einen Stabilisierungsschub und eine sichtbare Scope-Reduktion.
