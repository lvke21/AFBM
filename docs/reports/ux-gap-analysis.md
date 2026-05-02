# UX Gap Analysis

Stand: 2026-05-01

Verglichen wurden:

- Current State: `docs/reports/ux-flow-current-state.md`
- Target State: `docs/reports/ux-flow-target-state.md`

## Executive Summary

Der aktuelle UX-Flow ist spielbar und hat keine harte Sackgasse ohne Rueckweg. Die groessten Abweichungen liegen nicht in fehlender technischer Funktion, sondern in mentalen Modellen:

- Login wirkt doppelt und uneinheitlich.
- Offline wird als sofort/lokal wahrgenommen, ist aber accountgebunden.
- Online-Recovery kann in Retry-Loops fuehren.
- Returning Player haben keinen echten Resume-First Flow.
- Admin ist funktional, aber als gleichrangiger Spielmodus und durch technische Claim-Hinweise etwas unklar.

## Gap-Liste

| ID | Bereich | Gap | Kategorie | Impact | Fix notwendig |
| --- | --- | --- | --- | --- | --- |
| GAP-01 | Auth / First-Time | Ziel: ein klarer Login-Schritt. Aktuell: globaler Auth Status plus separates Firebase Login Panel. | Hoch | User kann zwei Panels als zwei Login-Systeme verstehen. | Ja |
| GAP-02 | Savegames Copy | Ziel: Offline-Karriere mit sichtbarer Account-Voraussetzung. Aktuell: Copy sagt "Offline sofort spielbar", Login ist aber Pflicht. | Hoch | Falsche Erwartung direkt am Einstieg. | Ja |
| GAP-03 | Returning Player | Ziel: oberstes Resume Panel fuer letzte Offline/Online-Aktivitaet. Aktuell: Franchises-Liste und Online-Weiterspielen sind getrennt; kein einheitlicher Resume-First Zustand. | Hoch | Wiederkehrender User braucht mehr Orientierung/Klicks als noetig. | Ja |
| GAP-04 | Online Missing Membership | Ziel: primaerer CTA `Liga neu suchen / Rejoin`. Aktuell: primaerer Retry laedt dieselbe Liga erneut. | Hoch | User kann in Loop landen und versteht den Reparaturpfad nicht. | Ja |
| GAP-05 | Online Missing Team | Ziel: Teamzuordnung reparieren/Rejoin als primaere Aktion. Aktuell: primaerer Retry "Team erneut laden". | Hoch | Fehler bleibt wahrscheinlich bestehen, Fortschritt ist indirekt. | Ja |
| GAP-06 | Online Join | Ziel: Liga suchen -> Liga waehlen -> Team bestaetigen -> Beitreten. Aktuell: Team-Identity-Auswahl ist prominent und Pflicht, auch fuer Testliga-Suchmentalitaet. | Mittel | Join wirkt komplizierter als noetig. | Ja |
| GAP-07 | Online Search Empty | Ziel: Keine Liga -> erklaerter Zustand mit optionalem Admin/Test-Hinweis. Aktuell: nur "Aktuell ist keine Liga verfügbar." | Mittel | User weiss nicht, ob er warten, Admin fragen oder Seed ausfuehren soll. | Ja |
| GAP-08 | Online Continue | Ziel: ungueltige lastLeagueId -> direkt Liga suchen als primaere Aktion. Aktuell: Feedback erscheint, User muss separaten Liga-suchen-Button darunter nutzen. | Mittel | Kleiner Umweg nach kaputtem lokalen Zustand. | Ja |
| GAP-09 | Logout / Re-Login | Ziel: Resume kann aus serverseitigen Memberships rekonstruiert werden. Aktuell: Logout loescht lokale Online-Keys; danach braucht User Liga suchen/Rejoin. | Mittel | Sicher, aber Returning-Online-Flow verliert Komfort. | Optional/Ja |
| GAP-10 | Sidebar Online Navigation | Ziel: konsistentes Navigationsmodell. Aktuell: Online nutzt Hash-Anker, Draft echte Route, andere Bereiche disabled. | Mittel | Mentales Modell "Route vs Bereich" uneinheitlich. | Ja, spaeter |
| GAP-11 | Sidebar Disabled UX | Ziel: Disabled States erklaeren auch per Tastatur gut. Aktuell: disabled Eintraege sind `span` mit Text/Title, nicht fokussierbar. | Niedrig | Accessibility/Keyboard-Erklaerung begrenzt. | Ja |
| GAP-12 | Admin Entry | Ziel: Admin als Utility. Aktuell: Adminmodus ist im Savegames Screen gleichrangig mit Spielmodi. | Mittel | Normale Spieler koennen Admin als Spielmodus lesen. | Ja |
| GAP-13 | Admin Claim Copy | Ziel: UID-Allowlist und Custom Claim gleichwertig erklaeren. Aktuell: AdminAuthGate betont Custom Claim/Token Refresh. | Niedrig | Allowlisted Admins koennen irritiert sein. | Ja |
| GAP-14 | Rueckwege | Ziel: sichtbares Hauptmenue konsistent `/app/savegames`. Aktuell: Rueckwege mischen `/`, `/app/savegames`, `/online`. | Niedrig | Funktioniert technisch, wirkt aber uneinheitlich. | Ja |
| GAP-15 | Savegame Error Retry | Ziel: Retry ohne kompletten Seitenreload. Aktuell: Savegames-Listenfehler nutzt `window.location.reload()`. | Niedrig | Grober Reset, aber keine Blockade. | Ja |
| GAP-16 | Admin Informationsdichte | Ziel: Admin startet mit Status und klarer naechster Aktion. Aktuell: Debug, Draft, Simulation und GM-Aktionen liegen dicht beieinander. | Mittel | Admin kann richtige Aktion schwerer priorisieren. | Ja, spaeter |

