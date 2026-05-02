# Client Component Responsibility Map

Datum: 2026-05-01

## Ziel

Diese Analyse kartiert drei große Client-Komponenten als Grundlage für spätere, kleine Refactors. Es wurden keine Produktionscode-Änderungen vorgenommen. Fokus ist die Trennung von UI Panels, lokalem State, Derived Data, Action Handlern, Service Calls und Guards.

## Kurzfazit

| Datei | Größe | Bewertung | Hauptproblem |
| --- | ---: | --- | --- |
| `src/components/online/online-league-placeholder.tsx` | 1760 Zeilen | Hoch riskant | Mischt Online-Dashboard, viele lokale Form-States, lokale/Firebase Guards, lokale Action Handler und viele Panels. |
| `src/components/admin/admin-league-detail.tsx` | 1641 Zeilen | Hoch riskant | Mischt Admin API Orchestrierung, destructive/confirm Actions, Finance/Training/GM Tabellen und Derived Admin-State. |
| `src/components/online/online-fantasy-draft-room.tsx` | 419 Zeilen | Mittel | Schon fokussierter, aber Virtualisierung, Auswahl-State und Draft-UI liegen noch zusammen. |

## `online-league-placeholder.tsx`

### Responsibility Map

| Bereich | Inhalt | Hinweise |
| --- | --- | --- |
| UI Panels | Header/Status, Ready-State, Week Flow, Team Overview, Franchise Strategy, Training, Coaching, Contracts/Free Agents, Trades, Draft/Scouting, Player List | Mehrere fachliche Screens werden in einer Komponente gerendert. |
| Lokale UI States | Training-Form, Feedbacks je Domäne, `pendingAction`, Franchise Strategy, Pricing, `expertMode` | Viele States sind unabhängig, werden aber gemeinsam im Parent gehalten. |
| Derived Data | `detailState`, `modeStatus`, Firebase-MVP Flags, Training Preview, Price Hints, Ready Guidance Items, Current League User | `toOnlineLeagueDetailState` ist gut, aber die Komponente leitet weiter viele View-Details ab. |
| Action Handler | Ready, Expert Mode, Strategy, Training, Contracts, Release, Free Agents, Trade, Coach, Media, Pricing | Mehrere Handler haben Guard + Service Call + Feedback + State Update in einem Block. |
| Service Calls | `setOnlineLeagueUserReadyState`, `setOnlineFranchiseStrategy`, `submitWeeklyTrainingPlan`, Contract/Trade/Coach/Media/Pricing Funktionen aus `online-league-service.ts` | Große Runtime-Importfläche bleibt ein Bundle-Risiko. |
| Permissions/Guards | Firebase-MVP Local Action Guard, Missing Player/Team Recovery, loaded/error/empty states | Guards sind fachlich wichtig und dürfen nicht beiläufig in UI-Komponenten zerlegt werden. |

### Sichere zukünftige Extraktionskandidaten

1. `useOnlineTrainingPlanForm`
   - Enthält Training-State, Preview-Eingaben, `handleSubmitTrainingPlan`, Feedback.
   - Niedriges Risiko, wenn Inputs/Outputs klar bleiben und Firebase-MVP Guard erhalten bleibt.

2. `useOnlineFranchiseControls`
   - Enthält Franchise Strategy, Pricing, Media Expectation und zugehörige Feedbacks.
   - Sinnvoll, weil diese Controls unabhängig vom Ready-/Week-Flow sind.

3. Display-Komponenten für reine Panels
   - `OnlineTrainingPanel`, `OnlineCoachingPanel`, `OnlineContractsPanel`, `OnlineTradePanel`, `OnlineDraftSummaryPanel`.
   - Erst extrahieren, wenn Props klein bleiben. Keine Action-Handler in mehrere Ebenen verteilen, wenn dadurch Prop-Explosion entsteht.

4. Lokale Action Hooks nach Domäne
   - Bereits vorhandenes `useOnlineLeaguePlaceholderActions` kann später um Trade/Draft erweitert werden.
   - Contracts und Coaching sollten getrennte Hooks bleiben.

### Riskante Bereiche, vorerst behalten

