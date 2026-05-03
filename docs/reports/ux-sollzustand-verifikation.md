# UX Sollzustand Verifikation

Stand: 2026-05-01

Rolle dieser Bewertung: externer UX-Auditor / Product Critic.
Bewertungsbasis:

- `docs/reports/ux-flow-target-state.md`
- `docs/reports/ux-final-system.md`
- aktueller sichtbarer UI- und Flow-Zustand in Savegames, Online, Admin und Navigation

## 1. Gesamtbewertung

**Gesamtstatus: Gelb mit roten Kernrisiken**

Governance-Hinweis: Dieser Bericht bewertet UX-/Product-Reife fuer echte Spieler. Fuer Release-Entscheidungen gilt die zentrale Gate-Definition in `docs/reports/qa-release-gates.md`. Ein rotes UX-/Product-Gate blockiert einen Spieler-Release auch dann, wenn technische QA- oder E2E-Gates gruen sind; internes Staging kann trotzdem erlaubt sein, wenn es explizit als QA-System deklariert ist.

Das System wirkt deutlich strukturierter als zuvor, ist aber noch nicht wirklich intuitiv oder als fertiges Spiel erlebbar. Es hat einen erkennbaren UX-Rahmen, klare Hubs und bessere Fallbacks. Trotzdem ist der Sollzustand aus den Zielberichten nicht voll erreicht.

Der kritischste Befund: Die UX beschreibt an mehreren Stellen einen fertigen, eindeutigen Spielfluss, waehrend die tatsaechliche Bedienung noch nach Testumgebung, Admin-Tooling und technischen Zwischenzustaenden riecht. Besonders Online-Rejoin, Fortsetzen und Admin-Woche sind nicht robust genug, um einem neuen oder normalen Spieler ohne Erklaerung zu vertrauen.

**Releasefaehig als internes Staging-/QA-System: Ja, eingeschraenkt.**
**Releasefaehig als intuitiv spielbarer MVP fuer echte Spieler: Nein.**

## 2. Bewertung je Bereich

| Bereich | Bewertung | Harte Einschaetzung |
| --- | --- | --- |
| First-Time Experience | Gelb | Der Einstieg ist besser, aber nicht radikal eindeutig. User sieht Account, Fortsetzen, Neue Karriere, Online und Admin fast gleichzeitig. Innerhalb von 5 Sekunden ist der grobe Zweck erkennbar, aber nicht genau ein naechster Schritt. |
| Continue Flow | Rot | `Fortsetzen` im Hauptbereich ist nicht immer echtes Fortsetzen, sondern springt teils nur zur Franchise-Liste. Online-Fortsetzen haengt stark an gespeicherter letzter Liga. Das Zielbild "Returning Player spielt ohne Nachdenken weiter" ist nicht erreicht. |
| Offline Flow | Gelb | Offline ist formulierter und besser validiert, aber weiterhin accountgebunden. Der Button `Offline Spielen` kann bei fehlendem Login gesperrt wirken und trotzdem Login fokussieren. Das ist funktional, aber mental unsauber. |
| Online Flow | Rot | Der Online Hub ist vorhanden, aber der Flow ist nicht maximal 3 Klicks und Rejoin ist nicht "immer" garantiert. Team-Identitaet steht vor oder neben der Ligawahl und macht den Beitritt schwerer als das Zielsystem vorgibt. |
| Admin Flow | Gelb/Rot | Admin ist nutzbar, aber nicht narrensicher. Status und Safety Check sind besser, doch `Woche simulieren` und `Woche abschließen` wirken fachlich getrennt, laufen aber ueber denselben Simulationspfad. Das ist tauschend. |
| Navigation | Gelb | Die Sidebar ist kontextabhaengiger und verhindert viele leere Ziele. Trotzdem bleiben Hash-Anker, disabled `span`-Eintraege und gemischte Online-/Offline-Mentalmodelle. Der Zustand ist sichtbar, aber nicht immer eindeutig genug. |
| System States | Gelb | Liga, Team, Draft und Week-State werden an vielen Stellen angezeigt. Dennoch muss ein User bei Online-Fehlern oder Draft-/Roster-Sperren noch interpretieren, ob er selbst etwas tun kann oder ein Admin gebraucht wird. |
| Edge Cases | Rot | User ohne Team, kaputte Membership, aktiver Draft und nicht abgeschlossene Woche sind besser abgefangen, aber nicht produktreif. Sie fuehren oft zu Recovery-Hinweisen, nicht zu einem wirklich einfachen Reparaturpfad. |

