# Decision Log

## D1: Multiplayer-Core vor neuen Features

Entscheidung:

- Der Core Loop `Join/Rejoin -> Team -> Ready -> Sim -> Results/Standings -> Reload` hat Prioritaet vor allen neuen Features.

Begruendung:

- Produkt-, UX-, QA- und Data-Reports zeigen denselben Engpass.

Konsequenz:

- Keine Erweiterung von Contracts/Cap, Development, Trade Board, Inbox, Finance bis Core Loop Staging-gruen ist.

## D2: Nicht-MVP-Features einfrieren

Entscheidung:

- Contracts/Cap, Development, Trade Board, Inbox und Finance bleiben Coming Soon oder werden aus Hauptnavigation entfernt.

Begruendung:

- Sie erhoehen Datenmodell-, UI- und Testkomplexitaet ohne den aktuellen Spielkern zu verbessern.

## D3: Admin ist Betrieb, nicht Spielmodus

Entscheidung:

- Adminmodus bleibt Utility fuer berechtigte Nutzer und darf nicht als normaler Spielerpfad wirken.

Begruendung:

- Admin UI enthaelt Debug, Simulation, GM-Tools und potenziell riskante Aktionen.

## D4: Production bleibt No-Go

Entscheidung:

- Kein Production Rollout, bis echte Production-Projekt-ID, App Hosting Backend-ID und Production Config verifiziert sind.

Begruendung:

- Production Access Requirements und Deployment-Analyse zeigen fehlende Zielverifikation.

## D5: E2E/Staging Smoke ist Release-Gate

Entscheidung:

- Production-Go erfordert authentifizierten Staging GM/Admin Smoke.

Begruendung:

- Lokale Unit/Build-Gates sind gruen, aber Browser-/Live-Flows bleiben die groesste Luecke.

## D6: Admin-UID-Allowlist ist temporaer

Entscheidung:

- UID-Allowlist bleibt kurzfristig akzeptabel, muss aber als temporaerer serverseitiger Fallback behandelt werden.

Begruendung:

- Custom Claims/IAM waren operativ blockiert; Rules und API divergieren dadurch.

Folgeentscheidung offen:

- Claims-only wiederherstellen oder API-only Allowlist bewusst dokumentieren und testen.

## D7: Online-Service nur inkrementell schneiden

Entscheidung:

- Kein Big-Bang-Refactor von `online-league-service.ts` oder Firebase Repository.

Begruendung:

- Diese Module tragen Join, Draft, Ready, Week, Dashboard und Admin-Flows.

## D8: State Machine vor Datenmodellumbau

Entscheidung:

- Zuerst Invarianten und State Machine definieren/codieren, danach Firestore-Struktur veraendern.

Begruendung:

- Doppelte Statusfelder sind Ursache vieler UI-/Admin-Blocker.

## D9: Engine bleibt vorerst stabil

Entscheidung:

- Keine Game-Engine-Refactors in der naechsten Roadmap-Phase.

Begruendung:

- Engine ist gross, aber stark getestet; aktuelle Risiken liegen in Multiplayer/UX/Deployment.

## D10: Performance zuerst messen

Entscheidung:

- Vor Subscription-Umbau erst Read-/Emit-Metriken fuer `subscribeToLeague()` einfuehren.

Begruendung:

- Zu frueher Subscription-Split kann Views mit fehlenden Daten erzeugen.

## Offene Entscheidungen

| ID | Frage | Empfehlung |
| --- | --- | --- |
| O1 | Soll Admin langfristig Claims-only sein? | Ja, wenn IAM/Claims operationalisiert sind. |
| O2 | Soll Online-Multiplayer langfristig unter `src/modules/online` wandern? | Erst nach Stabilisierung entscheiden. |
| O3 | Soll Local Online Mode Produktfeature bleiben? | Als Test/Fallback behalten, nicht als Produktversprechen. |
| O4 | Werden nicht-MVP Menuepunkte versteckt oder gruppiert? | Fuer MVP lieber verstecken oder klare "Spaeter"-Gruppe. |
| O5 | Wann wird Production Firestore aktiviert? | Nicht vor Migrations-/Backfill-/Rules-Go. |