- `ReadyForWeek` und Week Flow: beeinflusst Spielablauf und Firebase/local Pfade.
- Missing Player/Team Recovery: kritisch für Join/Rejoin und ungültige LocalStorage-Daten.
- Firebase-MVP Guarding: darf nicht in Display-Komponenten verschwinden.
- Contract/Release/Free-Agent Actions: verändern Roster und Cap, daher erst mit guten Tests auslagern.

## `admin-league-detail.tsx`

### Responsibility Map

| Bereich | Inhalt | Hinweise |
| --- | --- | --- |
| UI Panels | Summary Cards, Admin Action Grid, Simulation Control, Week Data, Debug Snapshot, Fantasy Draft Control, Finance Table, Rules, Training Status, GM Kontrolle, Logs | Einige Display-Sektionen sind bereits ausgelagert, aber viele Tabellen bleiben inline. |
| Lokale UI States | `league`, `loaded`, `loadError`, `lastLoadedAt`, `debugVisible`, Feedback, `lastSimulation`, GM Filter, Finance Sort | UI-State und serverseitige Mutationsergebnisse sind eng gekoppelt. |
| Derived Data | Ready State, Week Phase/Hints, Current Week Games, Standings, Recent Games, Draft Picks, Finance Users, Filtered Users, Debug Items | Viele Ableitungen entstehen direkt vor dem JSX und sind testbare Model-Kandidaten. |
| Action Handler | Configured simple Actions, Draft Init/Start/Complete/Auto/Reset, Remove Player, Simulate Week, Revenue Sharing, Training Reset, GM warnings/removal/vacancy | Mischung aus harmlosen, mutierenden und destruktiven Actions. |
| Service/API Calls | `requestAdminAction`, Admin API mit Bearer Token, lokale Fallbacks via `getOnlineLeagueById`, local admin browser state | API-Orchestrierung sollte zentral bleiben; nicht in Display-Panels verschieben. |
| Permissions/Guards | Firebase vs local mode, production guard für Draft Reset, confirm/prompt Flows, pending action lock, ready/schedule checks | Besonders confirm/prompt Actions sind risikoreich. |

### Sichere zukünftige Extraktionskandidaten

1. `admin-league-detail-model.ts`
   - Reine Ableitungen: `financeUsers`, `filteredUsers`, `debugItems`, `recentDraftPicks`, `standingRows`.
   - Gute Testbarkeit, kein UI-Verhalten betroffen.

2. Display-Komponenten für Tabellen
   - `AdminFinanceTable`, `AdminTrainingStatusTable`, `AdminGmControlTable`, `AdminLeagueLogsPanel`.
   - Nur Display + callbacks, keine Confirm-Logik intern verändern.

3. `useAdminLeagueLoader`
   - Kapselt `loadLeague`, `requestAdminAction` aber nur, wenn Admin API Tests erweitert werden.
   - Mittleres Risiko, weil Fehler-/Feedback-Zustände exakt bleiben müssen.

4. Action-Gruppen nach Semantik
   - Draft Action Handler in einen Hook, GM Control Handler in einen Hook.
   - Erst nach Model-Extraktion, damit der Hauptkomponentenkörper kleiner und überschaubarer ist.

### Riskante Bereiche, vorerst behalten

- `handleSimulateWeek`: hat Confirm, pending lock, API Call, Reload/Fallback und Ergebnisfeedback.
- GM Removal/Vacancy/Warn Flows: destructive oder semidestructive, benötigen Prompt/Reason und Audit-Verhalten.
- Draft Reset/Auto-Draft: kann viele Daten ändern; nicht in generische Config pressen.
- `requestAdminAction`: Security-relevant durch Bearer Token und local-state Payload.

## `online-fantasy-draft-room.tsx`

### Responsibility Map

