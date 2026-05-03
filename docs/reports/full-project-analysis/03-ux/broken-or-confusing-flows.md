# Broken Or Confusing Flows

Stand: 2026-05-02

## Ziel der Analyse

Alle aktuell erkennbaren Flow-Brueche, verwirrenden States, blockierenden Bugs und MVP-Luecken zusammenfassen.

## Wichtigste Flow-Brueche

| Rang | Flow | Problem | Ursache | Schwere | Fix-Vorschlag |
|---:|---|---|---|---|---|
| 1 | Continue/Rejoin | User kann eingeloggt sein, aber nicht verbunden wirken | `lastLeagueId`, Membership, Mirror, TeamId, assignedUserId muessen konsistent sein | Hoch | Recovery mit "Rejoin reparieren" statt nur Retry |
| 2 | Admin Week | `Woche simulieren` und `Woche abschliessen` wirken wie zwei Schritte | Simulation fuehrt bereits Week Advance aus | Hoch | Eine klare Hauptaktion: "Woche simulieren und abschliessen" |
| 3 | Online Join | Team-Identitaet blockiert einfachen Liga-Beitritt | Join-Form vor/nach Ligaauswahl zu dominant | Mittel/Hoch | Erst Liga waehlen, dann Teamidentitaet abfragen |
| 4 | First-Time Entry | Zu viele gleichrangige Optionen | Savegames, Online, Offline, Admin gleichzeitig sichtbar | Mittel | Zustandsgesteuerte primaere CTA |
| 5 | Online Team Management | Roster/Depth Chart sind MVP-Anker, keine vollen Seiten | Online Dashboard als Single-Screen | Mittel | Komplette Read-only Roster/Depth Chart Ansicht |
| 6 | Nicht-MVP Features | Sidebar wirkt voll, viele Bereiche Coming Soon | MVP scope sichtbar statt reduziert | Mittel | Nicht-MVP Gruppe optisch sekundär oder ausblenden |
| 7 | Admin Dialoge | Native prompts/confirms fuer kritische Aktionen | Browser Dialoge statt Design-System | Mittel/Hoch | Custom Confirm Modals |
| 8 | Auth/Offline Sprache | Offline verlangt Firebase Login | Accountgebundene Saves | Mittel | "Karriere im Account" statt "Offline" betonen |
| 9 | Spieler-Warten | User weiss nicht immer, ob Admin oder andere GMs fehlen | Ready/Week State technisch | Mittel | Explizite "Du bist fertig / warte auf ..." States |
| 10 | Live QA | Admin UI Staging Smoke offen | Kein echter Admin Token Browserlauf in letzter QA | Hoch fuer Release | Als Gate nachholen |

## Fehler- und Leerzustaende

| Zustand | Aktuelle UX | Bewertung |
|---|---|---|
| Nicht eingeloggt | Login Panel / Buttons fordern Login | OK |
| Keine Savegames | Empty State + Neue Karriere CTA | OK |
| Offline Erstellung deaktiviert | Erklaerung sichtbar | OK |
| Keine Online Liga | Empty State "Aktuell keine Liga verfügbar" | OK, aber ohne naechsten Admin/Seed-Hinweis |
| Ungueltige lastLeagueId | Bereinigung + Feedback | OK |
| Liga fehlt | Error State + Liga neu suchen | OK |
| User nicht Member | Recovery | Teilweise, Reparaturpfad nicht stark genug |
| User ohne Team | Recovery | Teilweise, wirkt wie kaputter Zustand |
| Draft active | Draft Route funktioniert, andere Bereiche koennen begrenzt sein | OK/Gelb |
| Week simulating | Ready gesperrt | OK |
| Week completed | Ready gesperrt, Results sichtbar | OK |
| Admin nicht berechtigt | Access Gate | OK |

## Blockierende Bugs

Statisch aktuell keine eindeutig reproduzierbaren blockierenden UI-Bugs gefunden. Die wichtigsten **Release-blockierenden Unsicherheiten** sind:

- Echter Staging Admin-UI-Smoke mit Admin-Token nicht als dauerhaft gruen dokumentiert.
- Staging-Daten koennen Membership/Mirror/Team-Zuordnung brechen.
- Full Week-2-Live-Loop nach Reload nicht umfassend als Browserflow belegt.

## Taeuschende UX

| Element | Warum es fertig wirkt | Warum es verwirren kann |
|---|---|---|
| `Fortsetzen` | klingt nach direktem Resume | fuehrt je nach Kontext nur zur Liste oder haengt an `lastLeagueId` |
| `Online Liga` Dashboard | wirkt wie vollstaendiger Franchise Hub | viele Bereiche sind Anker oder Coming Soon |
| `Woche abschliessen` | klingt wie eigener Schritt | gleiche Kernaktion wie Simulation |
| Admin Control Center | wirkt produktionsreif | native Dialoge und Debug-/Dev-Aktionen bleiben sichtbar |
| Team Management online | Sidebar Labels klingen voll | Roster/Depth Chart sind MVP-lesbar, nicht voll editierbar |

## Minimaler stabiler Game Loop

Der kleinste stabile Loop, der fuer MVP verteidigt werden kann:

```text
1. User loggt sich ein
2. User joined/rejoined eine Liga
3. System zeigt eindeutig: Liga, Team, Week, Draft Status
4. User oeffnet Roster/Depth Chart lesend
5. User setzt Ready
6. Admin sieht alle aktiven GMs ready
7. Admin simuliert und schliesst Woche ab
8. Results und Standings werden gespeichert
9. User reloadet und sieht naechste Woche
10. Loop beginnt wieder bei Ready
```

Nicht in den MVP-Loop aufnehmen:

- Online Contracts
- Online Development
- Online Trades
- Online Inbox
- Online Finance
- Admin GM-Disziplinar-Workflows
- Offline vollstaendige Staff/Training/Trade-Center Tiefe

## Priorisierte Verbesserungen

1. **Resume/Rejoin reparierend machen:** Button "Liga neu suchen und Verbindung pruefen".
2. **Admin Week Action vereinheitlichen:** ein Button, ein Confirm, ein Ergebnis.
3. **Online Join vereinfachen:** Liga zuerst, Teamidentitaet danach.
4. **Spielerstatus uebersetzen:** "Du bist fertig", "Admin ist dran", "andere GMs fehlen".
5. **Online Team Management ehrlicher machen:** Read-only MVP explizit labeln oder volle Liste zeigen.
6. **Admin Dialoge ersetzen:** kritische Aktionen mit klaren Folgen und Pflichtfeldern.
7. **Live QA nachziehen:** Staging Browser Smoke fuer Admin und GM.

## Release-Einschaetzung aus UX-Sicht

- Interne Staging-/QA-Nutzung: **Ja, mit Gelb-Status**
- Spieler-MVP fuer echte Nutzer ohne Begleitung: **Noch nein**
- Naechster sinnvoller Schritt: **Flow-Politur und Admin-Smoke, keine neuen Features**