## Fehlende Schritte

- Einheitlicher Account/Login-Step im First-Time Flow.
- Resume Panel fuer `Zuletzt gespielt`.
- Direkter Reparaturpfad fuer fehlende Online Membership.
- Direkter Reparaturpfad fuer fehlendes Online Team.
- Server-/Repository-basierte Rekonstruktion letzter Online-Liga nach Logout/Re-Login.
- Admin/Test-Hinweis im Online Empty State.
- Konsistenter Hauptmenue-Rueckweg.

## Schritte, die aktuell zu viel sind

- User sieht Auth Status und Login Panel gleichzeitig.
- Returning Player muss haeufig erst zwischen Savegames-Liste und Online Hub unterscheiden.
- Online Join verlangt viel Team-Identity-Auswahl, bevor klar ist, ob die Liga relevant ist.
- Missing Membership Retry wiederholt denselben Load statt den User zum Rejoin zu fuehren.
- Admin zeigt viele Aktionsfamilien direkt auf einer Ebene.

## Haengepunkte / Looping Flows

| Flow | Loop | Severity |
| --- | --- | --- |
| Direct Online League ohne Membership | `Liga erneut laden` -> gleicher Missing-Membership-State | Hoch |
| Online League ohne Team | `Team erneut laden` -> gleicher Missing-Team-State | Hoch |
| Ungueltige lastLeagueId | Feedback -> User muss separaten `Liga suchen` Button erkennen | Mittel |
| Logout/Re-Login Online | Online-Kontext geloescht -> Weiterspielen nicht moeglich -> Liga suchen/Rejoin | Mittel |

## Unscharfe States

- **Offline:** klingt lokal/ohne Account, ist aber Firebase-accountgebunden.
- **Auth:** globaler Accountstatus und Login-Kachel wirken redundant.
- **Admin:** "Adminmodus" klingt wie ein Spielmodus, nicht wie Utility.
- **Online Team Ready:** Draft/Roster/Membership-Zustaende werden erklaert, aber Reparaturpfade sind nicht immer primaer.
- **Home:** `/` und `/app/savegames` sind funktional gleich, aber Ruecklinks sind semantisch gemischt.

## Priorisierte Arbeitspakete

### AP1 - Online Recovery entlooppen

**Ziel:** Missing Membership und Missing Team fuehren primaer zu einem reparierenden Rejoin-/Liga-suchen-Flow.

**Umfang:**

- Missing Membership: primaerer CTA `Liga neu suchen / Rejoin`.
- Missing Team: primaerer CTA `Teamzuordnung reparieren / Rejoin`.
- Retry bleibt sekundär.
- Recovery Copy benennt konkrete fehlende Daten: Membership, TeamId, Rolle.

**Impact:** Hoch. Entfernt die kritischsten Looping Flows im Multiplayer.

**Abhaengigkeiten:** Online Hub/Rejoin muss bestehende Memberships und freie Teams sauber behandeln.

### AP2 - Auth konsolidieren

**Ziel:** Ein sichtbarer Account-Bereich statt globalem Status plus separatem Login-Gefuehl.

**Umfang:**

- Savegames Auth Status und Firebase Login Panel zu einem Account Panel zusammenfuehren.
- Logged-out: Login/Register.
- Logged-in: Account, Rolle, Logout, Online/Admin Verfuegbarkeit.
- Login-CTA aus Offline/Online/Admin scrollt/fokussiert dieses eine Panel.

**Impact:** Hoch. Reduziert First-Time-Verwirrung und klaert Rollen.

**Abhaengigkeiten:** Keine serverseitigen Auth-Aenderungen noetig.

### AP3 - Resume-First Hub bauen

**Ziel:** Returning Player setzt mit einem Klick fort.

**Umfang:**

