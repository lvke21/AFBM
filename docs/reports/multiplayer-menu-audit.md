# Multiplayer Menu Audit

Datum: 2026-05-02  
Audit-Basis: Repo-Head `0c00010`, statische Codeanalyse plus fokussierte Unit-Tests  
Scope: Multiplayer-Sidebar, Online-Hub, Liga-Dashboard, Ready-State, League/Week-Panels, Results, Standings, Draft

## Gesamturteil

Status: **Gelb bis Rot fuer MVP-Spielgefuehl**

Das Multiplayer-Menue ist nicht leer und die Kernrouten existieren. Trotzdem wirkt es an mehreren Stellen fertiger, als es ist. Viele Sidebar-Eintraege sind keine echten Seiten, sondern Hash-Anker in ein einziges Dashboard. Das ist technisch nicht automatisch falsch, aber aktuell fuehrt es zu flachen Teilansichten statt vollwertiger Bereiche. Einige nicht-MVP-Features sind bewusst deaktiviert, aber nicht immer sauber begruendet. Kritisch sind vor allem widerspruechliche Statusanzeigen: Die Hauptkarte "Naechste Partie" nutzt einen hartcodierten Placeholder, waehrend der Week-Flow separat einen Schedule liest. Standings werden clientseitig aus `matchResults` rekonstruiert und ignorieren gespeicherte Standing-Daten.

Live-Browser-Console, echte Staging-Auth und Reload auf Staging wurden in diesem Audit nicht ausgefuehrt. Console-Errors sind daher nicht als Live-Smoke bestaetigt oder ausgeschlossen. Die unten stehende Bewertung basiert auf Routing, Komponenten, Guards, Datenableitungen und vorhandenen Tests.

## Gepruefte Dateien

