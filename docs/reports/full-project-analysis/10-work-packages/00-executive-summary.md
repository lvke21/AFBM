# Executive Summary

## Gesamturteil

Status: **Gelb mit klarer Stabilisierungstendenz**.

AFBM hat einen intern spielbaren Multiplayer-Kern, eine breite Unit-/Service-Testbasis und viele sinnvolle Sicherheitsguards. Das System ist aber noch nicht reif fuer breite Production-Nutzung oder ein Spieler-MVP mit hohem Vertrauen. Der Engpass ist nicht fehlende Feature-Flaeche, sondern zu viel sichtbarer Scope, zu breite Online-/Firebase-Kopplung, unvollstaendige E2E-/Staging-Verifikation und mehrere kritische Zustandsquellen.

## Wichtigste Erkenntnis

Der spielbare Kern ist:

```text
Join/Rejoin -> Team verbunden -> Roster/Depth Chart -> Ready -> Admin simuliert Woche -> Results/Standings -> Reload
```

Alles ausserhalb dieses Loops sollte eingefroren, versteckt oder als spaeter markiert werden, bis dieser Loop auf Staging und in E2E reproduzierbar gruen ist.

## Top 10 Erkenntnisse

1. Multiplayer ist technisch als Staging-/QA-MVP spielbar, aber nicht als fertiges Spielerprodukt.
2. Der sichtbare Produktumfang ist groesser als der stabile Funktionsumfang.
3. Nicht-MVP-Features wie Contracts/Cap, Development, Trade Board, Inbox und Finance sollten eingefroren bleiben.
4. `src/lib/online/online-league-service.ts` bleibt mit ca. 8.882 Zeilen der groesste Wartbarkeits- und Kopplungshotspot.
5. `subscribeToLeague()` und das Firebase Repository lesen zu breit und erzeugen Kosten-, Re-Render- und Race-Risiken.
6. User-Team-Linking ist der kritischste Multiplayer-State: Membership, Mirror und Team-Zuordnung muessen konsistent bleiben.
7. Week Simulation ist service-/API-seitig gut abgesichert, braucht aber weiter Live-/Browser-Verifikation.
8. Unit/Integration/Build sind gruen; Browser-E2E ist lokal durch fehlende PostgreSQL-Infrastruktur nicht self-contained.
9. Security-Grundmodell ist defensiv, aber Admin API und Firestore Rules nutzen nicht exakt dieselbe Admin-Definition.
10. Production bleibt No-Go, solange echte Production-Projekt-ID, Backend-ID und Production-App-Hosting-Konfiguration nicht verifiziert sind.

## Groesste Risiken

1. User ist eingeloggt, aber nicht verlaesslich seinem Team zugeordnet.
2. Admin simuliert Woche, aber Results/Standings oder Reload sind live inkonsistent.
3. Nicht-MVP-Menuepunkte erzeugen den Eindruck eines kaputten Spiels.
4. E2E gibt lokal kein vollstaendiges Signal, weil Datenbank/Emulator/Secrets fehlen koennen.
5. Firestore Rules/Admin-API-Adminmodell divergieren durch UID-Allowlist vs Custom Claim.
6. Production Deployment koennte falsche Staging-Konfiguration verwenden.
7. Online-Monolithen machen kleine Aenderungen riskant.
8. Breite Firestore Subscriptions werden bei mehr Ligen/Spielern teuer und traege.
9. Race Conditions bei Join, Ready, Draft Pick und Week Simulation bleiben fachlich kritisch.
10. Engine- und Admin-Refactors koennen ohne starke Tests Verhalten veraendern.

## Harte Entscheidungen

- Kein neues Multiplayer-Feature, bevor Core Loop Staging-gruen ist.
- Nicht-MVP-Bereiche einfrieren oder aus Hauptnavigation nehmen.
- Admin bleibt Utility, kein Spielmodus.
- Production bleibt No-Go ohne verifizierte Zielumgebung.
- Engine nicht refactoren, bevor Golden-Master-/Determinismus-Schutz explizit steht.
- Firebase-Datenmodell nicht gross umbauen, bevor State Machine und E2E stabil sind.

## Was sofort gestoppt werden sollte

- Ausbau von Contracts/Cap, Development, Trade Board, Inbox und Finance im Multiplayer.
- Neue Admin-Tools mit nativen Prompt-/Confirm-Flows.
- Grosse Online-Service- oder Engine-Refactors.
- Production-Rollout-Vorbereitung mit geratenen IDs.
- UI, die Admin/Debug/Coming-Soon wie normale Spielerfeatures wirken laesst.

## Was zuerst stabilisiert werden sollte

1. Authenticated Staging Smoke fuer GM + Admin Week Simulation.
2. E2E-Infrastruktur fuer Prisma und Firebase reproduzierbar machen.
3. User-Team-Linking/Rejoin als Browser-Flow absichern.
4. Ready -> Simulate -> Results/Standings -> Reload als End-to-End-Flow absichern.
5. Nicht-MVP-Navigation reduzieren.

## Empfohlene Roadmap

1. **Stabilisierung:** E2E, Staging Smoke, Rejoin, Week Reload.
2. **Scope-Schnitt:** Nicht-MVP-Features einfrieren/verstecken.
3. **State-Hardening:** State Machine/Invarianten fuer League, User-Team, Ready, Draft, Week.
4. **Firebase-Kosten:** Subscription Profile und Read-Metriken.
5. **Architektur:** Online-Service, Firebase Repository und Admin Actions schrittweise schneiden.
6. **Production Readiness:** Production-Ziel verifizieren, separate App Hosting Config, Rollback.

## Go/No-Go

- Interne Weiterentwicklung: **Go**.
- Staging QA: **Go mit Bedingungen**.
- Production Release: **No-Go**.
- Breiter Spieler-MVP: **No-Go, bis Core Loop und Scope-Schnitt gruen sind**.
