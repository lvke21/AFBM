# Final Refactor Evaluation

Stand: 2026-05-01

## 1. Gesamturteil

**Ampelstatus: Gelb mit klar positiver Tendenz**

Das System ist nach der AP-Serie und den Folgeprompts stabiler, besser testbar und in mehreren kritischen Online-/Admin-Pfaden robuster geworden. Der ursprüngliche Zustand war „Gelb mit positiver Tendenz“, aber mit offenen E2E-Blockern, breiten Subscriptions, schwergewichtigen Client-Komponenten und einem sehr großen Online-Service-Monolithen.

Der neue Zustand ist weiterhin nicht „Grün“, weil zentrale Monolithen und große Client-Orchestratoren bestehen bleiben. Die entscheidende Verbesserung ist aber: Die wichtigsten Instabilitäten sind jetzt besser eingegrenzt, mehrere Browser-E2E-Blocker wurden stabilisiert, Route-State und Draft Room sind defensiver, und Performance-/Bundle-Risiken sind konkreter adressiert.

**Klare Entscheidung:** **Weiterentwickeln möglich.**

Für ein unkontrolliertes Production-Release reicht der Zustand noch nicht. Für weitere Feature-Arbeit und einen kontrollierten Staging-/Preview-Rollout ist die Basis ausreichend, sofern vor jedem Rollout Build, Typecheck, Lint, relevante Unit-Tests und die stabilisierten E2E-Smokes laufen.

## 2. Vorher vs. Nachher

| Bereich | Vorher | Nachher | Bewertung |
| --- | --- | --- | --- |
| Code-Komplexität | Mehrere zentrale Dateien mischten UI, State, Service Calls und Guards. | Einige Verantwortlichkeiten wurden extrahiert: Route-State, Draft-Room-Model, Admin Display, Admin Action Config, kleinere Online-Hooks. | Besser, aber nicht abgeschlossen. |
| Wartbarkeit | `online-league-service.ts` und große Client-Komponenten waren schwer reviewbar. | Kleine sichere Module reduzieren punktuell Last. Responsibility Map dokumentiert nächste Schnitte. | Spürbar besser, Monolith bleibt. |
| Performance | Doppelte Online-League-Ladepfade, breite Subscriptions, Draft-Liste mit hartem `slice(0, 120)`. | Route-State zentralisiert, `subscribeToLeague()` intern gruppiert, Draft Room virtualisiert und memoisiert. | Besser im Online-/Draft-Pfad. |
| Testbarkeit | E2E teils rot durch Locator- und Seed-Probleme; kritische Ableitungen waren inline. | E2E-Smoke und Navigation zuletzt grün; Draft- und Route-State-Ableitungen unit-getestet. | Deutlich besser. |
| Architektur | Online-Service als Barrel/Monolith; Client-Komponenten als Orchestratoren. | Importgrenzen leicht verbessert, reine Metrics/Contract Helpers ausgelagert, aber Service bleibt groß. | Leicht bis mittel besser. |
| Release-Sicherheit | Unit/Build meist grün, Browser-E2E nicht zuverlässig. | Build/Typecheck/Lint und relevante E2E-Smokes zuletzt grün; Staging Smoke bleibt Pflicht. | Besser, aber noch Gelb. |

## 3. Was wurde wirklich verbessert?

### Online Route-State

`src/components/online/online-league-route-state.tsx` wurde als zentraler League/User/Subscription-State etabliert und später gehärtet.

Konkrete Verbesserungen:

- Dashboard und Draft-Seite teilen denselben Route-State.
- Alte `league`/`currentUser` Werte werden beim neuen Load defensiv geleert.
- Fehlende League, fehlender User, fehlende Membership und leere `teamId` werden explizit validiert.
- Subscription-Snapshots mit `null` führen nicht mehr still zu kaputtem State.
- Cleanup bleibt über `active` Flag und `unsubscribe()` abgesichert.
- Neue Tests für `online-league-route-state-model.ts`.

Reduziertes Risiko:

- Weniger Race Conditions bei Route-/League-Wechsel.
- Weniger „halb geladene“ Online-Dashboards.
- Klarere Recovery bei ungültigem `lastLeagueId`.

### E2E-Stabilisierung

Die ursprünglichen E2E-Probleme waren nicht nur kosmetisch. Sie verhinderten Browser-Regressionsnachweise.

Konkrete Verbesserungen:

- Fragile `AFBM Manager` Locator wurden stabilisiert.
- E2E Seed wurde idempotenter gemacht.
- `npm run test:e2e:navigation` lief zuletzt grün.
- `npm run test:e2e:multiplayer` lief zuletzt grün mit `3 passed / 1 skipped`.

Reduziertes Risiko:

- GUI-Navigation und Multiplayer Join/Ready Flow sind wieder testbar.
- Weitere Frontend-Refactors sind weniger blind.

### `subscribeToLeague()`

`subscribeToLeague()` bleibt breit, wurde aber strukturell entschärft.

Konkrete Verbesserungen:

- Datenbereiche wurden analysiert: League Meta, Memberships, Teams, Draft State, Draft Picks, Available Players, Events.
- Core- und Draft-Subscriptions wurden in getrennte read-only Helper gruppiert.
- Public API blieb kompatibel.
- Bestehendes `emit -> mapLeague()` Verhalten blieb erhalten.

Reduziertes Risiko:

- Bessere Lesbarkeit und weniger Änderungsschmerz für spätere phasenabhängige Subscription-Splits.
- Keine Änderung am Firestore-Schema oder Write-Verhalten.

### Draft Room

Der Draft Room wurde in zwei Richtungen verbessert: Render-Performance und State-Zuverlässigkeit.

Konkrete Verbesserungen:

- Verfügbare Spieler werden virtualisiert statt hart auf 120 gerenderte Zeilen begrenzt.
- Der gesamte gefilterte Spielerpool bleibt erreichbar.
- Ableitungen für verfügbare Spieler, Picks, eigenes Roster und Positionscounts liegen in `online-fantasy-draft-room-model.ts`.
- Tests decken verfügbare Spieler, Pick-Reihenfolge, fehlende Player-Refs, eigenes Roster und Positionscounts ab.
- Memoization-Dependencies wurden geprüft und durch reine Helper weniger fehleranfällig.

Reduziertes Risiko:

- Weniger Renderarbeit bei ca. 500 Spielern.
- Weniger stale-state Risiko durch inline gewachsene `useMemo`-Blöcke.
- Draft Room ist klarer testbar.

### Admin UI

Admin Detail und Admin Actions wurden punktuell stabilisiert.

Konkrete Verbesserungen:

- Nicht-destruktive Admin-Actions wurden in `AdminSimpleLeagueActionConfig` begrenzt.
- Die Config-Grenze ist dokumentiert: keine Simulation, keine destruktiven Actions, keine Confirm-Flows in die Config.
- Reine Display-Sektionen wurden teilweise extrahiert.
- Responsibility Map dokumentiert weitere sichere Schnitte.

Reduziertes Risiko:

- Weniger Boilerplate bei einfachen Admin-Actions.
- Geringeres Risiko, dass komplexe Admin-Flows in eine unpassende generische Config gepresst werden.

### Import-/Bundle-Grenzen

Die Import-Situation rund um `online-league-service.ts` wurde verbessert, aber nicht gelöst.

Konkrete Verbesserungen:

- Typen und Konstanten wurden an mehreren Stellen aus Fachmodulen statt aus dem großen Service importiert.
- Reine Metrics-Helfer liegen in `online-league-metrics.ts`.
- `online-league-detail-model.ts` importiert `getFanMoodTier` und `getTeamChemistryTier` direkt aus dem kleinen Metrics-Modul.
- Service re-exportiert kompatibel weiter.

Reduziertes Risiko:

- Weniger unnötige Runtime-Kopplung für reine Anzeige-Helfer.
- Kleine Grundlage für weitere sichere Tree-Shaking-/Bundle-Schnitte.

## 4. Was ist weiterhin problematisch?

### Große Dateien bleiben groß

Aktueller Stand:

- `src/lib/online/online-league-service.ts`: ca. 8881 Zeilen
- `src/components/online/online-league-placeholder.tsx`: ca. 1760 Zeilen
- `src/components/admin/admin-league-detail.tsx`: ca. 1641 Zeilen
- `src/lib/online/repositories/firebase-online-league-repository.ts`: ca. 1415 Zeilen

Diese Dateien sind weiterhin schwer zu reviewen. Besonders `online-league-service.ts`, `online-league-placeholder.tsx` und `admin-league-detail.tsx` bleiben die größten Wartbarkeitsrisiken.

### `online-league-service.ts` bleibt ein Monolith

Es wurden einige Imports reduziert und kleine Helper ausgelagert. Die fachliche Kernlogik liegt aber weiterhin breit in einer Datei:

- Contracts/Cap
- Trades
- Draft
- Training
- Coaching
- Finance
- Week Flow
- Local persistence
- Admin-nahe Helpers

Das ist für neue Features riskant, weil kleine Änderungen ungewollte Seiteneffekte in entfernten Domänen haben können.

### `subscribeToLeague()` bleibt teuer

Die Subscription ist besser strukturiert, aber fachlich weiterhin breit:

- League-Dokument
- Memberships
- Teams
- Draft State
- Draft Picks
- Draft Available Players
- Events

Das ist für Draft- und Admin-Ansichten nachvollziehbar, aber für jedes Online-Dashboard dauerhaft teuer. Ein echter phasen-/view-spezifischer Split steht noch aus.

### Große Client-Orchestratoren bleiben

`online-league-placeholder.tsx` und `admin-league-detail.tsx` mischen weiterhin:

- viele lokale States
- Derived Data
- Panels
- Action Handler
- Service Calls
- Firebase/local Guards
- Fehler- und Recovery-Zustände

Die Responsibility Map ist vorhanden, aber die eigentliche Entflechtung steht noch aus.

### Testlücken bleiben

Verbessert wurden Unit-, Model- und E2E-Smoke-Pfade. Trotzdem fehlen noch:

- systematische Component Tests für große Online/Admin Panels
- Browser-E2E für vollständigen Fantasy-Draft-Room nach Admin-Setup
- echte Staging-Smokes mit Firebase Auth/Firestore
- Tests für phasenabhängige Subscription-Kosten
- React Profiler-/Bundle-Budget-Messung

## 5. Neue Risiken durch Refactor

### Zentraler Route-State

Die Zentralisierung ist architektonisch richtig. Sie macht `online-league-route-state.tsx` aber kritischer. Ein Fehler dort betrifft Dashboard und Draft-Seite gleichzeitig.

Bewertung: **mittel**, durch Tests reduziert.

### Memoization und Virtualisierung

Draft Room Memoization ist geprüft und getestet. Virtualisierung kann aber Layout-Regressionsrisiken erzeugen:

- feste Row-Höhe
- Sticky Header
- Scroll-Position nach Filterwechsel
- selected player cleanup

Bewertung: **niedrig bis mittel**, weil der betroffene Bereich eingegrenzt ist.

### Admin Action Config

Die Config ist aktuell eng begrenzt. Das Risiko entsteht, wenn später komplexe oder destruktive Actions hineingezwungen werden.

Bewertung: **niedrig**, solange die dokumentierte Grenze eingehalten wird.

### Import-Auslagerungen

Kleine Helper-Auslagerungen sind risikoarm. Das Risiko steigt, wenn Runtime-Funktionen mit versteckten Default-Daten oder Normalisierung ohne Tests verschoben werden.

Bewertung: **niedrig aktuell**, **mittel bei weiterer Service-Zerlegung**.

## 6. Test- und Infrastrukturstatus

| Bereich | Status | Bewertung |
| --- | --- | --- |
| Typecheck | zuletzt grün mit `npx tsc --noEmit` | Stabil |
| Lint | zuletzt grün mit `npm run lint` | Stabil |
| Build | zuletzt grün mit `npm run build` | Stabil |
| Unit-/Model-Tests | relevante Online/Admin/Draft/Route-State Tests grün | Stabil |
| Firebase Rules/Parity | nach Emulator-Rechten grün | Nutzbar, aber emulatorabhängig |
| Navigation E2E | zuletzt grün | Stabilisiert |
| Multiplayer E2E | zuletzt grün: 3 passed / 1 skipped | Nutzbar, Admin-Token-Skip beachten |
| Fantasy Draft E2E | einmal vor Draft Room im Admin-Setup gescheitert | Noch fragil |
| Seeds | E2E-Seed wurde verbessert, Multiplayer/Firebase Seeds sind markiert/idempotent ausgelegt | Besser, aber weiter beobachten |

Wichtig: Einige E2E-/Firebase-Kommandos brauchen lokale Services, Emulator-Ports oder Tokens. Diese Tests sind nicht überall „einfach grün“, aber sie sind deutlich brauchbarer als im Ausgangszustand.

## 7. Performance-Bewertung

### Render-Verhalten

Verbessert:

- Draft Room rendert die Spieler-Tabelle virtualisiert.
- Draft-Ableitungen sind memoisiert und in reine Helper verschoben.
- Route-State reduziert doppelte Online-Lade-/Subscription-Pfade.

Weiterhin offen:

- `online-league-placeholder.tsx` hält viele States in einer Komponente.
- Kleine State-Änderungen können große Dashboard-Bereiche invalidieren.
- Admin Detail rendert viele Tabellen und Panels in einem Client-Tree.

### Subscriptions

Verbessert:

- `subscribeToLeague()` ist intern in Core- und Draft-Subscription-Gruppen lesbarer.
- Route-State reduziert doppelte Subscriber auf Seitenebene.

Weiterhin offen:

- `subscribeToLeague()` liest weiterhin mehr Daten als manche Views brauchen.
- `availablePlayers` und Draft-Picks sind für Nicht-Draft-Ansichten wahrscheinlich zu teuer.
- Kein view-spezifisches Subscription-Profil.