- Oberstes Panel `Zuletzt gespielt`.
- Offline: aktives Savegame aus LocalStorage/API.
- Online: letzte Liga bevorzugt aus Membership/Repository rekonstruieren, nicht nur localStorage.
- Fallback: "Keine letzte Aktivitaet" plus CTAs.

**Impact:** Hoch. Reduziert Klickpfade fuer wiederkehrende Spieler.

**Abhaengigkeiten:** AP1 fuer robusten Online-Rejoin empfohlen.

### AP4 - Savegames Copy und Offline-Create UX korrigieren

**Ziel:** Keine falsche Erwartung "Offline sofort spielbar" bei Loginpflicht.

**Umfang:**

- Copy zu "Offline-Karriere mit deinem Account" aendern.
- Auth-locked Offline Button nicht als disabled/not-allowed darstellen, wenn er Login fokussiert.
- Feldvalidierung mit Fokus auf fehlerhaftes Feld.

**Impact:** Mittel bis hoch. Bessere First-Time Klarheit.

**Abhaengigkeiten:** AP2 ideal, aber nicht zwingend.

### AP5 - Online Join vereinfachen

**Ziel:** Ligaauswahl steht vor Team-Identity-Komplexitaet.

**Umfang:**

- Bei vorhandener Membership: keine Team-Identity anzeigen, direkt `Wieder beitreten`.
- Bei neuer Membership: Team automatisch vorschlagen, User bestaetigt nur.
- Team-Identity Details optional aufklappbar.
- Empty State mit Test/Admin-Hinweis.

**Impact:** Mittel. Senkt Reibung fuer neue Online-Spieler.

**Abhaengigkeiten:** AP1 fuer Rejoin-Pfade.

### AP6 - Navigation und Rueckwege vereinheitlichen

**Ziel:** Ein eindeutiges Hauptmenue und konsistente Online/Offline Rueckwege.

**Umfang:**

- Sichtbare Hauptmenue-Links auf `/app/savegames`.
- `/` darf intern weiter funktionieren, aber nicht als UI-Ziel erscheinen.
- Online Recovery immer mit `Online Hub` und `Savegames` als klare Optionen.

**Impact:** Mittel. Reduziert Orientierungsbrueche.

**Abhaengigkeiten:** Keine.

### AP7 - Admin als Utility klarer staffeln

**Ziel:** Admin wird nicht als normaler Spielmodus gelesen.

**Umfang:**

- Admin-Link im Savegames Hub visuell kleiner/sekundaer.
- AdminAuthGate Copy fuer UID-Allowlist und Custom Claim angleichen.
- Admin Hub in Ebenen gliedern: Status, Ligen, Aktionen, Debug.

**Impact:** Mittel. Verbessert Admin-Verstaendlichkeit ohne Gameplay-Risiko.

**Abhaengigkeiten:** Keine.

### AP8 - Sidebar Accessibility und Online-Navigation harmonisieren

**Ziel:** Disabled-Erklaerungen und Anker-Navigation sind klarer und tastaturfreundlicher.

**Umfang:**

- Disabled Items als fokussierbare `button`/`aria-disabled` mit Tooltip/Description.
- Hash-Anker beim Klick mit Focus-Management.
- Langfristig Online-Unterbereiche als echte Tabs oder Routen definieren.

**Impact:** Niedrig bis mittel. Verbessert Politur und Accessibility.

**Abhaengigkeiten:** Spaetere Online-Dashboard-Struktur.

### AP9 - Savegame Error Retry ohne Full Reload

**Ziel:** Fehler in Savegames-Liste bleiben lokal reparierbar.

**Umfang:**

- `window.location.reload()` durch lokalen Fetch-Retry ersetzen.
- Feedback erhalten, Auth-State nicht hart resetten.

**Impact:** Niedrig. Sauberer, aber kein Hauptfluss-Blocker.

**Abhaengigkeiten:** Keine.

## Empfohlene Reihenfolge

1. AP1 - Online Recovery entlooppen
2. AP2 - Auth konsolidieren
3. AP3 - Resume-First Hub bauen
4. AP4 - Savegames Copy und Offline-Create UX korrigieren
5. AP5 - Online Join vereinfachen
6. AP6 - Navigation und Rueckwege vereinheitlichen
7. AP7 - Admin als Utility klarer staffeln
8. AP8 - Sidebar Accessibility und Online-Navigation harmonisieren
9. AP9 - Savegame Error Retry ohne Full Reload

## Release Impact

- AP1 bis AP4 verbessern die Kernverstaendlichkeit fuer echte Spieler stark und sollten vor breiterem Staging-Playtest umgesetzt werden.
- AP5 bis AP7 sind wichtig fuer Multiplayer/Admin-Reife, aber nicht zwingend fuer einen kleinen internen Test.
- AP8 bis AP9 sind Politur und Robustheit.