- `src/app/online/page.tsx`
- `src/app/online/league/[leagueId]/page.tsx`
- `src/app/online/league/[leagueId]/draft/page.tsx`
- `src/components/layout/navigation-model.ts`
- `src/components/layout/sidebar-navigation.tsx`
- `src/components/online/online-league-app-shell.tsx`
- `src/components/online/online-league-route-state.tsx`
- `src/components/online/online-league-route-state-model.ts`
- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-league-dashboard-panels.tsx`
- `src/components/online/online-league-overview-sections.tsx`
- `src/components/online/online-league-detail-model.ts`
- `src/components/online/online-league-draft-page.tsx`
- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/online/online-continue-button.tsx`
- `src/components/online/online-league-search.tsx`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/types.ts`
- `src/lib/online/online-league-week-service.ts`

## Audit-Tabelle

| Menüpunkt | Status (OK / Teilweise / Broken / Placeholder) | Problem | Ursache | Fix-Vorschlag |
|---|---|---|---|---|
| Online Hub: Weiterspielen | Teilweise | Klick ist verdrahtet und prueft `lastLeagueId`, aber echte Nutzbarkeit haengt komplett an gueltiger Membership/Team-Zuordnung. Ohne Team endet der Flow in Recovery statt Spiel. | `OnlineContinueButton` laedt nur die letzte Liga und delegiert Membership-/Team-Validierung an die Ligaseite. | Feedback schon im Hub konkreter machen: "Liga gefunden, aber Teamzuordnung fehlt" statt erst nach Navigation. |
| Online Hub: Liga suchen | Teilweise | Suche/Join ist funktional, aber neue Nicht-Mitglieder sehen nur Lobby-Ligen. Eine aktive Testliga ist fuer neue User nicht automatisch joinbar, wenn sie nicht ueber `leagueMembers` gefunden wird. | Firebase-Repo sucht `status == lobby` plus bereits beigetretene Ligen aus `leagueMembers`. | Fuer MVP klar trennen: "Lobby beitreten" vs. "bestehender Liga erneut beitreten"; aktive Testliga nur fuer Member anzeigen. |
| Online Hub: Beitreten/Wieder beitreten | OK | Rejoin ist codeseitig beruecksichtigt; Join schreibt Membership und Mirror. Nicht live verifiziert in diesem Audit. | `repository.joinLeague()` repariert/erkennt bestehende Memberships und setzt `lastLeagueId` erst nach Erfolg. | Live-Smoke mit echtem Staging-User wiederholen, bevor Release-Entscheidung. |
| Dashboard | OK | Route existiert und laedt ueber `/online/league/[leagueId]`. Reload sollte durch `useOnlineLeagueRouteState` funktionieren. | AppShell + Route-State Provider laden User, Liga und Subscription zentral. | Keine kurzfristige Aenderung noetig. |
| Spielablauf | Teilweise | Klick fuehrt nur zu `#week-loop`, nicht zu einer eigenen Spielablauf-/Schedule-Seite. Panel zeigt keine vollstaendige Wochenliste und keine echte User-zentrierte naechste Partie. | `navigation-model.ts` setzt online `Spielablauf` auf Dashboard-Hash. `getWeekFlowNextMatchLabel()` nimmt das erste Match der aktuellen Woche. | Entweder als "Ligawoche" klar labeln oder eine echte Schedule-/Week-Seite bauen. Naechste Partie aus Sicht des User-Teams ableiten. |
| Roster | Teilweise | Klick fuehrt zu `#roster`, aber es gibt nur Zusammenfassung und Command-Center, keine vollstaendige Roster-Tabelle. Ohne 53 aktive Spieler plus Depth Chart bleibt der Menuepunkt gesperrt. | `teamNavigationReady` verlangt `activeRosterCount >= 53` und `depthChart.length > 0`; Panel zeigt nur `totalPlayersLabel` und Starter-Schnitt. | Fuer MVP eine echte Rosterliste im Dashboard oder eigene Route anzeigen; bei unvollstaendigem Roster klaren Diagnose-Text zeigen. |
| Depth Chart | Teilweise | Klick fuehrt zu `#depth-chart`, Anzeige ist read-only und auf die ersten 8 Eintraege begrenzt. Keine Bearbeitung im sichtbaren Dashboard. | `PlayerActionsPanel` rendert `detailState.roster.depthChart.slice(0, 8)`. Firebase-Repo hat `updateDepthChart`, aber keine sichtbare Editor-UI im Dashboard. | Als "Depth Chart anzeigen" markieren oder minimalen Editor anbinden. Vollstaendige Depth Chart anzeigen, nicht nur 8 Positionen. |
| Contracts/Cap | Placeholder | Menuepunkt ist in Online-Ligen deaktiviert. Wenn ein Manager-Team vorhanden ist, fehlt teilweise eine sichtbare Begruendung. | Online `contractsHref` ist immer `null`, `disabledReason` wird aber nur gesetzt, wenn `teamHref` fehlt. | Disabled-Grund immer setzen: "Online-Contracts/Cap noch nicht implementiert". |
| Development | Placeholder | Deaktiviert mit verstaendlicher Begruendung. Gleichzeitig existiert im Dashboard ein read-only Training-Panel, wodurch "Development" und "Training" semantisch unscharf werden. | Sidebar deaktiviert `Development`, Dashboard zeigt Firebase-MVP Training nur lesbar. | Begrifflichkeit vereinheitlichen: "Development kommt spaeter"; Training als read-only Wochenvorbereitung kennzeichnen. |
| Team Overview | Teilweise | Klick fuehrt zu `#team`, Teamkarte funktioniert, aber es ist keine vollstaendige Teamuebersicht. Sidebar wird erst nach vollem Roster freigegeben. | Team Overview ist nur `TeamOverviewCard`; Shell-Record ist hart `0-0`. | Team Overview um Record, Standing, naechstes Spiel und Roster-Basisdaten erweitern; Record aus Standings/Results ableiten. |
| Trade Board | Placeholder | Online deaktiviert. Bei vorhandenem Team kann die sichtbare Begruendung fehlen. | `tradeBoardHref` ist online immer `null`, `disabledReason` haengt faelschlich an `teamHref`. | Disabled-Grund immer setzen: "Online-Trades noch nicht implementiert". |
| Inbox | Placeholder | Sauber deaktiviert mit "Online-Inbox noch nicht implementiert". | Online `inboxHref` ist `null` und Reason ist explizit gesetzt. | Fuer MVP ausreichend; spaeter echte Inbox oder ausblenden. |
| Finance | Placeholder | Deaktiviert, aber Begruendung ist irrefuehrend: oft "Kein Manager-Team", obwohl der User ein Team haben kann. | Online `financeHref` ist immer `null`; Reason nutzt generische Offline-Logik. | Disabled-Grund auf "Online-Finance noch nicht implementiert" aendern. |
| League | Teilweise | Klick fuehrt zu `#league`, aber der Zielbereich ist eine "Naechste Partie"-Karte mit "Demnaechst", keine echte Ligauebersicht. | `LeagueStatusPanel` nutzt `id="league"` und rendert nur Next-Match/Waiting/Ready. | Echte League-Section bauen: Teams, Standings, Results, Schedule, Week-State. |
| Draft | OK | Route `/online/league/[leagueId]/draft` existiert. Active Draft zeigt Draft Room, completed Draft zeigt Abschlusskarte. | Eigene Next.js Route und Route-State Provider vorhanden. | Fuer MVP ok. Optional: expliziter Button "Zurueck zum Dashboard" in der Draft-Seite, nicht nur Sidebar. |
| Savegames | OK | Navigiert zu `/app/savegames`. | Fester Sidebar-Link. | Keine kurzfristige Aenderung noetig. |
| Zurueck zum Online Hub | OK | Link ist sichtbar und fuehrt nach `/online`. | `LeagueHeader`/Panel-Link. | Keine kurzfristige Aenderung noetig. |
| Bereit setzen / Ready zuruecknehmen | Teilweise | Button ist klickbar und nutzt Firebase-Transaktion. Er ist aber nicht status-sensitiv genug: bei `weekStatus === simulating` oder completed/Transition wirkt der Button weiterhin wie eine normale Aktion, solange Daten ihn anzeigen. | `ReadyStatePanel` disabled nur bei fehlendem Team oder pending Action; `setUserReady` prueft aktive Membership, aber nicht UI-seitig den Week-Status. | Button gegen Week-Status, Draft-Status und Simulation-Lock absichern; Text bei laufender Simulation sperren. |
| Ready-Progress Anzeige | Teilweise | "0/2 aktive Teams bereit" kann korrekt nach Week-Reset sein, wirkt aber falsch, wenn im selben Screen ein Team als bereit oder die Liga als 8-Team-Liga erscheint. CPU/unassigned Teams werden nicht erklaert. | `getOnlineLeagueWeekReadyState()` zaehlt aktive Memberships aus `league.users`, nicht alle Teams. `league.users` entsteht aus Memberships, nicht aus der Teamliste. | Label praezisieren: "0/2 aktive GMs bereit". Optional separate Anzeige "8 Teams / 2 menschliche GMs". |
| Erste Schritte Panel | Teilweise | Training-Schritt kann im Firebase-MVP offen bleiben, obwohl Training dort nur read-only ist. User kann Ready trotzdem setzen. | `trainingSet` verlangt `weeklyTrainingPlans.source === gm_submitted`; Firebase-MVP zeigt aber keine speicherbare Trainingseingabe. | In Firebase-MVP Training-Schritt als "Auto-Default aktiv" statt "offen" behandeln. |
| "Admin simuliert die Woche" Button | Placeholder | Button erscheint, wenn alle ready sind, ist aber disabled und fuehrt zu keiner Admin-Aktion. Fuer Nicht-Admins sieht das wie eine kaputte Hauptaktion aus. | `OnlineLeagueWeekFlowSection` rendert bei `showStartWeekButton` einen disabled Button. AdminControlsPanel ist `null`. | Nicht als Button darstellen, wenn keine Aktion moeglich ist. Fuer Admins auf Admin-Ligadetailseite verlinken oder echten API-Call anbieten. |
| Naechste Partie im LeagueStatusPanel | Broken | Hauptanzeige zeigt hart "Naechste Partie wird nach Ligastart erstellt", selbst wenn Schedule, Results oder Standings vorhanden sind. Das ist exakt die widerspruechliche Anzeige aus dem UI-Problem. | `toOnlineLeagueDetailState()` setzt `nextMatchLabel` konstant; nur `weekFlow.nextMatchLabel` nutzt Schedule. | Ein einziges Next-Game-Modell verwenden. `LeagueStatusPanel` muss dieselbe Schedule-/User-Team-Logik wie Week-Flow nutzen. |
| Naechste Partie im Week-Flow | Teilweise | Nutzt Schedule, aber nimmt einfach das erste Match der aktuellen Woche. Bei mehreren Games kann es ein fremdes Spiel zeigen. | `getWeekFlowNextMatchLabel()` sucht `league.schedule.find(match.week === currentWeek)`. | Naechstes Spiel fuer `currentLeagueUser.teamId` suchen; sonst "Kein Spiel fuer dein Team diese Woche". |
| Results / Letzte Ergebnisse | Teilweise | Ergebnisse werden angezeigt und sollten nach Reload aus `matchResults` kommen. Sortierung/Begrenzung ist roh und nicht sicher nach `simulatedAt`. | `getRecentResults()` nimmt `(league.matchResults ?? []).slice(0, 5)`. | Nach Season/Week/simulatedAt sortieren und Ergebnisstatus beruecksichtigen. |
| Standings | Teilweise | Sichtbar, aber fachlich zu duenn: nur Top 4, nur Wins/Losses, keine Ties, Points, Differential. Persistierte `league.standings` werden ignoriert. | `getStandings()` rekonstruiert aus `matchResults`; `mapFirestoreSnapshotToOnlineLeague()` liefert zwar `standings`, UI nutzt sie aber nicht. | Gespeicherte Standings als Quelle verwenden; Fallback aus Results nur bei fehlenden Standings. Vollstaendige Tabelle oder klarer "Top 4"-Titel. |
| Manager-Team Record in Sidebar/Header | Broken | Team-Record ist immer `0-0`, auch nach simulierten Ergebnissen. | `OnlineLeagueAppShell` setzt `managerTeam.currentRecord: "0-0"`. | Record aus `league.standings` oder `matchResults` ableiten. |
| Training Panel | Placeholder | Im Firebase-MVP nur read-only. Das ist sicherer als Fake-Funktionalitaet, wirkt aber neben dem First-Steps-Training-Schritt widerspruechlich. | `isFirebaseMvpMode` rendert Hinweis statt Formular. | Text mit First Steps harmonisieren: "Auto-Training aktiv, keine Aktion noetig". |
| Expertenmodus | OK | In Firebase-MVP ausgeblendet, lokal verfuegbar. Keine toten Firebase-Aktionen sichtbar. | `showAdvancedLocalActions = !isFirebaseMvpMode && expertMode`. | Keine kurzfristige Aenderung noetig. |
| Draft Room: Spieler auswaehlen | OK | Tabelle ist klickbar, Filter und Sortierung sind vorhanden, Virtualisierung existiert. | `OnlineFantasyDraftRoom` verwaltet Auswahl lokal und leitet Pick an Parent weiter. | Keine kurzfristige Aenderung noetig. |
| Draft Room: Pick bestaetigen | Teilweise | Button ist korrekt deaktiviert, wenn man nicht am Zug ist. Ohne eigenes Team steht "Kein Team"; Route-State blockt solche Faelle meistens vorher. | `isOwnTurn` basiert auf `draft.currentTeamId === ownTeamId`. | Fuer blockierte User klareren Hinweis anzeigen, warum kein Pick moeglich ist. |
| Reload auf Dashboard | Teilweise | Route-State hat Subscription-Cleanup und Recovery. Ohne gueltige Membership/Team wird localStorage bereinigt und Fehler angezeigt. Live-Reload wurde hier nicht im Browser geprueft. | `useOnlineLeagueRouteStateValue()` validiert User/Liga/Membership und unsubscribed beim Unmount. | Staging-E2E mit Reload auf Dashboard, Draft und Hash-Ankern ergaenzen. |
| Reload auf Hash-Ankern | Teilweise | Sidebar kann Hash beim Mount lesen. Inhalt ist dieselbe Seite; Browser scrollt zu Elementen, wenn sie existieren. Nicht live verifiziert. | `SidebarNavigation` synchronisiert `window.location.hash`; IDs existieren fuer `week-loop`, `team`, `roster`, `depth-chart`, `league`. | Playwright-Test fuer Direktaufruf `#roster`, `#depth-chart`, `#league`. |
| User ohne Team | Teilweise | Es gibt Recovery statt kaputter Seite. Als Spielerlebnis ist das aber eine Sackgasse, wenn Join/Rejoin die Teamverbindung nicht repariert. | `validateOnlineLeagueRouteState()` blockt fehlende Membership oder fehlende `teamId`. | Recovery mit klarer CTA "Liga neu suchen / Teamzuweisung reparieren" und Diagnose. |
| Admin ohne Team | Broken | Adminrechte helfen im Multiplayer-Dashboard nicht, wenn keine Team-Membership in `league.users` landet. Admin kann dadurch als "nicht verbunden" wirken. | `mapFirestoreSnapshotToOnlineLeague()` filtert Memberships ohne `teamId`; `validateOnlineLeagueRouteState()` verlangt einen League User mit Team. | Admin-Dashboard und Player-Dashboard trennen: Admin darf Ligadetail laden, Player-Menue braucht Team. Fehlertext entsprechend anpassen. |
| Console Errors | Teilweise | Kein Live-Browserlauf in diesem Audit. Codepfad enthaelt `console.warn` fuer Membership-/Team-Mismatch und Auth kann `console.error("AUTH_ERROR")` loggen. Keine konkreten Runtime-Console-Errors wurden hier bestaetigt. | Statische Analyse ohne Staging-Browser-Session. | Dedizierten Staging-Smoke mit Console-Capture ausfuehren. |