### Datenfluss

Verbessert:

- Online Route-State ist zentraler.
- Draft Room erhält Pick-Action als Prop und ruft keine Services direkt.
- Admin Simple Actions haben eine eng definierte Config-Grenze.

Weiterhin offen:

- Online Dashboard vermischt lokale Actions und Firebase-MVP Guards.
- Admin Detail vermischt API-Orchestrierung und UI-Tabellen.
- Local/Firebase Branches sind noch an mehreren Stellen sichtbar.

### Bekannte Engpässe

- `/online/league/[leagueId]` und `/online/league/[leagueId]/draft` bleiben große Route-Chunks.
- `/admin` und `/admin/league/[leagueId]` bleiben clientlastig.
- `online-league-service.ts` erschwert Tree-Shaking.
- Große Admin-/Online-Tabellen sind nur punktuell optimiert.

## 8. Architektur-Bewertung

### Monolithen reduziert?

**Nur teilweise.**

Kleine Helfer und Models wurden extrahiert. Der zentrale Online-Service und große Client-Komponenten bleiben aber dominant.

### Verantwortlichkeiten klarer?

**Ja, spürbar.**

Verbessert durch:

- `online-league-route-state.tsx`
- `online-league-route-state-model.ts`
- `online-fantasy-draft-room-model.ts`
- `online-league-metrics.ts`
- `admin-league-action-config.ts`
- `admin-league-detail-display.tsx`
- Responsibility Map Report

### Datenfluss verständlicher?

**Ja, im Online Route/Draft Bereich.**

Dashboard und Draft teilen einen klareren Route-State. Draft Room hat keine Service Calls. Admin bleibt komplexer, aber Action-Grenzen sind dokumentiert.

### Kopplung reduziert?

**Punktuell.**

Einige Imports gehen nicht mehr über `online-league-service.ts`. Die große Runtime-Kopplung besteht aber weiter, vor allem in Online Dashboard, Admin Detail und lokalen Online Actions.

## 9. Klare Empfehlung

**Empfehlung: Weiterentwickeln möglich.**

Das System ist stabil genug, um weitere Features und Refactors in kleinen, getesteten Schritten fortzusetzen. Es ist nicht in einem Zustand, der eine weitere Stabilisierung vor jeder Feature-Arbeit zwingend erfordert.

**Go/No-Go:**

- **Go für weitere Entwicklung:** Ja.
- **Go für kontrollierten Staging-/Preview-Rollout:** Ja, wenn die bekannten Checks laufen.
- **No-Go für unbegleiteten Production-Release:** Ja, noch kein unbegleiteter Production-Release ohne finalen Staging-Smoke.

Begründung: Die technischen Risiken sind jetzt sichtbar, eingegrenzt und teilweise getestet. Die verbleibenden Risiken liegen nicht mehr in akuten kaputten Kernflows, sondern in Architekturgröße, Bundle-Kopplung und noch nicht vollständig abgedeckten Browser-/Staging-Pfaden.

## 10. Konkrete nächste Schritte

1. **Admin Derived Model extrahieren**
   - `financeUsers`, `filteredUsers`, `debugItems`, `standingRows`, `recentDraftPicks` in ein testbares `admin-league-detail-model.ts`.
   - Risiko niedrig, Nutzen hoch für Reviewbarkeit.

2. **Online Training State aus `online-league-placeholder.tsx` lösen**
   - `useOnlineTrainingPlanForm` oder `OnlineTrainingPanel`.
   - Firebase-MVP Guard und Submit-Feedback mit Tests absichern.

3. **`subscribeToLeague()` phasenabhängig vorbereiten**
   - Keine sofortige Schemaänderung.
   - Erst messen und API-Design definieren: Dashboard braucht nicht immer Draft Available Players.

4. **Weitere kleine Import-Schnitte aus `online-league-service.ts`**
   - Nur reine Query-/View-Helper mit Tests.
   - Keine Write- oder Transaction-Logik verschieben.

5. **Staging Smoke als Release-Gate festlegen**
   - `/admin`, Online Join/Rejoin, Liga laden, Draft abgeschlossen/aktiv, Week Simulation, Reload.
   - Ergebnis vor Release dokumentieren.

## Schlussentscheidung

Das Projekt ist nicht „fertig refactored“, aber es ist deutlich stabiler als vor der AP-Serie. Der Zustand ist **Gelb**, nicht wegen akuter Kernflow-Defekte, sondern wegen weiter bestehender struktureller Risiken.

**Finale Entscheidung: Weiterentwickeln möglich. Release nur kontrolliert mit Staging-Smoke und den bekannten Checks.**
