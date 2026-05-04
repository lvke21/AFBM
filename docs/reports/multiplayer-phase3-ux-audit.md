# Multiplayer Phase 3 UX Audit

Stand: 2026-05-04

## Executive Summary

**UX ausreichend fuer Staging-Spieltest: Ja, eingeschraenkt.**

Der echte Spielerflow ist funktional belegbar: Login, Join, Team-Zuordnung, Draft-Interaktion, Completed-Draft-Dashboard, Ready, Reload und Ergebnisse funktionieren auf Staging. Es gibt keine P0-UX-Blocker, die den Golden Path unspielbar machen.

Fuer unmoderierte oder externe Tests ist die UX aber noch nicht sauber genug. Drei P1-Themen koennen neue Spieler verwirren: das Onboarding ist im Online-Flow stale und ueberdeckt wichtige Inhalte, Direct URLs landen nicht verlaesslich am Zielbereich, und technische Lifecycle-Begriffe erscheinen in Spieler-UI.

**Rollout-Entscheidung:** Staging-Spieltest akzeptabel, wenn Tester kurz gebrieft sind. Kein Production- oder breiter MVP-Go auf UX-Basis.

## Live-Evidenz

| Bereich | Beleg | Ergebnis |
| --- | --- | --- |
| Browser Login/Rejoin | `npm run test:e2e:browser:login-rejoin` | GREEN |
| Join neuer Spieler | `CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_JOIN_SMOKE=true npm run staging:smoke:join` | GREEN |
| Aktiver Draft | `CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_DRAFT_SMOKE=true npm run staging:smoke:draft` | GREEN |
| Player Ready + Reload | `CONFIRM_STAGING_SMOKE=true CONFIRM_STAGING_PLAYER_PLAYABILITY_SMOKE=true npm run staging:smoke:player-playability -- --league-id afbm-playability-test` | GREEN |
| Ergebnisse/Standings | `CONFIRM_STAGING_SMOKE=true npm run staging:smoke:admin-week -- --league-id afbm-playability-test --expected-commit 1dab315e567d1a0627b37689407d7fd22e870cf6` | GREEN |

Build-Info/Commit: `1dab315e567d1a0627b37689407d7fd22e870cf6`, Revision `afbm-staging-backend-build-2026-05-04-003`.

Letzter gepruefter State fuer `afbm-playability-test`:

| Feld | Wert |
| --- | --- |
| currentWeek | 2 |
| lastScheduledWeek | 3 |
| currentWeekGames | 2 |
| readyCount | 0/4 |
| resultsCount | 2 |
| standingsCount | 4 |
| activeLocks | none |

## Gepruefte Screenshots und Selektoren

| Flow | Screenshot/Selektor | Bewertung |
| --- | --- | --- |
| Login | `/tmp/afbm-phase3-ux-audit/01-login-form-or-session.png`, `Anmelden`, `Email`, `Passwort`, `Einloggen` | Verstaendlich, aber sehr knapp. Kein Blocker. |
| Online Hub | Playwright Login-Rejoin Screenshot `01-online-hub-after-login.png`, `Online Liga`, `Weiterspielen`, `Liga suchen` | Gute Orientierung nach Login. |
| Join vorher | `/var/folders/ys/75_wt9dj4rv3c3n61qkrql540000gn/T/afbm-staging-join-smoke-mszlhF/01-before-join-click.png`, `Team-Identität`, `Beitreten` | Grundflow klar, volle Liga aber nicht klar genug markiert. |
| Join nachher | `/var/folders/ys/75_wt9dj4rv3c3n61qkrql540000gn/T/afbm-staging-join-smoke-mszlhF/02-after-primary-join.png`, Teamname in Sidebar/Header, `Fantasy Draft muss...` | Team sichtbar, naechster Blocker sichtbar. |
| Draft active | `/var/folders/ys/75_wt9dj4rv3c3n61qkrql540000gn/T/afbm-staging-draft-smoke-92LcL7/02-before-valid-pick.png`, `Du bist am Zug`, `Pick bestaetigen` | Fachlich klar, Copy wirkt technisch/roh. |
| Draft falscher User | `/var/folders/ys/75_wt9dj4rv3c3n61qkrql540000gn/T/afbm-staging-draft-smoke-92LcL7/01-wrong-player-blocked.png`, `Warte auf anderes Team` | Blockiert korrekt, Grund sollte naeher am Button stehen. |
| Draft nach Pick | `/var/folders/ys/75_wt9dj4rv3c3n61qkrql540000gn/T/afbm-staging-draft-smoke-92LcL7/03-after-valid-pick.png`, `Pick gespeichert.` | Gutes Feedback und sichtbarer State-Wechsel. |
| Dashboard/Results | `/tmp/afbm-phase3-ux-audit/02-dashboard-results-desktop.png`, `Letzte Ergebnisse`, `Bereit fuer Woche 2`, `Standings` | Golden Path sichtbar. Onboarding ist stale und ueberdeckt Inhalte. |
| Direct URL Week | `/tmp/afbm-phase3-ux-audit/03-direct-week-loop.png`, URL `#week-loop` | Sidebar-Ziel aktiv, Viewport landet nicht verlaesslich am Bereich. |
| Direct URL Roster | `/tmp/afbm-phase3-ux-audit/04-direct-roster-hash.png`, URL `#roster` | Gleiches Deep-Link-Problem. |
| Coming Soon | `/tmp/afbm-phase3-ux-audit/05-coming-soon-direct-url-settled.png`, `Trade Board kommt spaeter`, `Zurueck zum Dashboard` | Gut geloest nach Ladephase. |
| Mobile | `/tmp/afbm-phase3-ux-audit/06-dashboard-mobile.png` | Kein harter Layoutbruch, aber viel Chrome und Onboarding verdeckt Kerninhalt. |