## Kritischste Befunde

1. **Next-Game-Anzeige ist widerspruechlich.** `LeagueStatusPanel` zeigt den hartcodierten Starttext, waehrend `WeekFlowSection` den Schedule liest. Das erzeugt direkt den Eindruck, das Spiel habe Ergebnisse, aber noch keinen Ligastart.
2. **Ready-Progress zaehlt aktive menschliche Memberships, nicht Teams.** Der Text sagt "aktive Teams", obwohl unassigned/CPU Teams nicht eingezaehlt werden. Bei einer 8-Team-Liga mit 2 oder 3 Managern wirkt `0/2` falsch.
3. **Standings ignorieren die persistierte Standings-Quelle.** Das UI rekonstruiert nur einfache W/L aus `matchResults` und zeigt nur Top 4.
4. **Mehrere Sidebar-Eintraege sind Placeholder mit falscher oder fehlender Begruendung.** Besonders `Contracts/Cap`, `Trade Board` und `Finance`.
5. **Team-/Roster-Menues sind hash-basierte Ausschnitte, keine fertigen Featureseiten.** Fuer ein MVP kann das reichen, aber nur wenn die Labels ehrlich sind und die Panels vollstaendiger werden.

## Mit / ohne Team

- Mit gueltigem Team und vollem Roster: Dashboard, Hash-Navigation und Draft laden codeseitig.
- Mit fehlendem Team: Route-State blockt und zeigt Recovery. Das ist besser als ein Crash, aber kein spielbarer Zustand.
- Mit unvollstaendigem Roster: Team-Menues bleiben gesperrt. Die Sidebar nennt "Roster nicht vollstaendig", zeigt aber keine genaue Diagnose, was fehlt.