| Bereich | Inhalt | Hinweise |
| --- | --- | --- |
| UI Panels | Draft Header, verfügbare Spieler Tabelle, Pick-Bestätigung, eigener Kaderstand, letzte Picks | Komponente ist fachlich fokussiert auf den Draft Room. |
| Lokale UI States | `selectedPlayerId`, `positionFilter`, `sortDirection`, Virtual Scroll State im Hook | Überschaubar; State ist UI-nah. |
| Derived Data | Player Map, Team Name Map, available/picked players, own roster, roster counts, virtual row window | Kritische Ableitungen sind bereits in `online-fantasy-draft-room-model.ts` testbar ausgelagert. |
| Action Handler | `onPickPlayer` wird als Prop genutzt; Auswahl über Row Click | Pick-Logik liegt außerhalb, gut. |
| Service Calls | Keine direkten Service Calls | Positiv für Testbarkeit und Bundle-Grenzen. |
| Permissions/Guards | `isOwnTurn`, Pick Button disabled, selected player cleanup wenn nicht mehr verfügbar | Sollte im Raum bleiben, da UI-semantisch. |

### Sichere zukünftige Extraktionskandidaten

1. `useVirtualTableWindow` in shared UI Utility
   - Nur wenn eine zweite Liste Virtualisierung braucht.
   - Vorher nicht extrahieren, um keine generische Abstraktion ohne zweiten Use Case zu bauen.

2. `DraftAvailablePlayersTable`
   - Kann später als reine Display-Komponente extrahiert werden.
   - Risiko niedrig, wenn Row Height, selected state und callbacks unverändert bleiben.

3. `DraftRosterSummary` und `DraftRecentPicks`
   - Sehr einfache Display-Komponenten mit kleinen Props.

### Riskante Bereiche, vorerst behalten

- Virtualisierung + Tabellenlayout: empfindlich gegen Row Height, Sticky Header und Scroll-Verhalten.
- Selected Player Cleanup: verhindert stale selection nach Pick/Subscription Update.
- `isOwnTurn` disabled logic: muss mit Draft-State synchron bleiben.

## Empfohlene Reihenfolge

1. `admin-league-detail-model.ts` für reine Admin-Ableitungen erstellen und testen.
   - Nutzen: reduziert Komplexität ohne UI- oder API-Risiko.

2. `OnlineTrainingPanel` oder `useOnlineTrainingPlanForm` aus `online-league-placeholder.tsx` extrahieren.
   - Nutzen: entfernt viel lokalen State aus der größten Online-Komponente.

3. Admin-Tabellen als Display-Komponenten extrahieren.
   - Reihenfolge: Finance Table, Training Status Table, GM Control Table, Logs Panel.

4. Contracts/Free-Agent Bereich im Online Dashboard erst nach zusätzlichen Tests anfassen.
   - Grund: Roster-/Cap-Mutationen sind regressionsanfällig.

5. Draft Room nur minimal weiter anfassen.
   - Die Datei ist vergleichsweise kontrolliert. Weitere Extraktion hat niedrigere Priorität.

## No-Go für schnelle Refactors

- Keine Service Calls in Display-Komponenten verschieben.
- Keine Confirm-/Prompt-Logik zusammenlegen oder generisch machen.
- Keine Firebase/local Branches vereinheitlichen, solange Tests nicht beide Pfade abdecken.
- Keine Roster-, Draft-, Week- oder Membership-Mutationen auslagern, ohne fokussierte Tests.
- Keine weitere generische Action-Config für semantisch unterschiedliche Admin-Actions.

## Nächste Tests pro Arbeitspaket

| Arbeitspaket | Mindesttests |
| --- | --- |
| Admin Derived Model | Unit Tests für Finance Sort, GM Filter, Debug Items, Standing Rows |
| Online Training Hook/Panel | Component/Model Tests für Preview, Firebase Guard, Submit Feedback |
| Admin Finance/Training/GM Tabellen | Component Render Tests plus Admin Route Tests |
| Online Contracts/Free Agents | Existing Online Detail Tests plus E2E Multiplayer Smoke |
| Draft Room Display Split | Draft Room Model Tests plus Multiplayer Draft/Smoke E2E |

## Gesamtbewertung

Der größte kurzfristige Wartbarkeitsgewinn liegt nicht im Draft Room, sondern in den beiden Orchestrator-Komponenten `online-league-placeholder.tsx` und `admin-league-detail.tsx`. Die sicherste Strategie bleibt: zuerst reine Derived-Data-Modelle und Display-Tabellen extrahieren, danach domänenspezifische Hooks, zuletzt mutierende Handler.