## UX-Blocker P0

Keine P0-UX-Blocker gefunden.

Der Spieler kann sich einloggen, einer Liga beitreten, sein Team sehen, Draft/Completed-Draft verstehen, Ready setzen, reloaden und Ergebnisse sehen. Die bekannten Probleme blockieren den Flow nicht vollstaendig, koennen ihn aber missverstaendlich machen.

## Schwere UX-Probleme P1

### P1.1 Onboarding ist nicht Online-Lifecycle-bewusst

**Problem:** Das Onboarding zeigt im Online-Dashboard nach simulierter Woche weiterhin Savegame-/Woche-1-Texte wie `Ueberpruefe dein Team` und "womit du in Woche 1 arbeitest", obwohl die Liga bereits in Woche 2 ist. Auf Desktop und Mobile ueberdeckt der Coach wichtige Ready-/Dashboard-Inhalte.

**Warum kritisch:** Ein neuer Spieler fragt "Was ist als Naechstes zu tun?" und bekommt gleichzeitig echte Week-2-Ready-Informationen und stale Woche-1-Onboarding. Das widerspricht dem Ziel "Wann geht es weiter?".

**Selektoren/Screenshots:**

- `/tmp/afbm-phase3-ux-audit/02-dashboard-results-desktop.png`
- `/tmp/afbm-phase3-ux-audit/06-dashboard-mobile.png`
- Text: `Einstieg 1/4`, `Ueberpruefe dein Team`, `Woche 1`

**Betroffene Komponenten:**

- `src/components/onboarding/onboarding-coach.tsx`
- `src/components/onboarding/onboarding-model.ts`
- Einbindung ueber `src/components/layout/app-shell.tsx`

**Minimaler Fix:** Onboarding fuer Online-Ligen lifecycle-bewusst machen oder im Multiplayer-Dashboard nach Team-/Week-Flow-Erkennung ausblenden. Mindestens darf es nicht stale Woche-1-Texte in Woche 2 anzeigen und nicht die Ready-CTA ueberdecken.

### P1.2 Direct URLs aktivieren Navigation, scrollen aber nicht verlaesslich zum Ziel

**Problem:** Direct URLs wie `#week-loop` oder `#roster` setzen die Sidebar/Navigation sichtbar auf den Zielbereich, der Viewport bleibt aber oben bzw. beim ersten Dashboard-Block. Neue Spieler koennen glauben, dass der Link ins Leere fuehrt.

**Warum kritisch:** Direct URLs sind Teil der QA- und Support-Flows. Wenn ein Spieler per Link zum Roster oder Spielablauf geschickt wird, muss der Zielbereich sichtbar sein.

**Selektoren/Screenshots:**