## Mit / ohne Admin

- Der Multiplayer-Spielerbereich unterscheidet kaum zwischen Admin und Nicht-Admin.
- Admin-Week-Simulation ist im Player-Dashboard nicht aktiv. Der sichtbare disabled Button "Admin simuliert die Woche" ist nur ein Hinweis/Placeholder.
- Admin ohne Team kann in diesem Player-Flow weiterhin blockiert werden, weil das Dashboard eine Team-Membership verlangt.

## Reload- und Datenbewertung

- Dashboard- und Draft-Routen existieren und nutzen denselben Route-State Provider.
- Subscription-Cleanup ist vorhanden.
- Invalid League/Membership fuehrt zu Recovery und `lastLeagueId`-Bereinigung.
- Hash-Reload sollte technisch funktionieren, ist aber nicht live bestaetigt.
- Results und Schedule kommen aus Firestore-Mapping, aber UI-Ableitungen sind inkonsistent.

## Ausgefuehrte Checks

```bash
npx vitest run src/components/layout/navigation-model.test.ts src/components/online/online-league-detail-model.test.ts
```

Ergebnis: **19 Tests bestanden**.

Diese Tests bestaetigen die aktuelle Modelllogik, inklusive einiger problematischer Erwartungen wie dem hartcodierten `nextMatchLabel`. Sie beweisen daher nicht, dass die UX korrekt ist.

## Brutale MVP-Einschaetzung

- Multiplayer-Menue MVP fertig: **Nein**
- Multiplayer-Spielerlebnis MVP fertig: **Nein**
- Kernnavigation technisch vorhanden: **Ja, teilweise**
- Statusanzeigen vertrauenswuerdig: **Nein**
- Nicht-MVP-Features sauber deaktiviert: **Teilweise**
- Risiko, dass ein Spieler denkt "das Spiel ist kaputt": **Ja**, besonders bei Ready-State, Next Game, League und Standings.