## 3. Detailpruefung

### 3.1 Einstieg / First-Time Experience

**Bewertung: Gelb**

Positiv:

- `/app/savegames` wirkt inzwischen wie ein Hub.
- Die Hauptoptionen sind visuell klarer: `Fortsetzen`, `Neue Karriere starten`, `Online Spielen`.
- Accountstatus ist sichtbar.
- Admin ist nicht mehr ganz so stark wie ein normaler Spielmodus.

Probleme:

- Es gibt nicht genau einen klaren naechsten Schritt. Ein neuer User sieht mehrere gleichwertige Entscheidungen.
- `Fortsetzen` ist prominent, auch wenn ein First-Time User noch nichts fortsetzen kann.
- `Neue Karriere starten` ist sichtbar, obwohl Login oder Umgebung die Erstellung blockieren kann.
- Admin bleibt sichtbar genug, dass normale Spieler ihn als Teil des Startflows wahrnehmen koennen.

Auditor-Urteil:

Der Einstieg ist verstaendlich, aber noch nicht "5 Sekunden, ein klarer Schritt". Er ist eher ein gut sortiertes Kontrollpanel als ein gefuehrter Spielstart.

### 3.2 Continue Flow

**Bewertung: Rot**

Positiv:

- Vorhandene Franchises werden geladen.
- Es gibt pro Franchise echte `Fortsetzen`-Aktionen.
- Eine zuletzt aktualisierte Franchise wird hervorgehoben.

Probleme:

- Der obere `Fortsetzen`-CTA springt nur zum Franchise-Bereich, statt direkt den wahrscheinlichsten Spielstand zu laden.
- Offline- und Online-Resume sind noch nicht zu einem echten "Zuletzt gespielt"-Flow konsolidiert.
- Online-Fortsetzen ist weiterhin stark an `lastLeagueId` gebunden. Wenn dieser lokale Zustand fehlt oder kaputt ist, braucht der User mentale Arbeit.
- Versteckte Abhaengigkeiten bleiben: Savegame muss existieren, Team muss gesetzt sein, Online-Membership muss konsistent sein, TeamId muss gueltig sein.

Auditor-Urteil:

Das System hat Fortsetzen-Buttons, aber noch keinen verlaesslichen Continue Flow. Es wirkt fertig, weil das Wort `Fortsetzen` prominent ist; tatsaechlich ist die Funktionalitaet zustandsabhaengig und nicht ausreichend erklaert.

### 3.3 Offline Flow

**Bewertung: Gelb**

Positiv:

- Dynasty-Name und User-Team werden validiert.
- Offline-Erstellung erklaert, dass sie zum Account gehoert.
- Wenn Erstellung deaktiviert ist, gibt es eine menschlichere Erklaerung.
- Vorhandene Franchises lassen sich laden.

Probleme:

- "Offline" bedeutet nicht intuitiv "Account erforderlich". Das wurde sprachlich verbessert, bleibt aber ein Produktwiderspruch.
- Bei fehlendem Login sieht der Button gesperrt aus, kann aber Login fokussieren. Das ist kein sauberer mentaler Zustand.
- Ein Nutzer ohne Manager-Team landet zwar nicht mehr blind in allen Bereichen, aber der Zustand fuehlt sich weiterhin wie ein Datenproblem statt wie ein gefuehrter Spielzustand an.

Auditor-Urteil:

Offline ist nutzbar, aber nicht frei von Friktion. Ein Spieler kann starten, wird aber bei gesperrter Erstellung oder fehlendem Team noch an Systemgrenzen erinnert.

### 3.4 Online Flow

**Bewertung: Rot**

Positiv:

- Online Hub existiert.
- `Weiterspielen`, `Liga suchen` und `Zurueck zum Hauptmenue` sind sichtbar.
- Rejoin wird fuer bestehende Mitglieder angeboten.
- Permission- und Not-found-Fehler fuehren eher Richtung Online Hub als in harte Sackgassen.

Probleme:

- "Maximal 3 Klicks ins Spiel" wird nicht sicher erreicht. Neue Nutzer muessen suchen, Teamidentitaet waehlen, ggf. Team vorschlagen, beitreten und warten.
- Team-Identitaet ist immer ein dominanter Block, selbst wenn der User zuerst nur eine Liga finden will.
- Rejoin funktioniert nicht "immer", sondern nur wenn Membership, Mirror, TeamId und Team-Zuordnung lesbar und konsistent genug sind.
- Fehlertexte helfen, aber sie erklaeren oft Systemzustand statt echte Reparatur als einfachen Schritt auszufuehren.
- Der Online-Dashboard-Zustand haengt an Draft/Roster/Team-Ready. Der User kann leicht denken: "Ich bin drin, aber warum ist alles gesperrt?"

Auditor-Urteil:

Online ist ein funktionsfaehiger Testflow, aber kein intuitiver Multiplayer-Einstieg. Er ist noch zu nah an Datenmodell und Staging-Realitaet.

### 3.5 Admin Flow

**Bewertung: Gelb/Rot**

Positiv:

- Admin-Passwort-Altlast ist im Hauptflow entfernt.
- Admin Hub zeigt Ligen, Status, Week-State, Draft-State und Safety Check.
- Kritische Aktionen haben Confirm Dialoge.
- Debug zeigt Membership- und Teamprobleme.

Probleme:

- `Woche simulieren` und `Woche abschließen` klingen wie unterschiedliche Fachaktionen, verwenden aber denselben `simulateWeek`-Pfad. Das ist UX-taeuschend.
- Admin-Detailseiten enthalten sehr viele Aktionen. Ein Admin kann sich noch immer in Tooling verlieren.
- Manche Aktionen sind fuer Test/Development gedacht, aber in der Oberflaeche nicht immer hart genug als gefaehrlich oder nicht-produktiv markiert.
- Der Status einer Liga ist sichtbar, aber nicht sofort in eine einzige klare Empfehlung uebersetzt: "Das ist der naechste sichere Schritt."

Auditor-Urteil:

Admin ist fuer interne Bediener brauchbar, aber nicht sicher genug als "fertiges Kontrollzentrum". Es ist ein stark verbessertes Tool, kein narrensicheres Produkt.

### 3.6 Navigation

**Bewertung: Gelb**

Positiv:

- Ohne Savegame wird die Sidebar stark reduziert.
- Ohne Team werden relevante Bereiche gesperrt.
- Aktiver Zustand ist sichtbar.
- Fallback geht konsistenter zu Savegames.

Probleme:

- Disabled Eintraege sind teils nicht fokussierbare `span`-Elemente; die Begruendung ist nicht fuer alle Bedienformen gleich gut.
- Online-Navigation nutzt Hash-Anker, Draft aber echte Route. Das ist technisch okay, aber mental uneinheitlich.
- Manche Labels bleiben fachlich gross, obwohl der Bereich noch nicht voll implementiert ist.
- Der Breadcrumb nutzt weiterhin `App` als Begriff, waehrend das Zielsystem `Hauptmenue` als zentrale Sprache definiert.

Auditor-Urteil:

Navigation ist deutlich weniger kaputt, aber nicht final intuitiv. Sie verhindert Leere besser, erzeugt aber noch kein geschlossenes Informationsmodell.

### 3.7 System States

**Bewertung: Gelb**

Positiv:

- Team, Liga, Draft, Week und Adminstatus werden an mehreren Stellen angezeigt.
- Debug- und Safety-States sind vorhanden.
- Online-Liga-Dashboard versucht, fehlende Daten zu erklaeren.

Probleme:

- Der User weiss nicht immer, ob er selbst handeln kann oder ob ein Admin handeln muss.
- "Draft aktiv", "Roster nicht vollstaendig", "Ready-State fehlt" und "Woche nicht simulierbar" sind fachlich korrekt, aber fuer Spieler noch zu wenig handlungsleitend.
- Der Status ist sichtbar, aber nicht immer als klare naechste Aufgabe uebersetzt.

Auditor-Urteil:

Das System zeigt Zustaende, aber es fuehrt noch nicht konsequent durch sie hindurch.

### 3.8 Edge Cases

**Bewertung: Rot**

| Edge Case | Bewertung | Warum |
| --- | --- | --- |
| User ohne Team | Gelb/Rot | Wird erkannt, aber fuehlt sich wie kaputter Datenzustand an. Reparatur ist nicht narrensicher. |
| User ohne Liga | Gelb | Online Hub hilft, aber `Weiterspielen` kann erst scheitern, bevor `Liga suchen` offensichtlich wird. |
| Kaputte Membership | Rot | Es gibt Recovery, aber kein garantierter Ein-Klick-Reparaturfluss fuer normale User. |
| Draft aktiv, UI blockiert | Gelb/Rot | Kein Auto-Draftboard mehr, gut. Aber viele gesperrte Bereiche koennen wie ein Defekt wirken. |
| Woche nicht abgeschlossen | Gelb/Rot | Admin sieht Blocker; Spieler versteht nicht zwingend, ob Warten, Ready setzen oder Adminaktion noetig ist. |

## 4. Kritischste Probleme Top 5

### 1. `Fortsetzen` verspricht mehr als es haelt

Der wichtigste Returning-Player-CTA ist nicht durchgehend ein echter Resume. Besonders der obere Hub-CTA springt nur zur Liste. Das wirkt wie ein fertiger Continue Flow, ist aber nur Navigation innerhalb der Seite.

### 2. Online-Rejoin ist noch kein verlaesslicher Produktflow

Der Zielzustand verlangt: User kann wieder beitreten und laden. Tatsachlich haengt der Flow an Membership, Mirror, TeamId, assignedUserId, localStorage und League-Verfuegbarkeit. Die UI kaschiert diese Komplexitaet, beseitigt sie aber nicht voll.

### 3. Admin `Woche abschließen` ist fachlich irrefuehrend

Der Button klingt wie eine andere Aktion als Simulation, laeuft aber ueber denselben Simulations-Action-Pfad. Das kann Admins zu falschen Annahmen fuehren und ist die deutlichste tauschende UX im Adminbereich.

### 4. Online-Join ist zu schwer fuer einen neuen Spieler

Der User muss nicht nur eine Liga finden, sondern auch Team-Identitaet konfigurieren. Das Zielbild "Liga suchen -> Liga waehlen -> Beitreten" wird dadurch verwässert.

### 5. Systemzustaende sind sichtbar, aber nicht genug handlungsleitend

Draft, Roster, Ready, Week, Membership und Adminrechte werden angezeigt. Aber die UX sagt nicht immer hart genug: "Du kannst jetzt X tun" oder "Du wartest auf Y".

## 5. Taeuschende UX

Diese Stellen wirken fertiger, als sie sind:

| UX-Element | Warum es fertig wirkt | Warum es nicht fertig ist |
| --- | --- | --- |
| `Fortsetzen` im Savegames-Hub | klingt wie direkter Resume | springt teils nur zum Franchise-Bereich |
| Online `Weiterspielen` | klingt wie sicherer Rejoin | haengt an lokalem lastLeagueId und konsistenter Membership |
| `Woche abschließen` | klingt wie eigener Week-Finalisierungsschritt | nutzt denselben Simulationspfad wie `Woche simulieren` |
| Admin Control Center | wirkt wie zentrale Produktionssteuerung | enthaelt weiterhin Tooling-/Debug-Komplexitaet und viele Fachaktionen |
| Online-Dashboard nach Join | wirkt wie Spieler ist "im Spiel" | Draft/Roster/Ready koennen grosse Teile blockieren |
| Sidebar mit vielen Labels | wirkt wie Features existieren | einige Bereiche sind bewusst gesperrt oder nur teilweise vorhanden |