- `/tmp/afbm-phase3-ux-audit/03-direct-week-loop.png`
- `/tmp/afbm-phase3-ux-audit/04-direct-roster-hash.png`
- URLs: `/online/league/afbm-playability-test#week-loop`, `/online/league/afbm-playability-test#roster`

**Betroffene Komponenten:**

- `src/components/layout/navigation-model.ts`
- Online League Detail/Dashboard Rendering rund um Section-Anker

**Minimaler Fix:** Nach League-State-Load Hash-Ziel per stabilen Anchors und `scroll-margin` sichtbar machen. Kein neues Routing-System noetig.

### P1.3 Technische Lifecycle-Begriffe leaken in Spieler-UI

**Problem:** In der Shell/Header-Zeile erscheinen technische Zustandsnamen wie `readyOpen` neben Saison/Woche. Spieler verstehen diese Begriffe nicht.

**Warum kritisch:** Das Ziel "Wo bin ich?" wird geschwaecht, weil ein interner State als Spielerstatus wirkt.

**Selektoren/Screenshots:**

- `/tmp/afbm-phase3-ux-audit/02-dashboard-results-desktop.png`
- Sichtbar: `1 · readyOpen · Woche 2`

**Betroffene Komponenten:**

- `src/components/layout/top-bar.tsx`
- Context-Aufbereitung fuer `currentSeason.phase`

**Minimaler Fix:** Interne Lifecycle-Phase vor UI-Ausgabe auf Spielerlabels mappen, z. B. `Woche offen`, `Draft laeuft`, `Simulation laeuft`, `Saison abgeschlossen`.

## Weitere UX-Probleme P2

### P2.1 Volle Liga wird nicht klar genug erklaert

**Problem:** In der Liga-Suche kann eine volle Liga weiter mit Status wie `Wartet auf Spieler` erscheinen. Der Button ist disabled, aber der konkrete Grund "Liga voll" ist vor dem Klick nicht klar.

**Screenshot/Selektor:** Join-Smoke Full-League Screenshot `08-full-league-blocked.png`, `Beitreten`, Spielerzaehler `1/1` oder `2/2`.

**Betroffene Komponente:** `src/components/online/online-league-search.tsx`

**Minimaler Fix:** Volle Ligen mit `Liga voll` und einer kurzen Erklaerung markieren; disabled CTA sollte denselben Grund anzeigen.

### P2.2 Draft-Copy ist uneinheitlich und teilweise roh

**Problem:** UI zeigt Transliterationen und Mischsprache: `Verfuegbare Spieler`, `Hoechste zuerst`, `Pick bestaetigen`, `Fantasy Draft muss...`.

**Warum relevant:** Nicht flow-blockierend, aber fuer einen ersten Spieltest wirkt der Kernmodus unfertig.

**Betroffene Komponenten:**

- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/online/online-league-overview-sections.tsx`

**Minimaler Fix:** Einheitliche deutsche Spielerbegriffe verwenden: `Verfuegbare Spieler` kann bleiben, aber konsequent als Produktentscheidung; besser sind echte Umlaute, wenn die App das erlaubt. `Fantasy Draft` entweder als Produktbegriff behalten oder durchgehend `Draft` verwenden.

### P2.3 Draft-Blocker fuer falschen Spieler steht nicht direkt beim CTA

**Problem:** Der falsche Spieler sieht `Warte auf anderes Team`, aber der disabled Pick-Button selbst erklaert den Grund nicht ausreichend lokal.

**Screenshot/Selektor:** `/var/folders/ys/75_wt9dj4rv3c3n61qkrql540000gn/T/afbm-staging-draft-smoke-92LcL7/01-wrong-player-blocked.png`, `Pick bestaetigen`

**Betroffene Komponente:** `src/components/online/online-fantasy-draft-room.tsx`

**Minimaler Fix:** Direkt am Button eine Zeile anzeigen: `Du bist nicht am Zug. Aktuell waehlt: <Team>.`

### P2.4 Mobile ist nutzbar, aber nicht fokussiert

**Problem:** Auf Mobile laden Navigation, Header, Dashboard und Onboarding in einer langen vertikalen Abfolge. Der Spieler sieht zwar keinen Layoutbruch, aber die erste klare Aktion ist zu tief im Screen.

**Screenshot:** `/tmp/afbm-phase3-ux-audit/06-dashboard-mobile.png`

**Betroffene Komponenten:**

- `src/components/layout/sidebar-navigation.tsx`
- `src/components/layout/top-bar.tsx`
- `src/components/onboarding/onboarding-coach.tsx`

**Minimaler Fix:** Onboarding auf Mobile weniger invasiv anzeigen oder nach unten aus dem Kernflow nehmen. Navigation kompakter halten, ohne neue Features einzufuehren.

### P2.5 Login ist funktional, aber nicht kontextstark

**Problem:** Die Login-Seite erklaert Email/Passwort, aber nicht, welche Liga oder welcher Flow danach fortgesetzt wird.

**Screenshot/Selektor:** `/tmp/afbm-phase3-ux-audit/01-login-form-or-session.png`, `Online-Multiplayer nutzt Email/Passwort-Accounts.`

**Betroffene Komponente:** `src/components/auth/online-auth-gate.tsx`

**Minimaler Fix:** Nach Login-Kontext im Hub ist gut; Login selbst kann spaeter einen kurzen Hinweis erhalten. Kein Staging-Blocker.

## Positive Befunde

- Team-Zuordnung ist nach Join und Reload sichtbar und stabil.
- Draft active zeigt Runde, Pick, aktuelles Team, eigene Rolle und verfuegbare Spieler.
- Draft-Pick gibt klares Erfolgssignal (`Pick gespeichert.`) und aktualisiert den naechsten Pick.
- Completed-Draft-Dashboard zeigt Ergebnisse, Standings, naechstes Spiel und Ready-CTA.
- Coming-Soon Direct URL ist nach Ladephase klar: Titel, Erklaerung, Rueckweg zum Dashboard und Spielablauf-Link.
- Reload-Verhalten ist im Browser-Test stabil: kein Login-Redirect, gleiches Team bleibt sichtbar.

## Minimale Fix-Reihenfolge

1. **Onboarding fuer Online-Ligen entschärfen:** Stale Woche-1-Texte entfernen, Overlay nicht ueber Ready/Dashboard legen.
2. **Direct URL Hash-Scroll reparieren:** `#week-loop`, `#roster`, `#depth-chart` muessen nach Datenload sichtbar am Ziel landen.
3. **Technische Lifecycle-Labels mappen:** `readyOpen` und aehnliche interne Phasen aus Spieler-UI entfernen.
4. **Liga-Suche bei vollen Ligen klaeren:** `Liga voll` sichtbar machen und disabled CTA begruenden.
5. **Draft-CTA-Blocker lokalisieren:** Grund direkt beim disabled Pick-Button anzeigen.
6. **Copy vereinheitlichen:** Draft-/Ready-Begriffe konsistent machen, ohne Funktion oder Scope zu aendern.
7. **Mobile Fokus verbessern:** Onboarding/Navigation so anpassen, dass die naechste Spieleraktion schneller sichtbar ist.

## Betroffene Komponenten

| Bereich | Dateien |
| --- | --- |
| Login | `src/components/auth/online-auth-gate.tsx` |
| Liga-Suche/Join | `src/components/online/online-league-search.tsx` |
| Dashboard/Ready/Results | `src/components/online/online-league-overview-sections.tsx` |
| Draft | `src/components/online/online-fantasy-draft-room.tsx` |
| Coming Soon | `src/components/online/online-league-coming-soon-page.tsx`, `src/components/online/online-league-coming-soon-model.ts` |
| Direct URLs/Navigation | `src/components/layout/navigation-model.ts`, Online League Detail Sections |
| Header/Status | `src/components/layout/top-bar.tsx` |
| Onboarding | `src/components/onboarding/onboarding-coach.tsx`, `src/components/onboarding/onboarding-model.ts` |

## Finale Entscheidung

**UX ausreichend fuer Staging-Spieltest: Ja, eingeschraenkt.**

Begruendung: Der echte Spieler kann den Kernflow durchlaufen und die wichtigsten Zustaende sehen. Es gibt keine P0-UX-Blocker. Die P1-Luecken sind aber stark genug, dass ein unbegleiteter Spieler falsche Schluesse ziehen kann, besonders durch stale Onboarding-Texte, nicht sichtbare Deep-Link-Ziele und technische Statusbegriffe.

**Empfehlung:** Phase-3-Staging-Spieltest darf starten, aber die ersten drei Fixes sollten vor einem breiteren externen Test erledigt werden.