## 6. Was fehlt zum "wirklich spielbar"

### Muss fehlen, bevor man es echten Spielern gibt

1. **Echter Resume-First Flow**
   Ein oberster `Fortsetzen`-Button muss den wahrscheinlichsten Offline- oder Online-Spielstand direkt laden.

2. **Online-Recovery als Ein-Klick-Reparatur**
   Missing Membership, Missing Team und kaputte Mirrors muessen fuer den User in einem gefuehrten Rejoin/Reparaturfluss enden.

3. **Klare Spieler-Next-Action im Online-Dashboard**
   Jeder Zustand braucht eine eindeutige Antwort: "Draft oeffnen", "Ready setzen", "Auf Admin warten", "Roster pruefen", "Woche ansehen".

4. **Admin-Aktionen fachlich trennen**
   `Woche simulieren` und `Woche abschließen` duerfen nicht gleich wirken oder denselben Effekt verschleiern.

5. **Online Join vereinfachen**
   Liga zuerst, Teamidentitaet danach oder automatisch. Der Beitritt darf nicht wie ein Team-Editor vor dem eigentlichen Spielstart wirken.

6. **Disabled UX accessibility-fest machen**
   Gesperrte Navigation braucht fokussierbare Erklaerungen und klare CTAs.

7. **Terminologie konsequent nachziehen**
   `Hauptmenue`, `Savegames`, `App`, `Online Liga`, `Franchise` und `Adminmodus` muessen einheitlicher verwendet werden.

## 7. Harte Wahrheitspruefung

### 1. Wuerde ein neuer Spieler ohne Hilfe verstehen, was zu tun ist?

**Teilweise, aber nicht sicher.**

Ein neuer Spieler erkennt: Es gibt Account, Karriere und Online. Er versteht aber nicht zwingend, welche Option fuer ihn jetzt die richtige ist, warum Offline Login braucht oder warum Admin sichtbar ist.

### 2. Wuerde ein Spieler freiwillig weiterspielen?

**Ein motivierter Tester: ja. Ein normaler Spieler: fraglich.**

Der Kern ist interessant und die UI ist deutlich strukturierter. Aber sobald Online-Zustaende, gesperrte Bereiche oder Admin-abhängige Week-Flows auftauchen, droht der Spielfluss in Systemverwaltung umzuschlagen.

### 3. Gibt es Stellen, wo der User das Gefuehl hat: "Das Spiel ist kaputt"?

**Ja.**

Konkrete Stellen:

- Online `Weiterspielen` findet keine Liga oder keine Membership.
- User ist in einer Online-Liga, aber Team-/Rosterbereiche sind gesperrt.
- Draft ist aktiv oder abgeschlossen, aber andere Menues wirken noch blockiert.
- Woche kann nicht simuliert oder abgeschlossen werden, ohne dass fuer Spieler klar ist, wer handeln muss.
- `Fortsetzen` fuehrt nicht direkt ins Spiel, sondern nur weiter nach unten.

## 8. Empfehlung

**Releasefaehig: Nein, nicht als wirklich spielbarer UX-MVP.**

**Geeignet fuer:**

- internes Staging
- Admin-/QA-Testlaeufe
- kontrollierte Multiplayer-Tests mit Anleitung
- technische Validierung von Seed, Membership, Draft und Week-Simulation

**Nicht geeignet fuer:**

- unbegleitete neue Spieler
- breiteren Playtest ohne Moderator
- Erwartung "einfach einloggen und spielen"

## 9. Entscheidung

Der definierte Ziel-UX-Zustand wurde **nicht voll erreicht**.

Das System ist nicht mehr chaotisch, aber noch nicht wirklich intuitiv. Es wirkt an vielen Stellen spielbar, weil Buttons, Statuskarten und Fallbacks vorhanden sind. Bei genauer Pruefung ist es jedoch eher ein stabilisiertes Testprodukt als ein fertiger Spielerflow.

**Klare Entscheidung: Spielbar fuer interne Tests: Ja. Wirklich spielbar fuer normale User: Nein.**
